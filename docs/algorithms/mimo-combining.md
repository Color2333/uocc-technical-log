# MIMO 空间分集合并

> *MIMO Spatial Diversity Combining*
>
> **最后更新**：2026-03-20 | 状态：🔄 EGC 理论研究完成，调参进行中

---

## 一、背景

单接收器 MIMO 系统利用**空间分集**对抗多径衰落。双目相机两个接收分支可以分别接收信号，通过合并策略获得分集增益。

**关键参考**：Takada et al., "Spatial Diversity Combining for Underwater Optical Camera Communication", 2024

---

## 二、三种合并策略

### EGC（等增益合并）

```
r_EGC = Σ w_i × r_i  （|w_i| = 1, 相位对齐）
```

所有分支等权重相加，相位对齐后叠加。

**优点**：实现简单，无需估计信道状态信息（CSI）
**缺点**：不如 MRC 高效，弱分支也等权参与

**研究状态**：✅ 理论研究完成（Takada 2024）

### SC（选择性合并）

```
选择 SNR 最高的分支作为输出：

r_SC = r_k  其中 k = argmax(SNR_i)
```

始终选择信号质量最好的单分支。

**优点**：实现最简单，只需选择器
**缺点**：浪费了其他分支的分集增益

### MRC（最大比合并）

```
最优合并，各分支按 SNR 加权：

r_MRC = Σ (SNR_i / Σ SNR_j) × r_i
```

按信噪比加权，信噪比高的分支权重更大。

**优点**：理论最优，分集增益最大
**缺点**：需要准确估计各分支 SNR（信道估计）

---

## 三、算法对比

| 策略 | 计算复杂度 | SNR 增益 | 信道估计 | 实现难度 |
|------|----------|---------|---------|---------|
| EGC | 低 | 中等 | 不需要 | 易 |
| SC | 低 | 中等偏低 | 简单（选分支）| 最易 |
| MRC | 高 | 最优 | 需要（精确加权）| 难 |

---

## 四、Takada 2024 关键内容

**论文**：Takada et al., "Spatial Diversity Combining for Underwater Optical Camera Communication", IEEE 2024

### 主要贡献

- 在 OCC（光学相机通信）场景下验证了 EGC/SC/MRC 的实际表现
- 发现在 **轻度浑浊水体** 中 EGC 性能接近 MRC（差距 < 1dB）
- **双目间距** 是关键参数：间距 > 5cm 时空间相关性降低，分集增益显著

### 关键结论

1. EGC 在水下 OCC 场景下是**性价比最高**的方案（无需 CSI + 增益接近 MRC）
2. 浑浊度增加时，EGC 分集增益从 2dB 提升至 4dB（相对单分支）
3. 双目相机天然适合 EGC：两路图像可独立解调后叠加

---

## 五、双目相机 EGC 实现方案

```diagram
type: flow
title: 双目相机 EGC 等增益合并

nodes:
  - stereo: 双目相机
  - left_img: 左图像
  - right_img: 右图像
  - left_demod: OOK解调(软判决)
  - right_demod: OOK解调(软判决)
  - egc: 等增益叠加
  - decision: 联合判决
  - output: 比特输出

edges:
  - stereo --> left_img
  - stereo --> right_img
  - left_img --> left_demod
  - right_img --> right_demod
  - left_demod --> egc
  - right_demod --> egc
  - egc --> decision
  - decision --> output
```

**关键点**：EGC 需要在**软判决**（soft decision）层合并，而非硬判决后合并。

---

## 六、仿真框架

```
mimo/
├── egc.py          # 等增益合并
├── sc.py           # 选择性合并
├── mrc.py          # 最大比合并
├── channel.py      # 水下信道模型（Rayleigh 衰落 + 散射）
└── simulation.py   # 仿真主程序（三策略 BER 对比）
```

### 仿真参数（当前设置）

| 参数 | 值 | 来源 |
|------|---|------|
| 信道模型 | Rayleigh 衰落 | 标准水下 OCC 模型 |
| 基带速率 | 10 kbps | 系统设计目标 |
| 双目间距 | 10 cm | 相机规格 |
| 仿真距离 | 3 m | 目标通信距离 |
| 浑浊度范围 | 0 - 50 NTU | 牛奶水箱 |

---

## 七、进展与计划

| 任务 | 状态 | 截止 |
|------|------|------|
| EGC 理论研究（Takada 2024）| ✅ 完成 | 2026-03-13 |
| EGC/SC/MRC 框架搭建 | ✅ 完成 | 2026-03-13 |
| 信道模型完善 | 🔄 进行中 | 2026-03-30 |
| 三策略 BER 对比仿真 | 🔄 调参中 | 2026-04-07 |
| 硬件双目实验验证 | ○ 待开始 | 2026-04-14 |

---

## 八、实现代码

```python
def egc_combine(signals: list[np.ndarray]) -> np.ndarray:
    """等增益合并 — 软判决层叠加"""
    combined = np.zeros_like(signals[0], dtype=float)
    for sig in signals:
        combined += sig / len(signals)
    return combined

def sc_combine(signals: list[np.ndarray], snrs: list[float]) -> np.ndarray:
    """选择性合并 — 选 SNR 最高的分支"""
    best_idx = np.argmax(snrs)
    return signals[best_idx]

def mrc_combine(signals: list[np.ndarray], snrs: list[float]) -> np.ndarray:
    """最大比合并 — 按 SNR 加权"""
    total_snr = sum(snrs)
    if total_snr == 0:
        return egc_combine(signals)
    weights = [s / total_snr for s in snrs]
    combined = np.zeros_like(signals[0], dtype=float)
    for sig, w in zip(signals, weights):
        combined += w * sig
    return combined
```
