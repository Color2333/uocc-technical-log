# 发射端设计

## 硬件组成

| 组件 | 规格 | 状态 |
|------|------|------|
| MCU | 待定（STM32/ESP32）| ✅ 基本完成 |
| 大功率 LED | 10W | ✅ 驱动电路迭代完成 |
| 低功率 LED | 3.3W | ✅ 驱动电路迭代完成 |
| LED 驱动 | 双路独立控制 | ✅ 基础控制完成 |

## LED 驱动电路设计

### v1.0 — NMOS 直驱（原型验证）

最初版本使用 N-MOSFET 直接驱动蓝光 LED：

```
Jetson GPIO(3.3V) ─[R1=10kΩ]─ Gate
                               N-MOSFET
5V ─[Blue LED]─[R_lim]─ Drain
                         Source ─ GND
```

**问题**：Jetson 控制地（GND_ctrl）与电源地（GND_pwr）共地，电源侧的开关噪声可通过地线反串进入 Jetson，存在损坏风险。

---

### v3.0 — EL817 光耦隔离 + P-MOS 高边开关（最终方案）✅

核心设计理念：**完全电气隔离** + **高边开关**保证安全。

#### 电路拓扑

```
控制侧 (Jetson, 3.3V)              电源侧 (12V)
─────────────────────             ─────────────────
Jetson GPIO                        +12V ─────────────── P-MOSFET Source
    │                                    │
  [R1=300Ω]                          [R3=10kΩ]
    │                                    │
  EL817 Anode (+)                   ┌── Gate ──┐
  EL817 Cathode (−)                 │  P-MOSFET│
    │                               └── Drain ─┘
  Jetson GND (隔离)                       │
                         EL817 Collector ─[R2=2kΩ]─ Gate
                         EL817 Emitter ─ 电源 GND
                                          │
                                     [CC 恒流驱动]
                                          │
                                      [10W LED]
                                          │
                                       电源 GND
```

#### 元件参数

| 元件 | 型号/规格 | 功能 |
|------|---------|------|
| R1 | 300Ω | EL817 输入限流（IF ≈ 10mA） |
| EL817 | 光电耦合器，CTR ≥ 50% | Jetson 与电源侧隔离 |
| R2 | 2kΩ | P-MOS 栅极驱动电阻（限制栅极电流） |
| R3 | 10kΩ | 栅极上拉至 12V（P-MOS 默认关断） |
| P-MOSFET | P-CH，Vgs(th) ≈ −3V | 12V 高边开关 |
| CC Driver | 恒流驱动模块 | 稳定 LED 工作电流 ~700mA |
| 10W LED | 大功率白/蓝光 LED | 水下通信光源 |

#### 工作逻辑

| Jetson GPIO | EL817 | P-MOS Gate | P-MOS 状态 | LED |
|-------------|-------|------------|-----------|-----|
| LOW (0V) | 截止 | ≈12V（R3上拉）| 截止 | OFF |
| HIGH (3.3V) | 导通 | 被 R2 拉低至接近 GND | 导通 | ON |

#### 三项关键设计决策

1. **EL817 光耦隔离**：Jetson GND ≠ 电源 GND，消除地环路噪声，保护主控。
2. **P-MOS 高边开关**：负载接地端固定，比 N-MOS 低边更安全，避免负载误触地。
3. **恒流驱动器**：抑制 12V 电压波动对 LED 亮度的影响，确保 OOK 调制信号质量。

#### 迭代历史

**v1.0** — NMOS 直驱：原型验证，共地问题，电流不稳定
**v2.0** — 加入恒流驱动：散热不足，大功率热衰减
**v3.0** — EL817 + P-MOS + CC 驱动 ✅ 定型

## 关键参数

| 参数 | 10W 支路 | 3.3W 支路 |
|------|---------|----------|
| 工作电流 | ~700mA | ~350mA |
| 占空比 | 50%（OOK）| 50%（OOK）|
| 散热方案 | 铝基板 + 风扇 | 被动散热 |

## LED 闪烁控制

OOK 调制下的 LED 控制时序：

```
     1  0  1  1  0  0  1
    ┌┐  ┌┐     ┌┐     ┌┐
LED ││  ││     ││     ││
    └┘  └┘     └┘     └┘
   ┌──────────────────────┐
Tx │                      │
   └──────────────────────┘

Data: bit=1 → LED ON, bit=0 → LED OFF
```

## 双路切换逻辑

```python
def select_power_branch(distance: float, channel_quality: float) -> str:
    """选择功率支路"""
    if distance > 2.0 or channel_quality < 0.5:
        return "10W"   # 远距离或信道差用大功率
    else:
        return "3.3W"  # 近距离用小功率省电
```
