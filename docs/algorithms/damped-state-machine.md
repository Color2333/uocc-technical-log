# 阻尼多状态机

> *Damped Multi-State Machine — 曝光+增益联合控制*
>
> **最后更新**：2026-03-20 | 状态：🔄 调参进行中

---

## 一、背景与动机

单一 ISO 增益无法覆盖从清水到重度浑浊的**宽动态范围**：

- **清水**：低 ISO 即可，信噪比高，增益过高引入不必要噪声
- **轻度浑浊**：需要适度增益
- **重度浑浊**：需要高 ISO + 长曝光，但会放大噪声

解决思路：引入**曝光时间**作为第二控制变量，形成四状态机，并加入**阻尼机制**防止状态振荡。

---

## 二、状态机定义

```diagram
type: fsm
title: 阻尼多状态机

nodes:
  - stable: STABLE 稳定态
  - low: LOW 低增益态
  - high: HIGH 高增益态
  - dark: DARK 低光态

edges:
  - stable --> low: e > HIGH
  - stable --> high: e < LOW
  - stable --> dark: e << LOW
  - low --> stable: |e| < thresh
  - high --> stable: |e| < thresh
  - dark --> high: e > thresh
  - low --> high: e << LOW
  - high --> dark: e << LOW
```

### 状态说明

| 状态 | 含义 | ISO | 曝光 | 典型场景 |
|------|------|-----|------|---------|
| STABLE | 稳定态 | 100 | 5ms | 清水，良好信道 |
| LOW | 低增益态 | 200 | 10ms | 轻度浑浊，近距离 |
| HIGH | 高增益态 | 800 | 20ms | 中度浑浊，远距离 |
| DARK | 低光态 | 1600 | 50ms | 重度浑浊，信号极弱 |

---

## 三、状态切换条件

| 当前状态 | 条件 | 切换目标 |
|---------|------|---------|
| STABLE | `RSSI_ema < low_thresh` | HIGH（信号太弱，需增益）|
| STABLE | `RSSI_ema > high_thresh` | LOW（信号太强，降增益）|
| STABLE | `RSSI_ema < dark_thresh` | DARK（极低光态）|
| LOW/HIGH | `\|error\| < stable_thresh` | STABLE |
| HIGH | `RSSI_ema < dark_thresh` | DARK |
| DARK | `RSSI_ema > high_thresh` | HIGH |

> 注：`RSSI_ema` 为经过 EMA 平滑的信号强度，而非原始帧 RSSI。

---

## 四、阻尼机制

状态切换不是瞬间完成，而是带阻尼系数 α：

```
ISO_new      = α × ISO_target      + (1-α) × ISO_old
exposure_new = α × exposure_target + (1-α) × exposure_old
```

α 越小，切换越慢，越不容易振荡。典型值：**α = 0.3**

### α 取值对比

| α 值 | 切换速度 | 振荡风险 | 适用场景 |
|------|---------|---------|---------|
| 0.1 | 慢 | 低 | 慢变信道 |
| 0.3 | 中（推荐）| 中低 | 通用 |
| 0.5 | 快 | 中 | 快变信道 |
| 0.8 | 很快 | 高 | 特殊需求 |

---

## 五、阻尼平滑自动曝光（2026-03 改进版）

> 在基础阻尼状态机基础上，引入 **EMA 平滑 + 自适应学习率 + 动量** 三项改进，形成"阻尼平滑自动曝光算法"。

### 5.1 RSSI EMA 平滑

在计算状态切换误差前，先对 RSSI 做指数移动平均：

```
RSSI_ema[t] = β × RSSI_ema[t-1] + (1-β) × RSSI_raw[t]
```

- β = 0.7 时，EMA 相当于过去约 3 帧的加权平均
- 大幅降低帧间噪声对状态机的干扰，防止因单帧异常触发状态跳变

### 5.2 自适应学习率

状态内的参数微调（不触发状态切换时），使用自适应 Kp：

```
Kp_t = Kp_base × (1 + γ × |error_t|)
```

误差大时 Kp 大，加速收敛；误差小时接近 Kp_base，减少稳态振荡。

### 5.3 动量更新

参数更新带动量，避免连续误差方向不一致时的来回抖动：

```
velocity[t] = μ × velocity[t-1] + Kp_t × error[t]
ISO_new = ISO_old + velocity[t]
```

### 5.4 完整算法流程

```python
class DampedSmoothAutoExposure:
    def __init__(
        self,
        target_rssi: float = 0.6,
        alpha: float = 0.3,   # 状态切换阻尼
        beta: float = 0.7,    # EMA 平滑系数
        kp_base: float = 0.2,
        gamma: float = 0.5,   # 自适应学习率放大
        momentum: float = 0.3,
    ):
        self.target = target_rssi
        self.alpha = alpha
        self.beta = beta
        self.kp_base = kp_base
        self.gamma = gamma
        self.momentum = momentum

        self.rssi_ema = target_rssi
        self.state = "STABLE"
        self.iso = 100.0
        self.exposure = 5.0
        self.velocity = 0.0

    def update(self, rssi_raw: float) -> tuple[float, float]:
        # 1. EMA 平滑
        self.rssi_ema = self.beta * self.rssi_ema + (1 - self.beta) * rssi_raw

        # 2. 状态切换判断（带阻尼）
        new_state = self._check_transition(self.rssi_ema)
        if new_state != self.state:
            self.state = new_state
            target_iso, target_exp = STATE_PARAMS[new_state]
            self.iso = self.alpha * target_iso + (1 - self.alpha) * self.iso
            self.exposure = self.alpha * target_exp + (1 - self.alpha) * self.exposure
        else:
            # 3. 状态内微调（自适应学习率 + 动量）
            error = self.target - self.rssi_ema
            kp = self.kp_base * (1 + self.gamma * abs(error))
            self.velocity = self.momentum * self.velocity + kp * error
            self.iso = np.clip(self.iso + self.velocity, 50, 3200)

        return self.iso, self.exposure
```

---

## 六、参数调优记录

| 日期 | α | β | Kp_base | 结果 |
|------|---|---|---------|------|
| 2026-03-13 | 0.3 | 0.7 | 0.2 | 收敛时间约 12 帧，振荡幅度 ±4% |
| 2026-03-20 | 0.2 | 0.7 | 0.2 | 收敛变慢（约 18 帧），振荡降至 ±2% |
| 待测 | 0.3 | 0.8 | 0.15 | — |

**当前最优参数**（空气信道，gain=62 实验环境）：α=0.3, β=0.7, Kp=0.2

---

## 七、仿真框架

```
mimo/
├── damped_fsm.py       # 阻尼多状态机核心（DampedSmoothAutoExposure）
├── channel.py          # 水下信道模型
└── simulation.py       # 仿真主程序（α/β 扫参）
```

**状态**：✅ 基础框架 + 改进算法完成，🔄 α/β 参数扫参进行中

---

## 八、后续计划

- [ ] 完成 α=0.2/0.3/0.5 仿真对比，确定最优 α
- [ ] 在实际相机 gain 实验（gain=0/62/75）数据上验证
- [ ] 与基础 ISO 自适应算法（Matus 2020）做 BER 对比
- [ ] 硬件联调时验证实际收敛时间
