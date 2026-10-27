/**
 * platform.js - 平台适配层
 * 在微信小游戏中 wx 原生存在，本文件是空操作；
 * 在浏览器预览版（index.html）中注入一个最小 wx mock，
 * 让游戏代码只面向 wx.* 编程，两端同源零分叉。
 *
 * 必须最先加载（index.html 第一个 script / game.js 第一行 require）。
 */
(function (G) {
  'use strict';
  if (typeof wx !== 'undefined') {
    G.__IS_MINIGAME__ = true;
    return; // 小游戏环境，原生 wx，不需要 mock
  }
  G.__IS_MINIGAME__ = false;

  // ---------- 浏览器 wx mock ----------
  var canvas = document.getElementById('game-canvas');
  var listeners = { touchstart: [], touchmove: [], touchend: [] };

  function toTouchList(e) {
    var t = (e.changedTouches && e.changedTouches[0]) || e.touches[0] || e;
    return [{ clientX: t.clientX, clientY: t.clientY }];
  }

  function bindDom(type, wxType) {
    canvas.addEventListener(type, function (e) {
      e.preventDefault();
      var touches = toTouchList(e);
      listeners[wxType].forEach(function (fn) {
        fn({ touches: touches, timeStamp: e.timeStamp || Date.now() });
      });
    }, { passive: false });
  }
  bindDom('touchstart', 'touchstart');
  bindDom('touchmove', 'touchmove');
  bindDom('touchend', 'touchend');
  bindDom('mousedown', 'touchstart');
  bindDom('mousemove', 'touchmove');
  bindDom('mouseup', 'touchend');

  function sysInfo() {
    var rect = canvas.getBoundingClientRect();
    return {
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      windowWidth: rect.width || window.innerWidth,
      windowHeight: rect.height || window.innerHeight,
      safeArea: {
        top: 0,
        bottom: rect.height || window.innerHeight,
        left: 0,
        right: rect.width || window.innerWidth,
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight
      },
      platform: 'browser'
    };
  }

  var wxMock = {
    getSystemInfoSync: function () { return sysInfo(); },

    createCanvas: function () { return canvas; },

    onTouchStart: function (fn) { listeners.touchstart.push(fn); },
    onTouchMove: function (fn) { listeners.touchmove.push(fn); },
    onTouchEnd: function (fn) { listeners.touchend.push(fn); },
    offTouchStart: function (fn) { },
    offTouchMove: function (fn) { },
    offTouchEnd: function (fn) { },

    onWindowResize: function (fn) { window.addEventListener('resize', fn); },
    offWindowResize: function (fn) { },

    // 音频：优先标准 WebAudio（移动端需首次手势后 resume，audio.js 已处理）
    createWebAudioContext: function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      return AC ? new AC() : null;
    },

    // 存储
    setStorageSync: function (k, v) {
      try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { }
    },
    getStorageSync: function (k) {
      try {
        var raw = window.localStorage.getItem(k);
        return raw === null ? '' : JSON.parse(raw);
      } catch (e) { return ''; }
    },
    removeStorageSync: function (k) {
      try { window.localStorage.removeItem(k); } catch (e) { }
    },

    // 振动（浏览器降级为空）
    vibrateShort: function () { },
    vibrateLong: function () { },

    // 主动分享（预览版仅打印）
    shareAppMessage: function (opt) {
      console.log('[mock share]', opt && opt.title);
      if (opt && opt.success) opt.success();
    },

    // 激励视频广告：预览版返回 null，由 ads.js 走模拟广告兜底
    createRewardedVideoAd: function () { return null; },

    // 图片加载
    _createImage: function () { return new Image(); }
  };

  G.wx = wxMock;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
