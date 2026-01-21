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
      // [修复] 防止 undefined 导致 JSON.stringify 异常
      if (value === undefined) {
          console.warn(`[DB] Skipping undefined value for key: ${key}`);
          return;
      }
      // 深拷贝去除非序列化数据 (如 Proxy)
      const cleanValue = JSON.parse(JSON.stringify(value));
      await set(KEY_PREFIX + key, cleanValue);
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