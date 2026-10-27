/**
 * ui.js - 绘制组件库（UI 设计 v1.2 插画沉浸版）
 * 统一语言：深棕半透明浮层 + 奶油细描边 + 大圆角；暖琥珀渐变主按钮
 */
(function (G) {
  'use strict';
  var C = function () { return G.CONFIG.colors; };

  // ---------- 基础绘制 ----------

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** 深棕半透明玻璃浮层（HUD/入口/弹窗统一公式） */
  function glassPanel(ctx, x, y, w, h, r, deep) {
    var c = C();
    ctx.save();
    roundRectPath(ctx, x, y, w, h, r == null ? 20 : r);
    ctx.fillStyle = deep ? c.overlayDeep : c.overlay;
    ctx.fill();
    ctx.strokeStyle = c.lineWarm;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /** 暖琥珀渐变主按钮 */
  function amberButton(ctx, x, y, w, h, r) {
    var c = C();
    ctx.save();
    var grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, c.amberLight);
    grd.addColorStop(0.55, c.amber);
    grd.addColorStop(1, c.amberDeep);
    roundRectPath(ctx, x, y, w, h, r == null ? 20 : r);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,244,214,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 内高光
    roundRectPath(ctx, x + 3, y + 3, w - 6, h * 0.42, r ? r - 2 : 16);
    ctx.fillStyle = 'rgba(255,240,200,0.28)';
    ctx.fill();
    ctx.restore();
  }

  function darkButton(ctx, x, y, w, h, r) {
    var c = C();
    ctx.save();
    var grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, 'rgba(60,42,24,0.92)');
    grd.addColorStop(1, c.overlay);
    roundRectPath(ctx, x, y, w, h, r == null ? 20 : r);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = c.lineWarm;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /** 奶油纸质感弹窗面板（弹窗底色：奶油纸+深褐描边） */
  function creamPanel(ctx, x, y, w, h, r) {
    var c = C();
    ctx.save();
    ctx.shadowColor = 'rgba(20,12,4,0.5)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRectPath(ctx, x, y, w, h, r == null ? 24 : r);
    ctx.fillStyle = c.cream;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // ---------- 文本 ----------

  function text(ctx, str, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = (opts.bold ? '900 ' : opts.weight || '') + (opts.size || 16) + 'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = opts.color || C().cream;
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    if (opts.shadow) {
      ctx.shadowColor = opts.shadowColor || 'rgba(30,15,0,0.55)';
      ctx.shadowBlur = opts.shadowBlur || 8;
      ctx.shadowOffsetY = opts.shadowOffsetY == null ? 1 : opts.shadowOffsetY;
    }
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function amberText(ctx, str, x, y, size, opts) {
    opts = opts || {};
    opts.color = opts.color || C().goldText;
    text(ctx, str, x, y, opts);
  }

  // ---------- 小图标 ----------

  function coin(ctx, x, y, r) {
    ctx.save();
    var grd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    grd.addColorStop(0, '#FFE29A');
    grd.addColorStop(0.65, '#F4B942');
    grd.addColorStop(1, '#C8901D');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,90,10,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function star(ctx, cx, cy, r, fill) {
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      var a2 = a + Math.PI / 5;
      var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      var qx = cx + Math.cos(a2) * r * 0.45, qy = cy + Math.sin(a2) * r * 0.45;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      ctx.lineTo(qx, qy);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (fill !== 'rgba(43,30,18,0.25)') {
      ctx.strokeStyle = 'rgba(255,244,214,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** 椭圆路径（用变换+arc 实现，规避部分环境 ctx.ellipse 兼容问题） */
  function ellipsePath(ctx, cx, cy, rx, ry) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.restore();
  }

  /** 已找出穿越物的金圈脉冲（§6.4：金圈=找对） */
  function goldRing(ctx, cx, cy, rx, ry, t) {
    // t: 0~1 相位，两圈脉冲
    ctx.save();
    for (var k = 0; k < 2; k++) {
      var ph = ((t + k * 0.5) % 1);
      var a = 1 - ph;
      ellipsePath(ctx, cx, cy, rx * (1 + ph * 0.5), ry * (1 + ph * 0.5));
      ctx.strokeStyle = 'rgba(255,215,94,' + (a * 0.9).toFixed(3) + ')';
      ctx.lineWidth = 4 * a + 1.5;
      ctx.stroke();
    }
    ellipsePath(ctx, cx, cy, rx, ry);
    ctx.strokeStyle = 'rgba(255,215,94,0.95)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  /** 提示呼吸高亮 */
  function breathRing(ctx, cx, cy, rx, ry, t) {
    var s = 1 + Math.sin(t * 5) * 0.12;
    ctx.save();
    ellipsePath(ctx, cx, cy, rx * s, ry * s);
    ctx.strokeStyle = 'rgba(255,201,99,0.95)';
    ctx.lineWidth = 5;
    ctx.stroke();
    ellipsePath(ctx, cx, cy, rx * s * 1.25, ry * s * 1.25);
    ctx.strokeStyle = 'rgba(255,201,99,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // ---------- Button 类 ----------

  function Button(opts) {
    this.x = opts.x; this.y = opts.y; this.w = opts.w; this.h = opts.h;
    this.r = opts.r == null ? 20 : opts.r;
    this.label = opts.label || '';
    this.icon = opts.icon || '';          // emoji 或 null
    this.iconSize = opts.iconSize || 20;
    this.type = opts.type || 'amber';     // amber | dark | brick
    this.fontSize = opts.fontSize || 18;
    this.letterSpacing = opts.letterSpacing == null ? 4 : opts.letterSpacing;
    this.enabled = opts.enabled !== false;
    this.pressed = false;
    this.onTap = opts.onTap || null;
  }

  Button.prototype.contains = function (px, py) {
    return this.enabled && px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  };

  Button.prototype.render = function (ctx) {
    var x = this.x, y = this.y;
    var press = this.pressed ? 2 : 0;
    y += press;
    var c = C();
    ctx.save();
    if (!this.enabled) ctx.globalAlpha = 0.55;
    if (this.type === 'amber') amberButton(ctx, x, y, this.w, this.h, this.r);
    else if (this.type === 'brick') {
      var g = ctx.createLinearGradient(0, y, 0, y + this.h);
      g.addColorStop(0, '#D9744F'); g.addColorStop(1, c.terra);
      roundRectPath(ctx, x, y, this.w, this.h, this.r);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,190,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    } else darkButton(ctx, x, y, this.w, this.h, this.r);

    var ty = y + this.h / 2 + 1;
    if (this.icon) {
      text(ctx, this.icon, x + this.w / 2, y + this.h * 0.32, { size: this.iconSize });
      ty = y + this.h * 0.68;
      text(ctx, this.label, x + this.w / 2, ty, {
        size: this.fontSize - 3, color: '#FFF9EA', bold: false, weight: '700 '
      });
    } else {
      text(ctx, this.label, x + this.w / 2, ty, {
        size: this.fontSize, color: '#FFF9EA', bold: true,
        shadow: true
      });
    }
    ctx.restore();
  };

  // ---------- 全局挂载 ----------

  G.UI = {
    roundRectPath: roundRectPath,
    glassPanel: glassPanel,
    amberButton: amberButton,
    darkButton: darkButton,
    creamPanel: creamPanel,
    text: text,
    coin: coin,
    star: star,
    goldRing: goldRing,
    breathRing: breathRing,
    Button: Button
  };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
