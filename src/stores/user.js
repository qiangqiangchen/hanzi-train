import { defineStore } from 'pinia';
import { db } from '../utils/db';
import achievementsData from '../data/achievements.json';
import { audio } from '../utils/audio';
import charsIndexRaw from '../data/chars_index.json';
import trainPartsData from '../data/train_parts.json';
import { auth } from '../utils/api'; 

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoaded: false,
    
    info: { name: '小小探险家', avatar: 'default' },
    progress: { currentLevel: 1, maxLevel: 1, totalStars: 0, totalScore: 0 },
    characters: {},
    history: [],
    trains: ['steam'],
    currentTrainId: 'steam',
    achievements: [],
    newAchievementsQueue: [],
    priorityList: [], // ['赢', '餐', '饕'] (存放 char)
    skippedChars: [], // ['一', '二'] (家长认为太简单跳过的)
    customCharacters: {},
    customConfigs: {}, // 用户自定义配置 { "人": { distractors: ["入", "八"] } }
    scenarioCache: {},
    settings: {
      showPinyin: true,
      showHanzi: true,
      bgmVolume: 0.3,
      sfxVolume: 1.0,
      hasSeenTutorial: false, // [Day9]
      scenarioCache: {}, 
    },

    unlockedParts: [],
    equippedParts: [],
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
    }
  },

  actions: {
    async init() {
      if (this.isLoaded) return;
      try {
        const [
            info, progress, characters, history, trains, currentTrainId, 
            achievements, settings, unlockedParts, equippedParts,
            lastPlayDate, dailyStreak, checkInDates, customConfigs, scenarioCache
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
          
          // [修复] 必须读取
          db.get('user_last_play_date'),
          db.get('user_daily_streak'),
          db.get('user_checkin_dates'),
          db.get('user_priority_list'),
          db.get('user_skipped_chars'),
          db.get('user_custom_chars'),
          db.get('user_custom_configs'),
          db.get('user_scenario_cache')
        ]);

        if (info) this.info = info;
        if (progress) this.progress = progress;
        if (characters) this.characters = characters;
        if (history) this.history = history;
        if (trains) this.trains = trains;
        if (currentTrainId) this.currentTrainId = currentTrainId;
        if (achievements) this.achievements = achievements;
        if (settings) this.settings = settings;
        if (unlockedParts) this.unlockedParts = unlockedParts;
        if (equippedParts) this.equippedParts = equippedParts;
        if (lastPlayDate) this.lastPlayDate = lastPlayDate;
        if (dailyStreak) this.dailyStreak = dailyStreak;
        if (this.settings) {
            audio.setVolume(this.settings.bgmVolume, this.settings.sfxVolume);
        }
        if (Array.isArray(checkInDates)) {
            this.checkInDates = checkInDates;
        } else {
            this.checkInDates = [];
        }
        if (customConfigs) this.customConfigs = customConfigs;
        this.isLoaded = true;
        console.log('[UserStore] Data loaded from IndexedDB');
      } catch (e) {
        console.error('Failed to load user data', e);
      }
    },

    // [Day3] 更新单字配置
    updateCustomConfig(char, config) {
        if (!this.customConfigs[char]) this.customConfigs[char] = {};
        Object.assign(this.customConfigs[char], config);
        this.charsDetailCache = {};
        this.save();
    },

    async getCharDetail(idOrChar) {
      let detail = null;
      let char = '';

      // 1. 先查自定义新字库 (customCharacters)
      if (!idOrChar.startsWith('h_')) {
          char = idOrChar;
          if (this.customCharacters[char]) {
              detail = { ...this.customCharacters[char] }; // 复制一份
          }
      }

      // 2. 如果不是自定义字，去查 charsIndex 和分片文件
      if (!detail) {
          let id = idOrChar;
          if (!id.startsWith('h_')) {
              const found = this.charsIndex.find(c => c.char === id);
              if (!found) return null; // 没找到
              id = found.id;
              char = found.char;
          } else {
              // 如果传的是 ID，我们要反查 char，方便后续查 customConfigs
              // 这里如果缓存里有，直接取；如果 index 里有，取 char
              // 假设 charsIndex 包含所有 h_ 开头的
              const found = this.charsIndex.find(c => c.id === id);
              if (found) char = found.char;
          }

          // 查内存缓存
          if (this.charsDetailCache[id]) {
              // 注意：缓存里应该已经是合并过的了，直接返回
              return this.charsDetailCache[id];
          }

          // Fetch 分片
          const CHUNK_SIZE = 200;
          const numId = parseInt(id.split('_')[1]);
          const chunkIndex = Math.floor((numId - 1) / CHUNK_SIZE);

          try {
            // 这里有个小问题：如果多次请求同一个 chunk，会有并发请求。
            // 但浏览器会自动合并相同 URL 请求，所以问题不大。
            const res = await fetch(`/data/chars_detail_${chunkIndex}.json`);
            if (!res.ok) throw new Error('Network error');
            const chunkData = await res.json();
            
            // 写入缓存前，先不合并，因为我们要针对单个字合并 customConfig
            // 但为了性能，我们通常把整个 chunk 塞进 cache
            Object.assign(this.charsDetailCache, chunkData);
            
            // 取出当前字
            if (this.charsDetailCache[id]) {
                detail = { ...this.charsDetailCache[id] };
            }
          } catch (e) {
            console.error(e);
            return null;
          }
      }

      // [Day3] 3. 合并家长配置
      if (detail) {
          const custom = this.customConfigs[char]; // char 必须存在
          if (custom && custom.distractors) {
              // 确保结构存在
              if (!detail.confusingChars) detail.confusingChars = {};
              // 覆盖 hard，确保优先使用
              detail.confusingChars.hard = custom.distractors;
          }
          
          // 更新回缓存 (如果是普通字)
          if (detail.id && detail.id.startsWith('h_')) {
              this.charsDetailCache[detail.id] = detail;
          }
      }

      return detail;
    },

    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      this.save();
      if (newSettings.bgmVolume !== undefined || newSettings.sfxVolume !== undefined) {
          audio.setVolume(this.settings.bgmVolume, this.settings.sfxVolume);
      }
    },

    // [修复] 强制转数字比较
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
          correct: 0, wrong: 0, streak: 0, lastTime: 0
        };
      }
      const record = this.characters[char];
      record.lastTime = Date.now();

      if (isCorrect) {
        record.correct++; record.streak++;
        if (record.level < 5) record.level++;
        const intervalMs = 10 * 1000; 
        record.nextReviewTime = Date.now() + intervalMs;
        if (record.level >= 4) record.status = 'mastered';
        else if (record.level >= 2) record.status = 'familiar';
        else record.status = 'learning';
      } else {
        record.wrong++; record.streak = 0; 
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

    recordLearning(count = 1) {
      // 1. 获取今天的日期 YYYY-MM-DD
      // 注意：toISOString() 是 UTC 时间，如果你在中国(UTC+8)，可能会导致半夜变成前一天
      // 建议改用本地时间
      const d = new Date();
      const offset = d.getTimezoneOffset() * 60000;
      const today = new Date(d.getTime() - offset).toISOString().split('T')[0];
      
      // 更新历史图表数据 (这里只存 MM-DD)
      const lastEntry = this.history[this.history.length - 1];
      if (lastEntry && lastEntry.date === today.slice(5)) { 
        lastEntry.count += count;
      } else {
        if (this.history.length >= 7) this.history.shift();
        this.history.push({ date: today.slice(5), count: count });
      }

      // [Day8 核心修复] 处理连胜逻辑
      // 确保 checkInDates 是数组
      if (!Array.isArray(this.checkInDates)) {
          // 如果旧数据是错的，尝试恢复或重置
          this.checkInDates = [];
      }

      if (this.lastPlayDate !== today) {
          // 计算昨天
          const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
          
          if (this.lastPlayDate === yesterday) {
              this.dailyStreak = (this.dailyStreak || 0) + 1;
          } else {
              this.dailyStreak = 1;
          }
          
          this.lastPlayDate = today;
          
          // 防止重复添加 (双保险)
          if (!this.checkInDates.includes(today)) {
              this.checkInDates.push(today);
          }
          
          if (this.checkInDates.length > 30) this.checkInDates.shift();
      }

      this.save();
    },

    checkUnlockTrains() {
        const totalStars = this.progress.totalStars;
        let unlockedId = null;
        if (totalStars >= 20 && !this.trains.includes('diesel')) {
            this.trains.push('diesel'); unlockedId = 'diesel';
        }
        if (totalStars >= 50 && !this.trains.includes('electric')) {
            this.trains.push('electric'); unlockedId = 'electric';
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
            this.currentTrainId = trainId; this.save();
        }
    },

    equipParts(partsList) {
      this.equippedParts = partsList;
      this.save();
    },

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
                this.achievements.push(ach.id); newUnlocked.push(ach);
            }
        });
        if (newUnlocked.length > 0) {
            this.save();
            this.newAchievementsQueue.push(...newUnlocked);
            return newUnlocked;
        }
    },
    
    consumeAchievement() { return this.newAchievementsQueue.shift(); },

    // [Day2] 打包当前数据
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
        // 日期相关
        lastPlayDate: this.lastPlayDate,
        dailyStreak: this.dailyStreak,
        checkInDates: this.checkInDates,
        version: '4.0'
      });
    },
    // [Day2] 恢复数据
    async deserializeData(jsonString) {
      try {
        const data = JSON.parse(jsonString);
        // 恢复到 state
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
        
        // 写入 IndexedDB
        this.save();
        alert('存档恢复成功！');
        window.location.reload(); // 刷新以确保状态一致
      } catch (e) {
        console.error('Deserialize failed', e);
        alert('存档文件损坏');
      }
    },
    // [Day2] 上传到云端
    async syncUpload() {
      try {
        const json = this.serializeData();
        await auth.uploadSave(json);
        alert('上传成功！');
        return true;
      } catch (e) {
        alert('上传失败: ' + e.message);
        return false;
      }
    },
    // [Day2] 从云端下载
    async syncDownload() {
      try {
        if (!confirm('确定要下载云端存档吗？这将覆盖当前进度。')) return;
        const res = await auth.downloadSave();
        await this.deserializeData(res.data);
      } catch (e) {
        alert('下载失败: ' + e.message);
      }
    },

    addPriorityChar(char) {
      if (!this.priorityList.includes(char)) {
        this.priorityList.push(char);
        this.save();
      }
    },
    
    // [Day1] 移除优先字 (学会后自动移除)
    removePriorityChar(char) {
      const idx = this.priorityList.indexOf(char);
      if (idx > -1) {
        this.priorityList.splice(idx, 1);
        this.save();
      }
    },
    
    // [Day1] 检查是否需要跳过 (用于 generateLevel)
    isSkipped(char) {
        return this.skippedChars.includes(char);
    },
    // 添加自定义字
    addCustomChar(charData) {
      this.customCharacters[charData.char] = charData;
      // 同时加入 charsDetailCache，让 getCharDetail 能查到
      this.charsDetailCache[`custom_${charData.char}`] = charData;
      
      this.save();
    },
    cacheScenario(levelId, script) {
      this.scenarioCache[levelId] = script;
      this.save();
    },

    save() {
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
        // [修复] 必须显式保存这三个字段
        db.set('user_last_play_date', this.lastPlayDate);
        db.set('user_daily_streak', this.dailyStreak);
        db.set('user_checkin_dates', this.checkInDates);
        db.set('user_priority_list', this.priorityList);
        db.set('user_skipped_chars', this.skippedChars);
        db.set('user_custom_chars', this.customCharacters);
        db.set('user_custom_configs', this.customConfigs);
        db.set('user_scenario_cache', this.scenarioCache);
    },

    async resetAllData() {
        await db.clearAll();
        window.location.reload();
    }
  }
});