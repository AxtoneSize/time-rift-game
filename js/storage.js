/**
 * storage.js - 本地存档（§10：本地存档进度/金币/图鉴）
 */
(function (G) {
  'use strict';
  var K = G.CONFIG.storageKeys;
  var INIT = G.CONFIG.initPlayer;

  function getNum(key, def) {
    var v = wx.getStorageSync(key);
    return (v === '' || v == null || isNaN(Number(v))) ? def : Number(v);
  }

  var Store = {
    getCoins: function () { return getNum(K.coins, INIT.coins); },
    addCoins: function (n) { wx.setStorageSync(K.coins, this.getCoins() + n); },

    getHints: function () { return getNum(K.hints, INIT.hints); },
    addHints: function (n) { wx.setStorageSync(K.hints, this.getHints() + n); },
    useHint: function () {
      var h = this.getHints();
      if (h <= 0) return false;
      wx.setStorageSync(K.hints, h - 1);
      return true;
    },

    getBest: function (levelId) {
      var v = wx.getStorageSync(K.best + levelId);
      return (v === '' || v == null) ? 0 : Number(v);
    },
    setBest: function (levelId, stars) {
      if (stars > this.getBest(levelId)) wx.setStorageSync(K.best + levelId, stars);
    },

    /** 时光图鉴：穿越物是否已收录 */
    isCodexFound: function (levelId, itemId) {
      return !!wx.getStorageSync(K.codex + levelId + '_' + itemId);
    },
    markCodex: function (levelId, itemId) {
      wx.setStorageSync(K.codex + levelId + '_' + itemId, true);
    },

    soundOn: function () {
      var v = wx.getStorageSync(K.sound);
      return v === '' ? true : !!v;
    },
    setSoundOn: function (v) { wx.setStorageSync(K.sound, !!v); }
  };

  G.Store = Store;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
