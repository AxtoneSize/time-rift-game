/**
 * main.js - 启动引导 + 场景管理器 + 主循环
 * 适配规范：750 逻辑宽基准（高度自适应），DPR 物理像素渲染，安全区避让
 */
(function (G) {
  'use strict';

  // ---------- 画布与视口 ----------
  var canvas = wx.createCanvas();
  var sys = wx.getSystemInfoSync();
  var dpr = Math.min(sys.pixelRatio || 2, 2);
  var ctx = canvas.getContext('2d');

  function resize() {
    var sys2 = wx.getSystemInfoSync();
    canvas.width = sys2.windowWidth * dpr;
    canvas.height = sys2.windowHeight * dpr;
    var scale = canvas.width / G.CONFIG.designWidth;   // 物理像素/逻辑单位
    G.Viewport = {
      W: canvas.width,
      H: canvas.height,
      VW: canvas.width / scale,          // 逻辑宽（=750）
      VH: canvas.height / scale,         // 逻辑高（随设备变化）
      scale: scale,
      dpr: dpr,
      safeTop: (sys2.safeArea ? sys2.safeArea.top : 0) / scale,
      safeBottom: ((sys2.windowHeight - (sys2.safeArea ? sys2.safeArea.bottom : sys2.windowHeight))) / scale
    };
  }
  resize();
  wx.onWindowResize(resize);

  // ---------- 图片加载 ----------
  G.loadImage = function (src, cb) {
    var img = null;
    if (typeof wx.createImage === 'function') img = wx.createImage();
    else if (canvas.createImage) img = canvas.createImage();
    else if (wx._createImage) img = wx._createImage();
    if (!img) { cb(null); return; }
    img.onload = function () { cb(img); };
    img.onerror = function () {
      console.error('[loadImage] failed:', src);
      cb(null);
    };
    img.src = src;
  };

  // ---------- 场景管理器 ----------
  function SceneManager() {
    this.scenes = {};
    this.current = null;
    this.overlayStack = G.Overlays.makeOverlayManager();
    this.toasts = [];
  }

  SceneManager.prototype.register = function (name, factory) {
    this.scenes[name] = factory;
    if (!this.current) this.current = factory(this);
  };

  SceneManager.prototype.goto = function (name) {
    this.overlayStack.clear();
    this.current = this.scenes[name](this);
  };

  SceneManager.prototype.openOverlay = function (o) {
    var self = this;
    // 包装 close：无论弹层如何关闭，都保证从栈中移除，避免"关不掉"死锁
    var origClose = o.close ? o.close.bind(o) : null;
    o.close = function () {
      if (origClose) origClose();
      self.overlayStack.remove(o);
    };
    this.overlayStack.push(o);
  };
  SceneManager.prototype.closeOverlay = function (o) {
    this.overlayStack.remove(o);
  };
  SceneManager.prototype.closeAllOverlays = function () { this.overlayStack.clear(); };
  SceneManager.prototype.hasOverlay = function () { return this.overlayStack.top() != null; };
  SceneManager.prototype.onCloseOf = function (o, fn) { this.overlayStack.onCloseOf(o, fn); };

  SceneManager.prototype.toast = function (msg) {
    this.toasts.push({ text: msg, born: Date.now() / 1000, life: 1.6 });
    if (this.toasts.length > 3) this.toasts.shift();
  };

  SceneManager.prototype.onTouch = function (type, x, y) {
    G.AudioFX.resume();
    var V = G.Viewport;
    var vx = x * dpr / V.scale, vy = y * dpr / V.scale;   // 物理→逻辑
    if (this.overlayStack.onTouch(type, vx, vy)) return;
    this.current.onTouch(type, vx, vy);
  };

  // 顶层 toast 渲染（manager 级，跨场景可见）
  SceneManager.prototype.renderToasts = function (ctx) {
    var now = Date.now() / 1000;
    this.toasts = this.toasts.filter(function (t) { return now - t.born < t.life; });
    var V = G.Viewport;
    for (var i = 0; i < this.toasts.length; i++) {
      var t = this.toasts[i];
      var age = (now - t.born) / t.life;
      var y = V.VH * 0.18 + i * 80 - age * 20;
      ctx.save();
      ctx.globalAlpha = age < 0.15 ? age / 0.15 : (age > 0.75 ? (1 - age) / 0.25 : 1);
      G.UI.glassPanel(ctx, V.VW / 2 - 250, y, 500, 64, 32, true);
      G.UI.text(ctx, t.text, V.VW / 2, y + 33, { size: 21, color: G.CONFIG.colors.goldText, bold: true });
      ctx.restore();
    }
  };

  // ---------- 主循环 ----------
  var manager = new SceneManager();
  G.Manager = manager;

  manager.register('home', function (m) { return new G.HomeScene(m); });
  manager.register('game', function (m) { return new G.GameScene(m); });

  wx.onTouchStart(function (e) { manager.onTouch('touchstart', e.touches[0].clientX, e.touches[0].clientY); });
  wx.onTouchMove(function (e) { manager.onTouch('touchmove', e.touches[0].clientX, e.touches[0].clientY); });
  wx.onTouchEnd(function (e) {
    var t = (e.changedTouches && e.changedTouches[0]) || e.touches[0];
    manager.onTouch('touchend', t.clientX, t.clientY);
  });

  var last = Date.now();
  function loop() {
    var now = Date.now();
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    manager.overlayStack.update(dt);
    manager.current.update(dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(G.Viewport.scale, 0, 0, G.Viewport.scale, 0, 0);
    manager.current.render(ctx);
    manager.overlayStack.render(ctx);
    manager.renderToasts(ctx);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
