# 接收端设计

> *Jetson Orin NX + 双目相机 + CUDA 并行化解调*
>
> **最后更新**：2026-03-27 | 状态：🔄 框架完成，室内实验进行中

---

## 1. 硬件平台

### 1.1 核心计算单元：Jetson Orin NX

| 项目 | 规格 |
|------|------|
| **型号** | NVIDIA Jetson Orin NX 8GB |
| **GPU** | NVIDIA Ampere架构，1024 CUDA 核心 |
| **AI 性能** | 34 TOPS (INT8) |
| **显存** | 8GB LPDDR5 |
| **CUDA 版本** | 11.4+ |
| **接口** | USB 3.2 × 4, CSI-2 × 4（支持双目相机） |
| **功耗** | 7.5W - 15W（动态调频） |

**选型理由**：
- 体积小（100×87×35mm），适合水下设备集成
- GPU 加速单元可并行处理双路图像流
- CSI-2 接口直连双目相机，无 USB 带宽瓶颈
- 功耗可控，支持水下电池供电场景

### 1.2 双目相机

| 项目 | 规格 | 状态 |
|------|------|------|
| **型号** | 星光海康相机 / 思特威 Stereo（待定） | 🔄 选型中 |
| **分辨率** | 1280×720 @ 60fps（目标） | — |
| **感光元件** | Sony IMX462 / 思特威 SC2210 | — |
| **基线距离** | 10 cm（参考 Takada 2024：> 5cm 获得显著分集增益）| — |
| **镜头焦距** | 4mm（目标 FOV 覆盖 3m 距离）| — |
| **接口** | MIPI CSI-2 | — |

**双目间距设计依据**：
- Takada 2024 论文指出：基线距离 > 5cm 时，两路信号空间相关性降低，分集增益显著
- 10cm 基线是当前选型的初步设计值，待室内标定实验后调整
- 基线过大会降低两路信号的相关性（好），但也会增大设备体积（坏）

### 1.3 硬件同步方案

```
       ┌─────────────────┐
       │  Jetson GPIO    │
       │  (外部触发信号)  │
       └────────┬────────┘
                │ Hardware Trigger (3.3V PWM)
        ┌───────┴───────┐
        │               │
   ┌────┴────┐    ┌────┴────┐
   │ 左相机   │    │ 右相机   │
   │ 曝光    │    │ 曝光     │
   └─────────┘    └─────────┘
```

**硬件 trigger 模式**：
- Jetson GPIO 输出 PWM 触发信号（3.3V）
- 触发相机曝光，精度 ±0.1ms
- 两路相机共享同一触发信号，实现同步曝光
- 符号周期为 100μs（10kbps），±0.1ms 同步误差 ≈ 1% 符号周期，满足要求

**触发时序参数**：

| 参数 | 值 | 说明 |
|------|---|------|
| 触发频率 | 60 Hz | 每秒 60 帧 |
| PWM 脉宽 | 1μs | 最小有效触发脉宽 |
| 触发延迟 | < 0.1ms | 硬件延迟 |
| 双目触发偏移 | < 0.1ms | 共享同一信号源 |

---

## 2. 信号处理链路

### 2.1 完整数据流

```diagram
type: flow
title: 接收端完整信号处理链路

nodes:
  - capture: 双目相机
    同步采集
  - roi: ROI 提取
    定位 LED 区域
  - rssi: RSSI 测量
    信号强度估计
  - iso: ISO 自适应
    增益闭环控制
  - thresh: 阈值判决
    OOK 软/硬判决
  - egc: EGC 等增益
    双目信号合并
  - rll: RLL 4B6B 解码
    直流平衡恢复
  - utf8: UTF-8 解码
    文字还原
  - output: 比特流/文字输出

edges:
  - capture --> roi
  - roi --> rssi
  - rssi --> iso
  - iso --> thresh
  - thresh --> egc
  - egc --> rll
  - rll --> utf8
  - utf8 --> output
```

**每帧延迟预算**（目标 60fps → 16.67ms/帧）：

| 阶段 | 目标延迟 | CPU/GPU |
|------|---------|---------|
| ROI 提取 | 2ms | CPU |
| RSSI 测量 | 0.5ms | CPU |
| ISO 自适应 | 0.2ms | CPU |
| OOK 阈值判决 | 3ms | GPU |
| EGC 合并 | 1ms | GPU |
| RLL 解码 | 1ms | GPU |
| **总计** | **~7.7ms** | — |

---

## 3. 帧提取与 ROI 定位

