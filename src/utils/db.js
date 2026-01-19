import { get, set, del, clear } from 'idb-keyval';

const KEY_PREFIX = 'hanzi_train_';

export const db = {
  async get(key, def = null) {
    try {
      const val = await get(KEY_PREFIX + key);
      return val === undefined ? def : val;
    } catch (e) {
      console.error('DB Get Error:', e);
      return def;
    }
  },

  async set(key, value) {
    try {
      await set(KEY_PREFIX + key, JSON.parse(JSON.stringify(value))); // 确保存入纯数据
    } catch (e) {
      console.error('DB Set Error:', e);
    }
  },

  async remove(key) {
    await del(KEY_PREFIX + key);
  },
  
  async clearAll() {
    await clear();
  }
};