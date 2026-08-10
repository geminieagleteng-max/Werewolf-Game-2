/**
 * 角色與陣營常數定義 (ES Module)
 * 包含完整的角色技能說明、發動時機、限制禁忌與實戰技巧
 */

export const FACTIONS = {
  WEREWOLF: 'WEREWOLF', // 狼人陣營
  GOOD: 'GOOD',         // 好人陣營
  THIRD: 'THIRD',       // 第三方陣營（如情侶人狼）
};

export const ROLES = {
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
  VILLAGER: 'VILLAGER',         // 村民
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
    title: '暗夜嗜血的獵殺者',
    icon: '🐺',
    faction: FACTIONS.WEREWOLF,
    factionName: '狼人陣營',
    isGod: false,
    difficulty: '⭐⭐⭐',
    tagline: '潛伏在好人之中，夜間商議並獵殺目標。',
    description: '夜晚與狼隊友商議擊殺一名玩家；白天隱藏身分，混淆好人視聽。',
    winCondition: '屠邊獲勝（殺死所有神職或所有村民）或屠城獲勝（殺死所有好人）。',
    hasNightAction: true,
    actionPriority: 2,
    tags: ['夜間暗殺', '團隊協商', '偽裝欺瞞'],
    skills: [
      {
        name: '夜間襲殺',
        icon: '🗡️',
        phase: '每晚狼人行動階段',
        triggerType: '主動發動 (夜間)',
        effect: '每晚全體存活狼人可於暗夜頻道協商，並投票鎖定一名存活玩家進行襲殺。',
        restrictions: '若遇守衛守護或女巫解藥救助，目標可能免於死亡。同伴出局後仍可單獨行動。',
      },
      {
        name: '悍跳偽裝',
        icon: '🎭',
        phase: '白天發言與投票階段',
        triggerType: '戰術策略',
        effect: '白天可偽裝成預言家、女巫、民等各種身分，製造假資訊擾亂好人推導。',
        restrictions: '需小心被真神職對跳或被騎士拔劍決鬥識破。',
      },
    ],
    strategyTips: [
      '狼隊友間可分工：一人「悍跳預言家」發假查驗帶節奏，其餘隊友在警下煽動好人。',
      '夜晚擊殺優先鎖定高威脅神職（如女巫、守衛、預言家），降低好人防禦。',
      '發言需保持心態平穩，邏輯自洽，切忌前後矛盾或過度針對單一好人。',
    ],
    faq: [
      { q: '狼人可以自刀（殺死自己）嗎？', a: '在標準規則下狼人可以選擇擊殺自己，用以騙取女巫首夜解藥以做高自身好人身分。' },
      { q: '狼人如果意見不一致怎麼辦？', a: '系統將以最後確認或多數共識鎖定的目標作為最終襲殺對象。' },
    ],
  },
  [ROLES.SEER]: {
    id: ROLES.SEER,
    name: '預言家',
    title: '洞悉黑夜的神之眼',
    icon: '🔮',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    difficulty: '⭐⭐⭐⭐',
    tagline: '好人陣營的領袖與核心資訊來源。',
    description: '每晚查驗一名存活玩家身分，得知其為好人或狼人。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 3,
    tags: ['資訊核心', '身分查驗', '引領放逐'],
    skills: [
      {
        name: '水晶球查驗',
        icon: '🔮',
        phase: '每晚預言家行動階段',
        triggerType: '主動發動 (夜間)',
        effect: '每晚可指定一名未查驗的存活玩家，水晶球將即刻揭曉該玩家為【好人陣營】或【狼人陣營】。',
        restrictions: '每晚僅限查驗 1 位玩家。僅能得知好人或狼人，無法直接判斷具體神職（如女巫/獵人）或村民身分。',
      },
    ],
    strategyTips: [
      '首日白天發言應儘早起跳，清晰報出昨夜查驗結果（金水或查殺）與心路歷程。',
      '留下清晰的「留警徽/查驗順序規劃」，讓好人能順利繼承你的邏輯線。',
      '面對悍跳狼人對跳時，保持自信冷靜，以查驗邏輯與視角差異說服場上好人。',
    ],
    faq: [
      { q: '預言家能查驗已經出局的玩家嗎？', a: '不能，只能查驗當前場上存活的玩家。' },
      { q: '預言家每晚能查驗幾個人？', a: '每晚僅限查驗 1 位玩家，確認查驗後即鎖定。' },
      { q: '被查驗的人會知道自己被查驗了嗎？', a: '不會，查驗結果僅預言家本人可見。' },
    ],
  },
  [ROLES.WITCH]: {
    id: ROLES.WITCH,
    name: '女巫',
    title: '生死逆轉的魔藥大師',
    icon: '🧪',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    difficulty: '⭐⭐⭐⭐',
    tagline: '手握生殺大權，擁有解藥與毒藥的強大神職。',
    description: '擁有解藥與毒藥各一瓶。解藥可救起夜間中刀玩家，毒藥可毒殺一名玩家。不可於同夜雙藥並用。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 4,
    tags: ['救死扶傷', '強力毒殺', '強神翻盤'],
    skills: [
      {
        name: '起死回生 (解藥)',
        icon: '💚',
        phase: '夜間女巫行動階段',
        triggerType: '主動發動 (夜間)',
        effect: '得知今夜狼人中刀目標，可消耗解藥將其救活。',
        restrictions: '全場遊戲僅能使用 1 次。同夜不可與毒藥同時使用。',
      },
      {
        name: '致命劇毒 (毒藥)',
        icon: '☠️',
        phase: '夜間女巫行動階段',
        triggerType: '主動發動 (夜間)',
        effect: '夜間可指定一名存活玩家施毒，目標將在夜間直接死亡，且無法發動出局技能（如獵人開槍）。',
        restrictions: '全場遊戲僅能使用 1 次。同夜不可與解藥同時使用。',
      },
    ],
    strategyTips: [
      '第一夜通常建議使用解藥救人（開銀水），避免好人神職在首夜意外倒牌。',
      '毒藥威力巨大但需謹慎，務必在確定狼人身分或放逐票決出現嚴重分歧時再行使用。',
      '被毒殺的獵人無法開槍，毒藥亦無視守衛守護。',
    ],
    faq: [
      { q: '女巫可以同一晚既用解藥又用毒藥嗎？', a: '不行，標準規則下一夜只能使用一瓶藥劑。' },
      { q: '被女巫毒殺的玩家可以發動技能嗎？', a: '不行，被毒死的獵人無法開槍。' },
    ],
  },
  [ROLES.GUARD]: {
    id: ROLES.GUARD,
    name: '守衛',
    title: '不滅的聖盾守護者',
    icon: '🛡️',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    difficulty: '⭐⭐⭐',
    tagline: '黑夜中守護關鍵隊友免遭狼吻。',
    description: '每晚守護一名玩家免遭狼人殺害，不可連續兩夜守護同一人。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 1,
    tags: ['夜間護衛', '平安夜創造者', '防禦神職'],
    skills: [
      {
        name: '聖盾庇護',
        icon: '🛡️',
        phase: '每晚守衛行動階段',
        triggerType: '主動發動 (夜間)',
        effect: '每晚選擇一名玩家（可守護自己），該玩家當夜免疫狼人擊殺傷害。',
        restrictions: '不可連續兩晚守護同一個玩家；守衛無法抵擋女巫的毒藥。',
      },
    ],
    strategyTips: [
      '首夜可以選擇「空守」或「自守」，次夜開始重點博弈守護已明跳身分的預言家或女巫。',
      '善用「空守」調節節奏，避免在關鍵夜晚受到「不可連守」的規則限制。',
      '若連續創造平安夜，將極大縮減狼人刀數優勢。',
    ],
    faq: [
      { q: '守衛可以守護自己嗎？', a: '可以，但依然遵循「不可連續兩晚守同一人」的限制。' },
      { q: '守衛能防住女巫的毒藥嗎？', a: '不能，守衛的聖盾僅能抵擋狼人的物理襲殺。' },
    ],
  },
  [ROLES.HUNTER]: {
    id: ROLES.HUNTER,
    name: '獵人',
    title: '絕地反擊的最後一槍',
    icon: '💥',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    difficulty: '⭐⭐',
    tagline: '臨死前拔槍威懾，同歸於盡的強力威懾神職。',
    description: '在被狼人擊殺或被投票放逐時可開槍帶走一人（若遭女巫毒殺則無法開槍）。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: false,
    actionPriority: 99,
    tags: ['亡語開槍', '高威懾力', '強神'],
    skills: [
      {
        name: '含恨一槍',
        icon: '🎯',
        phase: '出局結算階段 (夜死或白天放逐)',
        triggerType: '被動觸發 (出局時)',
        effect: '當被狼人刀死或被白天放逐出局時，可立即開槍指定一名存活玩家一同出局，亦可選擇壓槍不出。',
        restrictions: '若遭女巫毒殺，槍枝將會啞火，無法開槍帶人。',
      },
    ],
    strategyTips: [
      '白天發言可保持強勢威懾，迫使狼人不敢輕易煽動放逐你。',
      '若不幸出局，優先開槍帶走發言漏洞最大、狼面最高的玩家；若局勢不明亦可理性壓槍。',
    ],
    faq: [
      { q: '被女巫毒殺可以開槍嗎？', a: '不可以，被毒死時槍口被封閉無法開槍。' },
      { q: '獵人出局可以選擇不開槍（壓槍）嗎？', a: '可以，若局勢不明朗選擇壓槍可避免誤傷好人。' },
    ],
  },
  [ROLES.KNIGHT]: {
    id: ROLES.KNIGHT,
    name: '騎士',
    title: '聖光裁決的正義之刃',
    icon: '⚔️',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    difficulty: '⭐⭐⭐',
    tagline: '白天以身試法，直接翻牌決鬥斬殺狼人。',
    description: '白天發言階段可發動【決鬥】指定一名玩家。若目標為狼人，狼人當場死亡並直接跳入黑夜；若目標為好人，騎士以死謝罪出局。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: false,
    actionPriority: 99,
    tags: ['日間斬殺', '真理決鬥', '一擊定乾坤'],
    skills: [
      {
        name: '聖劍決鬥',
        icon: '⚔️',
        phase: '白天自由發言階段',
        triggerType: '主動發動 (日間)',
        effect: '白天發言期間可隨時翻牌並指定一名存活玩家進行決鬥。若目標為狼人，該狼人當場暴斃且白天立即結束直進黑夜；若目標為好人，騎士以死謝罪出局，白天發言繼續。',
        restrictions: '全場遊戲僅能發動 1 次。',
      },
    ],
    strategyTips: [
      '在兩位預言家對跳不休時，騎士可果斷決鬥其中一名預言家，一劍定乾坤驗證真假！',
      '切勿盲目決鬥路人，一旦決鬥好人將白白犧牲強大神職。',
    ],
    faq: [
      { q: '騎士決鬥成功後還會進行放逐投票嗎？', a: '不會，若成功斬殺狼人，白天立刻結束並直接進入黑夜。' },
      { q: '騎士決鬥好人會怎麼樣？', a: '騎士翻牌以死謝罪出局，原發言與投票流程繼續進行。' },
    ],
  },
  [ROLES.SILENCER]: {
    id: ROLES.SILENCER,
    name: '禁言長老',
    title: '封閉雙唇的靜默使者',
    icon: '🤐',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    difficulty: '⭐⭐',
    tagline: '夜間封印玩家言論，干擾敵方節奏。',
    description: '每晚可指定一名玩家在次日白天【禁言】（無法在聊天室發言，但保留投票權）。不可連續兩夜禁言同一人。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 5,
    tags: ['控制干擾', '禁言封口', '輔助神職'],
    skills: [
      {
        name: '禁言魔咒',
        icon: '🤐',
        phase: '每晚禁言長老行動階段',
        triggerType: '主動發動 (夜間)',
        effect: '每晚指定一名存活玩家，該玩家次日白天將被封印言論，無法在文字聊天室發言，但依然保有白天放逐投票權。',
        restrictions: '不可連續兩晚禁言同一個玩家。',
      },
    ],
    strategyTips: [
      '可針對發言煽動力強的疑似狼人進行禁言，打亂對方的號票節奏。',
      '注意觀察被禁言玩家在投票時的舉動，常能從票型中推測其陣營動向。',
    ],
    faq: [
      { q: '被禁言的玩家可以投票嗎？', a: '可以，禁言只封鎖發言權，不影響投票權。' },
      { q: '禁言長老可以禁言自己嗎？', a: '通常不建議禁言自己，但在特殊戰術自證時可靈活運用。' },
    ],
  },
  [ROLES.DREAMCATCHER]: {
    id: ROLES.DREAMCATCHER,
    name: '攝夢人',
    title: '編織幻象的夢境支配者',
    icon: '💤',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    difficulty: '⭐⭐⭐⭐',
    tagline: '每夜使人入夢免疫傷害，雙夢或亡故皆引發夢死。',
    description: '每晚選擇一人進入夢鄉，使其免疫當夜傷害。若連續兩夜攝夢同一人，該玩家夢死；若攝夢人死亡，被攝夢者一同死亡。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: true,
    actionPriority: 1,
    tags: ['夢境庇護', '連環夢死', '高階進階神職'],
    skills: [
      {
        name: '引渡夢鄉',
        icon: '💤',
        phase: '每晚攝夢人行動階段',
        triggerType: '主動發動 (夜間)',
        effect: '每晚選擇一名存活玩家入夢，被攝夢者當夜免疫狼人擊殺與女巫毒殺。',
        restrictions: '若連續兩晚攝夢同一人，該玩家直接【夢死】；若攝夢人出局，當夜被攝夢者一同死亡。',
      },
    ],
    strategyTips: [
      '第一夜可選擇庇護關鍵神職；若鎖定鐵狼，可透過連續兩夜攝夢將其直接「夢死」擊殺！',
      '務必注意保護自身安全，因為一旦自己夜死，當晚入夢的隊友也會被連帶拖死。',
    ],
    faq: [
      { q: '攝夢人可以選擇不攝夢（空夢）嗎？', a: '可以，若無合適目標可選擇空夢。' },
      { q: '夢死會觸發獵人開槍嗎？', a: '夢死屬於特殊規則傷害，獵人因夢死出局通常無法開槍。' },
    ],
  },
  [ROLES.CUPID]: {
    id: ROLES.CUPID,
    name: '邱比特',
    title: '繫結命運的愛神',
    icon: '💘',
    faction: FACTIONS.GOOD,
    factionName: '好人神職 / 第三方',
    isGod: true,
    difficulty: '⭐⭐⭐',
    tagline: '首夜射出愛之箭，連結兩位玩家的生死命運。',
    description: '第一夜指定任意兩名玩家連為【情侶】。情侶生死相隨，若一人出局，另一人隨之殉情。',
    winCondition: '若情侶為好人+好人，跟隨好人獲勝；若情侶為人+狼（人狼戀），則形成第三方陣營，需殺光其他所有人獲勝！',
    hasNightAction: true,
    actionPriority: 0,
    tags: ['愛之箭', '陣營轉化', '第三方變數'],
    skills: [
      {
        name: '連理之箭',
        icon: '💘',
        phase: '第一夜首夜行動階段',
        triggerType: '主動發動 (僅首夜)',
        effect: '首夜指定任意兩名玩家（可包含自己）連為情侶。情侶中任意一人因任何原因出局，另一人立刻殉情出局。',
        restrictions: '僅在遊戲第一夜發動 1 次，後續夜晚不再睜眼。',
      },
    ],
    strategyTips: [
      '可以選擇將自己與另一名玩家連為情侶，亦可選擇連兩名其他玩家觀察局勢。',
      '注意若連出「人狼戀」，你需與情侶共同結盟，消滅場上所有其他好人與狼人！',
    ],
    faq: [
      { q: '邱比特連的情侶知道彼此身分嗎？', a: '情侶雙方會在夜晚得知彼此是情侶，但不知道彼此具體角色。' },
      { q: '情侶中一人被毒死，另一人會怎樣？', a: '另一人隨之殉情死亡。' },
    ],
  },
  [ROLES.IDIOT]: {
    id: ROLES.IDIOT,
    name: '白痴',
    title: '裝瘋賣傻的免死神職',
    icon: '🤡',
    faction: FACTIONS.GOOD,
    factionName: '好人神職',
    isGod: true,
    difficulty: '⭐',
    tagline: '白天放逐時翻牌免死，以裝瘋自證清白。',
    description: '白天若被投票放逐，可翻牌免死，但失去後續投票權。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: false,
    actionPriority: 99,
    tags: ['翻牌免死', '抗推神職', '自證強神'],
    skills: [
      {
        name: '裝瘋賣傻',
        icon: '🤡',
        phase: '白天放逐結算階段',
        triggerType: '被動觸發 (放逐時)',
        effect: '若白天投票遭到放逐，系統自動翻牌揭曉身分免除死亡，繼續留在場上發言討論。',
        restrictions: '翻牌免死後將永久失去投票權，且無法被選為警長。夜間若被狼刀或女巫毒殺仍會正常死亡。',
      },
    ],
    strategyTips: [
      '白痴是極佳的抗推神職，平時發言可以適當低調或替真預言家擋刀。',
      '一旦被好人誤投放逐，即可透過翻牌自證鐵神職，並留在場上為好人梳理邏輯。',
    ],
    faq: [
      { q: '白痴在夜間被狼人殺死會翻牌免死嗎？', a: '不會，免死技能僅在白天被投票放逐時觸發。' },
      { q: '白痴翻牌後還能發言嗎？', a: '可以正常發言討論，只是不能再參與放逐投票。' },
    ],
  },
  [ROLES.VILLAGER]: {
    id: ROLES.VILLAGER,
    name: '村民',
    title: '洞察真相的平民基石',
    icon: '👨‍🌾',
    faction: FACTIONS.GOOD,
    factionName: '好人平民',
    isGod: false,
    difficulty: '⭐⭐',
    tagline: '雖無夜間神力，但憑邏輯與正義投票守護村莊。',
    description: '無夜間技能，僅參與白天討論與投票。好人陣營最堅實的基石。',
    winCondition: '放逐所有狼人，守護村莊和平。',
    hasNightAction: false,
    actionPriority: 99,
    tags: ['邏輯推導', '白天投票', '好人基石'],
    skills: [
      {
        name: '正義放逐票',
        icon: '🗳️',
        phase: '白天投票階段',
        triggerType: '全體平民權利',
        effect: '白天自由參與發言討論，透過各家發言視角與邏輯漏洞，投出關鍵放逐票。',
        restrictions: '夜間無特殊行動，需閉眼等待天亮。',
      },
    ],
    strategyTips: [
      '認真聆聽每一位玩家的發言邏輯，從中捕捉狼人視角的破綻與自相矛盾之處。',
      '及時「表水」（闡述自己的心路歷程與好人視角），避免被狼人當作抗推位。',
      '在局勢混亂時，堅定跟隨已被證實的真預言家或真女巫的號票方向。',
    ],
    faq: [
      { q: '平民沒有技能會不會很無聊？', a: '不會！狼人殺是邏輯與話術的遊戲，平民往往是決定勝負走向的關鍵多數票！' },
    ],
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
