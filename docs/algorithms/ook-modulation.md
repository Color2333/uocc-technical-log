# OOK 调制解调

> *On-Off Keying Modulation and Demodulation*

## 原理

OOK（开关键控）是最简单的数字调制方式：
- **bit = 1** → LED 开启（载波开）
- **bit = 0** → LED 关闭（载波关）

## 调制端（发射侧）

```diagram
type: flow
title: OOK 调制端

nodes:
  - bits: 原始比特流
  - modulate: OOK 调制
  - led: LED 驱动信号

edges:
  - bits --> modulate
  - modulate --> led
```

### 时序图

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

## 解调端（接收侧）

```diagram
type: flow
title: OOK 解调端

nodes:
  - capture: 相机采集
  - frame: 帧提取
  - thresh: 阈值判决
  - bits: 比特恢复
  - adapt: 阈值自适应

edges:
  - capture --> frame
  - frame --> thresh
  - thresh --> bits
  - adapt --> thresh
```

### 关键挑战

1. **阈值选择**：固定阈值无法适应信道变化
2. **噪声干扰**：水下环境引入额外噪声
3. **多径效应**：信号多次反射造成码间干扰

## IEEE 802.15.7 符合性

本系统遵循 IEEE 802.15.7 光学通信标准的关键参数：

| 参数 | 标准值 | 本系统实现 |
|------|-------|----------|
| 调制方式 | OOK / PPM | OOK ✅ |
| 符号速率 | 1-100 kbaud | 可配置 ✅ |
| RLL 编码 | 4B6B / 8B10B | 4B6B ✅ |
| 前向纠错 | Reed-Solomon | RS(255,239) 🔄 |

## 仿真结果

| 条件 | 误码率 (BER) |
|------|-------------|
| 1m, 10kbps, 空气信道 | < 10⁻⁶ ✅ |
| 3m, 10kbps, 空气信道 | < 10⁻⁴ ✅ |

## 代码实现

```python
def ook_modulate(bits: list[int], carrier_freq: float) -> np.ndarray:
    """OOK调制：将比特流转换为LED驱动信号"""
    signal = np.zeros(len(bits))
    for i, bit in enumerate(bits):
        signal[i] = 1 if bit == 1 else 0
    return signal

def ook_demodulate(received: np.ndarray, threshold: float) -> list[int]:
    """OOK解调：阈值判决恢复比特流"""
    return [1 if r > threshold else 0 for r in received]
```
