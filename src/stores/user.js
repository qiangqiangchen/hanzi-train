import { defineStore } from 'pinia';
import { db } from '../utils/db';
import { syncQueue } from '../utils/syncQueue';
import achievementsData from '../data/achievements.json';
import { audio } from '../utils/audio';
import charsIndexRaw from '../data/chars_index.json';
import trainPartsData from '../data/train_parts.json';
import api from '../utils/api';
import { authApi, progressApi, parentApi, gameApi, achievementsApi } from '../utils/api';

function getDefaultState() {
  return {
    isLoaded: false,
    isOnline: false,
    pendingSyncCount: 0,

    info: { name: '小小探险家', avatar: 'default' },
    progress: { currentLevel: 1, maxLevel: 1, totalStars: 0, totalScore: 0 },
    characters: {},
    history: [],
    trains: ['steam'],
    currentTrainId: 'steam',
    achievements: [],
    newAchievementsQueue: [],
    priorityList: [],
    skippedChars: [],
    customCharacters: {},
    customConfigs: {},
    scenarioCache: {},
    settings: {
      showPinyin: true,
      showHanzi: true,
      bgmVolume: 0.3,
      sfxVolume: 1.0,
      hasSeenTutorial: false,
    },

    unlockedParts: [],
    equippedParts: [],

    lastPlayDate: null,
    dailyStreak: 0,
    checkInDates: [],

    charsIndex: charsIndexRaw,
    charsDetailCache: {},

    lastSyncTime: 0,
    localUpdateTime: 0,
  };
}

