/**
 * smoke_test.js - 无头冒烟测试（Node 环境，wx/canvas 桩）
 * 流程：加载全部模块 → 主页点「开始侦探」→ 关卡内依次点中 3 个穿越物
 *      → 验证通关结算、金币入账、图鉴收录、误点教学提示、暂停/重开
 * 用法：node tools/smoke_test.js
 */
'use strict';

// ================= wx 桩 =================
const noop = () => { };
function makeCtx() {
  const gradient = { addColorStop: noop };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => gradient;
      if (k === 'measureText') return () => ({ width: 100 });
      if (typeof k === 'string') return t[k] !== undefined ? t[k] : noop;
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
const fakeCanvas = {
  width: 0, height: 0,
  getContext: () => makeCtx(),
  addEventListener: noop
};
const touchHandlers = {};
const storage = new Map();
let imageFactory = null;

global.wx = {
  createCanvas: () => fakeCanvas,
  getSystemInfoSync: () => ({
    pixelRatio: 2, windowWidth: 750, windowHeight: 1624, platform: 'devtools',
    safeArea: { top: 0, bottom: 1624, left: 0, right: 750, width: 750, height: 1624 }
  }),
  onTouchStart: fn => touchHandlers.start = fn,
  onTouchMove: fn => touchHandlers.move = fn,
  onTouchEnd: fn => touchHandlers.end = fn,
  onWindowResize: noop,
  createWebAudioContext: () => null,   // 无音频环境
  setStorageSync: (k, v) => storage.set(k, v),
  getStorageSync: k => storage.has(k) ? storage.get(k) : '',
  removeStorageSync: k => storage.delete(k),
  vibrateShort: noop,
  createRewardedVideoAd: () => null,  // 走模拟广告兜底
  createImage: () => imageFactory()
};
global.GameGlobal = global;
global.requestAnimationFrame = fn => 0;  // 不自动循环，手动驱动

// fake image：设置 src 后异步 onload
function makeImage() {
  const img = { width: 0, height: 0, onload: null, onerror: null, _src: '' };
  Object.defineProperty(img, 'src', {
    set(v) {
      img._src = v;
      if (v.includes('xiaomaibu')) {
        img.width = 1521; img.height = 973;
        setTimeout(() => img.onload && img.onload(), 0);
      } else setTimeout(() => img.onerror && img.onerror('404'), 0);
    },
    get() { return img._src; }
  });
  return img;
}
imageFactory = makeImage;

// ================= 载入模块 =================
require('../js/platform.js');
require('../js/config.js');
require('../js/audio.js');
require('../js/level-data.js');
require('../js/ui.js');
require('../js/storage.js');
require('../js/ads.js');
require('../js/mock-ad.js');
require('../js/overlays.js');
require('../js/scene-home.js');
require('../js/scene-game.js');
require('../js/main.js');

const G = global;
let pass = 0, fail = 0;
const T = (name, cond) => {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name); }
};

// ================= 测试驱动 =================
const M = G.Manager;

function tap(x, y) {
  touchHandlers.start({ touches: [{ clientX: x, clientY: y }] });
  touchHandlers.end({ changedTouches: [{ clientX: x, clientY: y }], touches: [] });
}
function frames(n, dt) {
  for (let i = 0; i < n; i++) {
    M.overlayStack.update(dt || 0.016);
    M.current.update(dt || 0.016);
    M.current.render(makeCtx());            // 同步覆盖渲染路径
    M.overlayStack.render(makeCtx());
    M.renderToasts(makeCtx());
  }
}

console.log('\n[1] 主页加载');
T('主页场景已创建', M.current.constructor.name === 'HomeScene');
T('视口 VW=750', Math.abs(G.Viewport.VW - 750) < 0.01);
T('视口 VH=1624', Math.abs(G.Viewport.VH - 1624) < 0.01);
frames(3);

console.log('\n[2] 点击「开始侦探」进入关卡');
const home = M.current;
tap(home.btnPlay.x + home.btnPlay.w / 2, home.btnPlay.y + home.btnPlay.h / 2);
T('进入游戏场景', M.current.constructor.name === 'GameScene');
const game = M.current;
T('关卡数据：第1关', game.level.levelId === 1);
T('限时 90s', game.timeLeft === 90);
T('教学关标记', game.level.isTutorial === true);

