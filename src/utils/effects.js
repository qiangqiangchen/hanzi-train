import confetti from 'canvas-confetti';

export const effects = {
  // [Day9] 震动反馈 (仅支持的设备)
  vibrate(pattern = 10) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // 部分浏览器需要用户交互后才能震动，且 pattern 可以是数组 [震, 停, 震]
      navigator.vibrate(pattern);
    }
  },

  // 答对特效
  playSuccess(x = 0.5, y = 0.5) {
    this.vibrate(10); // 轻微震动
    
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { x, y },
      colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42'],
      disableForReducedMotion: true,
      zIndex: 1000
    });
  },
  
  // 答错特效
  playError() {
    this.vibrate([50, 50, 50]); // 震动两下
  },

  // 连击特效
  playStreak() {
    this.vibrate(20);
    const end = Date.now() + 500;
    const colors = ['#ff0000', '#ffa500'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: colors,
        zIndex: 1000
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: colors,
        zIndex: 1000
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  },

  // 通关特效
  playWin() {
    this.vibrate([100, 50, 100]);
    const duration = 2000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        zIndex: 1000
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        zIndex: 1000
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }
};