export const useUserStore = defineStore('user', {
  state: () => getDefaultState(),

  getters: {
    statsCount(state) {
      let master = 0, learning = 0;
      Object.values(state.characters).forEach(c => {
        if (c.level >= 4) master++;
        else learning++;
      });
      return { master, learning, total: master + learning };
    },

    reviewList(state) {
      const now = Date.now();
      return Object.entries(state.characters)
        .filter(([char, record]) => {
          return record.nextReviewTime > 0 && record.nextReviewTime <= now && record.level < 5;
        })
        .map(([char]) => char);
    },

    isTodayCheckedIn(state) {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const today = new Date(d.getTime() - offset).toISOString().split('T')[0];
      return (state.checkInDates || []).includes(today);
    },

    hasPendingSync(state) {
      return state.pendingSyncCount > 0;
    },
  },

  actions: {
    // ==================== 初始化 ====================

    async init() {
      if (this.isLoaded) return;
      await this._doInit();
    },

    async forceReInit() {
      await this._doInit();
    },

    async _doInit() {
      // 设置 DB 前缀（账号隔离）
      const userId = authApi.getUserId();
      db.setUser(userId);

      // 1. 加载本地数据
      await this.loadLocal();

      // 2. 已登录 → 从后端加载并合并
      if (authApi.isLoggedIn()) {
        try {
          await this.loadAndMergeFromServer();
          this.isOnline = true;
          await this.replayQueue();
        } catch (e) {
          console.warn('[UserStore] Server unavailable, offline mode:', e.message);
          this.isOnline = false;
        }
      } else {
        this.isOnline = false;
      }

      this.pendingSyncCount = await syncQueue.count();

      if (!this._networkListenerAttached) {
        this.setupNetworkListener();
        this._networkListenerAttached = true;
      }

      this.isLoaded = true;
      console.log('[UserStore] ✅ Init complete, online:', this.isOnline, 'userId:', userId);
    },

    /**
     * 切换账号：重置 state → 重新初始化
     */
    async switchAccount() {
      console.log('[UserStore] Switching account...');

      // 清空离线队列
      await syncQueue.clear();

      // 重置所有 state
      const defaults = getDefaultState();
      Object.keys(defaults).forEach(key => {
        this[key] = defaults[key];
      });
      this.charsDetailCache = {};

      // 用新账号的 prefix 重新初始化
      await this.forceReInit();
    },

    // ==================== 网络状态监听 ====================

    setupNetworkListener() {
      window.addEventListener('online', async () => {
        console.log('[Network] 🟢 Back online, waiting 2s before sync...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (authApi.isLoggedIn()) {
          this.isOnline = true;
          await this.replayQueue();
          this.pendingSyncCount = await syncQueue.count();
        }
      });

      window.addEventListener('offline', () => {
        console.log('[Network] 🔴 Went offline');
        this.isOnline = false;
      });
    },

    // ==================== 离线队列 ====================

    async replayQueue() {
      const count = await syncQueue.count();
      if (count === 0) return;

      console.log(`[Sync] Replaying ${count} queued operations...`);
      const result = await syncQueue.replay(async (method, url, data) => {
        if (method === 'post') await api.post(url, data);
        else if (method === 'put') await api.put(url, data);
        else await api.get(url);
      });

      this.pendingSyncCount = result.remaining;
      if (result.success > 0) {
        console.log(`[Sync] ✅ Replayed ${result.success} operations`);
      }
    },

    async apiCall(type, method, url, data = null) {
      if (this.isOnline && authApi.isLoggedIn()) {
        try {
          let res;
          if (method === 'post') res = await api.post(url, data);
          else if (method === 'put') res = await api.put(url, data);
          else res = await api.get(url);
          return res.data;
        } catch (e) {
          if (!e.response || e.response.status >= 500 || e.code === 'ERR_NETWORK') {
            console.warn(`[API] Failed, queuing: ${type}`);
            await syncQueue.push(type, method, url, data);
            this.pendingSyncCount = await syncQueue.count();
            this.isOnline = false;
          } else {
            throw e;
          }
        }
      } else if (authApi.isLoggedIn()) {
        await syncQueue.push(type, method, url, data);
        this.pendingSyncCount = await syncQueue.count();
      }
      return null;
    },

    // ==================== 后端加载 + 合并 ====================

    async loadFromServer() {
      const [profile, progress, chars, settings] = await Promise.all([
        authApi.getMe(),
        progressApi.getProgress(),
        progressApi.getChars(),
        parentApi.getSettings().catch(() => null),
      ]);
      return { profile, progress, chars, settings };
    },

    async loadAndMergeFromServer() {
      const { profile, progress, chars, settings } = await this.loadFromServer();

      if (profile) {
        this.info = { name: profile.display_name || '小小探险家', avatar: profile.avatar || 'default' };
      }

      if (progress) {
        this.progress = {
          currentLevel: Math.max(this.progress.currentLevel, progress.current_level || 1),
          maxLevel: Math.max(this.progress.maxLevel, progress.max_level || 1),
          totalStars: Math.max(this.progress.totalStars, progress.total_stars || 0),
          totalScore: Math.max(this.progress.totalScore, progress.total_score || 0),
        };
        this.trains = this._mergeArrays(this.trains, progress.unlocked_trains || ['steam']);
        this.currentTrainId = progress.current_train_id || this.currentTrainId || 'steam';
        this.unlockedParts = this._mergeArrays(this.unlockedParts, progress.unlocked_parts || []);
        this.equippedParts = progress.equipped_parts || this.equippedParts || [];
        this.dailyStreak = Math.max(this.dailyStreak || 0, progress.daily_streak || 0);
        this.lastPlayDate = this._newerDate(this.lastPlayDate, progress.last_play_date);
        this.checkInDates = this._mergeArrays(this.checkInDates || [], progress.check_in_dates || []);
        this.priorityList = progress.priority_list || this.priorityList || [];
        this.skippedChars = progress.skipped_chars || this.skippedChars || [];
        this.customConfigs = { ...this.customConfigs, ...(progress.custom_configs || {}) };
      }

      if (Array.isArray(chars)) {
        chars.forEach(c => {
          const local = this.characters[c.char];
          if (!local) {
            this.characters[c.char] = {
              status: c.status || 'new',
              level: c.level || 0,
              correct: c.correct || 0,
              wrong: c.wrong || 0,
              streak: c.streak || 0,
              nextReviewTime: c.next_review_time || 0,
              lastTime: c.last_time || 0,
            };
          } else {
            const serverTime = c.last_time || 0;
            const localTime = local.lastTime || 0;
            if (serverTime > localTime) {
              this.characters[c.char] = {
                status: c.status || local.status,
                level: c.level ?? local.level,
                correct: c.correct ?? local.correct,
                wrong: c.wrong ?? local.wrong,
                streak: c.streak ?? local.streak,
                nextReviewTime: c.next_review_time ?? local.nextReviewTime,
                lastTime: serverTime,
              };
            }
          }
        });
      }

      if (settings) {
        this.settings = {
          showPinyin: settings.show_pinyin ?? this.settings.showPinyin,
          showHanzi: settings.show_hanzi ?? this.settings.showHanzi,
          bgmVolume: settings.bgm_volume ?? this.settings.bgmVolume,
          sfxVolume: settings.sfx_volume ?? this.settings.sfxVolume,
          hasSeenTutorial: settings.has_seen_tutorial ?? this.settings.hasSeenTutorial,
        };
        audio.setVolume(this.settings.bgmVolume, this.settings.sfxVolume);
      }

      try {
        const serverAchievements = await achievementsApi.getAll();
        const serverIds = serverAchievements.map(a => a.achievement_id);
        const localIds = this.achievements || [];

        // 合并：取并集
        this.achievements = [...new Set([...localIds, ...serverIds])];

        // 如果本地有后端没有的，同步上去
        const toSync = localIds.filter(id => !serverIds.includes(id));
        if (toSync.length > 0) {
          achievementsApi.sync(toSync).catch(() => {});
        }
      } catch (e) {
        console.warn('[Achievements] Server load failed, using local');
        const localAchievements = await db.get('user_achievements');
        if (localAchievements) this.achievements = localAchievements;
      }

      this.lastSyncTime = Date.now();
      this.saveLocal();
    },

    // ==================== 本地加载/保存 ====================

    async loadLocal() {
      try {
        const [
          info, progress, characters, history, trains, currentTrainId,
          achievements, settings, unlockedParts, equippedParts,
          lastPlayDate, dailyStreak, checkInDates,
          priorityList, skippedChars, customChars, customConfigs, scenarioCache,
          lastSyncTime
        ] = await Promise.all([
          db.get('user_info'),
          db.get('user_progress'),
          db.get('user_characters'),
          db.get('user_history'),
          db.get('user_trains'),
          db.get('user_current_train'),
          db.get('user_achievements'),
          db.get('user_settings'),
          db.get('user_parts'),
          db.get('user_equipped_parts'),
          db.get('user_last_play_date'),
          db.get('user_daily_streak'),
          db.get('user_checkin_dates'),
          db.get('user_priority_list'),
          db.get('user_skipped_chars'),
          db.get('user_custom_chars'),
          db.get('user_custom_configs'),
          db.get('user_scenario_cache'),
          db.get('user_last_sync_time'),
        ]);

        if (info) this.info = info;
        if (progress) this.progress = progress;
        if (characters) this.characters = characters;
        if (history) this.history = history;
        if (trains) this.trains = trains;
        if (currentTrainId) this.currentTrainId = currentTrainId;
        if (achievements) this.achievements = achievements;
        if (settings) {
          this.settings = settings;
          audio.setVolume(this.settings.bgmVolume, this.settings.sfxVolume);
        }
        if (unlockedParts) this.unlockedParts = unlockedParts;
        if (equippedParts) this.equippedParts = equippedParts;
        if (lastPlayDate) this.lastPlayDate = lastPlayDate;
        if (dailyStreak) this.dailyStreak = dailyStreak;
        if (Array.isArray(checkInDates)) this.checkInDates = checkInDates;
        else this.checkInDates = [];
        if (priorityList) this.priorityList = priorityList;
        if (skippedChars) this.skippedChars = skippedChars;
        if (customChars) this.customCharacters = customChars;
        if (customConfigs) this.customConfigs = customConfigs;
        if (scenarioCache) this.scenarioCache = scenarioCache;
        if (lastSyncTime) this.lastSyncTime = lastSyncTime;
      } catch (e) {
        console.error('[UserStore] Failed to load local data', e);
      }
    },

    saveLocal() {
      this.localUpdateTime = Date.now();
      db.set('user_info', this.info);
      db.set('user_progress', this.progress);
      db.set('user_characters', this.characters);
      db.set('user_history', this.history);
      db.set('user_trains', this.trains);
      db.set('user_current_train', this.currentTrainId);
      db.set('user_achievements', this.achievements);
      db.set('user_settings', this.settings);
      db.set('user_parts', this.unlockedParts);
      db.set('user_equipped_parts', this.equippedParts);
      db.set('user_last_play_date', this.lastPlayDate);
      db.set('user_daily_streak', this.dailyStreak);
      db.set('user_checkin_dates', this.checkInDates);
      db.set('user_priority_list', this.priorityList);
      db.set('user_skipped_chars', this.skippedChars);
      db.set('user_custom_chars', this.customCharacters);
      db.set('user_custom_configs', this.customConfigs);
      db.set('user_scenario_cache', this.scenarioCache);
      db.set('user_last_sync_time', this.lastSyncTime);
    },

    save() {
      this.saveLocal();
    },

    // ==================== 汉字详情 ====================

    updateCustomConfig(char, config) {
      if (!this.customConfigs[char]) this.customConfigs[char] = {};
      Object.assign(this.customConfigs[char], config);
      this.charsDetailCache = {};
      this.save();
      this.apiCall('custom-config', 'post', '/api/progress/custom-config', {
        char, distractors: config.distractors || [],
      });
    },

    async getCharDetail(idOrChar) {
      let detail = null;
      let char = '';

      if (!idOrChar.startsWith('h_')) {
        char = idOrChar;
        if (this.customCharacters[char]) {
          detail = { ...this.customCharacters[char] };
        }
      }

      if (!detail) {
        let id = idOrChar;
        if (!id.startsWith('h_')) {
          const found = this.charsIndex.find(c => c.char === id);
          if (!found) return null;
          id = found.id;
          char = found.char;
        } else {
          const found = this.charsIndex.find(c => c.id === id);
          if (found) char = found.char;
        }

        if (this.charsDetailCache[id]) {
          return this.charsDetailCache[id];
        }

        const CHUNK_SIZE = 200;
        const numId = parseInt(id.split('_')[1]);
        const chunkIndex = Math.floor((numId - 1) / CHUNK_SIZE);

        try {
          const res = await fetch(`/data/chars_detail_${chunkIndex}.json`);
          if (!res.ok) throw new Error('Network error');
          const chunkData = await res.json();
          Object.assign(this.charsDetailCache, chunkData);
          if (this.charsDetailCache[id]) {
            detail = { ...this.charsDetailCache[id] };
          }
        } catch (e) {
          console.error(e);
          return null;
        }
      }

      if (detail) {
        const custom = this.customConfigs[char];
        if (custom && custom.distractors) {
          if (!detail.confusingChars) detail.confusingChars = {};
          detail.confusingChars.hard = custom.distractors;
        }
        if (detail.id && detail.id.startsWith('h_')) {
          this.charsDetailCache[detail.id] = detail;
        }
      }

      return detail;
    },

    // ==================== 设置 ====================

    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      this.save();
      if (newSettings.bgmVolume !== undefined || newSettings.sfxVolume !== undefined) {
        audio.setVolume(this.settings.bgmVolume, this.settings.sfxVolume);
      }

      const serverSettings = {};
      if (newSettings.showPinyin !== undefined) serverSettings.show_pinyin = newSettings.showPinyin;
      if (newSettings.showHanzi !== undefined) serverSettings.show_hanzi = newSettings.showHanzi;
      if (newSettings.bgmVolume !== undefined) serverSettings.bgm_volume = newSettings.bgmVolume;
      if (newSettings.sfxVolume !== undefined) serverSettings.sfx_volume = newSettings.sfxVolume;
      if (newSettings.hasSeenTutorial !== undefined) serverSettings.has_seen_tutorial = newSettings.hasSeenTutorial;

      if (Object.keys(serverSettings).length > 0) {
        this.apiCall('update-settings', 'put', '/api/parent/settings', serverSettings);
      }
    },

    // ==================== 进度 ====================

    updateProgress(levelId, stars, score) {
      const lvl = Number(levelId);
      if (!isNaN(lvl) && lvl === this.progress.maxLevel && stars > 0) {
        this.progress.maxLevel++;
      }
      this.progress.totalStars += stars;
      this.progress.totalScore += score;
      this.checkUnlockParts();
      this.save();
    },

    updateCharStatus(char, isCorrect) {
      if (!this.characters[char]) {
        this.characters[char] = {
          status: 'new', level: 0, nextReviewTime: 0,
          correct: 0, wrong: 0, streak: 0, lastTime: 0,
        };
      }
      const record = this.characters[char];
      record.lastTime = Date.now();

      if (isCorrect) {
        record.correct++;
        record.streak++;
        if (record.level < 5) record.level++;
        const intervalMs = 10 * 1000;
        record.nextReviewTime = Date.now() + intervalMs;
        if (record.level >= 4) record.status = 'mastered';
        else if (record.level >= 2) record.status = 'familiar';
        else record.status = 'learning';
      } else {
        record.wrong++;
        record.streak = 0;
        record.level = Math.max(0, record.level - 2);
        record.status = 'learning';
        record.nextReviewTime = Date.now();
      }
      this.recordLearning(isCorrect ? 1 : 0);
      this.save();
    },

    batchUpdateChars(results) {
      results.forEach(item => this.updateCharStatus(item.char, item.isCorrect));
    },

    async syncAfterGame(levelId, stars, score, charResults, sessionData) {
      this.updateProgress(levelId, stars, score);
      this.batchUpdateChars(charResults);

      await this.apiCall('update-level', 'post', '/api/progress/update-level', {
        level_id: String(levelId), stars, score,
      });
      await this.apiCall('batch-update-chars', 'post', '/api/progress/chars/batch-update', {
        results: charResults,
      });
      if (sessionData) {
        await this.apiCall('game-session', 'post', '/api/game/session', sessionData);
      }
    },

    // ==================== 复习列表 ====================

    async fetchReviewList() {
      if (this.isOnline && authApi.isLoggedIn()) {
        try {
          const res = await progressApi.getReviewList();
          return res.chars || [];
        } catch (e) {
          console.warn('[Review] Server fetch failed, using local:', e.message);
        }
      }
      return this.reviewList;
    },

    // ==================== 学习记录 ====================

    recordLearning(count = 1) {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const today = new Date(d.getTime() - offset).toISOString().split('T')[0];

      const lastEntry = this.history[this.history.length - 1];
      if (lastEntry && lastEntry.date === today.slice(5)) {
        lastEntry.count += count;
      } else {
        if (this.history.length >= 7) this.history.shift();
        this.history.push({ date: today.slice(5), count: count });
      }

      if (!Array.isArray(this.checkInDates)) this.checkInDates = [];

      if (this.lastPlayDate !== today) {
        const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
        if (this.lastPlayDate === yesterday) {
          this.dailyStreak = (this.dailyStreak || 0) + 1;
        } else {
          this.dailyStreak = 1;
        }
        this.lastPlayDate = today;
        if (!this.checkInDates.includes(today)) this.checkInDates.push(today);
        if (this.checkInDates.length > 30) this.checkInDates.shift();
      }

      this.save();
    },

    // ==================== 火车系统 ====================

    checkUnlockTrains() {
      const totalStars = this.progress.totalStars;
      let unlockedId = null;
      if (totalStars >= 20 && !this.trains.includes('diesel')) {
        this.trains.push('diesel');
        unlockedId = 'diesel';
      }
      if (totalStars >= 50 && !this.trains.includes('electric')) {
        this.trains.push('electric');
        unlockedId = 'electric';
      }
      if (unlockedId) this.save();
      return unlockedId;
    },

    checkUnlockParts() {
      const totalChars = Object.keys(this.characters).length;
      let hasNew = false;
      trainPartsData.forEach(part => {
        if (!this.unlockedParts.includes(part.id)) {
          if (part.unlockType === 'chars' && totalChars >= part.unlockValue) {
            this.unlockedParts.push(part.id);
            hasNew = true;
            if (this.equippedParts.length < 3) this.equippedParts.push(part.id);
          }
        }
      });
      if (hasNew) this.save();
      return hasNew;
    },

    equipTrain(trainId) {
      if (this.trains.includes(trainId)) {
        this.currentTrainId = trainId;
        this.save();
        this.apiCall('equip-train', 'post', '/api/progress/equip-train', { train_id: trainId });
      }
    },

    equipParts(partsList) {
      this.equippedParts = partsList;
      this.save();
      this.apiCall('equip-parts', 'post', '/api/progress/equip-parts', { parts: partsList });
    },

    // ==================== 成就 ====================

    checkAchievements(context = {}) {
      const newUnlocked = [];
      const stats = this.statsCount;

      achievementsData.forEach(ach => {
        if (this.achievements.includes(ach.id)) return;
        let isMet = false;
        const cond = ach.condition;
        switch (cond.type) {
          case 'level_pass': if (this.progress.maxLevel > cond.value) isMet = true; break;
          case 'streak': if (context.streak && context.streak >= cond.value) isMet = true; break;
          case 'master_chars': if (stats.master >= cond.value) isMet = true; break;
          case 'train_count': if (this.trains.length >= cond.value) isMet = true; break;
        }
        if (isMet) {
          this.achievements.push(ach.id);
          newUnlocked.push(ach);
        }
      });

      if (newUnlocked.length > 0) {
        this.save();
        this.newAchievementsQueue.push(...newUnlocked);

        // ★ 直接同步解锁的成就 ID 到后端
        if (this.isOnline && authApi.isLoggedIn()) {
          const newIds = newUnlocked.map(a => a.id);
          achievementsApi.sync(newIds).catch(e => {
            console.warn('[Achievements] Sync failed, queuing:', e.message);
            // 失败时加入离线队列
            syncQueue.push('achievements-sync', 'post', '/api/achievements/sync', newIds);
          });
        } else if (authApi.isLoggedIn()) {
          // 离线时加入队列
          const newIds = newUnlocked.map(a => a.id);
          syncQueue.push('achievements-sync', 'post', '/api/achievements/sync', newIds);
        }

        return newUnlocked;
      }
    },

    consumeAchievement() { return this.newAchievementsQueue.shift(); },

    // ==================== 优先字 / 跳过字 ====================

    addPriorityChar(char) {
      if (!this.priorityList.includes(char)) {
        this.priorityList.push(char);
        this.save();
        this.apiCall('priority-add', 'post', '/api/progress/priority', { action: 'add', char });
      }
    },

    removePriorityChar(char) {
      const idx = this.priorityList.indexOf(char);
      if (idx > -1) {
        this.priorityList.splice(idx, 1);
        this.save();
        this.apiCall('priority-remove', 'post', '/api/progress/priority', { action: 'remove', char });
      }
    },

    isSkipped(char) { return this.skippedChars.includes(char); },

    addSkipChar(char) {
      if (!this.skippedChars.includes(char)) {
        this.skippedChars.push(char);
        this.save();
        this.apiCall('skip-add', 'post', '/api/progress/skip', { action: 'add', char });
      }
    },

    removeSkipChar(char) {
      const idx = this.skippedChars.indexOf(char);
      if (idx > -1) {
        this.skippedChars.splice(idx, 1);
        this.save();
        this.apiCall('skip-remove', 'post', '/api/progress/skip', { action: 'remove', char });
      }
    },

    // ==================== 自定义字 / 剧情缓存 ====================

    addCustomChar(charData) {
      this.customCharacters[charData.char] = charData;
      this.charsDetailCache[`custom_${charData.char}`] = charData;
      this.save();
    },

    cacheScenario(levelId, script) {
      this.scenarioCache[levelId] = script;
      this.save();
    },

    // ==================== 存档 ====================

    serializeData() {
      return JSON.stringify({
        info: this.info,
        progress: this.progress,
        characters: this.characters,
        history: this.history,
        trains: this.trains,
        currentTrainId: this.currentTrainId,
        achievements: this.achievements,
        settings: this.settings,
        unlockedParts: this.unlockedParts,
        equippedParts: this.equippedParts,
        lastPlayDate: this.lastPlayDate,
        dailyStreak: this.dailyStreak,
        checkInDates: this.checkInDates,
        priorityList: this.priorityList,
        skippedChars: this.skippedChars,
        customConfigs: this.customConfigs,
        version: '6.0',
      });
    },

    async deserializeData(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (data.info) this.info = data.info;
        if (data.progress) this.progress = data.progress;
        if (data.characters) this.characters = data.characters;
        if (data.history) this.history = data.history;
        if (data.trains) this.trains = data.trains;
        if (data.currentTrainId) this.currentTrainId = data.currentTrainId;
        if (data.achievements) this.achievements = data.achievements;
        if (data.settings) this.settings = data.settings;
        if (data.unlockedParts) this.unlockedParts = data.unlockedParts;
        if (data.equippedParts) this.equippedParts = data.equippedParts;
        if (data.lastPlayDate) this.lastPlayDate = data.lastPlayDate;
        if (data.dailyStreak) this.dailyStreak = data.dailyStreak;
        if (data.checkInDates) this.checkInDates = data.checkInDates;
        if (data.priorityList) this.priorityList = data.priorityList;
        if (data.skippedChars) this.skippedChars = data.skippedChars;
        if (data.customConfigs) this.customConfigs = data.customConfigs;
        this.save();
        alert('存档恢复成功！');
        window.location.reload();
      } catch (e) {
        console.error('Deserialize failed', e);
        alert('存档文件损坏');
      }
    },

    async syncUpload() {
      try {
        const json = this.serializeData();
        await parentApi.uploadSave(json);
        alert('上传成功！');
        return true;
      } catch (e) {
        alert('上传失败: ' + e.message);
        return false;
      }
    },

    async syncDownload() {
      try {
        if (!confirm('确定要下载云端存档吗？这将覆盖当前进度。')) return;
        const res = await parentApi.downloadSave();
        await this.deserializeData(res.data);
      } catch (e) {
        alert('下载失败: ' + e.message);
      }
    },

    async resetAllData() {
      await syncQueue.clear();
      await db.clearAll();
      window.location.reload();
    },
  },
});