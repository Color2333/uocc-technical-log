# RLL 编码：4B6B

> *Run-Length Limited Encoding*

## 为什么要 RLL 编码？

长时间传输相同比特（连续0或连续1）会导致：
1. **直流漂移**：接收端 AC 耦合无法处理
2. **时钟恢复困难**：无跳变导致同步丢失
3. **码间干扰**：连续脉冲干扰后续判决

## 4B6B 编码原理

将 **4 位数据**扩展为 **6 位传输符号**，利用编码表的直流平衡特性。

```diagram
type: flow
title: 4B6B 编码原理

nodes:
  - data: 原始数据 [b3 b2 b1 b0]
  - encode: 4B6B 编码表
  - symbol: 传输符号 [t5 t4 t3 t2 t1 t0]

edges:
  - data --> encode
  - encode --> symbol
```

## 编码规则

| 原始 4-bit | 编码 6-bit | 直流平衡值 |
|-----------|-----------|-----------|
| 0000 | 001111 | +2 |
| 0001 | 010011 | 0 |
| 0010 | 011001 | 0 |
| 0011 | 011100 | +1 |
| 0100 | 100011 | 0 |
| 0101 | 101001 | 0 |
| 0110 | 101100 | +1 |
| 0111 | 110001 | 0 |
| 1000 | 110010 | 0 |
| 1001 | 110100 | +1 |
| 1010 | 111000 | +2 |
| 1011 | 111001 | +3 |
| 1100 | 111010 | +3 |
| 1101 | 111100 | +4 |
| 1110 | 110110 | 0 |
| 1111 | 110000 | -2 |

## 直流平衡机制

编码器维护一个 **running disparity**（运行 disparity）：
- 每个符号的直流值累加
- 选择编码时优先选取能减小 disparity 的编码字

```
running_disparity += symbol_disparity
if abs(running_disparity) > threshold:
    flip_all_bits()  # 反转所有位恢复平衡
```

## 解码

解码是编码的逆过程，6位符号查表还原为4位数据。

## 实现

```python
# 4B6B 编码表
ENCODE_TABLE = {
    0b0000: (0b001111, +2),
    0b0001: (0b010011,  0),
    0b0010: (0b011001,  0),
    0b0011: (0b011100, +1),
    # ... 完整表格
}

def encode_4b6b(data: list[int]) -> list[int]:
    """4B6B编码"""
    result = []
    running_disparity = 0
    for i in range(0, len(data), 4):
        nibble = bits_to_int(data[i:i+4])
        code, disp = ENCODE_TABLE[nibble]
        if running_disparity + disp > 3:
            code = code ^ 0b111111  # 反转
            disp = -disp
        result.extend(int_to_bits(code, 6))
        running_disparity += disp
    return result
```
