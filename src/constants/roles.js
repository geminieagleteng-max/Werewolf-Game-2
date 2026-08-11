/**
 * 角色與陣營常數定義 (CommonJS)
 */

// 陣營 (Faction)
const FACTIONS = {
  WEREWOLF: 'WEREWOLF', // 狼人陣營
  GOOD: 'GOOD',         // 好人陣營
  THIRD: 'THIRD',       // 第三方陣營
};

// 角色類型 (Role Types)
const ROLES = {
  WEREWOLF: 'WEREWOLF',         // 狼人
  SEER: 'SEER',                 // 預言家
  WITCH: 'WITCH',               // 女巫
  HUNTER: 'HUNTER',             // 獵人
  GUARD: 'GUARD',               // 守衛
  IDIOT: 'IDIOT',               // 白痴
  KNIGHT: 'KNIGHT',             // 騎士
  SILENCER: 'SILENCER',         // 禁言長老
  DREAMCATCHER: 'DREAMCATCHER', // 攝夢人
  CUPID: 'CUPID',               // 邱比特
  HIDDEN_WOLF: 'HIDDEN_WOLF',   // 隱狼
  VILLAGER: 'VILLAGER',         // 村民 (普通村民)
};

// 角色詳細資料
const ROLE_DEFINITIONS = {
  [ROLES.WEREWOLF]: {
    id: ROLES.WEREWOLF,
    name: '狼人',
    title: '暗夜嗜血的獵殺者',
    icon: '🐺',
    faction: FACTIONS.WEREWOLF,
    factionName: '狼人陣營',
    isGod: false,
    description: '夜晚與狼隊友商議擊殺一名玩家；白天隱藏身分，混淆好人視聽。',
    winCondition: '存活狼人人數與好人人數達 1:1（狼人存活數 ≥ 好人存活數）即可獲勝。',
    hasNightAction: true,
    actionPriority: 2,
  },
  [ROLES.HIDDEN_WOLF]: {
    id: ROLES.HIDDEN_WOLF,
    name: '隱狼',
    title: '匿跡深淵的暗夜臥底',
    icon: '🌑',
    faction: FACTIONS.WEREWOLF,
    factionName: '狼人陣營',
    isGod: false,
    description: '屬於狼人陣營但與普通狼人互不相認。預言家查驗顯示為好人，普通狼人全滅後覺醒暗殺能力。',
    winCondition: '存活狼人人數與好人人數達 1:1（狼人存活數 ≥ 好人存活數）即可獲勝。',
    hasNightAction: false,
    actionPriority: 2,
  },
  [ROLES.GUARD]: {
    id: ROLES.GUARD,
    name: '守衛',
    title: '不滅的聖盾守護者',
    icon: '🛡️',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    description: '每晚守護一名玩家免遭狼人殺害，不可連續兩夜守護同一人。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 1,
  },
  [ROLES.SEER]: {
    id: ROLES.SEER,
    name: '預言家',
    title: '洞悉黑夜的神之眼',
    icon: '🔮',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    description: '每晚查驗一名玩家身分，得知其為好人或狼人。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 3,
  },
  [ROLES.WITCH]: {
    id: ROLES.WITCH,
    name: '女巫',
    title: '生死逆轉的魔藥大師',
    icon: '🧪',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    description: '擁有解藥與毒藥各一瓶。解藥可救起夜間中刀玩家，毒藥可毒殺一名玩家。不可於同夜雙藥並用。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 4,
  },
  [ROLES.HUNTER]: {
    id: ROLES.HUNTER,
    name: '獵人',
    title: '絕地反擊的最後一槍',
    icon: '💥',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    description: '在被狼人擊殺或被投票放逐時可開槍帶走一人（若遭女巫毒殺則無法開槍）。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: false,
    actionPriority: 99,
  },
  [ROLES.KNIGHT]: {
    id: ROLES.KNIGHT,
    name: '騎士',
    title: '聖光裁決的正義之刃',
    icon: '⚔️',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    description: '白天發言階段可發動【決鬥】指定一名玩家。若目標為狼人，狼人當場死亡並直接跳入黑夜；若目標為好人，騎士以死謝罪出局。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: false,
    actionPriority: 99,
  },
  [ROLES.SILENCER]: {
    id: ROLES.SILENCER,
    name: '禁言長老',
    title: '封閉雙唇的靜默使者',
    icon: '🤐',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    description: '每晚可指定一名玩家在次日白天【禁言】（無法在聊天室發言，但保留投票權）。不可連續兩夜禁言同一人。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 5,
  },
  [ROLES.DREAMCATCHER]: {
    id: ROLES.DREAMCATCHER,
    name: '攝夢人',
    title: '編織幻象的夢境支配者',
    icon: '💤',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    description: '每晚選擇一人進入夢鄉，使其免疫當夜傷害。若連續兩夜攝夢同一人，該玩家夢死；若攝夢人死亡，被攝夢者一同死亡。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 1,
  },
  [ROLES.CUPID]: {
    id: ROLES.CUPID,
    name: '邱比特',
    title: '繫結命運的愛神',
    icon: '💘',
    faction: FACTIONS.GOOD,
    factionName: '好人神職 / 第三方',
    isGod: true,
    description: '第一夜指定任意兩名玩家連為【情侶】。情侶生死相隨，若一人出局，另一人隨之殉情。',
    winCondition: '好人情侶隨好人獲勝；人狼情侶需消滅所有其他玩家獲勝。',
    hasNightAction: true,
    actionPriority: 0,
  },
  [ROLES.IDIOT]: {
    id: ROLES.IDIOT,
    name: '白痴',
    title: '裝瘋賣傻的免死神職',
    icon: '🤡',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    description: '白天若被投票放逐，可翻牌免死，但失去後續投票權。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: false,
    actionPriority: 99,
  },
  [ROLES.HIDDEN_WOLF]: {
    id: ROLES.HIDDEN_WOLF,
    name: '隱狼',
    title: '匿跡深淵的暗夜臥底',
    icon: '🌑',
    faction: FACTIONS.WEREWOLF,
    factionName: '狼人陣營',
    isGod: false,
    description: '屬於狼人陣營但與普通狼人互不相認。預言家查驗顯示為好人，普通狼人全滅後覺醒暗殺能力。',
    winCondition: '存活狼人人數與好人人數達 1:1（狼人存活數 ≥ 好人存活數）即可獲勝。',
    hasNightAction: false, // 覺醒前無常規夜間行動
    actionPriority: 2,
  },
  [ROLES.VILLAGER]: {
    id: ROLES.VILLAGER,
    name: '村民',
    title: '洞察真相的平民基石',
    icon: '👨‍🌾',
    faction: FACTIONS.GOOD,
    factionName: '好人平民',
    isGod: false,
    description: '無夜間技能，僅參與白天討論與投票。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: false,
    actionPriority: 99,
  },
};

// 預設人數角色配置 (6 ~ 12 人板子)
const DEFAULT_ROLE_CONFIGS = {
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

module.exports = {
  FACTIONS,
  ROLES,
  ROLE_DEFINITIONS,
  DEFAULT_ROLE_CONFIGS,
};
