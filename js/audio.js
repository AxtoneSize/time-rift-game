/**
 * audio.js - 音效（WebAudio 合成，零外部音频文件）
 * 规范（§6.4）：找出「叮」（连击升调）/ 误点闷响 / 倒计时最后 10 秒心跳 / 通关 jingle
 * 移动端自动播放限制：首次触摸后 resume；可开关并持久化
 */
(function (G) {
  'use strict';
  var KEY = G.CONFIG.storageKeys.sound;

  var actx = null;
  try { actx = wx.createWebAudioContext ? wx.createWebAudioContext() : null; } catch (e) { actx = null; }

  function enabled() {
    var v = wx.getStorageSync(KEY);
    return v === '' ? true : !!v;
  }
  function setEnabled(v) { wx.setStorageSync(KEY, !!v); }

  function resume() {
    if (actx && actx.state === 'suspended' && actx.resume) {
      try { actx.resume(); } catch (e) { }
    }
  }

  /** 基础音符：freq(Hz) 起始频率，dur 秒，type 波形，slide 到目标频率 */
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!actx || !enabled()) return;
    try {
      var t0 = actx.currentTime + (delay || 0);
      var osc = actx.createOscillator();
      var gain = actx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.22, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain); gain.connect(actx.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    } catch (e) { }
  }

  var AudioFX = {
    resume: resume,
    isEnabled: enabled,
    setEnabled: setEnabled,

    /** 找出：叮，combo 连击升调（1/2/3...） */
    ding: function (combo) {
      var base = 880 * Math.pow(1.12, Math.min(combo - 1, 5));
      tone(base, 0.16, 'sine', 0.25);
      tone(base * 1.5, 0.22, 'sine', 0.14, null, 0.04);
    },

    /** 误点：闷响 */
    thud: function () {
      tone(180, 0.14, 'triangle', 0.22, 90);
    },

    /** 最后 10 秒心跳 */
    heartbeat: function () {
      tone(70, 0.09, 'sine', 0.3);
      tone(60, 0.1, 'sine', 0.24, null, 0.14);
    },

    /** 找齐全部：通关 jingle */
    win: function () {
      var seq = [523, 659, 784, 1046];
      for (var i = 0; i < seq.length; i++) {
        tone(seq[i], 0.2, 'sine', 0.2, null, i * 0.12);
      }
      tone(1318, 0.4, 'sine', 0.16, null, 0.5);
    },

    /** 金币入账 */
    coin: function () {
      tone(1318, 0.1, 'sine', 0.16);
      tone(1760, 0.14, 'sine', 0.13, null, 0.06);
    },

    /** 时间回跳（续时成功） */
    rewind: function () {
      tone(300, 0.5, 'sine', 0.16, 1200);
    }
  };

  G.AudioFX = AudioFX;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