// 等图片 onload
setTimeout(() => {
  console.log('\n[3] 场景图加载后布局');
  T('图片已加载', !!game.img && game.phase === 'play');
  const box = game.imageBox();
  T('imageBox contain 适配', box && box.w <= 702.01 && box.h <= 1254.01);
  frames(3);

  console.log('\n[4] 误点（教学关不扣时）');
  const t0 = game.timeLeft;
  tap(box.x + box.w - 30, box.y + 40);   // 卡片右上角空白
  T('误点不扣时（教学关）', Math.abs(game.timeLeft - t0) < 1e-9);
  T('误点已计数', game.wrongCount === 1);

  console.log('\n[5] 依次点中 3 个穿越物（image 坐标 → 虚拟坐标）');
  const toV = (p) => [box.x + p.x * box.s, box.y + p.y * box.s];
  for (const it of game.level.anachronisms) {
    const [vx, vy] = toV({ x: it.x, y: it.y });
    tap(vx, vy);
    T(`点中 ${it.name} → 已找出`, !!game.found[it.id]);
  }
  T('全找出 → winning 中', game.phase === 'winning');
  T('连击 ×3', game.combo === 3);
  T('误点计数为 1（第4步教学误点）', game.wrongCount === 1);

  frames(3);
  setTimeout(() => {
    console.log('\n[6] 结算');
    T('进入 settle', game.phase === 'settle');
    const ov = M.overlayStack.top();
    T('结算弹层打开', ov && ov.constructor.name === 'SettleOverlay');
    T('3 星（剩余时间充足）', ov.result.stars === 3);
    T('金币 = 30（前面有过 1 次教学误点，无零误点奖励）', ov.result.totalCoins === 30);
    T('零误点奖励未触发（教学误点已计入）', ov.result.zeroMiss === false);
    T('图鉴新收录 3 条', ov.result.newCodex.length === 3);
    frames(30); // 金币滚动动画推进

    console.log('\n[7] 再来一次（重开）');
    tap(ov.btnRetry.x + ov.btnRetry.w / 2, ov.btnRetry.y + ov.btnRetry.h / 2);
    T('弹层清空', !M.hasOverlay());
    T('时间重置 90s', game.timeLeft === 90);
    T('进度清空', Object.keys(game.found).length === 0);
    T('金币已入账 30', G.Store.getCoins() === 30);
    T('最佳成绩 3 星', G.Store.getBest(1) === 3);
    T('图鉴已持久化', G.Store.isCodexFound(1, 'phone'));

    console.log('\n[8] 暂停/继续 & 提示（模拟广告兜底）');
    tap(game.btnPause.x + 42, game.btnPause.y + 42);
    T('暂停弹层打开', M.hasOverlay() && game.phase === 'paused');
    frames(10, 1);   // 推进 10s，暂停中时间不应流逝
    T('暂停期间时间冻结', Math.abs(game.timeLeft - 90) < 1e-9);
    const pause = M.overlayStack.top();
    tap(pause.btnResume.x + pause.btnResume.w / 2, pause.btnResume.y + pause.btnResume.h / 2);
    T('继续游戏', game.phase === 'play' && !M.hasOverlay());

    const hints0 = G.Store.getHints();
    tap(game.btnHint.x + 75, game.btnHint.y + 54);
    T('提示道具 -1', G.Store.getHints() === hints0 - 1);
    T('呼吸高亮生效', !!game.hint);

    console.log('\n[9] 提示耗尽 → 模拟广告兜底 → 奖励即时到账');
    G.Store.addHints(-(G.Store.getHints()));   // 清零
    tap(game.btnHint.x + 75, game.btnHint.y + 54);
    const ad = M.overlayStack.top();
    T('模拟广告弹层打开', ad && ad.constructor.name === 'MockAd');
    frames(5);
    ad.countdown = 0;                          // 快进倒计时
    M.overlayStack.render(makeCtx());          // 渲染一帧生成领取按钮
    tap(ad.btnRect.x + ad.btnRect.w / 2, ad.btnRect.y + ad.btnRect.h / 2);
    frames(3);                                 // 驱动 MockAd 关闭回调
    setTimeout(() => {
      T('广告后提示 +1 并立即高亮', G.Store.getHints() >= 0 && !!game.hint);
      T('弹层已关闭', !M.hasOverlay());

      console.log('\n[10] 时间归零 → 续时决策点');
      game.manager.closeAllOverlays();
      game.timeLeft = 0.01;
      frames(2);
      T('timeup 弹层打开', M.overlayStack.top() && M.overlayStack.top().constructor.name === 'TimeupOverlay');
      const tu = M.overlayStack.top();
      // 模拟广告路径 +30s
      G.Ads.play('extraTime', { onMock: () => { } });
      tu.btnAd.onTap = null;
      // 直接调 grantExtraTime 验证逻辑
      game.grantExtraTime();
      T('续时后恢复 play', game.phase === 'play');
      T('时间 +30', Math.abs(game.timeLeft - 30.01) < 0.1);

      console.log(`\n========== 冒烟测试：${pass} 通过 / ${fail} 失败 ==========`);
      process.exit(fail > 0 ? 1 : 0);
    }, 500);
  }, 1200);
}, 50);
