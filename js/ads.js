/**
 * ads.js - 激励视频广告封装（§3.3：全部为用户主动触发的激励视频）
 * 上线前在 CONFIG.adUnitIds 填入真实 adUnitId；
 * 无填充 / 开发环境 / 预览版 → 走游戏内模拟广告兜底（满足提审项：无填充有兜底文案）。
 *
 * 用法：
 *   Ads.play('freeHint', {
 *     onMock:   function(){ /* 打开游戏内模拟广告弹层，结束时回调 onReward(true) *\/ },
 *     onReward: function(){ /* 立即发奖，1 秒内给可见奖励（§3.5 铁律） *\/ },
 *     onFail:   function(){ /* 降级文案 *\/ }
 *   });
 */
(function (G) {
  'use strict';
  var IDS = function () { return G.CONFIG.adUnitIds; };

  var cache = {}; // slot -> RewardedVideoAd

  function createAd(slot) {
    var id = IDS()[slot];
    if (!G.__IS_MINIGAME__ || !id || !wx.createRewardedVideoAd) return null;
    if (cache[slot]) return cache[slot];
    try {
      var ad = wx.createRewardedVideoAd({ adUnitId: id });
      ad.onError(function (err) { console.warn('[ads] onError', slot, err); });
      cache[slot] = ad;
      return ad;
    } catch (e) {
      console.warn('[ads] create failed', slot, e);
      return null;
    }
  }

  var Ads = {
    /** 是否有真实广告位 */
    hasRealAd: function (slot) { return !!createAd(slot); },

    /**
     * 播放激励视频。真实广告可用 → 拉起；否则回调 onMock 让调用方展示模拟广告。
     */
    play: function (slot, cb) {
      cb = cb || {};
      var ad = createAd(slot);
      if (!ad) {
        if (cb.onMock) cb.onMock();
        else if (cb.onReward) cb.onReward(); // 无模拟兜底时直接发奖，避免卡死流程
        return;
      }
      var settled = false;
      var onClose = function (res) {
        if (settled) return;
        settled = true;
        if (res && res.isEnded) { if (cb.onReward) cb.onReward(); }
        else { if (cb.onFail) cb.onFail(); }
      };
      var onErr = function () {
        if (settled) return;
        settled = true;
        if (cb.onMock) cb.onMock();       // 拉起失败 → 模拟广告兜底
        else if (cb.onFail) cb.onFail();
      };
      ad.offClose(onClose); ad.onClose(onClose);
      ad.offError(onErr); ad.onError(onErr);
      ad.show().catch(function () {
        // 首次 show 失败重试一次（官方推荐处理）
        ad.load().then(function () { return ad.show(); }).catch(onErr);
      });
    }
  };

  G.Ads = Ads;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
