/**
 * 角色與陣營常數定義 (ES Module)
 */

export const FACTIONS = {
  WEREWOLF: 'WEREWOLF', // 狼人陣營
  GOOD: 'GOOD',         // 好人陣營
};

export const ROLES = {
  WEREWOLF: 'WEREWOLF', // 狼人
  SEER: 'SEER',         // 預言家
  WITCH: 'WITCH',       // 女巫
  HUNTER: 'HUNTER',     // 獵人
  GUARD: 'GUARD',       // 守衛
  IDIOT: 'IDIOT',       // 白痴
  VILLAGER: 'VILLAGER', // 村民
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
};
