import { ROLES, FACTIONS, ROLE_DEFINITIONS } from './roles.js';
import { GAME_PHASES } from './gameStates.js';

/**
 * 遊戲狀態機與裁判核心邏輯 (ES Module)
 */
export class Game {
  /**
   * @param {string} roomId
   * @param {Array<import('./Player').Player>} players
   * @param {Array<string>} roleConfig
   */
  constructor(roomId, players, roleConfig = []) {
    this.roomId = roomId;
    this.players = players || [];
    this.roleConfig = Array.isArray(roleConfig) ? [...roleConfig] : [];

    this.round = 0;
    this.phase = GAME_PHASES.WAITING;

    this.nightActions = {
      cupidLovers: null, // [id1, id2]
      dreamTargetId: null,
      guardTargetId: null,
      werewolfVotes: new Map(),
      werewolfFinalTargetId: null,
      seerCheckedPlayerId: null,
      witchUsedAntidote: false,
      witchPoisonTargetId: null,
      silencedTargetId: null,
    };

    this.lastNightDeaths = [];
    this.lastDayDeaths = [];
    this.dayVotes = new Map();
    this.pendingHunter = null;
    this.winner = null;
    this.winReason = '';
  }

  assignRoles() {
    const shuffledRoles = [...this.roleConfig];
    for (let i = shuffledRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
    }

    this.players.forEach((player, index) => {
      player.resetGameState();
      player.role = shuffledRoles[index];
    });

    this.round = 1;
    this.phase = GAME_PHASES.ASSIGNING_ROLES;
  }

  getAlivePlayersByRole(role) {
    return this.players.filter((p) => p.isAlive && p.role === role);
  }

  getAlivePlayersByFaction(faction) {
    return this.players.filter((p) => {
      if (!p.isAlive) return false;
      const def = ROLE_DEFINITIONS[p.role];
      return def && def.faction === faction;
    });
  }

  resetNightActions() {
    // 每日清空前一天的禁言狀態
    this.players.forEach((p) => {
      p.isSilenced = false;
    });

    this.nightActions = {
      cupidLovers: this.nightActions.cupidLovers, // 情侶關係跨夜保持
      dreamTargetId: null,
      guardTargetId: null,
      werewolfVotes: new Map(),
      werewolfFinalTargetId: null,
      seerCheckedPlayerId: null,
      witchUsedAntidote: false,
      witchPoisonTargetId: null,
      silencedTargetId: null,
    };
  }

  // 1. 邱比特連線
  handleCupidLink(cupidPlayerId, target1Id, target2Id) {
    const cupid = this.players.find((p) => p.id === cupidPlayerId);
    if (!cupid || cupid.role !== ROLES.CUPID || !cupid.isAlive) {
      return { success: false, message: '非有效邱比特' };
    }
    const p1 = this.players.find((p) => p.id === target1Id);
    const p2 = this.players.find((p) => p.id === target2Id);
    if (!p1 || !p2 || p1.id === p2.id) {
      return { success: false, message: '請選擇兩位不同的玩家連為情侶！' };
    }

    p1.loverId = p2.id;
    p2.loverId = p1.id;
    this.nightActions.cupidLovers = [p1.id, p2.id];

    return { success: true, p1, p2 };
  }

  // 2. 攝夢人入夢
  handleDreamcatcherDream(dreamerPlayerId, targetPlayerId) {
    const dreamer = this.players.find((p) => p.id === dreamerPlayerId);
    if (!dreamer || dreamer.role !== ROLES.DREAMCATCHER || !dreamer.isAlive) {
      return { success: false, message: '非有效攝夢人' };
    }

    this.nightActions.dreamTargetId = targetPlayerId;
    return { success: true, targetPlayerId };
  }

  // 3. 守衛守護
  handleGuardProtect(guardPlayerId, targetPlayerId) {
    const guard = this.players.find((p) => p.id === guardPlayerId);
    if (!guard || guard.role !== ROLES.GUARD || !guard.isAlive) {
      return { success: false, message: '非有效守衛' };
    }

    if (targetPlayerId && guard.lastGuardedId === targetPlayerId) {
      return { success: false, message: '不可連續兩晚守護同一位玩家！' };
    }

    this.nightActions.guardTargetId = targetPlayerId;
    guard.lastGuardedId = targetPlayerId;
    return { success: true, targetPlayerId };
  }

