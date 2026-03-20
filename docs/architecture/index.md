# 系统架构总览

## 整体组成

```diagram
type: arch
title: 系统架构 — 发射端与接收端

containers:
  - id: tx
    label: 发射端
    children:
      - utf8: UTF-8 文字编码
      - ook_tx: OOK 调制
      - rll: RLL 4B6B
      - led: LED 驱动 (10W+3.3W)
      - led_hp: 大功率 LED
      - led_lp: 低功率 LED

  - id: channel
    label: 水下信道

  - id: rx
    label: 接收端
    children:
      - camera: 双目相机
      - adapt: 增益自适应
      - ook_rx: OOK 解调
      - mimo: MIMO 合并
      - rll_dec: RLL 解码
      - output: 文字输出
      - jetson: Jetson Orin NX

edges:
  - utf8 --> ook_tx
  - ook_tx --> rll
  - rll --> led
  - led --> led_hp
  - led --> led_lp
  - led_hp --> channel
  - led_lp --> channel
  - channel --> camera
  - camera --> adapt
  - adapt --> ook_rx
  - ook_rx --> mimo
  - mimo --> rll_dec
  - rll_dec --> output
```

## 子模块

| 模块 | 页面 |
|------|------|
| [发射端设计](./transmitter.md) | LED驱动、OOK调制 |
| [接收端设计](./receiver.md) | 双目相机、自适应增益 |
| [CUDA加速](./cuda-acceleration.md) | GPU并行化 |

## 信号流

```diagram
type: flow
title: 端到端信号流

nodes:
  - text_in: 文字输入
  - utf8: UTF-8 编码
  - ook_tx: OOK 调制
  - rll_enc: RLL 编码
  - led: LED 驱动
  - light: 光信号
  - camera: 相机采集
  - ook_rx: OOK 解调
  - rll_dec: RLL 解码
  - mimo: MIMO 合并
  - text_out: 文字输出

edges:
  - text_in --> utf8
  - utf8 --> ook_tx
  - ook_tx --> rll_enc
  - rll_enc --> led
  - led --> light
  - light --> camera
  - camera --> ook_rx
  - ook_rx --> rll_dec
  - rll_dec --> mimo
  - mimo --> text_out
```
