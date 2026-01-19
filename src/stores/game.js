import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import levelsData from '../data/levels.json';
import charsData from '../data/characters.json'; // 依然保留旧数据用于兼容
import chaptersData from '../data/chapters.json';
import trainsData from '../data/trains.json';
import charsIndex from '../data/chars_index.json'; // 新索引
import { audio } from '../utils/audio';
import { preloadAudio } from '../utils/preload';
import { useUserStore } from './user';
import { useRouter } from 'vue-router';
import { effects } from '../utils/effects';

export const useGameStore = defineStore('game', () => {
  const userStore = useUserStore();
  const router = useRouter();

  // State
  const currentLevelConfig = ref(null);
  const currentChapter = ref(null);
  const questions = ref([]);
  const currentIndex = ref(0);
  const score = ref(0);
  const streak = ref(0);
  const isGameActive = ref(false);
  const userInteracted = ref(false);
  const isProcessing = ref(false);

  const collectedCarriages = ref([]);
  const resultData = ref(null);
  const sessionRecords = ref({});
  const totalClicks = ref(0);

  const currentSkill = ref(null);
  const skillUsed = ref(false);
  const shieldActive = ref(false);

  const timeLimit = ref(0);
  const timeRemaining = ref(0);
  const timerId = ref(null);

  const transitionTimers = [];
  let lastPlayTime = 0;

  // 当前已填入的字索引 (例如"天空"，填了"天"，index=1)
  const currentFillIndex = ref(0);
  // 用户已选的答案序列 (用于UI显示填空槽)
  const currentFilledChars = ref([]);

  const currentQuestion = computed(() => {
    if (!questions.value || questions.value.length === 0) return null;
    return questions.value[currentIndex.value];
  });

  const progressPercent = computed(() => {
    if (!questions.value.length) return 0;
    return ((currentIndex.value) / questions.value.length) * 100;
  });

  // --- Actions ---

  function clearAllTimers() {
    stopTimer();
    transitionTimers.forEach(id => clearTimeout(id));
    transitionTimers.length = 0;
  }

  function exitGame() {
    clearAllTimers();
    isGameActive.value = false;
    isProcessing.value = false;
  }

  async function initLevel(levelId) {
    console.log(`[Game] Init level: ${levelId}`);
    clearAllTimers();
    isProcessing.value = false;
    isGameActive.value = true;
    currentFillIndex.value = 0; // [Day4] 重置词语状态
    currentFilledChars.value = [];

    // 1. 复习关逻辑
    if (levelId === 'review') {
        const reviewChars = userStore.reviewList;
        if (reviewChars.length === 0) return false;
        
        currentLevelConfig.value = {
            levelId: 'review',
            name: '每日复习',
            chapter: 99,
            targetChars: reviewChars.slice(0, 10),
            difficulty: { optionCount: 4, timeLimit: 15 }
        };
        currentChapter.value = { id: 99, name: '记忆宫殿', bgColor: 'bg-gradient-to-r from-pink-300 via-purple-300 to-indigo-400', bgImage: '' };
        
        resetGameState();
        initSkill();

        const targetCharObjs = await fetchDetails(reviewChars.slice(0, 10));
        questions.value = await generateQuestions(currentLevelConfig.value); // [Day4] 统一使用 generateQuestions
        triggerAudioPreload(questions.value);
        timeLimit.value = 15;
        audio.playBGM('/audio/bgm/default.mp3');
        return true;
    }

    const levelIdNum = Number(levelId);
    let levelConfig = levelsData.find(l => l.levelId == levelIdNum);
    let targetCharObjs = [];

    if (!levelConfig) {
      console.log(`[Game] Auto-generating Level ${levelIdNum}...`);
      
      const isWordMode = levelIdNum > 20 && Math.random() < 0.3; // [Day4] 词语模式标记
      const charCount = levelIdNum <= 10 ? 3 : (levelIdNum <= 30 ? 4 : (levelIdNum <= 60 ? 5 : 6));
      
      // [Day1] 策略 1: 优先从 priorityList 取
      const priorityChars = userStore.priorityList.slice(0, charCount);
      
      if (priorityChars.length > 0) {
          const details = await fetchDetails(priorityChars);
          targetCharObjs = details;
          console.log('[Game] Using priority chars:', priorityChars);
      }
      
      // [Day1] 策略 2: 补全
      if (targetCharObjs.length < charCount) {
          const needed = charCount - targetCharObjs.length;
          const targetLevel = Math.min(Math.ceil(levelIdNum / 20), 5);
          
          const existingChars = targetCharObjs.map(o => o.char);
          
          const pool = charsIndex.filter(c => 
              c.level === targetLevel && 
              !userStore.isSkipped(c.char) && 
              !existingChars.includes(c.char) &&
              (!userStore.characters[c.char] || userStore.characters[c.char].level < 4)
          );
          
          // 兜底
          const finalPool = pool.length > 0 ? pool : charsIndex.filter(c => c.level === targetLevel);
          const absoluteFinalPool = finalPool.length > 0 ? finalPool : charsIndex;

          const randomPicks = absoluteFinalPool.sort(() => Math.random() - 0.5).slice(0, needed);
          
          const randomDetails = await fetchDetails(randomPicks.map(i => i.id || i.char));
          targetCharObjs = [...targetCharObjs, ...randomDetails];
      }

      // [修复] 这里不需要再 fetch 了，targetCharObjs 已经准备好了
      
      levelConfig = {
        levelId: levelIdNum,
        chapter: Math.min(Math.ceil(levelIdNum / 20), 3), 
        name: `第 ${levelIdNum} 关`,
        difficulty: { optionCount: 4, timeLimit: 0 },
        _autoGeneratedTargetObjs: targetCharObjs
      };
    } else {
        // 手写配置
        const ids = levelConfig.targetChars.map(char => {
            const found = charsIndex.find(c => c.char === char);
            return found ? found.id : char; 
        });
        targetCharObjs = await fetchDetails(ids);
    }

    currentLevelConfig.value = levelConfig;
    
    const chapIdx = (levelConfig.chapter - 1) % chaptersData.length;
    const baseChapter = chaptersData[chapIdx] || chaptersData[0];
    currentChapter.value = { ...baseChapter };

    if (currentChapter.value.id === 1) audio.playBGM('/audio/bgm/farm.mp3');
    else if (currentChapter.value.id === 2) audio.playBGM('/audio/bgm/city.mp3');
    else if (currentChapter.value.id === 3) audio.playBGM('/audio/bgm/space.mp3');
    else audio.playBGM('/audio/bgm/default.mp3');

    resetGameState();
    initSkill();

    timeLimit.value = levelConfig.difficulty?.timeLimit || 0;
    
    // [Day4] 生成题目 (支持词语)
    questions.value = await generateQuestions(levelConfig);
    
    triggerAudioPreload(questions.value);
    
    return true;
  }

  // [Day4] 升级为支持词语的生成器
  async function generateQuestions(level) {
    let targets = [];
    if (level._autoGeneratedTargetObjs) targets = level._autoGeneratedTargetObjs;
    // ...

    const qList = [];

    for (const charObj of targets) {
      // [Day4] 词语判定逻辑
      // 如果该字有组词 (example)，且长度为 2-4，且随机命中
      // 且关卡 ID > 10 (作为示例)
      const canBeWord = charObj.example && charObj.example.length >= 2 && charObj.example.length <= 4 && Math.random() < 0.4;

      if (canBeWord) {
        // 生成词语题
        const word = charObj.example; // "天空"
        // 我们需要获取这个词里每个字的详情（为了拼音和语音）
        // 注意：charsIndex 里可能没有某些字（比如生僻组词）。
        // 简单起见，我们只生成 "Target字 + 其他字" 的结构
        // 题目对象结构升级：
        // isWord: true
        // targetText: "天空"
        // targetChars: [ {char:'天'}, {char:'空'} ]
        // options: [ {char:'天'}, {char:'空'}, {char:'大'}, {char:'海'} ]

        // 分解词语
        const charList = word.split('');
        const charDetails = await fetchDetails(charList); // 获取每个字的详情

        const q = {
          isWord: true,
          targetText: word,
          targetChars: charDetails, // 正确答案序列
          options: generateWordOptions(charDetails, level.difficulty),
          status: 'pending'
        };
        qList.push(q);

      } else {
        // 单字题 (旧逻辑)
        // 为了统一结构，单字题也包装成 isWord: false
        const options = generateOptions(charObj, level.difficulty).map(opt => ({ ...opt, state: 'normal' }));
        qList.push({
          isWord: false,
          targetChar: charObj, // 保留旧字段兼容
          targetText: charObj.char, // 统一字段
          targetChars: [charObj],   // 统一字段
          options: options,
          status: 'pending'
        });
      }
    }
    return qList;
  }

  // [Day4] 词语选项生成
  function generateWordOptions(targetChars, difficulty) {
    // 目标：包含所有正确字，再补干扰项
    // targetChars: [{char:'天'}, {char:'空'}]
    const correctOptions = targetChars.map(c => ({ ...c, state: 'normal' }));

    // 需要补足到 4 个或更多
    const totalNeeded = Math.max(4, targetChars.length + 2); // 至少 2 个干扰项
    const distractorsNeeded = totalNeeded - correctOptions.length;

    // 找干扰项 (随机)
    // 注意：要排除正确字
    const pool = charsIndex.filter(c => !targetChars.some(t => t.char === c.char));
    const distractors = pool.sort(() => Math.random() - 0.5).slice(0, distractorsNeeded).map(c => ({ ...c, state: 'normal' }));

    // 合并打乱
    return [...correctOptions, ...distractors].sort(() => Math.random() - 0.5);
  }

  function triggerAudioPreload(questionsList) {
    const audioUrls = new Set();
    questionsList.forEach(q => {
      if (q.targetChar && q.targetChar.char) {
        audioUrls.add(`/audio/chars/${q.targetChar.char}_question.mp3`);
      }
      q.options.forEach(opt => {
        if (opt.char) audioUrls.add(`/audio/chars/${opt.char}.mp3`);
      });
    });
    preloadAudio(Array.from(audioUrls));
  }

  // [辅助] 批量获取详情，兼容 ID 和 Char
  async function fetchDetails(idsOrChars) {
    const promises = idsOrChars.map(id => userStore.getCharDetail(id));
    const results = await Promise.all(promises);

    return results.map((res, index) => {
      if (res) return res;
      const originalInput = idsOrChars[index];
      let charStr = originalInput;
      if (originalInput.startsWith('h_')) {
        const found = charsIndex.find(c => c.id === originalInput);
        if (found) charStr = found.char;
      }
      return { id: originalInput, char: charStr, pinyin: '' };
    }).filter(item => item && item.char);
  }

  function resetGameState() {
    score.value = 0;
    streak.value = 0;
    currentIndex.value = 0;
    isGameActive.value = true;
    userInteracted.value = false;
    isProcessing.value = false;
    collectedCarriages.value = [];
    sessionRecords.value = {};
    totalClicks.value = 0;
  }

  function initSkill() {
    const trainId = userStore.currentTrainId;
    if (trainId === 'diesel') currentSkill.value = 'hint';
    else if (trainId === 'electric') currentSkill.value = 'shield';
    else currentSkill.value = null;
    skillUsed.value = false;
    shieldActive.value = false;
  }

  function buildQuestionsFromChars(targetCharObjs, difficulty) {
    const qList = [];
    const shuffledTargets = [...targetCharObjs].sort(() => Math.random() - 0.5);
    shuffledTargets.forEach(target => {
      const optionsWithState = generateOptions(target, difficulty).map(opt => ({
        ...opt,
        state: 'normal'
      }));
      qList.push({ targetChar: target, options: optionsWithState, status: 'pending', isReview: false });
    });
    return qList;
  }

  function generateOptions(target, difficulty) {
    const pool = charsIndex.filter(c => c.char !== target.char);
    const maxOptions = 6;
    const configCount = Math.min(difficulty.optionCount, maxOptions);
    const neededCount = configCount - 1; // 需要几个干扰项

    // [Day3] 优先使用配置的干扰项 (无论 Easy/Hard，只要有配置都先用)
    // 顺序：Hard (家长配置) > Medium > Easy
    // target 对象来自于 fetchDetails，已经是合并了家长配置的完整对象

    const conf = target.confusingChars || {};
    const preferredList = [
      ...(conf.hard || []),
      ...(conf.medium || []),
      ...(conf.easy || [])
    ];

    // 去重并转为对象
    // 注意：preferredList 只是字符串数组 ['入', '八']
    // 我们需要从 charsIndex 里找到对应的对象 {id, char, level}
    // 如果是自定义字，charsIndex 里可能没有，得去 customCharacters 里找
    // 简单起见，我们只处理 charsIndex 里有的

    let distractors = [];

    // 1. 填充优先干扰项
    for (const charStr of preferredList) {
      if (distractors.length >= neededCount) break;

      // 查找对象
      const found = charsIndex.find(c => c.char === charStr);
      // 或者是自定义字？userStore.customCharacters[charStr]
      // 这里 access userStore 有点麻烦，如果你没引入，需要引入

      if (found && !distractors.some(d => d.char === found.char)) {
        distractors.push(found);
      }
    }

    // 2. 如果不够，随机补全
    if (distractors.length < neededCount) {
      const remaining = neededCount - distractors.length;
      // 过滤掉已选的
      const cleanPool = pool.filter(c => !distractors.some(d => d.char === c.char));
      const randomExtras = cleanPool.sort(() => Math.random() - 0.5).slice(0, remaining);
      distractors = [...distractors, ...randomExtras];
    }

    // 3. 合并并打乱
    return [...distractors, target].sort(() => Math.random() - 0.5);
  }

  function startTimer() {
    stopTimer();
    if (timeLimit.value <= 0) return;
    timeRemaining.value = timeLimit.value;
    timerId.value = setInterval(() => {
      timeRemaining.value--;
      if (timeRemaining.value <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId.value) {
      clearInterval(timerId.value);
      timerId.value = null;
    }
  }

  function handleTimeout() {
    if (!isGameActive.value || isProcessing.value) return;
    totalClicks.value++;
    handleWrong(currentQuestion.value.targetChar);
    currentQuestion.value.options.forEach(opt => {
      if (opt.char !== currentQuestion.value.targetChar.char) opt.state = 'wrong';
    });
  }

  function playQuestionAudio() {
    const now = Date.now();
    if (now - lastPlayTime < 1000) return;
    lastPlayTime = now;

    if (!currentQuestion.value) return;
    // [Day4] 适配词语语音
    if (currentQuestion.value.isWord) {
      // 播放词语 TTS (或者如果有 word.mp3 更好)
      // 暂时用 TTS
      const text = `请拼出：${currentQuestion.value.targetText}`;
      audio.speakTTS(text);
    } else {
      // 单字逻辑
      const charObj = currentQuestion.value.targetChar;
      audio.playQuestion(charObj);
    }
    startTimer();
  }

  function submitAnswer(selectedOption) {
    if (!isGameActive.value || isProcessing.value || selectedOption.state === 'wrong') return false;
    
    userInteracted.value = true;
    totalClicks.value++;

    const q = currentQuestion.value;
    const currentTarget = q.targetChars[currentFillIndex.value]; 
    
    // 1. 判断是否命中当前需要的字
    if (selectedOption.char === currentTarget.char) {
        selectedOption.state = 'correct'; 
        audio.playSFX('correct'); 
        currentFilledChars.value.push(selectedOption);
        currentFillIndex.value++;
        
        if (!q.isWord && !q.isReview) {
            const charStr = currentTarget.char;
            if (!(charStr in sessionRecords.value)) sessionRecords.value[charStr] = true;
        }
        
        if (currentFillIndex.value >= q.targetChars.length) {
            isProcessing.value = true;
            handleCorrect(); 
        }
        return true;
    } 
    
    // 2. 选错逻辑
    
    // 2.1 护盾
    if (shieldActive.value) {
        shieldActive.value = false;
        audio.playSFX('attach');
        totalClicks.value--;
        return false;
    }
    
    audio.playSFX('wrong');

    // 2.2 判断是否要置灰 (变灰 = 死刑)
    // 规则：
    // - 单字模式：只要错，必须死 (为了触发纠错流程)
    // - 词语模式：只有当它是【纯干扰项】时才死。如果它是词里的字(顺序错)，不能死。
    
    let shouldDisable = true;
    
    if (q.isWord) {
        // 检查是否属于目标词
        // 注意：这里必须用 char 字符串比较，防止对象引用不同
        const isPartOfWord = q.targetChars.some(c => c.char === selectedOption.char);
        if (isPartOfWord) {
            shouldDisable = false; // 属于词，只是顺序不对，不置灰
        }
    }
    
    if (shouldDisable) {
        selectedOption.state = 'wrong';
    }

    // 2.3 记录错误 (单字模式)
    if (!q.isWord) {
        if (!q.isReview) {
            const charStr = q.targetChars[0].char;
            if (!(charStr in sessionRecords.value)) sessionRecords.value[charStr] = false;
        }
        handleWrong(q.targetChar);
    }
    console.log('Selected:', selectedOption.char);
    console.log('TargetChars:', q.targetChars.map(c => c.char));
    console.log('Is Part:', isPartOfWord);
    return false;
  }

  function handleCorrect() {
    stopTimer();
    audio.playVoice('太棒了！', 'great');

    transitionTimers.push(setTimeout(() => {
      audio.playSFX('correct');
    }, 1000));

    currentFillIndex.value = 0;
    currentFilledChars.value = [];

    streak.value++;
    score.value += 10 + (streak.value > 3 ? 5 : 0);

    transitionTimers.push(setTimeout(() => {
      const newCarriage = { char: currentQuestion.value.targetChar.char, type: streak.value >= 5 ? 'golden' : 'normal', id: Date.now() };
      collectedCarriages.value.push(newCarriage);
      audio.playSFX('attach');
    }, 1500));

    transitionTimers.push(setTimeout(() => {
      isProcessing.value = false;
      nextQuestion();
    }, 2500));
  }

  function handleWrong(targetChar,wrongOption) {
    stopTimer();
    audio.playSFX('wrong');
    transitionTimers.push(setTimeout(() => {
      audio.playVoice('不对哦，再试一次', 'try_again');
    }, 800));

    streak.value = 0;
    const currentQ = currentQuestion.value;
    if (!currentQ.isReview) {
      const reviewQ = JSON.parse(JSON.stringify(currentQ));
      reviewQ.isReview = true;
      reviewQ.options.forEach(o => o.state = 'normal');
      questions.value.push(reviewQ);
    }
  }

  function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++;
      playQuestionAudio();
    } else {
      finishGame();
    }
  }

  function useSkill() {
    if (skillUsed.value || !currentSkill.value) return false;
    if (currentSkill.value === 'hint') {
      const targetChar = currentQuestion.value.targetChar.char;
      const wrongOption = currentQuestion.value.options.find(o => o.char !== targetChar && o.state === 'normal');
      if (wrongOption) {
        wrongOption.state = 'wrong';
        skillUsed.value = true;
        audio.playSFX('correct');
        return true;
      }
    } else if (currentSkill.value === 'shield') {
      shieldActive.value = true;
      skillUsed.value = true;
      audio.playSFX('correct');
      return true;
    }
    return false;
  }

  function finishGame() {
    if (!isGameActive.value) return;
    clearAllTimers();
    isGameActive.value = false;
    isProcessing.value = false;

    const results = Object.entries(sessionRecords.value).map(([char, isCorrect]) => ({
      char,
      isCorrect
    }));
    userStore.batchUpdateChars(results);

    const passCount = collectedCarriages.value.length;
    let accuracy = 0;
    if (totalClicks.value > 0) accuracy = passCount / totalClicks.value;

    let stars = 1;
    if (accuracy >= 0.9) stars = 3;
    else if (accuracy >= 0.7) stars = 2;

    resultData.value = {
      levelId: currentLevelConfig.value.levelId,
      score: score.value,
      stars: stars,
      carriages: JSON.parse(JSON.stringify(collectedCarriages.value))
    };
    if (collectedCarriages.value.length > 0) userStore.recordLearning(collectedCarriages.value.length);
    userStore.updateProgress(currentLevelConfig.value.levelId, stars, score.value);
    userStore.checkAchievements();

    // [Day1] 移除已掌握的优先字
    collectedCarriages.value.forEach(item => {
      if (userStore.priorityList.includes(item.char)) {
        userStore.removePriorityChar(item.char);
      }
    });

    router.replace('/result');
  }

  return {
    currentLevelConfig, currentChapter, currentQuestion, currentIndex, score, streak,
    collectedCarriages, resultData, progressPercent, currentSkill, skillUsed, shieldActive,
    useSkill, timeLimit, timeRemaining, startTimer, stopTimer, initLevel, submitAnswer, playQuestionAudio, exitGame,
    currentFillIndex, currentFilledChars,
  };
});