### 3.1 问题背景

水面/水下场景的背景光复杂（阳光折射、水面波光粼粼），直接对全帧图像做处理会引入大量噪声。必须先定位 LED 光斑所在的感兴趣区域（Region of Interest，ROI）。

### 3.2 ROI 提取算法

**步骤一：背景建模**

```python
def build_background(frames: list[np.ndarray], alpha: float = 0.95) -> np.ndarray:
    """移动平均背景建模"""
    bg = frames[0].astype(float)
    for frame in frames[1:]:
        bg = alpha * bg + (1 - alpha) * frame.astype(float)
    return bg.astype(np.uint8)
```

**步骤二：差分检测**

```python
def detect_led_region(frame: np.ndarray, bg: np.ndarray,
                       diff_thresh: int = 50) -> tuple[int, int, int, int]:
    """帧差法检测 LED 光斑位置"""
    diff = cv2.absdiff(frame, bg)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, diff_thresh, 255, cv2.THRESH_BINARY)

    # 找最大连通域
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL,
                                    cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return 0, 0, frame.shape[1], frame.shape[0]  # 全帧

    largest = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(largest)

    # 扩展边界（留余量）
    margin = 10
    x = max(0, x - margin)
    y = max(0, y - margin)
    w = min(frame.shape[1] - x, w + 2 * margin)
    h = min(frame.shape[0] - y, h + 2 * margin)
    return x, y, w, h
```

**步骤三：跟踪（卡尔曼滤波）**

```python
def kalman_predict(kf: cv2.KalmanFilter) -> tuple[int, int]:
    """预测下一帧 ROI 位置（加速搜索）"""
    return kf.predict()

def kalman_update(kf: cv2.KalmanFilter, measurement: tuple[int, int]):
    """用观测值更新卡尔曼滤波器"""
    kf.correct(np.array(measurement, dtype=np.float32))
```

### 3.3 ROI 提取效果指标

| 指标 | 目标值 | 实测值 |
|------|--------|--------|
| 检测成功率 | > 95%（清水环境）| 待实验 |
| 平均处理时间 | < 2ms（720p）| 待实验 |
| 背景更新频率 | 每 30 帧 | 可配置 |
| 光斑定位精度 | ±2 pixels | 待标定 |

---

## 4. 自适应增益控制

### 4.1 控制目标

维持接收信号强度（RSSI）在目标区间，避免：
- **过曝**：ISO 过高 → 图像饱和 → 无法解调
- **欠曝**：ISO 过低 → 信噪比差 → 误码率高

### 4.2 双层控制架构

```diagram
type: flow
title: 双层自适应增益控制架构

nodes:
  - rssi_raw: 原始 RSSI
    (帧平均灰度值)
  - ema: EMA 平滑
    (去除帧间抖动)
  - damped: 阻尼多状态机
    (α = 0.3-0.7)
  - iso_ctl: ISO 增益控制器
    (Kp = 0.3)
  - camera: 相机参数更新
    (ISO / 曝光时间)

edges:
  - rssi_raw --> ema
  - ema --> damped
  - damped --> iso_ctl
  - iso_ctl --> camera
  - camera --> rssi_raw
```

**参数配置**：

| 参数 | 符号 | 典型值 | 调优范围 |
|------|------|--------|---------|
| 目标 RSSI | RSSI_target | 0.6（归一化）| 0.4 - 0.8 |
| 比例增益 | Kp | 0.3 | 0.1 - 0.5 |
| 阻尼因子 | α | 0.5 | 0.3 - 0.7 |
| EMA 平滑系数 | β | 0.8 | — |
| ISO 范围 | [ISO_min, ISO_max] | [50, 12800] | — |

详见：[ISO 增益自适应控制](../algorithms/adaptive-iso.md) 和 [阻尼多状态机](../algorithms/damped-state-machine.md)

### 4.3 阻尼多状态机决策逻辑

```python
# 伪代码描述（完整实现见 damped-state-machine.md）
class DampedStateMachine:
    def decide_action(self, error: float, state: str) -> tuple[str, float]:
        """
        根据误差和当前状态，决定 ISO 调整量
        状态：STABLE / ADJUSTING / OSCILLATING / SATURATED
        """
        if abs(error) < self.stable_thresh:
            return ("STABLE", 0.0)  # 不调整

        if self.is_oscillating(error):
            # 检测到震荡 → 增大阻尼
            alpha = min(self.alpha * 1.2, 0.9)
            return ("OSCILLATING", self.compute_damped_delta(error, alpha))

        # 正常调整
        return ("ADJUSTING", self.compute_damped_delta(error, self.alpha))
```

