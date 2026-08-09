/**
 * 角色與陣營常數定義 (ES Module)
 */

export const FACTIONS = {
  WEREWOLF: 'WEREWOLF', // 狼人陣營
  GOOD: 'GOOD',         // 好人陣營
  THIRD: 'THIRD',       // 第三方陣營（如情侶人狼）
};

export const ROLES = {
  WEREWOLF: 'WEREWOLF',       // 狼人
  SEER: 'SEER',               // 預言家
  WITCH: 'WITCH',             // 女巫
  HUNTER: 'HUNTER',           // 獵人
  GUARD: 'GUARD',             // 守衛
  IDIOT: 'IDIOT',             // 白痴
  KNIGHT: 'KNIGHT',           // 騎士
  SILENCER: 'SILENCER',       // 禁言長老
  DREAMCATCHER: 'DREAMCATCHER', // 攝夢人
  CUPID: 'CUPID',             // 邱比特
  VILLAGER: 'VILLAGER',       // 村民
};

export const ROLE_NAMES_ZH = {
  [ROLES.WEREWOLF]: '狼人',
  [ROLES.SEER]: '預言家',
  [ROLES.WITCH]: '女巫',
  [ROLES.HUNTER]: '獵人',
  [ROLES.GUARD]: '守衛',
  [ROLES.IDIOT]: '白痴',
  [ROLES.KNIGHT]: '騎士',
  [ROLES.SILENCER]: '禁言長老',
  [ROLES.DREAMCATCHER]: '攝夢人',
  [ROLES.CUPID]: '邱比特',
  [ROLES.VILLAGER]: '村民',
};

export const formatRoleConfigZh = (roleConfig) => {
  if (!roleConfig || !Array.isArray(roleConfig)) return '標準配置';
  return roleConfig.map((r) => ROLE_NAMES_ZH[r] || r).join('、');
};

export const ROLE_DEFINITIONS = {
  [ROLES.WEREWOLF]: {
    id: ROLES.WEREWOLF,
    name: '狼人',
    faction: FACTIONS.WEREWOLF,
    isGod: false,
    description: '夜晚與狼隊友商議擊殺一名玩家。',
    hasNightAction: true,
    actionPriority: 2,
  },
  [ROLES.GUARD]: {
    id: ROLES.GUARD,
    name: '守衛',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '每晚守護一名玩家免遭狼人殺害，不可連續兩夜守護同一人。',
    hasNightAction: true,
    actionPriority: 1,
  },
  [ROLES.SEER]: {
    id: ROLES.SEER,
    name: '預言家',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '每晚查驗一名玩家身分，得知其為好人或狼人。',
    hasNightAction: true,
    actionPriority: 3,
  },
  [ROLES.WITCH]: {
    id: ROLES.WITCH,
    name: '女巫',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '擁有解藥與毒藥各一瓶。解藥可救起夜間中刀玩家，毒藥可毒殺一名玩家。不可於同夜雙藥並用。',
    hasNightAction: true,
    actionPriority: 4,
  },
  [ROLES.HUNTER]: {
    id: ROLES.HUNTER,
    name: '獵人',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '在被狼人擊殺或被投票放逐時可開槍帶走一人（若遭女巫毒殺則無法開槍）。',
    hasNightAction: false,
    actionPriority: 99,
  },
  [ROLES.IDIOT]: {
    id: ROLES.IDIOT,
    name: '白痴',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '白天若被投票放逐，可翻牌免死，但失去後續投票權。',
    hasNightAction: false,
    actionPriority: 99,
  },
  [ROLES.KNIGHT]: {
    id: ROLES.KNIGHT,
    name: '騎士',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '白天發言階段可發動【決鬥】指定一名玩家。若目標為狼人，狼人當場死亡並直接跳入黑夜；若目標為好人，騎士以死謝罪出局。',
    hasNightAction: false,
    actionPriority: 99,
  },
  [ROLES.SILENCER]: {
    id: ROLES.SILENCER,
    name: '禁言長老',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '每晚可指定一名玩家在次日白天【禁言】（無法在聊天室發言，但保留投票權）。不可連續兩夜禁言同一人。',
    hasNightAction: true,
    actionPriority: 5,
  },
  [ROLES.DREAMCATCHER]: {
    id: ROLES.DREAMCATCHER,
    name: '攝夢人',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '每晚選擇一人進入夢鄉，使其免疫當夜傷害。若連續兩夜攝夢同一人，該玩家夢死；若攝夢人死亡，被攝夢者一同死亡。',
    hasNightAction: true,
    actionPriority: 1,
  },
  [ROLES.CUPID]: {
    id: ROLES.CUPID,
    name: '邱比特',
    faction: FACTIONS.GOOD,
    isGod: true,
    description: '第一夜指定任意兩名玩家連為【情侶】。情侶生死相隨，若一人出局，另一人隨之殉情。',
    hasNightAction: true,
    actionPriority: 0,
  },
  [ROLES.VILLAGER]: {
    id: ROLES.VILLAGER,
    name: '村民',
    faction: FACTIONS.GOOD,
    isGod: false,
    description: '無夜間技能，僅參與白天討論與投票。',
    hasNightAction: false,
    actionPriority: 99,
  },
};

export const DEFAULT_ROLE_CONFIGS = {
  6: [
    ROLES.WEREWOLF, ROLES.WEREWOLF,
    ROLES.SEER, ROLES.WITCH, ROLES.HUNTER,
    ROLES.VILLAGER
  ],
  7: [
    ROLES.WEREWOLF, ROLES.WEREWOLF,
    ROLES.SEER, ROLES.WITCH, ROLES.HUNTER,
    ROLES.VILLAGER, ROLES.VILLAGER
  ],
  8: [
    ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF,
    ROLES.SEER, ROLES.WITCH, ROLES.HUNTER,
    ROLES.VILLAGER, ROLES.VILLAGER
  ],
  9: [
    ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF,
    ROLES.SEER, ROLES.WITCH, ROLES.HUNTER, ROLES.GUARD,
    ROLES.VILLAGER, ROLES.VILLAGER
  ],
  10: [
    ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF,
    ROLES.SEER, ROLES.WITCH, ROLES.HUNTER, ROLES.GUARD, ROLES.KNIGHT,
    ROLES.VILLAGER, ROLES.VILLAGER
  ],
  12: [
    ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF,
    ROLES.SEER, ROLES.WITCH, ROLES.HUNTER, ROLES.GUARD, ROLES.KNIGHT,
    ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER
  ],
};
