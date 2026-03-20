# 接收端设计

## 硬件组成

| 组件 | 规格 | 状态 |
|------|------|------|
| Jetson Orin NX | 8GB | ✅ 基本环境搭建 |
| 双目相机 | 待定型号 | ✅ 选型完成 |
| CUDA | 11.4+ | 🔄 环境配置中 |

## 信号处理链路

```diagram
type: flow
title: 接收端信号处理链路

nodes:
  - capture: 相机采集
  - frame: 帧提取
  - adapt: 增益自适应
  - ook: OOK解调
  - rll: RLL解码
  - mimo: MIMO合并
  - output: 比特流

edges:
  - capture --> frame
  - frame --> adapt
  - adapt --> ook
  - ook --> rll
  - rll --> mimo
  - mimo --> output
```

## 自适应增益控制

接收端核心功能：根据信道状态动态调整 ISO 增益和曝光时间。

详见：[阻尼多状态机](../algorithms/damped-state-machine.md)

## 双目相机同步

**硬件同步方案**：用硬件 trigger 同步两路相机曝光。

**软件同步方案**：如果同步误差 < 1 符号周期，可以在 MIMO 合并时做时域对齐。

## 硬件选型注意事项

Q: 双目相机同步问题？

A: 
- 硬件同步：用硬件 trigger 同步两路相机曝光
- 软件同步：如果同步误差 < 1 符号周期，可以在 MIMO 合并时做时域对齐
