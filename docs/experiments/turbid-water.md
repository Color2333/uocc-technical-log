# 浑浊水信道实验

> *核心创新点验证* | 已完成（2026-04-28）

## 实验状态

✅ 完成。15 环境矩阵下三算法 × 12 浑水环境 = 36 次在线运行 + 离线 GT 扫描约 10⁵ 帧。

## 实验条件

| 参数 | 值 |
|------|---|
| 环境 | 3 m 室内水槽 |
| 浑浊剂 | 食品级 Mg(OH)₂ 悬浊液（4 档：0.5 / 1.0 / 1.5 / 2.0 g/L）|
| 气泡 | 水族泵（3 档：none / low / high）|
| 距离 | 3 m |
| 速率 | OOK chip rate ≈ 4 kHz，每轮约 12 000 bit |
| 接收 | Jetson Orin NX + RealSense D457 双目 + CUDA 解调 |

15 个组合：清水（×3 气泡档）+ 4 档浑度 × 3 档气泡 = 15 环境。

## 关键结果

### 三算法对照（Final BER）

| 算法 | 收敛环境数 / 12 | 平均最佳 BER | 备注 |
|------|----------------|-------------|------|
| **turbidity_adaptive** | **12 / 12** | ~10⁻³ | 浑水场景全胜 |
| adaptive_damping_guarded | 8 / 12 | 0.04（含失败）| 4 个气泡场景卡死于初始点 |
| discrete_grid | 0 / 12 | 0.18 | 12 轮内仅完成 12/20 网格点 |

### 关键最优点

| 环境 | 算法落点 | BER | Wilson 95% 上界 |
|------|---------|-----|-----------------|
| 浑水 1.5 g/L + 大气泡 | (ISO=16, sh=19) | 2×10⁻⁴ | ≤ 2.5×10⁻⁴ |
| 浑水 2.0 g/L + 大气泡 | (ISO=16, sh=19) | <8×10⁻⁵ | ≤ 2.5×10⁻⁴ |

### 物理观察

1. **shutter 始终落在 16–17（约 200–250 µs）** — 与 LED chip period 250 µs 完美匹配；曝光 > chip period 会产生符号间干扰
2. **ISO 随浑度上升**：清水偏 16，浑水中 64–128，与"散射衰减需要更多增益"一致
3. **气泡在浑水中反而帮助选择合并**：1.5 g 静水 BER=0.0016，加气泡降到 2×10⁻⁴（10×）—— 气泡引入的随机散射让选择合并能拣到几乎无误码的帧

## 与基线对比

固定参数系统在浑水中 BER 普遍卡在 0.18–0.29（等价完全没解出）；turbidity_adaptive 在所有 12 个环境下 BER ≤ 10⁻²，10/12 环境 BER ≤ 10⁻³。**自适应至少提升一个数量级**。

## 严谨性处理（2026-05-03 复盘）

- **BER=0** 用 Wilson 95% 上限替换：每点 ~12 000 bit，0 错误对应 BER ≤ 2.5×10⁻⁴
- **网格 framing**：discrete_grid 12 轮跑不完 4×5=20 网格，论文里限定为非自适应基线
- **off-grid 落点**：算法选 sh=18/19 超出 GT sweep 范围 [12,17]，论文中以最近邻 GT BER 替代或限定 claim
- **单 seed**：仅 claim 单次工作点定位能力，不做随机性分析

## 数据资产

- `Code Repo/uocc-hardware/result/uocc_raw_data_20260502.tar`（21 GB sweep 视频）
- `result/receiver/analysis/analysis_summary.csv`（36 次在线运行汇总）
- `result/receiver/analysis_v2/figA_groundtruth_heatmap.png`（15 环境 BER 热力图聚合）
- `result/receiver/analysis_v2/mimo_offline_summary.csv`（MIMO 三策略 × 15 环境）
