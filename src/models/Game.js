const { ROLES, FACTIONS, ROLE_DEFINITIONS } = require('../constants/roles');
const { GAME_PHASES } = require('../constants/gameStates');

/**
 * 遊戲狀態機與裁判核心邏輯
 */
class Game {
  /**
   * @param {string} roomId
   * @param {Array<Player>} players
   * @param {Array<string>} roleConfig
   */
  constructor(roomId, players, roleConfig) {
    this.roomId = roomId;
    this.players = players; // 玩家陣列引用
    this.roleConfig = [...roleConfig];

    // 輪次與階段
    this.round = 0; // 第幾天/夜 (1-indexed)
    this.phase = GAME_PHASES.WAITING;

    // 夜晚行動記錄
    this.nightActions = {
      guardTargetId: null,
      werewolfVotes: new Map(), // werewolfId -> targetId
      werewolfFinalTargetId: null,
      seerCheckedPlayerId: null,
      witchUsedAntidote: false,
      witchPoisonTargetId: null,
    };

    // 夜晚與白天死者記錄
    this.lastNightDeaths = []; // [{ player, reason }]
    this.lastDayDeaths = [];   // [{ player, reason }]

    // 白天放逐投票記錄
    this.dayVotes = new Map(); // voterPlayerId -> targetPlayerId (null 為棄票)

    // 獵人技能發動暫存
    this.pendingHunter = null; // { hunterPlayer, triggerReason: 'NIGHT' | 'DAY_VOTE' }

    // 遊戲勝負結果
    this.winner = null; // 'GOOD' | 'WEREWOLF'
    this.winReason = '';
  }

  /**
   * 隨機洗牌並分配角色
   */
  assignRoles() {
    // 洗牌算法 (Fisher-Yates Shuffle)
    const shuffledRoles = [...this.roleConfig];
    for (let i = shuffledRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
    }

    // 分配給玩家
    this.players.forEach((player, index) => {
      player.resetGameState();
      player.role = shuffledRoles[index];
    });

    this.round = 1;
    this.phase = GAME_PHASES.ASSIGNING_ROLES;
  }

  /**
   * 取得指定身分存活玩家
   */
  getAlivePlayersByRole(role) {
    return this.players.filter(p => p.isAlive && p.role === role);
  }

  /**
   * 取得指定陣營存活玩家
   */
  getAlivePlayersByFaction(faction) {
    return this.players.filter(p => {
      if (!p.isAlive) return false;
      const def = ROLE_DEFINITIONS[p.role];
      return def && def.faction === faction;
    });
  }

  /**
   * 重置單夜的行動記錄
   */
  resetNightActions() {
    this.nightActions = {
      guardTargetId: null,
      werewolfVotes: new Map(),
      werewolfFinalTargetId: null,
      seerCheckedPlayerId: null,
      witchUsedAntidote: false,
      witchPoisonTargetId: null,
    };
  }

  /**
   * 守衛選擇守護目標
   */
  handleGuardProtect(guardPlayerId, targetPlayerId) {
    const guard = this.players.find(p => p.id === guardPlayerId);
    if (!guard || guard.role !== ROLES.GUARD || !guard.isAlive) {
      return { success: false, message: '非有效守衛' };
    }

    // 不可連續兩晚守護同一個目標 (如果非空)
    if (targetPlayerId && guard.lastGuardedId === targetPlayerId) {
      return { success: false, message: '不可連續兩晚守護同一位玩家！' };
    }

    this.nightActions.guardTargetId = targetPlayerId;
    guard.lastGuardedId = targetPlayerId;
    return { success: true, targetPlayerId };
  }

