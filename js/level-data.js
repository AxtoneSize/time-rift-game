/**
 * level-data.js - 关卡数据（策划方案 v2.0 §10 交付规格）
 * 坐标基于场景图原始像素（scene_xiaomaibu.jpg：1521x973），
 * {x, y, rx, ry} 为穿越物中心点椭圆热区（rx/ry 为半轴）。
 * 可用 tools/validate_levels.js 校验三区分散与边界。
 */
(function (G) {
  'use strict';

  var LEVEL_1 = {
    levelId: 1,
    chapterId: 1,
    chapterName: '第1章 · 小镇夏天',
    levelName: '90年代小卖部',
    sceneImage: 'assets/scenes/scene_xiaomaibu.jpg',
    sceneW: 1521,
    sceneH: 973,
    timer: 90,
    isTutorial: true,          // 1-5 关为教学关：误点只提示不扣时（§3.1）
    anachronisms: [
      {
        id: 'milktea',
        name: '珍珠奶茶杯',
        x: 172, y: 686, rx: 62, ry: 80,
        difficulty: 'easy',
        lore: '珍珠奶茶：90 年代可没有外卖奶茶，想喝甜的只能自己煮糖水——「珍珠」要到 2000 年后才流行起来。'
      },
      {
        id: 'phone',
        name: '智能手机',
        x: 553, y: 701, rx: 68, ry: 50,
        difficulty: 'easy',
        lore: '智能手机：90 年代联络全靠写信和座机，「大哥大」要两万多一台还得托关系，是整条街的体面。'
      },
      {
        id: 'bike',
        name: '共享单车',
        x: 1240, y: 650, rx: 185, ry: 235,
        difficulty: 'easy',
        lore: '共享单车：90 年代的自行车要凭票买、上牌照，二八大杠一骑就是十年，扫一下就骑走？想都不敢想。'
      }
    ],
    decoys: [],                // 第 1 章 decoy 零出现（§5）
    starThresholds: [20, 45]   // 剩余 >=45s 三星 / >=20s 两星
  };

  G.LEVELS = [LEVEL_1];
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
