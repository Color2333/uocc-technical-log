# UOCC: 水下光学相机通信系统

> *Underwater Optical Camera Communication System*

## 系统概览

### 研究背景与问题

现有水下光学通信系统普遍采用**固定参数设计**——发射功率、调制参数、接收增益在通信建立后保持不变。这一设计在实验室清水环境下运行良好，但在真实水下环境中会面临：

- **水体浑浊度动态变化**（浮游生物、泥沙再悬浮）
- **光源与相机之间距离变化**（水下设备漂移）
- **背景光干扰波动**（水面折射光、人工光源）

固定参数系统无法应对上述动态因素，导致**通信中断或误码率急剧上升**。

### 核心问题

> 如何在浑浊动态水下环境中实现具备"感知-反馈"闭环的自适应光学通信？

### 解决方案

本系统构建三级自适应机制：

```diagram
type: flow
title: 自适应控制闭环

nodes:
  - sense: 感知层 (相机)
  - algo: 算法层 (自适应控制算法)
  - exec: 执行层 (LED/增益)
  - feedback: 反馈 (信道质量)
  - loop: 感知层 (重新感知)

edges:
  - sense --> algo
  - algo --> exec
  - exec --> feedback
  - feedback --> loop
  - loop --> sense
```

### 主要研究内容

| 模块 | 描述 |
|------|------|
| **硬件平台** | LED发射端、接收端双目相机、Jetson Orin NX |
| **调制解调** | OOK调制解调、4B6B RLL编码 |
| **自适应控制** | ISO增益优化、阻尼多状态机 |
| **空间分集** | MIMO合并（EGC/SC/MRC）|
| **CUDA加速** | GPU并行化解调算法 |

### 系统架构

```diagram
type: arch
title: UOCC 系统整体架构

containers:
  - id: tx
    label: 发射端
    children:
      - utf8: UTF-8 文字编码
      - ook_tx: OOK 调制
      - rll: RLL 4B6B 编码
      - led: LED 驱动 (10W+3.3W)
      - led_hp: 大功率 LED
      - led_lp: 低功率 LED

  - id: channel
    label: 水下信道
    children:
      - water: 光信号传播

  - id: rx
    label: 接收端
    children:
      - camera: 双目相机
      - adapt: 增益自适应
      - ook_rx: OOK 解调
      - mimo: MIMO 合并
      - rll_dec: RLL 解码
      - output: 文字输出
      - jetson: Jetson Orin NX (CUDA)

edges:
  - utf8 --> ook_tx
  - ook_tx --> rll
  - rll --> led
  - led --> led_hp
  - led --> led_lp
  - led_hp --> water
  - led_lp --> water
  - water --> camera
  - camera --> adapt
  - adapt --> ook_rx
  - ook_rx --> mimo
  - mimo --> rll_dec
  - rll_dec --> output
  - mimo --> jetson
```

---

## 快速导航

- [算法模块](../algorithms/) — OOK调制、RLL编码、自适应控制、MIMO合并
- [系统架构](../architecture/) — 发射端、接收端、CUDA加速
- [实验记录](../experiments/) — 空气信道、清水信道、浑浊水信道
- [进度追踪](../timeline/) — 里程碑、优先级
- [设计演进](../design/) — LED驱动迭代、算法迭代

---

*本文档随项目进展持续更新*
