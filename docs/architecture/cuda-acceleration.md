# CUDA 加速设计

> *GPU Parallelized Demodulation on Jetson Orin NX*

## 架构

```diagram
type: arch
title: CUDA 并行化设计

containers:
  - id: input
    label: 输入
    children:
      - rx_frame: 接收帧
      - gpu_copy: GPU内存拷贝

  - id: processing
    label: CUDA处理
    children:
      - ook_demod: OOK解调
      - rll_decode: RLL解码

  - id: output
    label: 输出
    children:
      - bitstream: 比特流输出

edges:
  - rx_frame --> gpu_copy
  - gpu_copy --> ook_demod
  - ook_demod --> rll_decode
  - rll_decode --> bitstream
```

## 并行化策略

### OOK 解调并行化

每个像素列独立进行阈值判决：
- **线程块**：对应图像的每一列
- **线程**：对应列内的每个像素点

```cuda
__global__ void ook_demodulate_kernel(
    float* frame,      // 输入帧
    int8_t* output,    // 输出比特
    float threshold,   // 判决阈值
    int width, height
) {
    int col = blockIdx.x;
    int row = threadIdx.x;
    
    if (col >= width || row >= height) return;
    
    float val = frame[row * width + col];
    output[col] = (val > threshold) ? 1 : 0;
}
```

### RLL 解码并行化

每个 6-bit 符号独立查表解码：
- **线程块**：对应一组 6-bit 符号
- **线程**：对应单个符号

## 当前状态

| 组件 | 状态 |
|------|------|
| UTF-8 文字编码 | ✅ 完成 |
| OOK 调制 | ✅ 完成 |
| CUDA OOK 解调核 | 🔄 进行中 |
| CUDA RLL 解码核 | 🔄 进行中 |

## 性能目标

| 指标 | 目标 |
|------|------|
| 解调延迟 | < 10ms @ 1080p |
| 帧率 | ≥ 30 fps |
| CUDA 加速比 | > 10x vs CPU |