  /**
   * 狼人選擇/投票擊殺目標
   */
  handleWerewolfSelect(werewolfPlayerId, targetPlayerId) {
    const wolf = this.players.find(p => p.id === werewolfPlayerId);
    if (!wolf || wolf.role !== ROLES.WEREWOLF || !wolf.isAlive) {
      return { success: false, message: '非存活狼人' };
    }

    if (targetPlayerId) {
      const target = this.players.find(p => p.id === targetPlayerId && p.isAlive);
      if (!target) {
        return { success: false, message: '目標玩家不存在或已出局' };
      }
      this.nightActions.werewolfVotes.set(werewolfPlayerId, targetPlayerId);
    } else {
      this.nightActions.werewolfVotes.delete(werewolfPlayerId);
    }

    // 計算狼隊最終目標 (選票最多者)
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

  /**
   * 計算狼人達成共識的目標
   */
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

  /**
   * 預言家查驗 (嚴格限制：每晚僅限查驗 1 位存活玩家)
   */
  handleSeerCheck(seerPlayerId, targetPlayerId) {
    const seer = this.players.find(p => p.id === seerPlayerId);
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

    const target = this.players.find(p => p.id === tId && p.isAlive);
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

  /**
   * 女巫行動 (救人或毒人)
   */
  handleWitchAction(witchPlayerId, { useAntidote, poisonTargetId }) {
    const witch = this.players.find(p => p.id === witchPlayerId);
    if (!witch || witch.role !== ROLES.WITCH || !witch.isAlive) {
      return { success: false, message: '非存活女巫' };
    }

    // 檢查不能同時使用兩瓶藥
    if (useAntidote && poisonTargetId) {
      return { success: false, message: '同一夜不能同時使用解藥與毒藥！' };
    }

    // 解藥處理
    if (useAntidote) {
      if (witch.hasUsedAntidote) {
        return { success: false, message: '解藥已使用過，無法再次使用！' };
      }
      this.nightActions.witchUsedAntidote = true;
      witch.hasUsedAntidote = true;
    }

    // 毒藥處理
    if (poisonTargetId) {
      if (witch.hasUsedPoison) {
        return { success: false, message: '毒藥已使用過，無法再次使用！' };
      }
      const target = this.players.find(p => p.id === poisonTargetId && p.isAlive);
      if (!target) {
        return { success: false, message: '下毒目標不存在或已出局' };
      }
      this.nightActions.witchPoisonTargetId = poisonTargetId;
      witch.hasUsedPoison = true;
    }

    return { success: true };
  }

  /**
   * 結算夜晚行動 (計算狼殺、守衛、解藥、毒藥)
   */
  settleNight() {
    const deaths = [];
    const wolfTargetId = this.nightActions.werewolfFinalTargetId;
    const guardTargetId = this.nightActions.guardTargetId;
    const witchUsedAntidote = this.nightActions.witchUsedAntidote;
    const poisonTargetId = this.nightActions.witchPoisonTargetId;

    // 1. 結算狼刀
    if (wolfTargetId) {
      const isGuarded = (guardTargetId === wolfTargetId);
      const isSaved = (witchUsedAntidote);

      // 標準規則：守衛護盾可擋狼刀；女巫解藥可救狼刀
      // 同守同救 (守衛且女巫救) 判定：預設目標平安
      let survived = false;
      if (isGuarded || isSaved) {
        survived = true;
      }

      if (!survived) {
        const victim = this.players.find(p => p.id === wolfTargetId && p.isAlive);
        if (victim) {
          victim.kill('WEREWOLF', this.round);
          deaths.push({ player: victim, reason: 'WEREWOLF' });
        }
      }
    }

    // 2. 結算女巫毒藥
    if (poisonTargetId) {
      const poisonedVictim = this.players.find(p => p.id === poisonTargetId && p.isAlive);
      if (poisonedVictim) {
        poisonedVictim.kill('POISON', this.round);
        // 女巫毒殺使獵人失去技能
        poisonedVictim.canShoot = false;
        deaths.push({ player: poisonedVictim, reason: 'POISON' });
      }
    }

    this.lastNightDeaths = deaths;

    // 檢查是否有獵人在昨夜中刀死亡（非毒殺）需發動技能
    const deadHunter = deaths.find(d => d.player.role === ROLES.HUNTER && d.reason === 'WEREWOLF');
    if (deadHunter && deadHunter.player.canShoot) {
      this.pendingHunter = {
        hunterPlayer: deadHunter.player,
        triggerReason: 'NIGHT',
      };
    } else {
      this.pendingHunter = null;
    }

    return deaths;
  }

  /**
   * 白天投票放逐
   */
  handleDayVote(voterId, targetId) {
    const voter = this.players.find(p => p.id === voterId);
    if (!voter || !voter.isAlive || !voter.canVote) {
      return { success: false, message: '無效投票人或無投票權' };
    }

    if (targetId) {
      const target = this.players.find(p => p.id === targetId && p.isAlive);
      if (!target) {
        return { success: false, message: '目標玩家不存在或已出局' };
      }
      this.dayVotes.set(voterId, targetId);
    } else {
      // 棄票
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

  /**
   * 結算白天投票放逐
   */
  settleDayVote() {
    const voteCounts = {};
    const voteDetails = [];

    this.dayVotes.forEach((targetId, voterId) => {
      const voter = this.players.find(p => p.id === voterId);
      const target = targetId ? this.players.find(p => p.id === targetId) : null;
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

    // 若最高票唯一且大於 0 票，則該玩家被放逐
    if (candidates.length === 1 && maxVotes > 0) {
      const target = this.players.find(p => p.id === candidates[0] && p.isAlive);
      if (target) {
        // 白痴技能判定：若為白痴，翻牌免死，失去投票權
        if (target.role === ROLES.IDIOT && !target.isIdiotRevealed) {
          target.isIdiotRevealed = true;
          target.canVote = false;
          exiledPlayer = target; // 記錄被票中，但依然存活
        } else {
          target.kill('VOTE', this.round);
          exiledPlayer = target;

          // 獵人被票出且具備開槍能力
          if (target.role === ROLES.HUNTER && target.canShoot) {
            this.pendingHunter = {
              hunterPlayer: target,
              triggerReason: 'DAY_VOTE',
            };
          }
        }
      }
    } else if (candidates.length > 1) {
      isTie = true; // 平票，無人放逐
    }

    this.lastDayDeaths = (exiledPlayer && !exiledPlayer.isAlive)
      ? [{ player: exiledPlayer, reason: 'VOTE' }]
      : [];

    return {
      voteDetails,
      maxVotes,
      isTie,
      exiledPlayer: exiledPlayer ? exiledPlayer.toPublicJSON() : null,
      isIdiotSaved: exiledPlayer ? exiledPlayer.isIdiotRevealed : false,
      hasHunterSkill: !!this.pendingHunter,
    };
  }

  /**
   * 獵人開槍帶走玩家
   */
  handleHunterShoot(hunterId, targetId) {
    if (!this.pendingHunter || this.pendingHunter.hunterPlayer.id !== hunterId) {
      return { success: false, message: '當前非該獵人開槍回合' };
    }

    const hunter = this.pendingHunter.hunterPlayer;
    if (!hunter.canShoot) {
      return { success: false, message: '獵人無法開槍（可能遭毒殺）' };
    }

    if (!targetId) {
      // 獵人選擇不開槍 (壓槍)
      this.pendingHunter = null;
      return { success: true, shotPlayer: null, message: '獵人選擇不出槍' };
    }

    const target = this.players.find(p => p.id === targetId && p.isAlive);
    if (!target) {
      return { success: false, message: '目標玩家不存在或已出局' };
    }

    target.kill('HUNTER', this.round);
    this.pendingHunter = null;

    return {
      success: true,
      shotPlayer: target.toPublicJSON(),
    };
  }

  /**
   * 判定勝負條件 (勝利規則：標準屠邊與全滅)
   * 狼人獲勝：好人陣營神職全滅 OR 平民全滅
   * 好人獲勝：狼人陣營全滅
   */
  checkWinCondition() {
    const aliveWerewolves = this.players.filter(p => p.isAlive && p.role === ROLES.WEREWOLF);
    const aliveGods = this.players.filter(p => {
      if (!p.isAlive) return false;
      const def = ROLE_DEFINITIONS[p.role];
      return def && def.faction === FACTIONS.GOOD && def.isGod;
    });
    const aliveVillagers = this.players.filter(p => p.isAlive && p.role === ROLES.VILLAGER);

    // 1. 狼人全滅 -> 好人勝利
    if (aliveWerewolves.length === 0) {
      this.winner = FACTIONS.GOOD;
      this.winReason = '好人陣營獲勝！所有狼人已被消滅。';
      this.phase = GAME_PHASES.GAME_OVER;
      return { isOver: true, winner: FACTIONS.GOOD, reason: this.winReason };
    }

    // 2. 神職全滅或平民全滅 (屠邊規則) -> 狼人勝利
    if (aliveGods.length === 0) {
      this.winner = FACTIONS.WEREWOLF;
      this.winReason = '狼人陣營獲勝！好人神職已被全數消滅（屠邊）。';
      this.phase = GAME_PHASES.GAME_OVER;
      return { isOver: true, winner: FACTIONS.WEREWOLF, reason: this.winReason };
    }

    if (aliveVillagers.length === 0) {
      this.winner = FACTIONS.WEREWOLF;
      this.winReason = '狼人陣營獲勝！好人平民已被全數消滅（屠邊）。';
      this.phase = GAME_PHASES.GAME_OVER;
      return { isOver: true, winner: FACTIONS.WEREWOLF, reason: this.winReason };
    }

    return { isOver: false, winner: null, reason: '' };
  }
}

module.exports = Game;
