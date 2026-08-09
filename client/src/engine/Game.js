import { ROLES, FACTIONS, ROLE_DEFINITIONS } from './roles';
import { GAME_PHASES } from './gameStates';

/**
 * 遊戲狀態機與裁判核心邏輯 (ES Module)
 */
export class Game {
  /**
   * @param {string} roomId
   * @param {Array<import('./Player').Player>} players
   * @param {Array<string>} roleConfig
   */
  constructor(roomId, players, roleConfig) {
    this.roomId = roomId;
    this.players = players;
    this.roleConfig = [...roleConfig];

    this.round = 0;
    this.phase = GAME_PHASES.WAITING;

    this.nightActions = {
      guardTargetId: null,
      werewolfVotes: new Map(),
      werewolfFinalTargetId: null,
      seerCheckedPlayerId: null,
      witchUsedAntidote: false,
      witchPoisonTargetId: null,
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
    return this.players.filter(p => p.isAlive && p.role === role);
  }

  getAlivePlayersByFaction(faction) {
    return this.players.filter(p => {
      if (!p.isAlive) return false;
      const def = ROLE_DEFINITIONS[p.role];
      return def && def.faction === faction;
    });
  }

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

  handleGuardProtect(guardPlayerId, targetPlayerId) {
    const guard = this.players.find(p => p.id === guardPlayerId);
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

  handleSeerCheck(seerPlayerId, targetPlayerId) {
    const seer = this.players.find(p => p.id === seerPlayerId);
    if (!seer || seer.role !== ROLES.SEER || !seer.isAlive) {
      return { success: false, message: '非存活預言家' };
    }

    const target = this.players.find(p => p.id === targetPlayerId);
    if (!target) {
      return { success: false, message: '查驗目標不存在' };
    }

    this.nightActions.seerCheckedPlayerId = targetPlayerId;
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

  handleWitchAction(witchPlayerId, { useAntidote, poisonTargetId }) {
    const witch = this.players.find(p => p.id === witchPlayerId);
    if (!witch || witch.role !== ROLES.WITCH || !witch.isAlive) {
      return { success: false, message: '非存活女巫' };
    }

    if (useAntidote && poisonTargetId) {
      return { success: false, message: '同一夜不能同時使用解藥與毒藥！' };
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
      const target = this.players.find(p => p.id === poisonTargetId && p.isAlive);
      if (!target) {
        return { success: false, message: '下毒目標不存在或已出局' };
      }
      this.nightActions.witchPoisonTargetId = poisonTargetId;
      witch.hasUsedPoison = true;
    }

    return { success: true };
  }

  settleNight() {
    const deaths = [];
    const wolfTargetId = this.nightActions.werewolfFinalTargetId;
    const guardTargetId = this.nightActions.guardTargetId;
    const witchUsedAntidote = this.nightActions.witchUsedAntidote;
    const poisonTargetId = this.nightActions.witchPoisonTargetId;

    if (wolfTargetId) {
      const isGuarded = (guardTargetId === wolfTargetId);
      const isSaved = (witchUsedAntidote);

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

    if (poisonTargetId) {
      const poisonedVictim = this.players.find(p => p.id === poisonTargetId && p.isAlive);
      if (poisonedVictim) {
        poisonedVictim.kill('POISON', this.round);
        poisonedVictim.canShoot = false;
        deaths.push({ player: poisonedVictim, reason: 'POISON' });
      }
    }

    this.lastNightDeaths = deaths;

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

    if (candidates.length === 1 && maxVotes > 0) {
      const target = this.players.find(p => p.id === candidates[0] && p.isAlive);
      if (target) {
        if (target.role === ROLES.IDIOT && !target.isIdiotRevealed) {
          target.isIdiotRevealed = true;
          target.canVote = false;
          exiledPlayer = target;
        } else {
          target.kill('VOTE', this.round);
          exiledPlayer = target;

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

  checkWinCondition() {
    const aliveWerewolves = this.players.filter(p => p.isAlive && p.role === ROLES.WEREWOLF);
    const aliveGood = this.players.filter(p => {
      if (!p.isAlive) return false;
      const def = ROLE_DEFINITIONS[p.role];
      return def && def.faction === FACTIONS.GOOD;
    });

    const totalConfigGods = this.roleConfig.filter(r => {
      const def = ROLE_DEFINITIONS[r];
      return def && def.faction === FACTIONS.GOOD && def.isGod;
    }).length;
    const totalConfigVillagers = this.roleConfig.filter(r => r === ROLES.VILLAGER).length;

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

    // 2. 好人全滅 -> 狼人勝利
    if (aliveGood.length === 0) {
      this.winner = FACTIONS.WEREWOLF;
      this.winReason = '狼人陣營獲勝！好人陣營已被全數消滅。';
      this.phase = GAME_PHASES.GAME_OVER;
      return { isOver: true, winner: FACTIONS.WEREWOLF, reason: this.winReason };
    }

    // 3. 標準屠邊規則 (若同時有神職與平民配置)
    if (totalConfigGods > 0 && totalConfigVillagers > 0) {
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
    }

    return { isOver: false, winner: null, reason: '' };
  }
}