---

## 5. OOK 解调算法

### 5.1 硬判决 vs 软判决

**硬判决**：每个像素直接判为 0 或 1，计算简单但丢失置信度信息。

**软判决**：每个像素输出连续值（像素灰度），用于 EGC 合并后再判决。

本系统采用 **软判决 → EGC 合并 → 硬判决** 的链路。

### 5.2 阈值自适应

```python
class OOKDemodulator:
    def __init__(self, symbol_rate: int = 10000):
        self.symbol_rate = symbol_rate
        self.samples_per_symbol = 10  # 每符号 10 个采样点（100kHz 采样）
        self.threshold = None

    def compute_threshold(self, roi_frame: np.ndarray) -> float:
        """基于直方图的双峰阈值"""
        gray = cv2.cvtColor(roi_frame, cv2.COLOR_BGR2GRAY)
        # Otsu's method 自动阈值
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return float(thresh)

    def demodulate(self, roi_frame: np.ndarray) -> np.ndarray:
        """将 ROI 区域积分得到比特流"""
        threshold = self.compute_threshold(roi_frame)
        gray = cv2.cvtColor(roi_frame, cv2.COLOR_BGR2GRAY).astype(float)

        # 按符号周期积分
        symbol_width = gray.shape[1] // self.samples_per_symbol
        bits = []
        for i in range(self.samples_per_symbol):
            col_start = i * symbol_width
            col_end = (i + 1) * symbol_width
            symbol_energy = gray[:, col_start:col_end].mean()
            bits.append(1 if symbol_energy > threshold else 0)

        return np.array(bits)

    def soft_demodulate(self, roi_frame: np.ndarray) -> np.ndarray:
        """软判决：输出归一化置信度 [0, 1]"""
        threshold = self.compute_threshold(roi_frame)
        gray = cv2.cvtColor(roi_frame, cv2.COLOR_BGR2GRAY).astype(float)
        symbol_width = gray.shape[1] // self.samples_per_symbol
        soft_bits = []
        for i in range(self.samples_per_symbol):
            col_start = i * symbol_width
            col_end = (i + 1) * symbol_width
            symbol_energy = gray[:, col_start:col_end].mean()
            # 归一化到 [0, 1]
            normalized = np.clip((symbol_energy / threshold), 0, 2)
            soft_bits.append(normalized / 2.0)  # 0.5 = 判决边界
        return np.array(soft_bits)
```

### 5.3 解调性能指标

| 指标 | 目标 | 测试条件 |
|------|------|---------|
| 硬判决 BER | < 10⁻³ | 3m 清水信道，10kbps |
| 软判决 + EGC BER | < 10⁻⁴ | 3m 清水信道，10kbps |
| 解调延迟 | < 3ms/帧 | 720p ROI |
| 支持符号速率 | 1 - 100 kbps | 可配置 |

---

## 6. 双目相机同步

### 6.1 硬件同步（推荐）

**原理**：Jetson GPIO 输出同一路 PWM 触发信号到两个相机的 trigger 接口，两路相机在收到触发信号后同时曝光。

```
Jetson GPIO (PIN 13)
       │
       │ 3.3V PWM @ 60Hz
       │
  ┌────┴────┐
  │         │
┌─┴───┐ ┌───└─┐
│CAM_L│ │CAM_R│
│曝光  │ │曝光  │
└─────┘ └─────┘
  ↑         ↑
  └────┬────┘
   同步误差 < 0.1ms
```

**优点**：同步精度高，不依赖软件
**缺点**：需要硬件 trigger 接口的相机

### 6.2 软件同步（备选）

若相机不支持硬件 trigger，则采用软件同步：

```python
def software_sync(left_frame: np.ndarray, right_frame: np.ndarray,
                  timestamp_l: float, timestamp_r: float) -> tuple[np.ndarray, np.ndarray]:
    """
    时间戳对齐：找到最近的左右帧配对
    容忍同步误差 < 1 符号周期（100μs）
    """
    if abs(timestamp_l - timestamp_r) < 0.0001:  # 0.1ms
        return left_frame, right_frame

    # 否则丢弃时间戳更远的那帧
    if timestamp_l > timestamp_r:
        return left_frame, None  # 右帧丢弃，等待下一帧
    else:
        return None, right_frame  # 左帧丢弃
```

### 6.3 时序约束分析

