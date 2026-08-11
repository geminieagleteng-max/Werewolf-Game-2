import { ACHIEVEMENTS, calculateHonorRank } from './achievements';

const STORAGE_KEY = 'werewolf_achievement_stats_v1';

const DEFAULT_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  goodWins: 0,
  wolfWins: 0,
  loverWins: 0,
  currentStreak: 0,
  maxStreak: 0,
  flawlessWins: 0,

  seerWolfFound: 0,
  seerWolfFoundSingleGame: 0,
  witchSaved: 0,
  witchPoisonedWolf: 0,
  witchDualHitSingleGame: 0,
  guardSaved: 0,
  hunterShotWolf: 0,
  knightKilledWolf: 0,
  silencedCount: 0,
  dreamKilledWolf: 0,
  idiotRevealed: 0,

  loneWolfWon: 0,
  wolfOscarWins: 0,
  nightSurvivorCount: 0,
  silverWaterWon: 0,

  chatCount: 0,
  voiceUsed: 0,
  loreViewedRoles: [],

  unlockedAchievements: {}, // { [id]: { unlockedAt: number } }
  equippedTitle: '新晉村民',
};

class AchievementManager {
  constructor() {
    this.stats = this.loadStats();
    this.listeners = new Set();
    this.toastListeners = new Set();

    // 當前單局臨時追蹤紀錄 (重開新局時重置)
    this.currentMatch = {
      role: null,
      playerId: null,
      nightSurvivedCount: 0,
      seerWolfFoundThisGame: 0,
      witchSavedThisGame: false,
      witchPoisonedWolfThisGame: false,
      wasSilverWater: false,
      wasVotedInDay: false,
      newlyUnlockedThisGame: [],
    };
  }

