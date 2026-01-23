import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth } from '../utils/api'; // [Day2] 引入 API
import chaptersData from '../data/chapters.json';
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
  const currentStoryScript = ref(null); 
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

  const currentFillIndex = ref(0); 
  const currentFilledChars = ref([]); 

  const transitionTimers = []; 
  let lastPlayTime = 0;

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

  // [Day8 修复] 完整的 AI 获取与兜底函数
  async function fetchAiScenario(levelId, questionsList) {
      // 1. 尝试 AI
      try {
          const chars = questionsList.map(q => q.targetChars.map(c => c.char)).flat();
          const uniqueChars = [...new Set(chars)].slice(0, 5);
          if (uniqueChars.length === 0) return null;

          const scenario = await auth.generateScenario(Number(levelId), uniqueChars);
          if (scenario && scenario.dialogs && scenario.dialogs.length > 0) {
              return {
                  trigger: 'pre',
                  background: scenario.background || 'bg-blue-500',
                  dialogs: scenario.dialogs,
                  id: `ai_${levelId}`
              };
          }
      } catch (e) {
          console.warn('AI scenario skipped:', e.message);
      }
      
      // 2. [Day8] 本地兜底逻辑
      // 如果 AI 失败，或者没返回有效数据，使用本地模板
      // 这样保证剧情模式的连续性
      const charsStr = questionsList.slice(0, 3).map(q => q.targetChars[0].char).join('、');
      return {
          trigger: 'pre',
          background: 'bg-indigo-600',
          id: `fallback_${levelId}`,
          dialogs: [
              { role: 'conductor', name: '列车长', text: `前方到达第 ${levelId} 关！`, emotion: 'happy' },
              { role: 'conductor', name: '列车长', text: `我们要收集 [${charsStr}] 这些能量块。`, emotion: 'normal' },
              { role: 'conductor', name: '列车长', text: '大家准备好了吗？出发！', emotion: 'happy' }
          ]
      };
  }

  async function initLevel(levelId) {
    console.log(`[Game] Init level (Server): ${levelId}`);
    clearAllTimers();
    isProcessing.value = false;
    isGameActive.value = true;
    currentFillIndex.value = 0;
    currentFilledChars.value = [];

    try {
        // [Day2] 调用后端 API
        const data = await auth.initLevel(Number(levelId));
        console.log('game.js->',data)
        currentLevelConfig.value = {
            levelId: data.levelId, // 确保后端返回了 levelId
            difficulty: { timeLimit: data.timeLimit }
        };
        resetGameState(); // [关键]
        initSkill();
        // 应用后端返回的数据
        questions.value = data.questions;
        timeLimit.value = data.timeLimit || 0;

        // 章节配置 (前端保留，或者后端也返回)
        // 简单起见，前端根据 levelId 算一下
        const chapIdx = Math.floor((levelId - 1) / 20) % chaptersData.length;
        currentChapter.value = chaptersData[chapIdx];

        // 音频预加载
        triggerAudioPreload(questions.value);

        return true;
    } catch (e) {
        console.error('Level Init Failed', e);
        alert('无法连接服务器获取关卡');
        return false;
    }
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
      qList.push({ 
          isWord: false, 
          targetChar: target, 
          targetChars: [target], 
          options: optionsWithState, 
          status: 'pending', 
          isReview: false 
      });
    });
    return qList;
  }

  function generateOptions(target, difficulty) {
    const pool = charsIndex.filter(c => c.char !== target.char);
    const maxOptions = 6;
    const configCount = Math.min(difficulty.optionCount, maxOptions);
    const count = Math.min(pool.length, configCount - 1);
    const distractors = pool.sort(() => Math.random() - 0.5).slice(0, count);
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

    const q = currentQuestion.value;
    if (!q) return;

    if (q.isWord) {
        // 词语模式：播放 TTS
        const text = `请拼出：${q.targetText}`;
        audio.speakTTS(text);
    } else {
        // 单字模式：播放 MP3
        // [修复] 增加空值检查
        if (q.targetChar) {
            audio.playQuestion(q.targetChar);
        } else if (q.targetChars && q.targetChars[0]) {
            // 兼容性处理：如果只有 targetChars
            audio.playQuestion(q.targetChars[0]);
        }
    }
    startTimer();
  }

  function submitAnswer(selectedOption) {
    if (!isGameActive.value || isProcessing.value || selectedOption.state === 'wrong') return false;
    userInteracted.value = true;
    totalClicks.value++;

    const q = currentQuestion.value;
    const currentTarget = q.targetChars[currentFillIndex.value];
    
    if (selectedOption.char === currentTarget.char) {
        selectedOption.state = 'correct'; 
        audio.playSFX('correct'); 
        currentFilledChars.value.push(selectedOption);
        currentFillIndex.value++;
        
        if (!q.isReview) {
            const charStr = currentTarget.char;
            if (!(charStr in sessionRecords.value)) sessionRecords.value[charStr] = true;
        }
        
        if (currentFillIndex.value >= q.targetChars.length) {
            isProcessing.value = true;
            handleCorrect(); 
        }
        return true;
    } else {
        if (shieldActive.value) {
            shieldActive.value = false;
            selectedOption.state = 'wrong';
            audio.playSFX('attach'); 
            totalClicks.value--;
            return false; 
        }
        
        selectedOption.state = 'wrong';
        audio.playSFX('wrong');
        
        if (q.targetChars.length === 1) {
             if (!q.isReview) {
                const charStr = q.targetChars[0].char;
                if (!(charStr in sessionRecords.value)) sessionRecords.value[charStr] = false;
            }
            handleWrong(q.targetChar);
        }
        
        return false;
    }
  }

  function handleCorrect() {
    stopTimer();
    audio.playVoice('太棒了！', 'great'); 
    
    transitionTimers.push(setTimeout(() => { 
        audio.playSFX('correct'); 
    }, 1000)); 
    
    streak.value++;
    score.value += 10 + (streak.value > 3 ? 5 : 0);
    
    currentFillIndex.value = 0;
    currentFilledChars.value = [];
    
    transitionTimers.push(setTimeout(() => {
      const q = currentQuestion.value;
      q.targetChars.forEach(c => {
          collectedCarriages.value.push({ char: c.char, type: streak.value >= 5 ? 'golden' : 'normal', id: Date.now() + Math.random() });
      });
      audio.playSFX('attach');
    }, 1500));
    
    transitionTimers.push(setTimeout(() => { 
        isProcessing.value = false; 
        nextQuestion(); 
    }, 2500));
  }

  function handleWrong(targetChar) {
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
    audio.stopAll();
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
    currentStoryScript, currentFillIndex, currentFilledChars
  };
});