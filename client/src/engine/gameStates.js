/**
 * 遊戲階段狀態機列舉與中文名稱定義 (ES Module)
 */

export const GAME_PHASES = {
  // 準備階段
  WAITING: 'WAITING',                 // 大廳等待中
  ASSIGNING_ROLES: 'ASSIGNING_ROLES', // 發牌階段

  // 夜晚階段
  NIGHT_START: 'NIGHT_START',                 // 夜幕降臨（天黑請閉眼）
  NIGHT_CUPID: 'NIGHT_CUPID',                 // 邱比特牽線
  NIGHT_DREAMCATCHER: 'NIGHT_DREAMCATCHER',   // 攝夢人入夢
  NIGHT_GUARD: 'NIGHT_GUARD',                 // 守衛睜眼行動
  NIGHT_WEREWOLF: 'NIGHT_WEREWOLF',           // 狼人睜眼行動
  NIGHT_SEER: 'NIGHT_SEER',                   // 預言家睜眼行動
  NIGHT_WITCH: 'NIGHT_WITCH',                 // 女巫睜眼行動
  NIGHT_SILENCER: 'NIGHT_SILENCER',           // 禁言長老禁言
  NIGHT_SETTLE: 'NIGHT_SETTLE',               // 夜晚結算 (計算傷害、守護、解藥、毒藥、攝夢)

  // 白天階段
  DAY_ANNOUNCE: 'DAY_ANNOUNCE',       // 天亮公佈昨夜出局名單
  DAY_DISCUSSION: 'DAY_DISCUSSION',   // 白天自由/輪流發言階段
  KNIGHT_DUEL: 'KNIGHT_DUEL',         // 騎士決鬥動畫與結算
  DAY_VOTING: 'DAY_VOTING',           // 白天投票放逐階段
  DAY_VOTE_RESULT: 'DAY_VOTE_RESULT', // 票數結算公佈

  // 被動/特殊技能階段
  HUNTER_SHOOT: 'HUNTER_SHOOT',       // 獵人發動開槍技能階段

  // 結算
  GAME_OVER: 'GAME_OVER',             // 遊戲結束
};

// 階段中文名稱對照
export const PHASE_NAMES_ZH = {
  [GAME_PHASES.WAITING]: '大廳等待中',
  [GAME_PHASES.ASSIGNING_ROLES]: '發牌階段 🎴',
  [GAME_PHASES.NIGHT_START]: '夜幕降臨 🌙',
  [GAME_PHASES.NIGHT_CUPID]: '邱比特行動 💘',
  [GAME_PHASES.NIGHT_DREAMCATCHER]: '攝夢人行動 💤',
  [GAME_PHASES.NIGHT_GUARD]: '守衛行動 🛡️',
  [GAME_PHASES.NIGHT_WEREWOLF]: '狼人行動 🐺',
  [GAME_PHASES.NIGHT_SEER]: '預言家行動 🔮',
  [GAME_PHASES.NIGHT_WITCH]: '女巫行動 🧪',
  [GAME_PHASES.NIGHT_SILENCER]: '禁言長老行動 🤐',
  [GAME_PHASES.NIGHT_SETTLE]: '夜晚結算中 ⏳',
  [GAME_PHASES.DAY_ANNOUNCE]: '天亮公佈 ☀️',
  [GAME_PHASES.DAY_DISCUSSION]: '白天自由發言 💬',
  [GAME_PHASES.KNIGHT_DUEL]: '騎士決鬥 ⚔️',
  [GAME_PHASES.DAY_VOTING]: '放逐投票 🗳️',
  [GAME_PHASES.DAY_VOTE_RESULT]: '票數結算 📊',
  [GAME_PHASES.HUNTER_SHOOT]: '獵人開槍 💥',
  [GAME_PHASES.GAME_OVER]: '遊戲結束 🏆',
};

// 階段預設倒數秒數
export const PHASE_DURATIONS = {
  [GAME_PHASES.ASSIGNING_ROLES]: 5,
  [GAME_PHASES.NIGHT_START]: 3,
  [GAME_PHASES.NIGHT_CUPID]: 15,
  [GAME_PHASES.NIGHT_DREAMCATCHER]: 12,
  [GAME_PHASES.NIGHT_GUARD]: 12,
  [GAME_PHASES.NIGHT_WEREWOLF]: 15,
  [GAME_PHASES.NIGHT_SEER]: 12,
  [GAME_PHASES.NIGHT_WITCH]: 15,
  [GAME_PHASES.NIGHT_SILENCER]: 12,
  [GAME_PHASES.DAY_ANNOUNCE]: 5,
  [GAME_PHASES.DAY_DISCUSSION]: 45,
  [GAME_PHASES.KNIGHT_DUEL]: 6,
  [GAME_PHASES.DAY_VOTING]: 15,
  [GAME_PHASES.DAY_VOTE_RESULT]: 5,
  [GAME_PHASES.HUNTER_SHOOT]: 12,
};