  loadStats() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_STATS,
          ...parsed,
          unlockedAchievements: parsed.unlockedAchievements || {},
          loreViewedRoles: parsed.loreViewedRoles || [],
        };
      }
    } catch (e) {
      console.warn('載入成就資料失敗，使用預設值', e);
    }
    return { ...DEFAULT_STATS };
  }

  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
      this.notifyListeners();
    } catch (e) {
      console.error('儲存成就資料失敗', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToast(listener) {
    this.toastListeners.add(listener);
    return () => this.toastListeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((fn) => fn(this.stats, this.getSummary()));
  }

  notifyToast(achievement) {
    this.toastListeners.forEach((fn) => fn(achievement));
  }

  getSummary() {
    const unlockedMap = this.stats.unlockedAchievements || {};
    const unlockedCount = Object.keys(unlockedMap).length;
    const totalCount = ACHIEVEMENTS.length;

    let totalAp = 0;
    ACHIEVEMENTS.forEach((ach) => {
      if (unlockedMap[ach.id]) {
        totalAp += ach.ap || 0;
      }
    });

    const rankInfo = calculateHonorRank(totalAp);

    return {
      unlockedCount,
      totalCount,
      totalAp,
      progressPercent: Math.round((unlockedCount / totalCount) * 100),
      rankInfo,
      equippedTitle: this.stats.equippedTitle || '新晉村民',
    };
  }

  /**
   * 檢查所有成就達成狀態並觸發解鎖
   */
  evaluateAchievements() {
    const newlyUnlocked = [];

    ACHIEVEMENTS.forEach((ach) => {
      if (!this.stats.unlockedAchievements[ach.id]) {
        if (ach.isUnlocked(this.stats)) {
          const unlockRecord = { unlockedAt: Date.now() };
          this.stats.unlockedAchievements[ach.id] = unlockRecord;
          newlyUnlocked.push(ach);
          this.currentMatch.newlyUnlockedThisGame.push(ach);
          this.notifyToast(ach);
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      this.saveStats();
    }

    return newlyUnlocked;
  }

  // ----------------------------------------------------
  // 遊戲內各階段事件掛載
  // ----------------------------------------------------

  onGameStarted(myPlayer) {
    this.currentMatch = {
      role: myPlayer?.role || null,
      playerId: myPlayer?.id || null,
      nightSurvivedCount: 0,
      seerWolfFoundThisGame: 0,
      witchSavedThisGame: false,
      witchPoisonedWolfThisGame: false,
      wasSilverWater: false,
      wasVotedInDay: false,
      newlyUnlockedThisGame: [],
    };
  }

  onRoleAssigned(role, playerId) {
    this.currentMatch.role = role;
    this.currentMatch.playerId = playerId;
  }

  onSeerResult(result) {
    if (result?.isWerewolf) {
      this.stats.seerWolfFound = (this.stats.seerWolfFound || 0) + 1;
      this.currentMatch.seerWolfFoundThisGame += 1;
      if (this.currentMatch.seerWolfFoundThisGame > (this.stats.seerWolfFoundSingleGame || 0)) {
        this.stats.seerWolfFoundSingleGame = this.currentMatch.seerWolfFoundThisGame;
      }
      this.evaluateAchievements();
    }
  }

  onWitchSaveSuccess() {
    this.stats.witchSaved = (this.stats.witchSaved || 0) + 1;
    this.currentMatch.witchSavedThisGame = true;
    this.checkWitchDualHit();
    this.evaluateAchievements();
  }

  onWitchPoisonWolfSuccess() {
    this.stats.witchPoisonedWolf = (this.stats.witchPoisonedWolf || 0) + 1;
    this.currentMatch.witchPoisonedWolfThisGame = true;
    this.checkWitchDualHit();
    this.evaluateAchievements();
  }

  checkWitchDualHit() {
    if (this.currentMatch.witchSavedThisGame && this.currentMatch.witchPoisonedWolfThisGame) {
      this.stats.witchDualHitSingleGame = 1;
    }
  }

  onGuardSaved() {
    this.stats.guardSaved = (this.stats.guardSaved || 0) + 1;
    this.evaluateAchievements();
  }

  onKnightKilledWolf() {
    this.stats.knightKilledWolf = (this.stats.knightKilledWolf || 0) + 1;
    this.evaluateAchievements();
  }

  onHunterShotWolf() {
    this.stats.hunterShotWolf = (this.stats.hunterShotWolf || 0) + 1;
    this.evaluateAchievements();
  }

  onSilencerSuccess() {
    this.stats.silencedCount = (this.stats.silencedCount || 0) + 1;
    this.evaluateAchievements();
  }

  onDreamKilledWolf() {
    this.stats.dreamKilledWolf = (this.stats.dreamKilledWolf || 0) + 1;
    this.evaluateAchievements();
  }

  onIdiotRevealed() {
    this.stats.idiotRevealed = (this.stats.idiotRevealed || 0) + 1;
    this.evaluateAchievements();
  }

  onNightSurvived() {
    this.currentMatch.nightSurvivedCount += 1;
    if (this.currentMatch.nightSurvivedCount >= 3) {
      this.stats.nightSurvivorCount = Math.max(this.stats.nightSurvivorCount || 0, 1);
      this.evaluateAchievements();
    }
  }

  onSilverWaterSaved() {
    this.currentMatch.wasSilverWater = true;
  }

  onDayVoted() {
    this.currentMatch.wasVotedInDay = true;
  }

  onChatSent() {
    this.stats.chatCount = (this.stats.chatCount || 0) + 1;
    this.evaluateAchievements();
  }

  onVoiceUsed() {
    this.stats.voiceUsed = 1;
    this.evaluateAchievements();
  }

  onRoleManualViewed(roleKey) {
    if (!roleKey) return;
    const list = new Set(this.stats.loreViewedRoles || []);
    list.add(roleKey);
    this.stats.loreViewedRoles = Array.from(list);
    this.evaluateAchievements();
  }

  onGameOver(gameOverData, myPlayer) {
    if (!gameOverData || !myPlayer) return;

    this.stats.gamesPlayed = (this.stats.gamesPlayed || 0) + 1;

    const winner = gameOverData.winner;
    const myRole = myPlayer.role;
    const isGood = myRole !== 'WEREWOLF';
    const isWolf = myRole === 'WEREWOLF';

    let isWon = false;
    if (winner === 'GOOD' && isGood) {
      isWon = true;
      this.stats.goodWins = (this.stats.goodWins || 0) + 1;
    } else if (winner === 'WEREWOLF' && isWolf) {
      isWon = true;
      this.stats.wolfWins = (this.stats.wolfWins || 0) + 1;
    } else if (winner === 'THIRD' || myPlayer.loverId) {
      if (winner === 'THIRD') {
        isWon = true;
        this.stats.loverWins = (this.stats.loverWins || 0) + 1;
      }
    }

    if (isWon) {
      this.stats.gamesWon = (this.stats.gamesWon || 0) + 1;
      this.stats.currentStreak = (this.stats.currentStreak || 0) + 1;
      if (this.stats.currentStreak > (this.stats.maxStreak || 0)) {
        this.stats.maxStreak = this.stats.currentStreak;
      }

      // 檢查是否完封勝 (己方全員存活)
      if (gameOverData.allPlayers && Array.isArray(gameOverData.allPlayers)) {
        const teamPlayers = gameOverData.allPlayers.filter((p) =>
          isWolf ? p.role === 'WEREWOLF' : p.role !== 'WEREWOLF'
        );
        const allTeamAlive = teamPlayers.length > 0 && teamPlayers.every((p) => p.isAlive);
        if (allTeamAlive) {
          this.stats.flawlessWins = (this.stats.flawlessWins || 0) + 1;
        }

        // 殘狼翻盤：狼隊友全出局，僅自己 1 隻存活並獲勝
        if (isWolf) {
          const aliveWolves = gameOverData.allPlayers.filter((p) => p.role === 'WEREWOLF' && p.isAlive);
          if (aliveWolves.length === 1 && aliveWolves[0].id === myPlayer.id) {
            this.stats.loneWolfWon = (this.stats.loneWolfWon || 0) + 1;
          }

          // 奧斯卡影帝：狼人獲勝且未曾被票過
          if (!this.currentMatch.wasVotedInDay) {
            this.stats.wolfOscarWins = (this.stats.wolfOscarWins || 0) + 1;
          }
        }
      }

      // 銀水死裡逃生
      if (this.currentMatch.wasSilverWater && myPlayer.isAlive) {
        this.stats.silverWaterWon = (this.stats.silverWaterWon || 0) + 1;
      }
    } else {
      this.stats.currentStreak = 0;
    }

    this.evaluateAchievements();
    this.saveStats();
  }

  // ----------------------------------------------------
  // 榮譽稱號系統 (Title Wardrobe)
  // ----------------------------------------------------

  getAvailableTitles() {
    const titles = [{ title: '新晉村民', tier: 'BRONZE', unlocked: true, source: '預設稱號' }];

    ACHIEVEMENTS.forEach((ach) => {
      if (ach.rewardTitle) {
        const isUnlocked = !!this.stats.unlockedAchievements[ach.id];
        titles.push({
          title: ach.rewardTitle,
          tier: ach.tier.id,
          unlocked: isUnlocked,
          source: ach.title,
          icon: ach.icon,
        });
      }
    });

    return titles;
  }

  equipTitle(title) {
    this.stats.equippedTitle = title;
    this.saveStats();
  }

  resetAllStats() {
    this.stats = { ...DEFAULT_STATS, unlockedAchievements: {}, loreViewedRoles: [] };
    this.saveStats();
  }
}

export const achievementManager = new AchievementManager();
