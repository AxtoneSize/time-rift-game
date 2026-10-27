/**
 * scene-home.js - S1 主菜单（满屏场景插画 + 暖色渐晕 + 浮层）
 * UI 设计 v1.2：场景图打底，Logo 立体金字，按钮暖琥珀，浮层深棕半透明
 */
(function (G) {
  'use strict';
  var COL = function () { return G.CONFIG.colors; };

  function drawImageCover(ctx, img, vw, vh) {
    var iw = img.width, ih = img.height;
    var s = Math.max(vw / iw, vh / ih);
    var dw = iw * s, dh = ih * s;
    ctx.drawImage(img, (vw - dw) / 2, (vh - dh) / 2, dw, dh);
  }

  function HomeScene(manager) {
    this.manager = manager;
    this.bgImg = null;
    this.t = 0;
    this.load();
    this.build();
  }

  HomeScene.prototype.load = function () {
    var self = this;
    G.loadImage(G.CONFIG.assets.sceneXiaomaibu, function (img) { self.bgImg = img; });
  };

  HomeScene.prototype.build = function () {
    var V = G.Viewport;
    var self = this;
    var side = 84;
    var bw = V.VW - side * 2;

    this.btnPlay = new G.UI.Button({
      x: side, y: V.VH - V.safeBottom - 300, w: bw, h: 150, r: 40,
      label: '开 始 侦 探', fontSize: 40, letterSpacing: 8,
      onTap: function () { self.manager.goto('game'); }
    });
    this.btnCodex = new G.UI.Button({
      x: side, y: V.VH - V.safeBottom - 130, w: bw, h: 92, r: 24,
      label: '时光图鉴 · 收集穿越物', type: 'dark', fontSize: 22,
      onTap: function () { self.manager.openOverlay(new G.Overlays.CodexOverlay()); }
    });

    // 顶部按钮（深棕浮层小方钮）
    var bs = 88;
    this.btnSound = new G.UI.Button({
      x: V.VW - 40 - bs, y: V.safeTop + 24, w: bs, h: bs, r: 22,
      icon: G.Store.soundOn() ? '🔊' : '🔇', label: '', iconSize: 40, type: 'dark',
      onTap: function () {
        var v = !G.Store.soundOn();
        G.Store.setSoundOn(v);
        G.AudioFX.setEnabled(v);
        self.btnSound.icon = v ? '🔊' : '🔇';
        if (v) G.AudioFX.coin();
      }
    });
    this.btnCodexTop = new G.UI.Button({
      x: V.VW - 40 - bs, y: V.safeTop + 24 + bs + 20, w: bs, h: bs, r: 22,
      icon: '📖', label: '', iconSize: 40, type: 'dark',
      onTap: function () { self.manager.openOverlay(new G.Overlays.CodexOverlay()); }
    });
  };

  HomeScene.prototype.update = function (dt) { this.t += dt; };

  HomeScene.prototype.render = function (ctx) {
    var V = G.Viewport, c = COL();
    // 1. 满屏场景插画
    ctx.fillStyle = '#241A10';
    ctx.fillRect(0, 0, V.VW, V.VH);
    if (this.bgImg) drawImageCover(ctx, this.bgImg, V.VW, V.VH);

    // 2. 上下暖色渐晕（28%→78% 可读性红线）
    var g1 = ctx.createLinearGradient(0, 0, 0, V.VH * 0.3);
    g1.addColorStop(0, 'rgba(30,20,10,0.5)');
    g1.addColorStop(1, 'rgba(30,20,10,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, V.VW, V.VH * 0.3);
    var g2 = ctx.createLinearGradient(0, V.VH * 0.5, 0, V.VH);
    g2.addColorStop(0, 'rgba(30,20,10,0)');
    g2.addColorStop(0.55, 'rgba(30,20,10,0.55)');
    g2.addColorStop(1, 'rgba(30,20,10,0.8)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, V.VH * 0.5, V.VW, V.VH * 0.5);

    // 3. Logo（立体金字）
    var ly = V.VH * 0.22;
    G.UI.text(ctx, '穿越', V.VW / 2 - 118, ly, {
      size: 108, bold: true, color: '#FFF6DE', shadow: true, shadowBlur: 18, shadowOffsetY: 5
    });
    G.UI.text(ctx, '找茬', V.VW / 2 + 118, ly, {
      size: 108, bold: true, color: c.goldBright, shadow: true, shadowBlur: 18, shadowOffsetY: 5
    });
    // 副标题浮层胶囊
    var tag = '时 光 侦 探 · 招 募 中';
    G.UI.glassPanel(ctx, V.VW / 2 - 230, ly + 84, 460, 66, 33);
    G.UI.text(ctx, tag, V.VW / 2, ly + 118, { size: 22, color: c.cream, bold: true });

    // 4. 金币（左上）
    var coins = G.Store.getCoins();
    G.UI.glassPanel(ctx, 36, V.safeTop + 24, 220, 78, 39);
    G.UI.coin(ctx, 74, V.safeTop + 63, 22);
    G.UI.text(ctx, String(coins), 96, V.safeTop + 64, {
      size: 26, color: c.cream, bold: true, align: 'left'
    });
    G.UI.text(ctx, '＋', 226, V.safeTop + 64, { size: 26, color: c.goldText, bold: true });

    // 5. 顶部按钮列（右上）
    this.btnSound.render(ctx);
    this.btnCodexTop.render(ctx);

    // 6. 底部菜单
    this.btnPlay.render(ctx);
    this.btnCodex.render(ctx);

    // 最佳成绩条
    var best = G.Store.getBest(1);
    var starStr = best > 0 ? (best === 3 ? '★★★' : best === 2 ? '★★' : '★') : '尚未通关';
    G.UI.text(ctx, '第 1 关 · 小镇夏天    最佳 ' + starStr, V.VW / 2, V.VH - V.safeBottom - 330, {
      size: 20, color: c.creamDim
    });

    // 7. 版本
    G.UI.text(ctx, G.CONFIG.version + ' · ' + G.CONFIG.studio, V.VW / 2, V.VH - V.safeBottom + 18, {
      size: 16, color: 'rgba(255,244,222,0.75)'
    });
  };

  HomeScene.prototype.onTouch = function (type, x, y) {
    var btns = [this.btnPlay, this.btnCodex, this.btnSound, this.btnCodexTop];
    var i, b;
    if (type === 'touchstart') {
      for (i = 0; i < btns.length; i++) btns[i].pressed = btns[i].contains(x, y);
      return true;
    }
    if (type === 'touchend') {
      for (i = 0; i < btns.length; i++) {
        b = btns[i];
        var wasPressed = b.pressed;
        b.pressed = false;
        if (wasPressed && b.contains(x, y) && b.onTap) {
          G.AudioFX.resume();
          G.AudioFX.coin();
          b.onTap();
          return true;
        }
      }
      return true;
    }
    return true;
  };

  G.HomeScene = HomeScene;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