  // 檢查是否普通狼人已全滅（此時隱狼覺醒）
  isRegularWolfTeamDead() {
    return this.players.filter((p) => p.isAlive && p.role === ROLES.WEREWOLF).length === 0;
  }

  // 4. 狼人擊殺
  handleWerewolfSelect(werewolfPlayerId, targetPlayerId) {
    const wolf = this.players.find((p) => p.id === werewolfPlayerId);
    if (!wolf || !wolf.isAlive) {
      return { success: false, message: '非存活玩家' };
    }

    const isNormalWolf = wolf.role === ROLES.WEREWOLF;
    const isAwakenedHiddenWolf = wolf.role === ROLES.HIDDEN_WOLF && this.isRegularWolfTeamDead();

    if (!isNormalWolf && !isAwakenedHiddenWolf) {
      return { success: false, message: '非存活狼人或隱狼尚未覺醒' };
    }

    if (targetPlayerId) {
      const target = this.players.find((p) => p.id === targetPlayerId && p.isAlive);
      if (!target) {
        return { success: false, message: '目標玩家不存在或已出局' };
      }
      this.nightActions.werewolfVotes.set(werewolfPlayerId, targetPlayerId);
    } else {
      this.nightActions.werewolfVotes.delete(werewolfPlayerId);
    }

    this.nightActions.werewolfFinalTargetId = this.calculateWerewolfConsensus();

    return {
      success: true,
      votes: Array.from(this.nightActions.werewolfVotes.entries()).map(([wId, tId]) => ({
        voterId: wId,
        targetId: tId,
      })),
      consensusTargetId: this.nightActions.werewolfFinalTargetId,
    };
  }

  calculateWerewolfConsensus() {
    const voteCounts = {};
    for (const targetId of this.nightActions.werewolfVotes.values()) {
      if (targetId) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
      }
    }

