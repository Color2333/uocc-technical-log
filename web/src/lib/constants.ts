export const VERSION_ORDER = [
  "u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08", "u09", "u10", "u11", "u12"
] as const;

export const LEARNING_PATH = VERSION_ORDER;

export type VersionId = typeof LEARNING_PATH[number];

export const VERSION_META: Record<string, {
  title: string;
  subtitle: string;
  coreAddition: string;
  keyInsight: string;
  layer: "overview" | "algorithms" | "architecture" | "experiments" | "timeline" | "design";
  prevVersion: string | null;
}> = {
  u01: { title: "系统概览", subtitle: "研究背景与核心问题", coreAddition: "自适应光学通信系统", keyInsight: "感知-反馈-执行三级闭环", layer: "overview", prevVersion: null },
  u02: { title: "OOK 调制解调", subtitle: "开关键控基础原理", coreAddition: "OOK调制解调", keyInsight: "bit=1 LED开, bit=0 LED关", layer: "algorithms", prevVersion: "u01" },
  u03: { title: "RLL 编码", subtitle: "4B6B 线路编码", coreAddition: "4B6B直流平衡编码", keyInsight: "直流平衡, 时钟恢复", layer: "algorithms", prevVersion: "u02" },
  u04: { title: "自适应控制", subtitle: "ISO 增益优化", coreAddition: "RSSI反馈增益控制", keyInsight: "Matus 2020 复现, 收敛~15帧", layer: "algorithms", prevVersion: "u03" },
  u05: { title: "阻尼多状态机", subtitle: "曝光+增益联合控制", coreAddition: "多状态机+阻尼切换", keyInsight: "覆盖宽动态范围, 防振荡", layer: "algorithms", prevVersion: "u04" },
  u06: { title: "MIMO 合并", subtitle: "空间分集合并策略", coreAddition: "EGC/SC/MRC三种合并", keyInsight: "空间分集对抗多径衰落", layer: "algorithms", prevVersion: "u05" },
  u07: { title: "发射端设计", subtitle: "LED 驱动电路", coreAddition: "双路功率分支10W+3.3W", keyInsight: "10W远距/3.3W近距自动切换", layer: "architecture", prevVersion: "u06" },
  u08: { title: "接收端设计", subtitle: "自适应增益链路", coreAddition: "双目相机+Jetson Orin NX", keyInsight: "ISO/曝光联合自适应", layer: "architecture", prevVersion: "u07" },
  u09: { title: "CUDA 加速", subtitle: "GPU 并行化解调", coreAddition: "OOK解调+RLL解码CUDA核", keyInsight: ">10x加速比", layer: "architecture", prevVersion: "u08" },
  u10: { title: "实验记录", subtitle: "空气/清水/浑浊水信道", coreAddition: "三阶段实验验证", keyInsight: "浑浊水信道是核心验证", layer: "experiments", prevVersion: "u09" },
  u11: { title: "进度追踪", subtitle: "里程碑与优先级", coreAddition: "P0/P1/P2/P3优先级管理", keyInsight: "P0=硬件联调+浑浊水实验", layer: "timeline", prevVersion: "u10" },
  u12: { title: "设计演进", subtitle: "迭代记录与硬件选型", coreAddition: "LED驱动v1-v3, 算法迭代", keyInsight: "从固定参数到自适应控制", layer: "design", prevVersion: "u11" },
};

export const LAYERS = [
  { id: "overview" as const, label: "系统概览", color: "#3B82F6", versions: ["u01"] },
  { id: "algorithms" as const, label: "算法模块", color: "#10B981", versions: ["u02", "u03", "u04", "u05", "u06"] },
  { id: "architecture" as const, label: "系统架构", color: "#8B5CF6", versions: ["u07", "u08", "u09"] },
  { id: "experiments" as const, label: "实验记录", color: "#F59E0B", versions: ["u10"] },
  { id: "timeline" as const, label: "进度追踪", color: "#EF4444", versions: ["u11"] },
  { id: "design" as const, label: "设计演进", color: "#EC4899", versions: ["u12"] },
] as const;
