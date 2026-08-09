import { ROLES, FACTIONS, ROLE_DEFINITIONS } from './roles';

const BOT_NAMES = [
  '🤖 智慧阿爾法',
  '🤖 邏輯大師',
  '🤖 福爾摩汪',
  '🤖 柯南分身',
  '🤖 摸魚小兵',
  '🤖 沉默是金',
  '🤖 帶刀侍衛',
  '🤖 毒舌女巫',
  '🤖 預言神算',
];

const BOT_SPEECHES = {
  GENERAL: [
    '我是閉眼好人，昨天的情況大家怎麼看？',
    '我覺得大家發言都很真誠，但我還是想先聽聽後面的分析。',
    '這輪先跟著預言家走吧，不要分票！',
    '我覺得前面幾位發言有點劃水，要注意一下。',
    '目前局勢還不明朗，大家多聊聊自己的身分線索。',
    '我是一張鐵好人牌，請大家相信我！',
  ],
  WEREWOLF: [
    '我是好人村民，大家不要懷疑我！',
    '我覺得某個號位發言邏輯很奇怪，大家可以多注意。',
    '今天白天我建議先出一個嫌疑最大的。',
  ],
  SEER: [
    '我是好人，昨晚的查驗大家先聽我說。',
    '我感覺場上有狼在打倒鉤，大家別被帶節奏了。',
  ],
};

export function getRandomBotName(existingNames = []) {
  const available = BOT_NAMES.filter((n) => !existingNames.includes(n));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `🤖 AI玩家_${Math.floor(100 + Math.random() * 900)}`;
}

export function generateBotSpeech(botPlayer) {
  const isWolf = botPlayer.role === ROLES.WEREWOLF;
  const list = isWolf ? BOT_SPEECHES.WEREWOLF : BOT_SPEECHES.GENERAL;
  return list[Math.floor(Math.random() * list.length)];
}

export function getBotNightAction(botPlayer, game) {
  if (!botPlayer.isAlive) return null;

  const alivePlayers = game.players.filter((p) => p.isAlive);
  const otherAlive = alivePlayers.filter((p) => p.id !== botPlayer.id);

  if (botPlayer.role === ROLES.WEREWOLF) {
    // 狼人優先刀非狼人玩家
    const nonWolves = otherAlive.filter((p) => p.role !== ROLES.WEREWOLF);
    const target = nonWolves.length > 0 ? nonWolves[Math.floor(Math.random() * nonWolves.length)] : otherAlive[0];
    return { type: 'werewolf_select', targetId: target ? target.id : null };
  }

  if (botPlayer.role === ROLES.SEER) {
    // 預言家查驗未查驗過的其他玩家
    const target = otherAlive[Math.floor(Math.random() * otherAlive.length)];
    return { type: 'seer_check', targetId: target ? target.id : null };
  }

  if (botPlayer.role === ROLES.GUARD) {
    // 守衛守護其他玩家或自己（不可連續守同一人）
    const validTargets = alivePlayers.filter((p) => p.id !== botPlayer.lastGuardedId);
    const target = validTargets[Math.floor(Math.random() * validTargets.length)];
    return { type: 'guard_protect', targetId: target ? target.id : null };
  }

  if (botPlayer.role === ROLES.WITCH) {
    // 女巫：如果有人中刀且解藥還在，有 80% 機率救人
    const wolfTargetId = game.nightActions.werewolfFinalTargetId;
    let useAntidote = false;
    let poisonTargetId = null;

    if (wolfTargetId && !botPlayer.hasUsedAntidote && Math.random() < 0.8) {
      useAntidote = true;
    } else if (!botPlayer.hasUsedPoison && game.round >= 2 && Math.random() < 0.3) {
      // 隨機下毒一個其他玩家
      const target = otherAlive[Math.floor(Math.random() * otherAlive.length)];
      poisonTargetId = target ? target.id : null;
    }

    return { type: 'witch_action', useAntidote, poisonTargetId };
  }

  return null;
}

export function getBotDayVote(botPlayer, game) {
  if (!botPlayer.isAlive || !botPlayer.canVote) return null;

  const alivePlayers = game.players.filter((p) => p.isAlive && p.id !== botPlayer.id);
  if (alivePlayers.length === 0) return null;

  // 狼人盡量票投好人
  if (botPlayer.role === ROLES.WEREWOLF) {
    const nonWolves = alivePlayers.filter((p) => p.role !== ROLES.WEREWOLF);
    const targetList = nonWolves.length > 0 ? nonWolves : alivePlayers;
    const chosen = targetList[Math.floor(Math.random() * targetList.length)];
    return chosen.id;
  }

  // 好人隨機選一位嫌疑犯（或跟隨大家）
  const chosen = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  return chosen.id;
}
