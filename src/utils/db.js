import { get, set, del, clear, keys } from 'idb-keyval';

let KEY_PREFIX = 'hanzi_train_';

export const db = {
  /**
   * 设置当前账号前缀
   * 未登录: hanzi_train_
   * 已登录: hanzi_train_u{userId}_
   */
  setUser(userId) {
    if (userId) {
      KEY_PREFIX = `hanzi_train_u${userId}_`;
    } else {
      KEY_PREFIX = 'hanzi_train_';
    }
    console.log(`[DB] Key prefix: ${KEY_PREFIX}`);
  },

  getPrefix() {
    return KEY_PREFIX;
  },

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
      if (value === undefined) {
        console.warn(`[DB] Skipping undefined value for key: ${key}`);
        return;
      }
      const cleanValue = JSON.parse(JSON.stringify(value));
      await set(KEY_PREFIX + key, cleanValue);
    } catch (e) {
      console.error('DB Set Error:', e);
    }
  },

  async remove(key) {
    await del(KEY_PREFIX + key);
  },

  /**
   * 清空当前账号的所有数据
   */
  async clearCurrent() {
    try {
      const allKeys = await keys();
      const myKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(KEY_PREFIX));
      for (const key of myKeys) {
        await del(key);
      }
      console.log(`[DB] Cleared ${myKeys.length} keys with prefix: ${KEY_PREFIX}`);
    } catch (e) {
      console.error('DB Clear Error:', e);
    }
  },

  /**
   * 清空所有数据（重置用）
   */
  async clearAll() {
    await clear();
  }
};