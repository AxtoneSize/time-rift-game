/**
 * validate_levels.js - 关卡数据校验（策划方案 v2.0 §10）
 * 检查项：坐标在画幅内 / 热区不越界 / 三区分散（3x3 区域覆盖）/ 同章重复 / decoy 与穿越物热区不重叠 / 资源文件存在
 * 用法：node tools/validate_levels.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

// 载入关卡数据（IIFE 挂到 globalThis）
require('../js/config.js');
require('../js/level-data.js');
const LEVELS = globalThis.LEVELS;
const CFG = globalThis.CONFIG;

let errors = 0, warnings = 0;
const err = (m) => { console.error('  ✗ ' + m); errors++; };
const warn = (m) => { console.warn('  ⚠ ' + m); warnings++; };
const ok = (m) => console.log('  ✓ ' + m);

const zonesOf = (it, W, H) => {
  const nx = it.x / W, ny = it.y / H;
  const col = Math.min(2, Math.floor(nx * 3));
  const row = Math.min(2, Math.floor(ny * 3));
  return row * 3 + col;
};

for (const lv of LEVELS) {
  console.log(`\n[关卡 ${lv.levelId}] ${lv.chapterName} · ${lv.levelName}`);

  // 0. 资源文件
  const imgPath = path.join(__dirname, '..', lv.sceneImage);
  if (fs.existsSync(imgPath)) {
    const size = fs.statSync(imgPath).size;
    ok(`场景图存在：${lv.sceneImage} (${(size / 1024).toFixed(0)}KB)`);
    if (size > 1024 * 1024) warn('场景图超过 1MB，注意主包 4MB 限制');
  } else err(`场景图缺失：${lv.sceneImage}`);

  // 1. 坐标在画幅内 + 热区不越界
  for (const it of lv.anachronisms) {
    const label = it.name;
    if (it.x < 0 || it.x > lv.sceneW || it.y < 0 || it.y > lv.sceneH) err(`${label} 中心点越界 (${it.x},${it.y})`);
    else if (it.x - it.rx < 0 || it.x + it.rx > lv.sceneW || it.y - it.ry < 0 || it.y + it.ry > lv.sceneH)
      warn(`${label} 热区超出画幅边缘（允许，但点击可能落在裁切区）`);
    else ok(`${label} 坐标/热区正常 (${it.x},${it.y} r=${it.rx}x${it.ry})`);
    if (it.rx <= 0 || it.ry <= 0) err(`${label} 热区半径非法`);
    if (!it.lore) warn(`${label} 缺少图鉴文案`);
  }

  // 2. 三区分散（3x3 九宫格至少覆盖 3 个不同区域）
  const zones = new Set(lv.anachronisms.map(it => zonesOf(it, lv.sceneW, lv.sceneH)));
  if (zones.size >= 3) ok(`三区分散通过：覆盖 ${zones.size}/9 区域`);
  else err(`三区分散不达标：仅覆盖 ${zones.size}/9 区域`);

  // 3. 穿越物间热区不重叠（避免误触相邻物品）
  const list = lv.anachronisms;
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const dx = (a.x - b.x) / (a.rx + b.rx), dy = (a.y - b.y) / (a.ry + b.ry);
      if (dx * dx + dy * dy < 1) warn(`${a.name} 与 ${b.name} 热区有重叠，注意点击优先级`);
    }

  // 4. 同章内穿越物重复
  const names = list.map(i => i.id);
  if (new Set(names).size !== names.length) err('同章内存在重复穿越物');

  // 5. decoy 与穿越物热区不重叠（§4.4 decoy 点了不扣时，但不能挡住真穿越物）
  for (const d of lv.decoys || [])
    for (const a of list) {
      const dx = (d.x - a.x) / (d.rx + a.rx), dy = (d.y - a.y) / (d.ry + a.ry);
      if (dx * dx + dy * dy < 1) err(`decoy ${d.name} 与 ${a.name} 热区重叠`);
    }

  // 6. 数值配置一致性（§3.1）
  const gp = CFG.gameplay;
  if (lv.timer !== gp.level1Time) warn(`限时 ${lv.timer}s 与配置 ${gp.level1Time}s 不一致（关卡可覆盖，属正常）`);
  if (lv.starThresholds[1] !== gp.starGreat || lv.starThresholds[0] !== gp.starGood)
    warn(`星级阈值与全局配置不一致：${JSON.stringify(lv.starThresholds)}`);
}

console.log(`\n========== 校验完成：${errors} 错误 / ${warnings} 警告 ==========`);
process.exit(errors > 0 ? 1 : 0);
