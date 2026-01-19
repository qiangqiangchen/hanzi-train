import { Howl, Howler } from 'howler';

const soundCache = {};
const playHistory = {}; // [修复] 防抖记录

const VOLUMES = {
  bgm: 0.3,
  sfx: 1.0,
  voice: 1.0
};

export const audio = {
  currentBGM: null,

  init() {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
  },

  setVolume(bgmVol, sfxVol) {
    VOLUMES.bgm = bgmVol;
    VOLUMES.sfx = sfxVol;
    if (this.currentBGM) {
      this.currentBGM.volume(bgmVol);
    }
  },

  playBGM(url) {
    if (this.currentBGM && this.currentBGM._src.includes(url)) return;
    if (this.currentBGM) {
      this.currentBGM.fade(VOLUMES.bgm, 0, 1000);
      setTimeout(() => { if (this.currentBGM) this.currentBGM.stop(); }, 1000);
    }
    const sound = new Howl({ src: [url], loop: true, volume: 0, html5: true });
    sound.play();
    sound.fade(0, VOLUMES.bgm, 1000);
    this.currentBGM = sound;
  },

  // [修复] 通用防抖检查
  checkDebounce(key, duration = 300) {
    const now = Date.now();
    if (playHistory[key] && now - playHistory[key] < duration) {
      return false; // 冷却中，不播放
    }
    playHistory[key] = now;
    return true;
  },

  playSFX(name) {
    let url = `/audio/sfx/${name}.mp3`;
    if (name === 'attach') url = 'https://actions.google.com/sounds/v1/cartoon/clank_car_crash.ogg';
    else if (name === 'wrong') url = 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg';
    else if (name === 'correct') url = 'https://actions.google.com/sounds/v1/cartoon/pop.ogg';

    // [修复] 针对汽笛声做长防抖，防止重叠
    const debounceTime = name === 'whistle' ? 2000 : 150;
    if (!this.checkDebounce(url, debounceTime)) return;

    if (!soundCache[url]) {
      soundCache[url] = new Howl({
        src: [url],
        volume: VOLUMES.sfx,
        onloaderror: (id, err) => console.warn(`Audio Missing: ${url}`)
      });
    } else {
      soundCache[url].volume(VOLUMES.sfx);
    }
    soundCache[url].play();
  },

  playVoice(text, filename) {
    const url = `/audio/sfx/${filename}.mp3`;

    // [修复] 语音防抖 500ms
    if (!this.checkDebounce(url, 500)) return;

    const sound = new Howl({
      src: [url],
      volume: VOLUMES.voice,
      onloaderror: () => {
        this.speakTTS(text);
      }
    });
    sound.play();
  },

  playQuestion(charObj) {
    let url = charObj.audio_quest || `/audio/chars/${charObj.char}_question.mp3`;

    // [修复] 题目语音防抖 500ms
    if (!this.checkDebounce(url, 500)) return;

    const sound = new Howl({
      src: [url],
      volume: VOLUMES.voice,
      html5: true, // [优化] 对于大量音频，建议开启 HTML5 Audio 以流式播放，减少内存占用
      onloaderror: () => {
        // 降级 TTS
        const text = `请找出 ${charObj.char}`;
        this.speakTTS(text);
      }
    });
    sound.play();
  },

  playChar(char) {
    const url = `/audio/chars/${char}.mp3`;
    if (!this.checkDebounce(url, 200)) return;

    const sound = new Howl({
      src: [url],
      volume: VOLUMES.voice,
      onloaderror: () => {
        this.speakTTS(char);
      }
    });
    sound.play();
  },

  speakTTS(text) {
    if (!window.speechSynthesis) return;
    // TTS 防抖
    if (!this.checkDebounce('tts_' + text, 500)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};