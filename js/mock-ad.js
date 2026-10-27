/**
 * mock-ad.js - 游戏内模拟激励视频弹层（广告无填充时的兜底，提审项要求）
 * 开发/预览环境与真实广告位未配置时使用；3 秒倒计时后可领奖。
 * 接口：new MockAd(onDone) → {update, render, onTouch}，onTouch 返回 true 表示已消费。
 */
(function (G) {
  'use strict';
  var UI = function () { return G.UI; };
  var COL = function () { return G.CONFIG.colors; };

  function MockAd(onDone) {
    this.t = 0;
    this.countdown = 3;          // 模拟观看 3 秒
    this.done = false;
    this.result = false;
    this.onDone = onDone || function () { };
    this.closing = false;
    this.closeT = 0;
  }

  MockAd.prototype.layout = function () {
    var V = G.Viewport;
    var w = Math.min(V.VW - 80, 560);
    var h = w * 0.9;
    return {
      x: (V.VW - w) / 2, y: (V.VH - h) / 2, w: w, h: h
    };
  };

  MockAd.prototype.update = function (dt) {
    this.t += dt;
    if (this.done && !this.closing) {
      this.closing = true;
      var self = this;
      setTimeout(function () {
        self.onDone(self.result);
      }, 350);
    }
  };

  MockAd.prototype.render = function (ctx) {
    var V = G.Viewport, c = COL(), ui = UI();
    var L = this.layout();

    ctx.save();
    ctx.fillStyle = 'rgba(20,12,4,0.72)';
    ctx.fillRect(0, 0, V.VW, V.VH);

    // 广告牌体
    ui.creamPanel(ctx, L.x, L.y, L.w, L.h, 24);
    ui.text(ctx, '模 拟 广 告', L.x + L.w / 2, L.y + 46, {
      size: 18, color: c.ink, bold: true
    });
    ui.text(ctx, '(正式版本替换为激励视频)', L.x + L.w / 2, L.y + 76, {
      size: 12, color: '#7A6A52'
    });

    // 广告创意：一枚大金币旋转
    var cy = L.y + L.h * 0.48;
    var squish = Math.abs(Math.sin(this.t * 2.4));
    var R = L.w * 0.14;
    ctx.save();
    ctx.translate(L.x + L.w / 2, cy);
    ctx.scale(Math.max(squish, 0.18), 1);
    ui.coin(ctx, 0, 0, R);
    ctx.restore();
    ui.text(ctx, '看完广告，时光金币到手！', L.x + L.w / 2, cy + R + 34, {
      size: 15, color: c.ink
    });

    // 底部按钮
    var bw = L.w - 120, bh = 64, bx = L.x + 60, by = L.y + L.h - 92;
    if (this.countdown > 0) {
      ui.darkButton(ctx, bx, by, bw, bh, 18);
      ui.text(ctx, '请稍候 ' + Math.ceil(this.countdown) + 's', bx + bw / 2, by + bh / 2 + 1, {
        size: 17, color: c.creamDim
      });
    } else if (!this.done) {
      var pressed = this.pressedBtn;
      if (pressed) { bx += 0; by += 2; }
      ui.amberButton(ctx, bx, by, bw, bh, 18);
      ui.text(ctx, '领取奖励', bx + bw / 2, by + bh / 2 + 1, { size: 18, bold: true });
      this.btnRect = { x: bx, y: by, w: bw, h: bh };
    }
    ctx.restore();
  };

  MockAd.prototype.onTouch = function (type, x, y) {
    if (type === 'touchstart') {
      this.pressedBtn = false;
      if (this.btnRect && this.countdown <= 0 && !this.done) {
        var r = this.btnRect;
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) this.pressedBtn = true;
      }
      return true; // 模态：吞掉所有触摸
    }
    if (type === 'touchend') {
      if (this.pressedBtn && this.btnRect && !this.done) {
        var r = this.btnRect;
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          this.done = true;
          this.result = true;
          G.AudioFX.coin();
        }
      }
      this.pressedBtn = false;
      return true;
    }
    return true;
  };

  G.MockAd = MockAd;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
