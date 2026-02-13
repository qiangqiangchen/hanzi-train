import { defineStore } from 'pinia';
import { db } from '../utils/db';
import achievementsData from '../data/achievements.json';
import { audio } from '../utils/audio';
import charsIndexRaw from '../data/chars_index.json';
import trainPartsData from '../data/train_parts.json';
import { authApi, progressApi, parentApi } from '../utils/api';

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoaded: false,
    isOnline: false, // 是否连接后端

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

    // 打卡
    lastPlayDate: null,
    dailyStreak: 0,
    checkInDates: [],

    // 数据管理
    charsIndex: charsIndexRaw,
    charsDetailCache: {},
  }),

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
  },

  actions: {
    // ==================== 初始化 ====================

    async init() {
      if (this.isLoaded) return;

      // 1. 已登录 → 优先从后端加载
      if (authApi.isLoggedIn()) {
        try {
          await this.loadFromServer();
          this.isOnline = true;
          this.isLoaded = true;
          // 同步写入本地作为离线缓存
          this.saveLocal();
          console.log('[UserStore] ✅ Loaded from server');
          return;
        } catch (e) {
          console.warn('[UserStore] Server load failed, falling back to local:', e.message);
        }
      }

      // 2. 从本地 IndexedDB 加载（离线 / 未登录）
      await this.loadLocal();
      this.isOnline = false;
      this.isLoaded = true;
      console.log('[UserStore] ✅ Loaded from local');
    },

    // ==================== 从后端加载 ====================

    async loadFromServer() {
      const [profile, progress, chars, settings] = await Promise.all([
        authApi.getMe(),
        progressApi.getProgress(),
        progressApi.getChars(),
        parentApi.getSettings().catch(() => null),
      ]);

      // 用户信息
      if (profile) {
        this.info = { name: profile.display_name || '小小探险家', avatar: profile.avatar || 'default' };
      }

      // 进度
      if (progress) {
        this.progress = {
          currentLevel: progress.current_level || 1,
          maxLevel: progress.max_level || 1,
          totalStars: progress.total_stars || 0,
          totalScore: progress.total_score || 0,
        };
        this.trains = progress.unlocked_trains || ['steam'];
        this.currentTrainId = progress.current_train_id || 'steam';
        this.unlockedParts = progress.unlocked_parts || [];
        this.equippedParts = progress.equipped_parts || [];
        this.dailyStreak = progress.daily_streak || 0;
        this.lastPlayDate = progress.last_play_date || null;
        this.checkInDates = progress.check_in_dates || [];
        this.priorityList = progress.priority_list || [];
        this.skippedChars = progress.skipped_chars || [];
        this.customConfigs = progress.custom_configs || {};
      }

      // 单字记录：数组 → Map
      if (Array.isArray(chars)) {
        this.characters = {};
        chars.forEach(c => {
          this.characters[c.char] = {
            status: c.status || 'new',
            level: c.level || 0,
            correct: c.correct || 0,
            wrong: c.wrong || 0,
            streak: c.streak || 0,
            nextReviewTime: c.next_review_time || 0,
            lastTime: c.last_time || 0,
          };
        });
      }

      // 设置
      if (settings) {
        this.settings = {
          showPinyin: settings.show_pinyin ?? true,
          showHanzi: settings.show_hanzi ?? true,
          bgmVolume: settings.bgm_volume ?? 0.3,
          sfxVolume: settings.sfx_volume ?? 1.0,
          hasSeenTutorial: settings.has_seen_tutorial ?? false,
        };
        audio.setVolume(this.settings.bgmVolume, this.settings.sfxVolume);
      }

      // 成就：从后端尚未实现列表接口，暂从本地加载
      const localAchievements = await db.get('user_achievements');
      if (localAchievements) this.achievements = localAchievements;
    },

    // ==================== 从本地加载 ====================

    async loadLocal() {
      try {
        const [
          info, progress, characters, history, trains, currentTrainId,
          achievements, settings, unlockedParts, equippedParts,
          lastPlayDate, dailyStreak, checkInDates,
          priorityList, skippedChars, customChars, customConfigs, scenarioCache
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
      } catch (e) {
        console.error('[UserStore] Failed to load local data', e);
      }
    },

    // ==================== 保存到本地 ====================

    saveLocal() {
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
    },

    // ==================== 统一 save (本地 + 在线) ====================

    save() {
      this.saveLocal();
    },

    // ==================== 汉字详情 ====================

    updateCustomConfig(char, config) {
      if (!this.customConfigs[char]) this.customConfigs[char] = {};
      Object.assign(this.customConfigs[char], config);
      this.charsDetailCache = {};
      this.save();

      // 在线同步
      if (this.isOnline && authApi.isLoggedIn()) {
        progressApi.updateCustomConfig(char, config.distractors || []).catch(() => { });
      }
    },

    async getCharDetail(idOrChar) {
      let detail = null;
      let char = '';

      // 1. 查自定义字库
      if (!idOrChar.startsWith('h_')) {
        char = idOrChar;
        if (this.customCharacters[char]) {
          detail = { ...this.customCharacters[char] };
        }
      }

      // 2. 查 charsIndex 和分片文件
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

        // 内存缓存
        if (this.charsDetailCache[id]) {
          return this.charsDetailCache[id];
        }

        // Fetch 分片
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

      // 3. 合并家长配置
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

      // 在线同步
      if (this.isOnline && authApi.isLoggedIn()) {
        const serverSettings = {};
        if (newSettings.showPinyin !== undefined) serverSettings.show_pinyin = newSettings.showPinyin;
        if (newSettings.showHanzi !== undefined) serverSettings.show_hanzi = newSettings.showHanzi;
        if (newSettings.bgmVolume !== undefined) serverSettings.bgm_volume = newSettings.bgmVolume;
        if (newSettings.sfxVolume !== undefined) serverSettings.sfx_volume = newSettings.sfxVolume;
        if (newSettings.hasSeenTutorial !== undefined) serverSettings.has_seen_tutorial = newSettings.hasSeenTutorial;

        console.log('[Settings] Syncing to server:', serverSettings);
        console.log('[Settings] isOnline:', this.isOnline, 'isLoggedIn:', authApi.isLoggedIn());

        parentApi.updateSettings(serverSettings)
          .then(res => console.log('[Settings] ✅ Synced:', res))
          .catch(err => console.error('[Settings] ❌ Failed:', err.response?.data || err.message));
      } else {
        console.log('[Settings] Skipped sync - isOnline:', this.isOnline, 'isLoggedIn:', authApi.isLoggedIn());
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

    /**
     * 通关后：本地 + 后端双写
     */
    async syncAfterGame(levelId, stars, score, charResults, sessionData) {
      // 本地更新
      this.updateProgress(levelId, stars, score);
      this.batchUpdateChars(charResults);

      // 在线同步
      if (this.isOnline && authApi.isLoggedIn()) {
        try {
          const promises = [
            progressApi.updateLevel(levelId, stars, score),
            progressApi.batchUpdateChars(charResults),
          ];

          // 提交游戏会话记录
          if (sessionData) {
            const { gameApi } = await import('../utils/api');
            promises.push(gameApi.submitSession(sessionData));
          }

          const results = await Promise.allSettled(promises);
          results.forEach((r, i) => {
            if (r.status === 'rejected') {
              console.warn(`[Sync] Request ${i} failed:`, r.reason?.message);
            }
          });
          console.log('[Sync] ✅ Game results synced to server');
        } catch (e) {
          console.warn('[Sync] ⚠️ Failed to sync, data saved locally:', e.message);
        }
      }
    },

    // ==================== 学习记录 ====================

    recordLearning(count = 1) {
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const today = new Date(d.getTime() - offset).toISOString().split('T')[0];

      // 更新历史图表
      const lastEntry = this.history[this.history.length - 1];
      if (lastEntry && lastEntry.date === today.slice(5)) {
        lastEntry.count += count;
      } else {
        if (this.history.length >= 7) this.history.shift();
        this.history.push({ date: today.slice(5), count: count });
      }

      // 打卡逻辑
      if (!Array.isArray(this.checkInDates)) {
        this.checkInDates = [];
      }

      if (this.lastPlayDate !== today) {
        const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
        if (this.lastPlayDate === yesterday) {
          this.dailyStreak = (this.dailyStreak || 0) + 1;
        } else {
          this.dailyStreak = 1;
        }
        this.lastPlayDate = today;
        if (!this.checkInDates.includes(today)) {
          this.checkInDates.push(today);
        }
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
            if (this.equippedParts.length < 3) {
              this.equippedParts.push(part.id);
            }
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
        if (this.isOnline && authApi.isLoggedIn()) {
          progressApi.equipTrain(trainId).catch(() => { });
        }
      }
    },

    equipParts(partsList) {
      this.equippedParts = partsList;
      this.save();
      if (this.isOnline && authApi.isLoggedIn()) {
        progressApi.equipParts(partsList).catch(() => { });
      }
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
          case 'level_pass':
            if (this.progress.maxLevel > cond.value) isMet = true;
            break;
          case 'streak':
            if (context.streak && context.streak >= cond.value) isMet = true;
            break;
          case 'master_chars':
            if (stats.master >= cond.value) isMet = true;
            break;
          case 'train_count':
            if (this.trains.length >= cond.value) isMet = true;
            break;
        }
        if (isMet) {
          this.achievements.push(ach.id);
          newUnlocked.push(ach);
        }
      });
      if (newUnlocked.length > 0) {
        this.save();
        this.newAchievementsQueue.push(...newUnlocked);
        return newUnlocked;
      }
    },

    consumeAchievement() {
      return this.newAchievementsQueue.shift();
    },

    // ==================== 优先字 / 跳过字 ====================

    addPriorityChar(char) {
      if (!this.priorityList.includes(char)) {
        this.priorityList.push(char);
        this.save();
        if (this.isOnline && authApi.isLoggedIn()) {
          progressApi.updatePriority('add', char).catch(() => { });
        }
      }
    },

    removePriorityChar(char) {
      const idx = this.priorityList.indexOf(char);
      if (idx > -1) {
        this.priorityList.splice(idx, 1);
        this.save();
        if (this.isOnline && authApi.isLoggedIn()) {
          progressApi.updatePriority('remove', char).catch(() => { });
        }
      }
    },

    isSkipped(char) {
      return this.skippedChars.includes(char);
    },

    // ==================== 自定义字 ====================

    addCustomChar(charData) {
      this.customCharacters[charData.char] = charData;
      this.charsDetailCache[`custom_${charData.char}`] = charData;
      this.save();
    },

    // ==================== 剧情缓存 ====================

    cacheScenario(levelId, script) {
      this.scenarioCache[levelId] = script;
      this.save();
    },

    // ==================== 存档导入导出 ====================

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
        version: '5.0',
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

    // ==================== 重置 ====================

    async resetAllData() {
      await db.clearAll();
      window.location.reload();
    },
  },
});