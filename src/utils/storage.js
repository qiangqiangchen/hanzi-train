const KEY_PREFIX = 'hanzi_train_';

export const storage = {
  get(key, def = null) {
    const item = localStorage.getItem(KEY_PREFIX + key);
    if (!item) return def;
    try {
      return JSON.parse(item);
    } catch (e) {
      return def;
    }
  },

  set(key, value) {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(KEY_PREFIX + key);
  },
  
  // [Day7] 清空本应用所有数据
  clear() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};