# ISO 增益自适应控制

> *Adaptive ISO Gain Control — 基于 Matus 2020 复现 + 改进*

## 参考论文

Matus, V. et al. "Adaptive Gain Control for Underwater Optical Communication", 2020

---

## 一、基础算法（Matus 2020 复现）

### 核心思想

接收信号强度（RSSI）反馈调节接收端 ISO 增益，形成闭环控制。

```diagram
type: flow
title: ISO 增益自适应控制

nodes:
  - rssi_t: 设定目标 RSSI_target
  - measure: 测量当前 RSSI_current
  - error: 计算误差 e = RSSI_t - RSSI_c
  - delta: ΔGain = Kp × e
  - iso_new: ISO_new = ISO_old + ΔGain
  - loop: 等待下一帧，循环

edges:
  - rssi_t --> measure
  - measure --> error
  - error --> delta
  - delta --> iso_new
  - iso_new --> loop
  - loop --> measure
```

### 算法参数

| 参数 | 符号 | 典型值 |
|------|------|-------|
| 目标 RSSI | RSSI_target | 可配置（0.5~0.8 归一化）|
| 比例增益 | Kp | 0.1 - 0.5 |
| 帧间隔 | T_frame | 33ms (30fps) |
| ISO 范围 | [ISO_min, ISO_max] | [50, 3200] |

### 基础实现

```python
class AdaptiveISOController:
    def __init__(self, target_rssi: float, kp: float = 0.3):
        self.target = target_rssi
        self.kp = kp
        self.current_gain = 100  # 初始ISO

    def update(self, current_rssi: float) -> float:
        error = self.target - current_rssi
        delta = self.kp * error
        self.current_gain += delta
        self.current_gain = np.clip(self.current_gain, 50, 3200)
        return self.current_gain
```

### 仿真结果（已完成 ✅）

| 指标 | 结果 |
|------|------|
| 收敛时间 | ~15 帧 |
| 稳态误差 | < 5% |
| 适用场景 | 轻度浑浊、慢变信道 |

---

## 二、改进算法（2026-02）

> **基于对基础算法局限性的分析，引入三项改进：EMA 平滑、自适应学习率、动量项。**

### 2.1 EMA 平滑（指数移动平均）

**问题**：原始 RSSI 帧间噪声大，直接用来计算误差会导致增益剧烈抖动。

**解决**：对 RSSI 做指数移动平均（EMA）：

```
RSSI_ema[t] = β × RSSI_ema[t-1] + (1-β) × RSSI_current[t]
```

| 参数 | 典型值 | 说明 |
|------|-------|------|
| β（平滑系数）| 0.7 | 越大越平滑，但响应越慢 |
| 初始值 | RSSI_target | 避免冷启动振荡 |

```python
class AdaptiveISOController:
    def __init__(self, target_rssi: float, kp: float = 0.3, beta: float = 0.7):
        self.target = target_rssi
        self.kp = kp
        self.beta = beta
        self.rssi_ema = target_rssi  # 初始值设为目标
        self.current_gain = 100

    def update(self, current_rssi: float) -> float:
        # EMA 平滑
        self.rssi_ema = self.beta * self.rssi_ema + (1 - self.beta) * current_rssi
        error = self.target - self.rssi_ema
        ...
```

### 2.2 自适应学习率

**问题**：固定 Kp 在误差大时收敛慢，误差小时易振荡。

**解决**：Kp 随误差大小自适应调整：

```
Kp_adaptive = Kp_base × (1 + γ × |error|)
```

误差越大，学习率越高，收敛更快；误差小时接近固定 Kp，稳态更稳。

| 参数 | 典型值 | 说明 |
|------|-------|------|
| Kp_base | 0.2 | 基础学习率 |
| γ（放大系数）| 0.5 | 自适应强度 |

### 2.3 动量项

**问题**：无动量时，增益更新每帧独立，遇到突变信号时响应迟滞。

**解决**：加入动量，使当前帧更新受上一帧方向惯性影响：

```
velocity[t] = μ × velocity[t-1] + Kp × error[t]
ISO_new = ISO_old + velocity[t]
```

| 参数 | 典型值 | 说明 |
|------|-------|------|
| μ（动量系数）| 0.3 | 越大惯性越强，过大会超调 |

### 改进版完整实现

```python
class ImprovedAdaptiveISO:
    def __init__(
        self,
        target_rssi: float = 0.6,
        kp_base: float = 0.2,
        beta: float = 0.7,
        gamma: float = 0.5,
        momentum: float = 0.3,
    ):
        self.target = target_rssi
        self.kp_base = kp_base
        self.beta = beta
        self.gamma = gamma
        self.momentum = momentum

        self.rssi_ema = target_rssi
        self.current_gain = 100.0
        self.velocity = 0.0

    def update(self, current_rssi: float) -> float:
        # 1. EMA 平滑
        self.rssi_ema = self.beta * self.rssi_ema + (1 - self.beta) * current_rssi

        # 2. 误差计算
        error = self.target - self.rssi_ema

        # 3. 自适应学习率
        kp = self.kp_base * (1 + self.gamma * abs(error))

        # 4. 动量更新
        self.velocity = self.momentum * self.velocity + kp * error

        # 5. 增益更新
        self.current_gain += self.velocity
        self.current_gain = np.clip(self.current_gain, 50, 3200)

        return self.current_gain
```

### 改进效果对比

| 指标 | 基础算法 | 改进算法 |
|------|---------|---------|
| 收敛时间 | ~15 帧 | ~8 帧 |
| 稳态振荡幅度 | ±8% | ±3% |
| 突变响应速度 | 慢（固定 Kp）| 快（自适应 Kp）|
| 帧间抖动 | 大 | 小（EMA 平滑）|

---

## 三、实际相机增益实验（2026-03-20）

> 验证不同 gain 设置下的图像效果，指导算法参数选择。

### 实验参数

| 实验组 | Gain 值 | 对应 ISO 近似 | 场景 |
|--------|---------|-------------|------|
| Group A | 0 | ~100 | 正常光照 |
| Group B | 62 | ~400 | 中度增益 |
| Group C | 75 | ~600 | 高增益 |

### 初步观察

- **Gain=0**：图像噪声低，动态范围正常，适合清水/强信号
- **Gain=62**：亮度提升明显，噪声开始增加，适合轻度浑浊
- **Gain=75**：高噪声，但弱光下信号可辨识，适合中度浑浊

### 后续计划

- [ ] 在水箱环境中重复实验（清水 / 5 NTU / 20 NTU）
- [ ] 量化不同 gain 下的 SNR 和 BER 关系
- [ ] 基于实测数据调整自适应算法的 STATE_PARAMS 映射

---

## 四、局限性与下一步

**单一 ISO 增益的局限**：无法覆盖从清水到重度浑浊的宽动态范围。

**解决方案**：引入阻尼多状态机，将曝光时间 + ISO 联合控制。参见 [阻尼多状态机](./damped-state-machine.md)
