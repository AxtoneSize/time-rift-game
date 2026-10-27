/**
 * config.js - 全局数值与色彩令牌
 * 色彩取自 UI 设计 v1.2《插画沉浸版》设计语言（从场景画取色）
 * 所有可调数值集中在这一处，改配置即可调数值（验收项）
 */
(function (G) {
  'use strict';

  var CONFIG = {
    // ---- 版本 ----
    version: 'v0.1.0',
    studio: '时光侦探社出品',

    // ---- 设计基准（UI v1.2：750x1624，胶囊安全区/底部小黑条运行时读取）----
    designWidth: 750,

    // ---- 色彩令牌 v1.2 ----
    colors: {
      ink: '#2B2018',          // 深褐墨：浮层底、深色文字
      cream: '#FBF4E2',        // 灯光奶油：浅文字/描边
      amber: '#E89B3C',        // 暖琥珀：主按钮
      amberLight: '#F0AC4E',
      amberDeep: '#C77B22',
      terra: '#C9583C',        // 雨棚砖红：强调/警示
      wallGreen: '#8FB08A',    // 青砖灰绿：成功/已通关
      wallGreenDeep: '#5F7D5C',
      gold: '#F4B942',         // 金：金币/星星/图鉴徽章
      goldBright: '#FFD75E',
      goldText: '#FFC963',
      overlay: 'rgba(43,30,18,0.45)',   // 深棕浮层 45%
      overlayDeep: 'rgba(43,30,18,0.62)',
      overlayDark: 'rgba(43,30,18,0.80)',
      lineWarm: 'rgba(251,244,226,0.35)', // 奶油细描边
      creamDim: 'rgba(251,244,226,0.55)'
    },

    // ---- 核心数值（策划方案 v2.0 §2.1 / §3.1 / §3.2）----
    gameplay: {
      level1Time: 90,            // 关卡限时（秒）
      wrongPenalty: 5,           // 误点扣秒（教学关不扣）
      starGreat: 45,             // 剩余 >= 45s → 3 星
      starGood: 20,              // 剩余 >= 20s → 2 星，否则 1 星
      coin3: 30, coin2: 20, coin1: 10,
      zeroMissBonus: 5,          // 零误点通关额外金币
      hintBreathMs: 2000,        // 提示高亮时长
      extraTime: 30,             // 广告续时秒数
      hintFullFlashMs: 600       // 免费提示"金光扫过"时长
    },

    // ---- 玩家初始资产 ----
    initPlayer: { coins: 0, hints: 3 },

    // ---- 存档键名 ----
    storageKeys: {
      coins: 'czz_coins',
      hints: 'czz_hints',
      best: 'czz_best_level_',
      sound: 'czz_sound_on',
      codex: 'czz_codex_'     // + levelId + '_' + itemId
    },

    // ---- 资源 ----
    assets: {
      sceneXiaomaibu: 'assets/scenes/scene_xiaomaibu.jpg'
    },

    // ---- 广告位（上线前替换为真实 adUnitId；为空时走模拟广告兜底）----
    adUnitIds: {
      freeHint: '',    // 免费提示
      extraTime: '',   // 续时 30 秒
      doubleCoin: '',  // 双倍金币（结算页）
      dailyGift: '',   // 每日礼包（后续版本）
      codexCard: ''    // 图鉴补卡（后续版本）
    }
  };

  G.CONFIG = CONFIG;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
