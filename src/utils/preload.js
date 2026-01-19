// 预加载图片
export const preloadImages = (urls) => {
  return Promise.all(urls.map(url => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = resolve;
      img.onerror = resolve; // 即使失败也不阻塞
    });
  }));
};

// [Day5] 预加载音频
// 使用 fetch 触发浏览器缓存，或者 Howler 预加载
export const preloadAudio = (urls) => {
  return Promise.all(urls.map(url => {
    return fetch(url).then(res => {
      if (res.ok) return res.blob();
    }).catch(() => {});
  }));
};