| 参数 | 值 | 说明 |
|------|---|------|
| 帧率 | 60 fps | 每帧 16.67ms |
| 符号周期 | 100μs | 10kbps |
| 触发同步误差 | < 0.1ms | 硬件 trigger 精度 |
| 允许同步误差 | < 1 符号周期 | EGC 合并要求 |
| **是否满足** | ✅ 是 | 0.1ms << 100μs（实际 1 符号 = 100μs，0.1ms = 1/10 符号周期）|

---

## 7. MIMO 合并（EGC 实现）

### 7.1 为什么选 EGC

| 方案 | 复杂度 | SNR 增益 | 信道估计 | 水下适用性 |
|------|--------|---------|---------|-----------|
| **EGC** | 低 | 中等 | 不需要 | ✅ **最佳选择** |
| SC | 低 | 中低 | 简单 | ⚠️ 浪费分集 |
| MRC | 高 | 最优 | 需要精确 | ❌ 实现复杂 |

**选择 EGC 的理由**（来自 Takada 2024）：
- 水下 OCC 信道不需要精确 CSI → EGC 无需信道估计即可部署
- 轻度浑浊水体中 EGC 性能接近 MRC（差距 < 1dB）
- 浑浊度增加时 EGC 分集增益从 2dB 提升至 4dB

### 7.2 EGC 合并实现

```python
def egc_combine(left_bits: np.ndarray, right_bits: np.ndarray) -> np.ndarray:
    """
    等增益合并 — 软判决层叠加
    left_bits, right_bits: [0.0 - 1.0] 归一化置信度
    """
    assert len(left_bits) == len(right_bits)
    # 逐点相加（等权重）
    combined = (left_bits + right_bits) / 2.0

    # 硬判决
    output = (combined > 0.5).astype(np.uint8)
    return output
```

### 7.3 双目信号相关性实测（待补充）

| 测试场景 | 预期相关性 | 分集增益 |
|---------|-----------|---------|
| 清水 3m | 低相关性 | 约 2dB |
| 轻度浑浊 | 降低相关性 | 约 3dB |
| 重度浑浊 | 高度不相关 | 约 4dB |

详见：[MIMO 空间分集合并](../algorithms/mimo-combining.md)

---

## 8. RLL 4B6B 解码

### 8.1 解码原理

解码是编码的逆过程：
1. 接收 6 位符号流
2. 查表还原为 4 位数据
3. 跟踪 running disparity，必要时反转

### 8.2 解码实现

```python
# 4B6B 解码表（完整 16 项）
DECODE_TABLE = {
    0b001111: (0b0000, +2),
    0b010011: (0b0001,  0),
    0b011001: (0b0010,  0),
    0b011100: (0b0011, +1),
    0b100011: (0b0100,  0),
    0b101001: (0b0101,  0),
    0b101100: (0b0110, +1),
    0b110001: (0b0111,  0),
    0b110010: (0b1000,  0),
    0b110100: (0b1001, +1),
    0b111000: (0b1010, +2),
    0b111001: (0b1011, +3),
    0b111010: (0b1100, +3),
    0b111100: (0b1101, +4),
    0b110110: (0b1110,  0),
    0b110000: (0b1111, -2),
    # 全 0 和全 1 是无效符号，跳过
}

def decode_4b6b(symbols: list[int]) -> list[int]:
    """4B6B 解码"""
    result = []
    running_disparity = 0

    for i in range(0, len(symbols) - 5, 6):
        word = bits_to_int(symbols[i:i + 6])

        # 检查 disparity 是否需要反转
        disp = get_disparity(word)
        if running_disparity + disp > 3:
            word = word ^ 0b111111  # 反转
            disp = -disp

        data_nibble = DECODE_TABLE.get(word)
        if data_nibble is None:
            continue  # 跳过无效符号（帧同步）

        data_bits = int_to_bits(data_nibble[0], 4)
        result.extend(data_bits)
        running_disparity += data_nibble[1]

    return result
```

详见：[RLL 4B6B 编码](../algorithms/rll-encoding.md)

---

## 9. CUDA 加速架构

### 9.1 并行化解调流程

