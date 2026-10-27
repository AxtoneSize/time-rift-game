/**
 * scene-game.js - S4 游戏主界面 + 暂停/续时弹层 + 结算
 * 规则（策划方案 v2.0 §2.1/§3.1）：限时 90s，椭圆热区判定，教学关误点不扣时，
 * 星级按剩余时间，广告决策点：免费提示 / 续时 30 秒 / 双倍金币
 */
(function (G) {
  'use strict';
  var COL = function () { return G.CONFIG.colors; };
  var GP = function () { return G.CONFIG.gameplay; };

  /* ================= 结算弹层 ================= */

  function SettleOverlay(game, result) {
    this.game = game;
    this.result = result;      // {win, stars, timeLeft, baseCoins, zeroMiss, bonus, totalCoins, newCodex:[]}
    this.t = 0;
    this.coinShown = 0;        // 数字滚动
    this.starShown = 0;
    this.box = null;
    this.doubled = false;
    this._layout();
  }

  SettleOverlay.prototype._layout = function () {
    var V = G.Viewport;
    var w = Math.min(V.VW - 72, 600);
    var h = Math.min(V.VH * 0.72, 860);
    this.box = { x: (V.VW - w) / 2, y: (V.VH - h) / 2, w: w, h: h };
  };

  SettleOverlay.prototype.update = function (dt) {
    this.t += dt;
    var r = this.result;
    // 金币数字滚动
    var target = r.win ? r.totalCoins : 0;
    if (this.coinShown < target) {
      this.coinShown = Math.min(target, this.coinShown + dt * Math.max(60, target * 1.4));
    }
    // 星星逐颗点亮
    var starsTarget = r.win ? r.stars : 0;
    var should = Math.min(starsTarget, Math.floor(this.t / 0.45) + (this.t > 0.2 ? 1 : 0));
    if (should > this.starShown) {
      this.starShown = should;
      G.AudioFX.coin();
    }
  };

  SettleOverlay.prototype.close = function () { if (this.onClose) this.onClose(); };

  SettleOverlay.prototype.render = function (ctx) {
    var V = G.Viewport, c = COL(), ui = G.UI, r = this.result, b = this.box;
    ctx.save();
    ctx.fillStyle = 'rgba(20,12,4,0.7)';
    ctx.fillRect(0, 0, V.VW, V.VH);

    ui.creamPanel(ctx, b.x, b.y, b.w, b.h, 28);
    var cx = b.x + b.w / 2;

    // 标题
    ui.text(ctx, r.win ? '通 关 成 功' : '时 光 耗 尽', cx, b.y + 84, {
      size: 40, bold: true, color: r.win ? c.amberDeep : c.terra, shadow: false
    });
    ui.text(ctx, r.win ? '你揪出了全部穿越物！' : '找到 ' + r.foundCount + ' / ' + r.total + ' 个穿越物',
      cx, b.y + 136, { size: 18, color: '#7A6A52' });

    // 星星
    var sy = b.y + 250;
    var sr = 52;
    for (var i = 0; i < 3; i++) {
      var sx = cx + (i - 1) * 150;
      var big = i === 1;
      var rr = sr * (big ? 1.25 : 1);
      if (r.win && i < this.starShown) {
        var pop = 1 + Math.max(0, 0.35 - (this.t % 0.45) * 2) * (this.starShown === i + 1 ? 1 : 0);
        ui.star(ctx, sx, sy, rr * pop, c.goldBright);
      } else {
        ui.star(ctx, sx, sy, rr, 'rgba(43,30,18,0.16)');
      }
    }
    if (r.win) {
      var need = GP();
      ui.text(ctx, '剩余 ' + Math.ceil(r.timeLeft) + ' 秒 · ' +
        (r.stars === 3 ? '火眼金睛！' : r.stars === 2 ? '眼力不错！' : '有惊无险！'),
        cx, sy + 100, { size: 17, color: '#7A6A52' });
    }

    // 金币
    var gy = b.y + 430;
    ui.coin(ctx, cx - 84, gy, 30);
    ui.text(ctx, '+' + Math.round(this.coinShown), cx + 40, gy + 2, {
      size: 44, bold: true, color: c.amberDeep
    });
    if (r.win && r.zeroMiss && this.coinShown >= r.totalCoins) {
      ui.text(ctx, '零误点 · 火眼金睛 +5', cx, gy + 58, { size: 17, color: c.wallGreenDeep, bold: true });
    }

    // 新收录图鉴
    var ny = gy + 96;
    if (r.newCodex && r.newCodex.length) {
      r.newCodex.forEach(function (it, i) {
        ui.text(ctx, '📖 新收录：' + it.name, cx, ny + i * 34, { size: 16, color: c.ink });
      });
    } else if (r.win) {
      ui.text(ctx, '时光图鉴 +0 · 再玩一局试试零误点', cx, ny, { size: 15, color: '#9A8A70' });
    }

    // 按钮
    var bw = b.w - 120, bh = 92, bx = b.x + 60;
    var by1 = b.y + b.h - 130, by2 = b.y + b.h - 240, by3 = b.y + b.h - 348;

    if (r.win && !this.doubled) {
      var self = this;
      this.btnDouble = new ui.Button({
        x: bx, y: by3, w: bw, h: bh, r: 22, type: 'brick',
        label: '看广告 · 金币翻倍', fontSize: 24,
        onTap: function () {
          G.Ads.play('doubleCoin', {
            onMock: function () {
              var ad = new G.MockAd(function (ok) {
                if (ok) {
                  self.doubled = true;
                  G.Store.addCoins(r.totalCoins);
                  r.totalCoins *= 2;
                  G.AudioFX.coin();
                  self.game.manager.toast('金币翻倍！' + r.totalCoins + ' 枚已入袋');
                }
                self.game.manager.closeOverlay(ad);
              });
              self.game.manager.openOverlay(ad);
            },
            onReward: function () {
              self.doubled = true;
              G.Store.addCoins(r.totalCoins);
              r.totalCoins *= 2;
              G.AudioFX.coin();
            },
            onFail: function () { self.game.manager.toast('广告未完成，奖励保留原样'); }
          });
        }
      });
      this.btnDouble.render(ctx);
    }

    this.btnRetry = new ui.Button({
      x: bx, y: r.win ? by2 : by1, w: bw, h: bh, r: 22,
      label: '再 来 一 次', fontSize: 26,
      onTap: function () { self.game.restart(); }
    });
    this.btnRetry.render(ctx);

    this.btnHome = new ui.Button({
      x: bx, y: r.win ? by1 : by2, w: bw, h: bh, r: 22, type: 'dark',
      label: '返回主页', fontSize: 22,
      onTap: function () { self.close(); self.game.manager.goto('home'); }
    });
    this.btnHome.render(ctx);
    ctx.restore();
  };

  SettleOverlay.prototype.onTouch = function (type, x, y) {
    var btns = [this.btnDouble, this.btnRetry, this.btnHome];
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (!b) continue;
      if (type === 'touchstart') { b.pressed = b.contains(x, y); continue; }
      if (type === 'touchend') {
        var was = b.pressed; b.pressed = false;
        if (was && b.contains(x, y) && b.onTap) { b.onTap(); return true; }
      }
    }
    return true;
  };

  /* ================= 暂停弹层 ================= */

  function PauseOverlay(game) {
    this.game = game;
    var V = G.Viewport;
    var w = Math.min(V.VW - 120, 520);
    var h = 620;
    this.box = { x: (V.VW - w) / 2, y: (V.VH - h) / 2, w: w, h: h };
    var self = this;
    var bw = w - 100, bh = 96, bx = this.box.x + 50;
    this.btnResume = new G.UI.Button({
      x: bx, y: this.box.y + 150, w: bw, h: bh, r: 22, label: '继 续 侦 探', fontSize: 26,
      onTap: function () { self.close(); }
    });
    this.btnRetry = new G.UI.Button({
      x: bx, y: this.box.y + 270, w: bw, h: bh, r: 22, type: 'dark', label: '重新开始', fontSize: 22,
      onTap: function () { self.close(); self.game.restart(); }
    });
    this.btnHome = new G.UI.Button({
      x: bx, y: this.box.y + 390, w: bw, h: bh, r: 22, type: 'dark', label: '返回主页', fontSize: 22,
      onTap: function () { self.close(); self.game.manager.goto('home'); }
    });
  }
  PauseOverlay.prototype.close = function () { if (this.onClose) this.onClose(); };

  PauseOverlay.prototype.render = function (ctx) {
    var c = COL(), ui = G.UI, b = this.box;
    ctx.fillStyle = 'rgba(20,12,4,0.6)';
    ctx.fillRect(0, 0, G.Viewport.VW, G.Viewport.VH);
    ui.creamPanel(ctx, b.x, b.y, b.w, b.h, 28);
    ui.text(ctx, '暂 停', b.x + b.w / 2, b.y + 84, { size: 34, bold: true, color: c.ink });
    this.btnResume.render(ctx);
    this.btnRetry.render(ctx);
    this.btnHome.render(ctx);
    ui.text(ctx, '提示道具：' + G.Store.getHints() + ' 个 · 金币：' + G.Store.getCoins(),
      b.x + b.w / 2, b.y + b.h - 56, { size: 15, color: '#7A6A52' });
  };
  PauseOverlay.prototype.onTouch = function (type, x, y) {
    var btns = [this.btnResume, this.btnRetry, this.btnHome];
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (type === 'touchstart') { b.pressed = b.contains(x, y); continue; }
      if (type === 'touchend') {
        var was = b.pressed; b.pressed = false;
        if (was && b.contains(x, y) && b.onTap) { b.onTap(); return true; }
      }
    }
    return true;
  };

  /* ================= 续时决策点（时间归零） ================= */

  function TimeupOverlay(game) {
    this.game = game;
    var V = G.Viewport;
    var w = Math.min(V.VW - 120, 560);
    var h = 680;
    this.box = { x: (V.VW - w) / 2, y: (V.VH - h) / 2, w: w, h: h };
    var self = this;
    var bw = w - 100, bh = 96, bx = this.box.x + 50;
    this.btnAd = new G.UI.Button({
      x: bx, y: this.box.y + 210, w: bw, h: bh, r: 22,
      label: '看广告 · 时光倒流 +30s', fontSize: 23,
      onTap: function () {
        G.Ads.play('extraTime', {
          onMock: function () {
            var ad = new G.MockAd(function (ok) {
              self.game.manager.closeOverlay(ad);
              if (ok) self.game.grantExtraTime();
              else self.game.giveUp();
            });
            self.game.manager.openOverlay(ad);
          },
          onReward: function () { self.game.grantExtraTime(); },
          onFail: function () { self.game.giveUp(); }
        });
      }
    });
    this.btnGiveUp = new G.UI.Button({
      x: bx, y: this.box.y + 340, w: bw, h: bh, r: 22, type: 'dark',
      label: '就此结算', fontSize: 22,
      onTap: function () { self.close(); self.game.giveUp(); }
    });
  }
  TimeupOverlay.prototype.close = function () { if (this.onClose) this.onClose(); };

  TimeupOverlay.prototype.render = function (ctx) {
    var c = COL(), ui = G.UI, b = this.box;
    ctx.fillStyle = 'rgba(20,12,4,0.72)';
    ctx.fillRect(0, 0, G.Viewport.VW, G.Viewport.VH);
    ui.creamPanel(ctx, b.x, b.y, b.w, b.h, 28);
    var cx = b.x + b.w / 2;
    ui.text(ctx, '⏳', cx, b.y + 100, { size: 64 });
    ui.text(ctx, '时光沙漏碎了…', cx, b.y + 170, { size: 30, bold: true, color: c.ink });
    ui.text(ctx, '只差一点点，就看广告让时光倒流吧', cx, b.y + 216, { size: 16, color: '#7A6A52' });
    this.btnAd.render(ctx);
    this.btnGiveUp.render(ctx);
    ui.text(ctx, '广告结束后进度保留，无缝续玩', cx, b.y + b.h - 52, { size: 14, color: '#9A8A70' });
  };
  TimeupOverlay.prototype.onTouch = function (type, x, y) {
    var btns = [this.btnAd, this.btnGiveUp];
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (type === 'touchstart') { b.pressed = b.contains(x, y); continue; }
      if (type === 'touchend') {
        var was = b.pressed; b.pressed = false;
        if (was && b.contains(x, y) && b.onTap) { b.onTap(); return true; }
      }
    }
    return true;
  };

  /* ================= 游戏场景 ================= */

  function GameScene(manager) {
    this.manager = manager;
    this.level = G.LEVELS[0];
    this.img = null;
    this.phase = 'loading';   // loading | play | paused | timeup | settle
    this.t = 0;
    this.load();
    this.reset();
    this.build();
  }

  GameScene.prototype.load = function () {
    var self = this;
    G.loadImage(this.level.sceneImage, function (img) {
      self.img = img;
      if (self.phase === 'loading') self.phase = 'play';
    });
  };

  GameScene.prototype.reset = function () {
    this.timeLeft = this.level.timer;
    this.combo = 0;
    this.wrongCount = 0;
    this.found = {};
    this.ripples = [];
    this.floaters = [];
    this.toastMsg = null;
    this.hint = null;          // {itemId, until}
    this.flashUntil = 0;       // 免费提示金光
    this.lastHeartbeat = -1;
    this.winAt = 0;
    this.shake = 0;
  };

  GameScene.prototype.restart = function () {
    this.manager.closeAllOverlays();
    this.reset();
    this.phase = 'play';
  };

  GameScene.prototype.build = function () {
    var V = G.Viewport, self = this;
    var bs = 88;   // 最小热区 88×88（UI v1.2 适配规范）
    this.btnPause = new G.UI.Button({
      x: 28, y: V.safeTop + 22, w: bs, h: bs, r: 22, icon: '⏸', label: '', iconSize: 36,
      onTap: function () {
        if (self.phase !== 'play') return;
        self.phase = 'paused';
        var ov = new PauseOverlay(self);
        self.manager.openOverlay(ov);
        self.manager.onCloseOf(ov, function () { self.phase = 'play'; });
      }
    });
    this.btnHint = new G.UI.Button({
      x: V.VW - 28 - 150, y: V.VH - V.safeBottom - 148, w: 150, h: 108, r: 22,
      icon: '💡', label: '提示 ×' + G.Store.getHints(), iconSize: 30,
      onTap: function () { self.onHintTap(); }
    });
  };

  GameScene.prototype.cardRect = function () {
    var V = G.Viewport;
    return {
      x: 24, y: V.safeTop + 158,
      w: V.VW - 48,
      h: V.VH - V.safeBottom - 168 - (V.safeTop + 158) - 44
    };
  };

  GameScene.prototype.imageBox = function () {
    if (!this.img) return null;
    var card = this.cardRect();
    var s = Math.min(card.w / this.img.width, card.h / this.img.height);
    var dw = this.img.width * s, dh = this.img.height * s;
    return { x: card.x + (card.w - dw) / 2, y: card.y + (card.h - dh) / 2, w: dw, h: dh, s: s };
  };

  /** 虚拟坐标 → 场景图像素坐标 */
  GameScene.prototype.toImage = function (vx, vy) {
    var b = this.imageBox();
    if (!b) return null;
    return { x: (vx - b.x) / b.s, y: (vy - b.y) / b.s };
  };

  GameScene.prototype.grantExtraTime = function () {
    this.timeLeft += GP().extraTime;
    this.phase = 'play';
    G.AudioFX.rewind();
    this.manager.toast('时光倒流 +' + GP().extraTime + ' 秒！');
  };

  GameScene.prototype.giveUp = function () {
    var found = this.foundCount();
    var r = {
      win: false, stars: 0, timeLeft: 0,
      foundCount: found, total: this.level.anachronisms.length,
      baseCoins: 0, zeroMiss: this.wrongCount === 0, bonus: 0, totalCoins: 0,
      newCodex: []
    };
    this.phase = 'settle';
    var ov = new SettleOverlay(this, r);
    this.manager.openOverlay(ov);
    this.manager.onCloseOf(ov, function () { });
  };

  GameScene.prototype.foundCount = function () {
    return this.level.anachronisms.filter(function (it) { return this.found[it.id]; }, this).length;
  };

  GameScene.prototype.onWin = function () {
    var need = GP();
    var remaining = this.timeLeft;
    var stars = remaining >= need.starGreat ? 3 : (remaining >= need.starGood ? 2 : 1);
    var base = stars === 3 ? need.coin3 : stars === 2 ? need.coin2 : need.coin1;
    var zeroMiss = this.wrongCount === 0;
    var bonus = zeroMiss ? need.zeroMissBonus : 0;
    var total = base + bonus;

    // 新收录图鉴
    var newCodex = [];
    var self = this;
    this.level.anachronisms.forEach(function (it) {
      if (self.found[it.id] && !G.Store.isCodexFound(self.level.levelId, it.id)) newCodex.push(it);
    });
    this.level.anachronisms.forEach(function (it) {
      if (self.found[it.id]) G.Store.markCodex(self.level.levelId, it.id);
    });

    G.Store.addCoins(total);
    G.Store.setBest(this.level.levelId, stars);

    var r = {
      win: true, stars: stars, timeLeft: remaining,
      foundCount: this.level.anachronisms.length, total: this.level.anachronisms.length,
      baseCoins: base, zeroMiss: zeroMiss, bonus: bonus, totalCoins: total,
      newCodex: newCodex
    };
    this.phase = 'settle';
    var ov = new SettleOverlay(this, r);
    this.manager.openOverlay(ov);
    this.manager.onCloseOf(ov, function () { });
  };

  /* ---------- 提示 ---------- */

  GameScene.prototype.onHintTap = function () {
    if (this.phase !== 'play') return;
    var unfound = this.level.anachronisms.filter(function (it) { return !this.found[it.id]; }, this);
    if (!unfound.length) return;
    var self = this;

    if (G.Store.useHint()) {
      this.applyHint(unfound);
    } else {
      // 道具不足 → 广告决策点（§3.3 免费提示）
      G.Ads.play('freeHint', {
        onMock: function () {
          var ad = new G.MockAd(function (ok) {
            self.manager.closeOverlay(ad);
            if (ok) {
              G.Store.addHints(1);          // 奖励即时到账
              self.refreshHintLabel();
              var unf2 = self.level.anachronisms.filter(function (it) { return !self.found[it.id]; });
              self.flashUntil = self.t + GP().hintFullFlashMs;   // 金光扫过
              self.applyHint(unf2);          // 立刻呼吸高亮，回到找物状态
            }
          });
          self.manager.openOverlay(ad);
        },
        onReward: function () {
          G.Store.addHints(1);
          self.refreshHintLabel();
          var unf2 = self.level.anachronisms.filter(function (it) { return !self.found[it.id]; });
          self.applyHint(unf2);
        },
        onFail: function () { self.manager.toast('广告未完成，稍后再试'); }
      });
    }
  };

  GameScene.prototype.refreshHintLabel = function () {
    this.btnHint.label = '提示 ×' + G.Store.getHints();
  };

  GameScene.prototype.applyHint = function (unfound) {
    var pick = unfound[Math.floor(Math.random() * unfound.length)];
    this.hint = { itemId: pick.id, until: this.t + GP().hintBreathMs / 1000 };
    // 金光扫过全图 + 目标高亮（§3.5）
    this.flashUntil = Math.max(this.flashUntil, this.t + 0.6);
    this.refreshHintLabel();
    G.AudioFX.coin();
  };

  /* ---------- 更新 ---------- */

  GameScene.prototype.update = function (dt) {
    this.t += dt;
    if (this.manager.hasOverlay()) return;

    if (this.phase === 'play') {
      this.timeLeft -= dt;
      var sec = Math.ceil(this.timeLeft);
      if (sec <= 10 && sec >= 1 && sec !== this.lastHeartbeat) {
        this.lastHeartbeat = sec;
        G.AudioFX.heartbeat();
      }
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.phase = 'timeup';
        var ov = new TimeupOverlay(this);
        this.manager.openOverlay(ov);
        this.manager.onCloseOf(ov, function () { });
      }
    }
    // 粒子清理
    var now = this.t;
    this.ripples = this.ripples.filter(function (r) { return now - r.born < 0.6; });
    this.floaters = this.floaters.filter(function (f) { return now - f.born < 1.1; });
    if (this.hint && now > this.hint.until) this.hint = null;
  };

  /* ---------- 触摸 ---------- */

  GameScene.prototype.onTouch = function (type, x, y) {
    if (this.phase !== 'play') return true;
    var V = G.Viewport;
    // 按钮
    if (type === 'touchstart') {
      this.btnPause.pressed = this.btnPause.contains(x, y);
      this.btnHint.pressed = this.btnHint.contains(x, y);
      this.pdown = { x: x, y: y };
      return true;
    }
    if (type === 'touchend') {
      var bp = this.btnPause.pressed; this.btnPause.pressed = false;
      var bh = this.btnHint.pressed; this.btnHint.pressed = false;
      if (bp && this.btnPause.contains(x, y)) { this.btnPause.onTap(); return true; }
      if (bh && this.btnHint.contains(x, y)) { G.AudioFX.resume(); this.btnHint.onTap(); return true; }
      if (!this.pdown) return true;
      var dxs = x - this.pdown.x, dys = y - this.pdown.y;
      this.pdown = null;
      if (dxs * dxs + dys * dys > 40 * 40) return true;  // 视为滑动，不算点击
      this.handleTap(x, y);
      return true;
    }
    return true;
  };

  GameScene.prototype.handleTap = function (vx, vy) {
    var b = this.imageBox();
    if (!b) return;
    var c = COL();

    // 场景图外点击 → 轻提示
    if (vx < b.x || vx > b.x + b.w || vy < b.y || vy > b.y + b.h) {
      this.manager.toast('在画里找找穿越物吧');
      return;
    }

    var p = this.toImage(vx, vy);
    var self = this;

    // 命中检测（椭圆热区）
    var hit = null;
    for (var i = 0; i < this.level.anachronisms.length; i++) {
      var it = this.level.anachronisms[i];
      if (this.found[it.id]) continue;
      var dx = (p.x - it.x) / it.rx, dy = (p.y - it.y) / it.ry;
      if (dx * dx + dy * dy <= 1) { hit = it; break; }
    }

    if (hit) {
      this.found[hit.id] = true;
      this.combo += 1;
      // 虚拟坐标下的中心
      var cxv = b.x + hit.x * b.s, cyv = b.y + hit.y * b.s;
      this.ripples.push({ x: cxv, y: cyv, born: this.t, gold: true });
      G.AudioFX.ding(this.combo);
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) { }
      this.floaters.push({ text: '✓ ' + hit.name, x: cxv, y: cyv - hit.ry * b.s - 16, born: this.t, gold: true });
      if (this.combo >= 2) this.toastMsg = { text: '连击 ×' + this.combo + ' · 叮♪', born: this.t, life: 1.4 };
      var isNew = !G.Store.isCodexFound(this.level.levelId, hit.id);
      if (isNew) {
        this.toastMsg = { text: '📖 图鉴新收录：' + hit.name, born: this.t, life: 1.6 };
      }
      // 全部找出
      if (this.foundCount() === this.level.anachronisms.length) {
        G.AudioFX.win();
        this.winAt = this.t;
        var self2 = this;
        setTimeout(function () { if (self2.phase === 'winning') self2.onWin(); }, 1100);
        this.phase = 'winning';
      }
    } else {
      // 误点
      this.combo = 0;
      this.wrongCount += 1;
      this.ripples.push({ x: vx, y: vy, born: this.t, gold: false });
      this.shake = 0.25;
      G.AudioFX.thud();
      if (this.level.isTutorial) {
        this.toastMsg = { text: '教学关：误点不扣时，继续找！', born: this.t, life: 1.5 };
      } else {
        this.timeLeft = Math.max(0, this.timeLeft - GP().wrongPenalty);
        this.floaters.push({ text: '-' + GP().wrongPenalty + 's', x: vx, y: vy - 30, born: this.t, gold: false });
        if (this.timeLeft <= 0) { /* update 循环会处理 timeup */ }
      }
    }
  };

  /* ---------- 渲染 ---------- */

  GameScene.prototype.render = function (ctx) {
    var V = G.Viewport, c = COL(), ui = G.UI, self = this;

    // 背景：场景图 cover + 深棕压暗（沉浸式）
    ctx.fillStyle = c.ink;
    ctx.fillRect(0, 0, V.VW, V.VH);
    if (this.img) {
      var iw = this.img.width, ih = this.img.height;
      var s = Math.max(V.VW / iw, V.VH / ih);
      var dw = iw * s, dh = ih * s;
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.drawImage(this.img, (V.VW - dw) / 2, (V.VH - dh) / 2, dw, dh);
      ctx.restore();
    }

    // 标题行
    ui.text(ctx, this.level.chapterName + ' · ' + this.level.levelName,
      V.VW / 2, V.safeTop + 68, { size: 20, color: c.creamDim, bold: true });

    // ---- 场景卡片 ----
    var card = this.cardRect();
    var box = this.imageBox();

    if (this.img && box) {
      ctx.save();
      // 摇晃（误点反馈）
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - 0.016);
        ctx.translate(Math.sin(this.t * 60) * this.shake * 12, 0);
      }
      // 卡片底与裁剪
      ui.roundRectPath(ctx, card.x - 4, card.y - 4, card.w + 8, card.h + 8, 22);
      ctx.fillStyle = 'rgba(43,30,18,0.85)';
      ctx.fill();
      ctx.strokeStyle = c.lineWarm;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ui.roundRectPath(ctx, card.x, card.y, card.w, card.h, 18);
      ctx.clip();
      ctx.drawImage(this.img, box.x, box.y, box.w, box.h);

      // 教学关角标
      if (this.level.isTutorial) {
        ui.glassPanel(ctx, card.x + 16, card.y + 16, 250, 52, 26);
        ui.text(ctx, '🎓 教学关 · 误点不扣时', card.x + 141, card.y + 43, { size: 18, color: c.cream, bold: true });
      }

      // 已找出的金圈脉冲
      for (var i = 0; i < this.level.anachronisms.length; i++) {
        var it = this.level.anachronisms[i];
        if (!this.found[it.id]) continue;
        ui.goldRing(ctx, box.x + it.x * box.s, box.y + it.y * box.s,
          Math.max(it.rx * box.s, 18), Math.max(it.ry * box.s, 18), (this.t * 0.9) % 1);
      }

      // 提示呼吸高亮
      if (this.hint) {
        var hit2 = this.level.anachronisms.filter(function (x2) { return x2.id === self.hint.itemId; })[0];
        if (hit2) {
          ui.breathRing(ctx, box.x + hit2.x * box.s, box.y + hit2.y * box.s,
            Math.max(hit2.rx * box.s, 20), Math.max(hit2.ry * box.s, 20), this.t);
        }
      }

      // 免费提示金光扫过
      if (this.t < this.flashUntil) {
        var fp = (this.t % 0.6) / 0.6;
        var fx = card.x + card.w * fp;
        var g = ctx.createLinearGradient(fx - 80, 0, fx + 80, 0);
        g.addColorStop(0, 'rgba(255,215,94,0)');
        g.addColorStop(0.5, 'rgba(255,215,94,0.4)');
        g.addColorStop(1, 'rgba(255,215,94,0)');
        ctx.fillStyle = g;
        ctx.fillRect(card.x, card.y, card.w, card.h);
      }

      // 波纹
      this.ripples.forEach(function (r) {
        var age = (self.t - r.born) / 0.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 20 + age * 70, 0, Math.PI * 2);
        ctx.strokeStyle = r.gold ? 'rgba(255,215,94,' + (1 - age) + ')' : 'rgba(201,88,60,' + (1 - age) + ')';
        ctx.lineWidth = 6 * (1 - age) + 2;
        ctx.stroke();
      });

      // 漂浮文字
      this.floaters.forEach(function (f) {
        var age = (self.t - f.born) / 1.1;
        ctx.globalAlpha = 1 - age;
        ui.text(ctx, f.text, f.x, f.y - age * 46, {
          size: 24, bold: true, color: f.gold ? c.goldBright : c.terra, shadow: true
        });
        ctx.globalAlpha = 1;
      });

      // 顶部 toast（连击/图鉴/误点教学）
      if (this.toastMsg && this.t - this.toastMsg.born < this.toastMsg.life) {
        var tw = ctx.measureText(this.toastMsg.text).width;
        ui.glassPanel(ctx, V.VW / 2 - 240, card.y + 22, 480, 62, 31, true);
        ui.text(ctx, this.toastMsg.text, V.VW / 2, card.y + 54, {
          size: 21, color: c.goldText, bold: true
        });
      }
      ctx.restore(); // clip
      ctx.restore(); // shake
    } else {
      // loading
      ui.text(ctx, '时光画卷加载中…', V.VW / 2, card.y + card.h / 2, { size: 20, color: c.creamDim });
    }

    // ---- HUD：暂停 + 时钟 + 时间条 ----
    this.btnPause.render(ctx);

    var hy = V.safeTop + 64;
    var clockX = 28 + 88 + 26 + 52;
    // 时钟
    ctx.beginPath();
    ctx.arc(clockX, hy, 52, 0, Math.PI * 2);
    ctx.fillStyle = c.overlayDeep;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,201,99,0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();
    var lowTime = this.timeLeft <= 10 && this.phase === 'play';
    ui.text(ctx, String(Math.ceil(this.timeLeft)), clockX, hy + 1, {
      size: 30, bold: true, color: lowTime ? '#FF8A6A' : c.goldText
    });

    // 时间条
    var barX = clockX + 52 + 24, barW = V.VW - barX - 28;
    var ratio = Math.max(0, Math.min(1, this.timeLeft / this.level.timer));
    ui.roundRectPath(ctx, barX, hy - 13, barW, 26, 13);
    ctx.fillStyle = 'rgba(43,30,18,0.55)';
    ctx.fill();
    ctx.strokeStyle = c.lineWarm;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (ratio > 0.01) {
      ui.roundRectPath(ctx, barX + 2, hy - 11, (barW - 4) * ratio, 22, 11);
      var tg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      if (lowTime) { tg.addColorStop(0, '#E07856'); tg.addColorStop(1, c.terra); }
      else { tg.addColorStop(0, c.goldBright); tg.addColorStop(1, c.amber); }
      ctx.fillStyle = tg;
      ctx.fill();
    }

    // ---- Footer：找到进度点 + 提示 ----
    var dotsY = V.VH - V.safeBottom - 94;
    var total = this.level.anachronisms.length;
    var dotW = 52, gap = 18;
    var dotsW = total * dotW + (total - 1) * gap;
    var startX = (V.VW - dotsW) / 2 - 70;
    for (var d = 0; d < total; d++) {
      var dx0 = startX + d * (dotW + gap);
      var on = d < this.foundCount();
      ctx.beginPath();
      ctx.arc(dx0 + dotW / 2, dotsY, dotW / 2, 0, Math.PI * 2);
      if (on) {
        var dg = ctx.createLinearGradient(0, dotsY - 26, 0, dotsY + 26);
        dg.addColorStop(0, c.goldBright); dg.addColorStop(1, c.amber);
        ctx.fillStyle = dg;
      } else {
        ctx.fillStyle = c.overlay;
      }
      ctx.fill();
      ctx.strokeStyle = on ? 'rgba(255,244,214,0.7)' : c.lineWarm;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ui.text(ctx, on ? '✓' : '?', dx0 + dotW / 2, dotsY + 1, {
        size: 22, bold: true, color: on ? '#7A4A1A' : 'rgba(251,244,226,0.4)'
      });
    }
    this.btnHint.render(ctx);
  };

  G.GameScene = GameScene;
  G.SettleOverlay = SettleOverlay;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
