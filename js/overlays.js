/**
 * overlays.js - 通用弹层：设置、时光图鉴（深色遮罩 + 奶油纸面板，UI v1.2 保留项）
 */
(function (G) {
  'use strict';
  var COL = function () { return G.CONFIG.colors; };

  function backdrop(ctx) {
    var V = G.Viewport;
    ctx.save();
    ctx.fillStyle = 'rgba(20,12,4,0.6)';
    ctx.fillRect(0, 0, V.VW, V.VH);
    ctx.restore();
  }

  function panelBox(wRatio, hRatio) {
    var V = G.Viewport;
    var w = Math.min(V.VW * wRatio, 640);
    var h = Math.min(V.VH * hRatio, w * 1.5);
    return { x: (V.VW - w) / 2, y: (V.VH - h) / 2, w: w, h: h };
  }

  function closeBtnRect(box) {
    return { x: box.x + box.w - 88, y: box.y + 14, w: 72, h: 72 };
  }

  function renderClose(ctx, r) {
    var c = COL();
    G.UI.roundRectPath(ctx, r.x, r.y, r.w, r.h, 18);
    ctx.fillStyle = 'rgba(43,30,18,0.08)';
    ctx.fill();
    G.UI.text(ctx, '✕', r.x + r.w / 2, r.y + r.h / 2 + 1, { size: 26, color: c.ink, bold: true });
  }

  function hitClose(self, type, x, y) {
    var r = closeBtnRect(self.box);
    if (type === 'touchstart') {
      self.closePressed = x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    } else if (type === 'touchend') {
      var hit = self.closePressed && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
      self.closePressed = false;
      if (hit) self.close();
    }
    return true; // 模态吞掉全部触摸
  }

  // ================= 设置弹层 =================

  function SettingsOverlay() {
    this.box = panelBox(0.72, 0.4);
    this.onClose = null;
  }
  SettingsOverlay.prototype.close = function () { if (this.onClose) this.onClose(); };

  SettingsOverlay.prototype.render = function (ctx) {
    var V = G.Viewport, c = COL(), b = this.box;
    backdrop(ctx);
    G.UI.creamPanel(ctx, b.x, b.y, b.w, b.h, 24);
    G.UI.text(ctx, '设 置', b.x + b.w / 2, b.y + 64, { size: 24, color: c.ink, bold: true });

    var on = G.Store.soundOn();
    var ry = b.y + 130;
    G.UI.text(ctx, '音效', b.x + 70, ry, { size: 18, color: c.ink, align: 'left' });
    // 开关
    var sw = 96, sh = 52, sx = b.x + b.w - 70 - sw, sy = ry - sh / 2;
    G.UI.roundRectPath(ctx, sx, sy, sw, sh, sh / 2);
    ctx.fillStyle = on ? c.amber : 'rgba(43,30,18,0.25)';
    ctx.fill();
    var kx = on ? sx + sw - sh / 2 - 4 : sx + sh / 2 + 4;
    ctx.beginPath();
    ctx.arc(kx, ry, sh / 2 - 6, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF9EA';
    ctx.fill();
    this.soundRect = { x: sx, y: sy, w: sw, h: sh };

    G.UI.text(ctx, '穿越找茬 ' + G.CONFIG.version, b.x + b.w / 2, b.y + b.h - 60, { size: 13, color: '#7A6A52' });
    renderClose(ctx, closeBtnRect(b));
  };

  SettingsOverlay.prototype.onTouch = function (type, x, y) {
    if (type === 'touchstart') {
      var r = this.soundRect;
      this.soundPressed = r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    } else if (type === 'touchend') {
      if (this.soundPressed && this.soundRect) {
        var r = this.soundRect;
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          var v = !G.Store.soundOn();
          G.Store.setSoundOn(v);
          G.AudioFX.setEnabled(v);
          if (v) G.AudioFX.coin();
        }
      }
      this.soundPressed = false;
    }
    return hitClose(this, type, x, y);
  };

  // ================= 时光图鉴弹层 =================

  function CodexOverlay() {
    this.box = panelBox(0.86, 0.78);
    this.onClose = null;
  }
  CodexOverlay.prototype.close = function () { if (this.onClose) this.onClose(); };

  CodexOverlay.prototype.render = function (ctx) {
    var V = G.Viewport, c = COL(), b = this.box, ui = G.UI;
    var level = G.LEVELS[0];
    backdrop(ctx);
    ui.creamPanel(ctx, b.x, b.y, b.w, b.h, 24);

    ui.text(ctx, '时 光 图 鉴', b.x + b.w / 2, b.y + 60, { size: 24, color: c.ink, bold: true });
    var found = 0;
    level.anachronisms.forEach(function (it) { if (G.Store.isCodexFound(level.levelId, it.id)) found++; });
    var pct = Math.round(found / level.anachronisms.length * 100);
    ui.text(ctx, '第' + level.chapterId + '章 收集度 ' + pct + '%  (' + found + '/' + level.anachronisms.length + ')',
      b.x + b.w / 2, b.y + 100, { size: 14, color: '#7A6A52' });

    var cardH = Math.min(160, (b.h - 220) / level.anachronisms.length - 16);
    var gap = 16;
    var cy = b.y + 132;
    var self = this;
    level.anachronisms.forEach(function (it, i) {
      var y = cy + i * (cardH + gap);
      var x = b.x + 36, w = b.w - 72;
      ui.roundRectPath(ctx, x, y, w, cardH, 16);
      ctx.fillStyle = 'rgba(43,30,18,0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(43,30,18,0.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      var isFound = G.Store.isCodexFound(level.levelId, it.id);
      // 左侧徽标
      var icx = x + 56, icy = y + cardH / 2;
      if (isFound) {
        ui.coin(ctx, icx, icy, 26);
        ui.text(ctx, '✓', icx, icy + 1, { size: 22, color: '#7A4A1A', bold: true });
      } else {
        ctx.beginPath();
        ctx.arc(icx, icy, 26, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(43,30,18,0.15)';
        ctx.fill();
        ui.text(ctx, '?', icx, icy + 1, { size: 22, color: 'rgba(43,30,18,0.4)', bold: true });
      }
      // 名称 + 文案
      ui.text(ctx, isFound ? it.name : '？？？', x + 100, y + 34, {
        size: 18, color: isFound ? c.ink : 'rgba(43,30,18,0.45)', bold: true, align: 'left'
      });
      if (isFound && cardH > 100) {
        // 简单换行
        var lore = it.lore;
        var maxChars = Math.max(14, Math.floor((w - 120) / 15));
        var lines = [];
        for (var s = 0; s < lore.length; s += maxChars) lines.push(lore.substring(s, s + maxChars));
        lines.slice(0, 3).forEach(function (ln, li) {
          ui.text(ctx, ln, x + 100, y + 66 + li * 24, { size: 13.5, color: '#5A4A34', align: 'left' });
        });
      } else if (!isFound) {
        ui.text(ctx, '揪出这个穿越物即可收录卡片', x + 100, y + cardH / 2 + 18, {
          size: 13, color: 'rgba(43,30,18,0.4)', align: 'left'
        });
      }
    });

    renderClose(ctx, closeBtnRect(b));
  };

  CodexOverlay.prototype.onTouch = function (type, x, y) {
    return hitClose(this, type, x, y);
  };

  // ================= 挂载 =================

  function makeOverlayManager() {
    var stack = [];
    return {
      push: function (o) { stack.push(o); },
      remove: function (o) {
        var i = stack.indexOf(o);
        if (i >= 0) stack.splice(i, 1);
      },
      clear: function () { stack.length = 0; },
      top: function () { return stack.length ? stack[stack.length - 1] : null; },
      update: function (dt) { if (stack.length) stack[stack.length - 1].update && stack[stack.length - 1].update(dt); },
      render: function (ctx) { for (var i = 0; i < stack.length; i++) stack[i].render(ctx); },
      /** 返回 true 表示触摸被弹层消费 */
      onTouch: function (type, x, y) {
        if (!stack.length) return false;
        stack[stack.length - 1].onTouch(type, x, y);
        return true;
      },
      onCloseOf: function (o, fn) { o.onClose = fn; }
    };
  }

  G.Overlays = {
    SettingsOverlay: SettingsOverlay,
    CodexOverlay: CodexOverlay,
    makeOverlayManager: makeOverlayManager
  };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
