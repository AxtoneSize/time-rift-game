# -*- coding: utf-8 -*-
"""关卡图预处理：裁掉 AI 水印 + 输出穿越物局部放大图供坐标核对"""
import os
from PIL import Image

SRC = r"D:\time-rift-game\assets\scenes\1990年代中国南方小镇的街角小卖部_黄昏暖光_手绘水彩怀旧_2026-10-27T09-41-19.png"
OUT_DIR = r"D:\time-rift-game\tools\crops"
os.makedirs(OUT_DIR, exist_ok=True)

img = Image.open(SRC)
print("原始尺寸:", img.size)

w, h = img.size
# 裁掉底部 5% 与右侧 1%（去除 AI 生成水印）
crop_bottom = int(h * 0.05)
crop_right = int(w * 0.01)
img2 = img.crop((0, 0, w - crop_right, h - crop_bottom))
print("裁剪后尺寸:", img2.size)

dst = r"D:\time-rift-game\assets\scenes\scene_xiaomaibu.png"
img2.save(dst, optimize=True)
print("已保存:", dst, os.path.getsize(dst) // 1024, "KB")

W, H = img2.size
# 三个粗标区域（按预览图估算的比例坐标），输出局部放大图核对
regions = {
    "crop_milktea": (0.05, 0.55, 0.28, 0.92),   # 左下奶茶杯
    "crop_phone":   (0.28, 0.58, 0.50, 0.82),   # 中央柜台手机
    "crop_bike":    (0.65, 0.35, 1.00, 0.95),   # 右下共享单车
}
for name, (x1, y1, x2, y2) in regions.items():
    box = (int(x1 * W), int(y1 * H), int(x2 * W), int(y2 * H))
    crop = img2.crop(box)
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    p = os.path.join(OUT_DIR, name + ".png")
    crop.save(p)
    print(name, "box=", box)