    let maxVotes = 0;
    let target = null;
    for (const [tId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        target = tId;
      }
    }
    return target;
  }

  // 5. 預言家查驗 (嚴格限制：每晚僅限查驗 1 位存活玩家)
  handleSeerCheck(seerPlayerId, targetPlayerId) {
    const seer = this.players.find((p) => p.id === seerPlayerId);
    if (!seer || seer.role !== ROLES.SEER || !seer.isAlive) {
      return { success: false, message: '非存活預言家' };
    }

    if (this.nightActions.seerCheckedPlayerId) {
      return { success: false, message: '今晚已完成查驗，每晚僅限查驗 1 位玩家！' };
    }

    const tId = Array.isArray(targetPlayerId) ? targetPlayerId[0] : targetPlayerId;
    if (!tId) {
      return { success: false, message: '請選擇 1 位查驗目標' };
    }

    const target = this.players.find((p) => p.id === tId && p.isAlive);
    if (!target) {
      return { success: false, message: '查驗目標不存在或已出局' };
    }

    this.nightActions.seerCheckedPlayerId = target.id;
    const isWerewolf = target.role === ROLES.WEREWOLF;

    return {
      success: true,
      result: {
        targetId: target.id,
        targetName: target.name,
        seatNumber: target.seatNumber,
        isWerewolf,
        factionName: isWerewolf ? '狼人陣營 🐺' : '好人陣營 🛡️',
      },
    };
  }

  // 6. 女巫行動 (同夜絕對禁止雙藥並用)
  handleWitchAction(witchPlayerId, { useAntidote, poisonTargetId }) {
    const witch = this.players.find((p) => p.id === witchPlayerId);
    if (!witch || witch.role !== ROLES.WITCH || !witch.isAlive) {
      return { success: false, message: '非存活女巫' };
    }

    if (useAntidote && poisonTargetId) {
      return { success: false, message: '同一夜不能同時使用解藥與毒藥！' };
    }

    // 若今晚已發動過任一藥劑，禁止再發動另一藥劑
    if (useAntidote && this.nightActions.witchPoisonTargetId) {
      return { success: false, message: '今晚已使用過毒藥，同夜不可再使用解藥！' };
    }
    if (poisonTargetId && this.nightActions.witchUsedAntidote) {
      return { success: false, message: '今晚已使用過解藥，同夜不可再使用毒藥！' };
    }

    if (useAntidote) {
      if (witch.hasUsedAntidote) {
        return { success: false, message: '解藥已使用過，無法再次使用！' };
      }
      this.nightActions.witchUsedAntidote = true;
      witch.hasUsedAntidote = true;
    }

    if (poisonTargetId) {
      if (witch.hasUsedPoison) {
        return { success: false, message: '毒藥已使用過，無法再次使用！' };
      }
      const target = this.players.find((p) => p.id === poisonTargetId && p.isAlive);
      if (!target) {
        return { success: false, message: '下毒目標不存在或已出局' };
      }
      this.nightActions.witchPoisonTargetId = poisonTargetId;
      witch.hasUsedPoison = true;
    }

    return { success: true };
  }

  // 7. 禁言長老禁言
  handleSilencerSilence(silencerPlayerId, targetPlayerId) {
    const silencer = this.players.find((p) => p.id === silencerPlayerId);
    if (!silencer || silencer.role !== ROLES.SILENCER || !silencer.isAlive) {
      return { success: false, message: '非有效禁言長老' };
    }

    if (targetPlayerId && silencer.lastSilencedId === targetPlayerId) {
      return { success: false, message: '不可連續兩晚禁言同一位玩家！' };
    }

    this.nightActions.silencedTargetId = targetPlayerId;
    silencer.lastSilencedId = targetPlayerId;
    return { success: true, targetPlayerId };
  }

  // 8. 騎士決鬥 (白天階段)
  handleKnightDuel(knightPlayerId, targetPlayerId) {
    const knight = this.players.find((p) => p.id === knightPlayerId);
    if (!knight || knight.role !== ROLES.KNIGHT || !knight.isAlive) {
      return { success: false, message: '非存活騎士' };
    }
    if (knight.hasUsedKnightDuel) {
      return { success: false, message: '騎士決鬥技能已使用過！' };
    }

    const target = this.players.find((p) => p.id === targetPlayerId && p.isAlive);
    if (!target || target.id === knight.id) {
      return { success: false, message: '請選擇有效的決鬥目標！' };
    }

    knight.hasUsedKnightDuel = true;
    const isWolf = target.role === ROLES.WEREWOLF || target.role === ROLES.HIDDEN_WOLF;

    let deadPlayers = [];
    if (isWolf) {
      // 決鬥成功：狼人被斬殺
      target.kill('KNIGHT', this.round);
      deadPlayers.push({ player: target, reason: 'KNIGHT' });
      this.checkLoverDeath(target, deadPlayers);
    } else {
      // 決鬥失敗：騎士以死謝罪出局
      knight.kill('KNIGHT', this.round);
      deadPlayers.push({ player: knight, reason: 'KNIGHT' });
      this.checkLoverDeath(knight, deadPlayers);
    }

    return {
      success: true,
      isWolf,
      targetPlayer: target.toPublicJSON(),
      knightPlayer: knight.toPublicJSON(),
      deadPlayers,
    };
  }

  // 夜晚結算 (計算狼刀、守衛、攝夢、解藥、毒藥、禁言、情侶連死)
  settleNight() {
    const deaths = [];
    const wolfTargetId = this.nightActions.werewolfFinalTargetId;
    const guardTargetId = this.nightActions.guardTargetId;
    const dreamTargetId = this.nightActions.dreamTargetId;
    const witchUsedAntidote = this.nightActions.witchUsedAntidote;
    const poisonTargetId = this.nightActions.witchPoisonTargetId;
    const silencedTargetId = this.nightActions.silencedTargetId;

    // 攝夢人連續攝夢判定
    const dreamers = this.players.filter((p) => p.isAlive && p.role === ROLES.DREAMCATCHER);
    if (dreamers.length > 0 && dreamTargetId) {
      const dreamer = dreamers[0];
      if (dreamer.lastDreamedId === dreamTargetId) {
        // 連續兩晚攝夢同一人，夢死出局
        const dreamVictim = this.players.find((p) => p.id === dreamTargetId && p.isAlive);
        if (dreamVictim) {
          dreamVictim.kill('DREAM', this.round);
          deaths.push({ player: dreamVictim, reason: 'DREAM' });
        }
      }
      dreamer.lastDreamedId = dreamTargetId;
    }

    // 1. 結算狼刀 (守衛、解藥、攝夢免疫)
    if (wolfTargetId) {
      const isGuarded = guardTargetId === wolfTargetId;
      const isSaved = witchUsedAntidote;
      const isDreamProtected = dreamTargetId === wolfTargetId;

      let survived = false;
      if (isGuarded || isSaved || isDreamProtected) {
        survived = true;
      }

      if (!survived) {
        const victim = this.players.find((p) => p.id === wolfTargetId && p.isAlive);
        if (victim) {
          victim.kill('WEREWOLF', this.round);
          deaths.push({ player: victim, reason: 'WEREWOLF' });
        }
      }
    }

    // 2. 結算女巫毒藥
    if (poisonTargetId) {
      const poisonedVictim = this.players.find((p) => p.id === poisonTargetId && p.isAlive);
      if (poisonedVictim) {
        poisonedVictim.kill('POISON', this.round);
        poisonedVictim.canShoot = false;
        deaths.push({ player: poisonedVictim, reason: 'POISON' });
      }
    }

    // 3. 攝夢人死亡帶走被攝夢者
    if (dreamers.length > 0 && dreamTargetId) {
      const dreamer = dreamers[0];
      if (!dreamer.isAlive) {
        const dreamVictim = this.players.find((p) => p.id === dreamTargetId && p.isAlive);
        if (dreamVictim && !deaths.some((d) => d.player.id === dreamVictim.id)) {
          dreamVictim.kill('DREAM', this.round);
          deaths.push({ player: dreamVictim, reason: 'DREAM' });
        }
      }
    }

    // 4. 結算禁言狀態
    if (silencedTargetId) {
      const silencedPlayer = this.players.find((p) => p.id === silencedTargetId && p.isAlive);
      if (silencedPlayer) {
        silencedPlayer.isSilenced = true;
      }
    }

    // 5. 情侶殉情判定
    const currentDeaths = [...deaths];
    currentDeaths.forEach((d) => {
      this.checkLoverDeath(d.player, deaths);
    });

    this.lastNightDeaths = deaths;

    // 檢查是否有獵人死亡需發動技能
    const deadHunter = deaths.find((d) => d.player.role === ROLES.HUNTER && d.player.canShoot);
    if (deadHunter) {
      this.pendingHunter = {
        hunterPlayer: deadHunter.player,
        triggerReason: 'NIGHT',
      };
    } else {
      this.pendingHunter = null;
    }

    return deaths;
  }

  // 情侶連鎖殉情判定
  checkLoverDeath(deadPlayer, deathList) {
    if (deadPlayer.loverId) {
      const partner = this.players.find((p) => p.id === deadPlayer.loverId && p.isAlive);
      if (partner && !deathList.some((d) => d.player.id === partner.id)) {
        partner.kill('LOVER', this.round);
        deathList.push({ player: partner, reason: 'LOVER' });
      }
    }
  }

  handleDayVote(voterId, targetId) {
    const voter = this.players.find((p) => p.id === voterId);
    if (!voter || !voter.isAlive || !voter.canVote) {
      return { success: false, message: '無效投票人或無投票權' };
    }

    if (targetId) {
      const target = this.players.find((p) => p.id === targetId && p.isAlive);
      if (!target) {
        return { success: false, message: '目標玩家不存在或已出局' };
      }
      this.dayVotes.set(voterId, targetId);
    } else {
      this.dayVotes.set(voterId, null);
    }

    return {
      success: true,
      votes: Array.from(this.dayVotes.entries()).map(([vId, tId]) => ({
        voterId: vId,
        targetId: tId,
      })),
    };
  }

  settleDayVote() {
    const voteCounts = {};
    const voteDetails = [];

    this.dayVotes.forEach((targetId, voterId) => {
      const voter = this.players.find((p) => p.id === voterId);
      const target = targetId ? this.players.find((p) => p.id === targetId) : null;
      voteDetails.push({
        voterId,
        voterName: voter ? voter.name : '未知',
        voterSeat: voter ? voter.seatNumber : 0,
        targetId,
        targetName: target ? target.name : '棄票',
        targetSeat: target ? target.seatNumber : 0,
      });

      if (targetId) {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
      }
    });

    let maxVotes = 0;
    let candidates = [];

    for (const [targetId, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        candidates = [targetId];
      } else if (count === maxVotes) {
        candidates.push(targetId);
      }
    }

    let exiledPlayer = null;
    let isTie = false;
    let dayDeaths = [];

    if (candidates.length === 1 && maxVotes > 0) {
      const target = this.players.find((p) => p.id === candidates[0] && p.isAlive);
      if (target) {
        if (target.role === ROLES.IDIOT && !target.isIdiotRevealed) {
          target.isIdiotRevealed = true;
          target.canVote = false;
          exiledPlayer = target;
        } else {
          target.kill('VOTE', this.round);
          exiledPlayer = target;
          dayDeaths.push({ player: target, reason: 'VOTE' });
          this.checkLoverDeath(target, dayDeaths);

          if (target.role === ROLES.HUNTER && target.canShoot) {
            this.pendingHunter = {
              hunterPlayer: target,
              triggerReason: 'DAY_VOTE',
            };
          }
        }
      }
    } else if (candidates.length > 1) {
      isTie = true;
    }

    this.lastDayDeaths = dayDeaths;

    return {
      voteDetails,
      maxVotes,
      isTie,
      exiledPlayer: exiledPlayer ? exiledPlayer.toPublicJSON() : null,
      isIdiotSaved: exiledPlayer ? exiledPlayer.isIdiotRevealed : false,
      hasHunterSkill: !!this.pendingHunter,
      dayDeaths,
    };
  }

  handleHunterShoot(hunterId, targetId) {
    if (!this.pendingHunter || this.pendingHunter.hunterPlayer.id !== hunterId) {
      return { success: false, message: '當前非該獵人開槍回合' };
    }

    const hunter = this.pendingHunter.hunterPlayer;
    if (!hunter.canShoot) {
      return { success: false, message: '獵人無法開槍（可能遭毒殺）' };
    }

    if (!targetId) {
      this.pendingHunter = null;
      return { success: true, shotPlayer: null, message: '獵人選擇不出槍' };
    }

    const target = this.players.find((p) => p.id === targetId && p.isAlive);
    if (!target) {
      return { success: false, message: '目標玩家不存在或已出局' };
    }

    target.kill('HUNTER', this.round);
    this.pendingHunter = null;

    const deadList = [{ player: target, reason: 'HUNTER' }];
    this.checkLoverDeath(target, deadList);

    return {
      success: true,
      shotPlayer: target.toPublicJSON(),
      deadList,
    };
  }

  checkWinCondition() {
    const aliveWerewolves = this.players.filter(
      (p) => p.isAlive && (p.role === ROLES.WEREWOLF || p.role === ROLES.HIDDEN_WOLF)
    );
    const aliveGood = this.players.filter((p) => {
      if (!p.isAlive) return false;
      const def = ROLE_DEFINITIONS[p.role];
      return def && def.faction === FACTIONS.GOOD;
    });

    // 1. 狼人全滅 -> 好人勝利
    if (aliveWerewolves.length === 0) {
      this.winner = FACTIONS.GOOD;
      this.winReason = '好人陣營獲勝！所有狼人已被消滅。';
      this.phase = GAME_PHASES.GAME_OVER;
      return { isOver: true, winner: FACTIONS.GOOD, reason: this.winReason };
    }

    // 2. 狼人與好人存活人數達 1:1（狼人存活數 >= 好人存活數）-> 狼人勝利
    if (aliveWerewolves.length >= aliveGood.length) {
      this.winner = FACTIONS.WEREWOLF;
      this.winReason = `狼人陣營獲勝！狼人與好人存活人數已達 ${aliveWerewolves.length}:${aliveGood.length}（1:1 控場綁票）。`;
      this.phase = GAME_PHASES.GAME_OVER;
      return { isOver: true, winner: FACTIONS.WEREWOLF, reason: this.winReason };
    }

    return { isOver: false, winner: null, reason: '' };
  }
}