```diagram
type: flow
title: CUDA GPU 并行化解调流水线

nodes:
  - host: CPU 主机端
    ROI 元数据传递
  - cuda_copy: cudaMemcpy
    帧数据上传至 GPU
  - roi_extract: ROI 裁剪 kernel
    并行处理左/右帧
  - rssi_calc: RSSI 计算 kernel
    块级并行归约
  - thresh: 阈值判决 kernel
    每像素独立判决
  - egc_k: EGC 合并 kernel
    双路信号融合
  - rll_k: RLL 解码 kernel
    字级并行
  - cuda_out: cudaMemcpy
    结果回传至主机

edges:
  - host --> cuda_copy
  - cuda_copy --> roi_extract
  - roi_extract --> rssi_calc
  - rssi_calc --> thresh
  - thresh --> egc_k
  - egc_k --> rll_k
  - rll_k --> cuda_out
```

### 9.2 CUDA Kernel 设计

```cpp
// OOK 解调 kernel（伪代码）
__global__
void ook_demod_kernel(
    float* d_frame,     // 输入：ROI 帧数据
    float* d_threshold, // 输入：自适应阈值
    float* d_bits,      // 输出：软判决比特 [0, 1]
    int symbols_per_frame,
    int samples_per_symbol
) {
    int tid = blockIdx.x * blockDim.x + threadIdx.x;
    if (tid >= symbols_per_frame) return;

    // 每线程处理一个符号：积分 → 归一化
    float symbol_sum = 0.0f;
    for (int s = 0; s < samples_per_symbol; s++) {
        int idx = tid * samples_per_symbol + s;
        symbol_sum += d_frame[idx];
    }
    float mean = symbol_sum / samples_per_symbol;
    d_bits[tid] = saturate(mean / (*d_threshold));
}
```

**并行度分析**（Jetson Orin NX 1024 CUDA 核心）：

| Kernel | 线程块大小 | 理论加速比 |
|--------|-----------|-----------|
| ROI 裁剪 | 256 | ~10× vs CPU |
| RSSI 计算 | 512 | ~20× vs CPU |
| OOK 阈值判决 | 512 | ~50× vs CPU |
| EGC 合并 | 512 | ~30× vs CPU |
| RLL 解码 | 256 | ~15× vs CPU |

### 9.3 CUDA 加速计划

| 任务 | 状态 | 目标性能 |
|------|------|---------|
| CUDA 环境配置 | 🔄 进行中 | Jetson Orin NX + CUDA 11.4 |
| OOK 解调核实现 | 🔄 进行中 | < 1ms/帧 |
| EGC 合并核实现 | ○ 待开始 | — |
| RLL 解码核实现 | ○ 待开始 | — |
| CPU-GPU 内存拷贝优化 | ○ 待开始 | < 0.5ms/帧 |

详见：[CUDA 加速](./cuda-acceleration.md)

---

## 10. 性能指标汇总

| 指标 | 目标值 | 当前状态 |
|------|--------|---------|
| **BER（清水 3m）** | < 10⁻³ | 🔄 室内空气信道测试中 |
| **BER（清水 5m）** | < 10⁻² | ○ 待测试 |
| **BER（浑浊水）** | < 10⁻¹ | ○ 待测试 |
| **吞吐量** | > 5 kbps（有效数据）| 🔄 测量中 |
| **端到端延迟** | < 50ms（含解码）| ○ 待测量 |
| **帧处理延迟** | < 8ms（GPU 解调）| ○ 待测量 |
| **功耗** | < 15W（Jetson）| ✅ 规格内 |
| **工作距离** | 3 - 5m（水下）| 🔄 待水下验证 |

---

## 11. 室内实验进展

| 实验 | 状态 | 说明 |
|------|------|------|
| 相机标定（内参+双目基线）| ✅ 完成 | 2026-03-10 |
| 空气信道 BER 测试 | 🔄 进行中 | 目标 < 10⁻⁴ |
| 清水信道（1m）| 🔄 进行中 | 初步结果待记录 |
| 清水信道（3m）| ○ 待开始 | — |
| 轻度浑浊（牛奶）| ○ 待开始 | NTU 10-30 |
| 重度浑浊 | ○ 待开始 | NTU 50+ |
| 双目 EGC 分集增益实测 | ○ 待开始 | — |

---

## 12. 待解决问题

| 问题 | 优先级 | 计划 |
|------|--------|------|
| 双目相机型号选定 | 🔴 P0 | 2026-04-07 前确定 |
| 硬件 trigger 方案验证 | 🔴 P0 | 2026-04-14 前完成 |
| 清水 3m BER 达标 | 🔴 P0 | 2026-04-21 前完成 |
| EGC vs SC 实测对比 | 🟡 P1 | 2026-04-28 |
| 浑浊水实验方案设计 | 🟡 P1 | 2026-05-01 |
| CUDA 全流程加速 | 🟡 P1 | 2026-05-15 |
