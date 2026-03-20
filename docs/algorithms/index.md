# 算法模块总览

本目录包含水下光学相机通信系统的核心算法实现。

## 模块列表

| 算法 | 描述 | 状态 |
|------|------|------|
| [OOK 调制解调](./ook-modulation.md) | 开关键控调制与解调基础 | ✅ 完成 |
| [RLL 编码](./rll-encoding.md) | 4B6B 线路编码，直流平衡 | ✅ 完成 |
| [ISO 增益自适应](./adaptive-iso.md) | 基于RSSI反馈的增益控制 | ✅ 仿真完成 |
| [阻尼多状态机](./damped-state-machine.md) | 曝光+增益联合控制状态机 | 🔄 调参中 |
| [MIMO 合并](./mimo-combining.md) | 空间分集合并（EGC/SC/MRC）| 🔄 调参中 |

## 算法层次

```diagram
type: flow
title: 算法层次结构

nodes:
  - adapt: 自适应控制层
  - iso: ISO 增益优化
  - fsm: 阻尼多状态机
  - mimo: 空间分集层 (MIMO)
  - egc: EGC 等增益合并
  - sc: SC 选择性合并
  - mrc: MRC 最大比合并
  - phys: 物理层
  - ook: OOK 调制解调
  - rll: RLL 4B6B 编码

edges:
  - iso --> fsm
  - fsm --> adapt
  - mimo --> egc
  - mimo --> sc
  - mimo --> mrc
  - ook --> phys
  - rll --> phys
```
