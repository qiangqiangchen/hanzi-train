import { db } from './db';

const QUEUE_KEY = 'sync_queue';

export const syncQueue = {
  async push(type, method, url, data = null) {
    const queue = await this.getAll();

    // 去重：相同 type 的操作只保留最新的
    const dedupeTypes = [
      'equip-train', 'equip-parts', 'update-settings',
    ];

    if (dedupeTypes.includes(type)) {
      const idx = queue.findIndex(item => item.type === type);
      if (idx > -1) {
        queue[idx] = {
          ...queue[idx],
          data,
          timestamp: Date.now(),
          retries: 0,
        };
        await db.set(QUEUE_KEY, queue);
        console.log(`[SyncQueue] Updated existing: ${type}`);
        return;
      }
    }

    // 优先字/跳过字：合并同一个字的 add/remove
    const cancelTypes = {
      'priority-add': 'priority-remove',
      'priority-remove': 'priority-add',
      'skip-add': 'skip-remove',
      'skip-remove': 'skip-add',
    };
    if (cancelTypes[type] && data) {
      const oppositeType = cancelTypes[type];
      const idx = queue.findIndex(
        item => item.type === oppositeType && item.data?.char === data.char
      );
      if (idx > -1) {
        // 互相抵消，直接移除对方
        queue.splice(idx, 1);
        await db.set(QUEUE_KEY, queue);
        console.log(`[SyncQueue] Cancelled: ${oppositeType} + ${type} for "${data.char}"`);
        return;
      }
    }

    queue.push({
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      type,
      method,
      url,
      data,
      timestamp: Date.now(),
      retries: 0,
    });

    await db.set(QUEUE_KEY, queue);
    console.log(`[SyncQueue] Queued: ${type}, total: ${queue.length}`);
  },

  async getAll() {
    const queue = await db.get(QUEUE_KEY, []);
    return Array.isArray(queue) ? queue : [];
  },

  async count() {
    const queue = await this.getAll();
    return queue.length;
  },

  async remove(id) {
    const queue = await this.getAll();
    const filtered = queue.filter(item => item.id !== id);
    await db.set(QUEUE_KEY, filtered);
  },

  async replay(executor) {
    const queue = await this.getAll();
    if (queue.length === 0) return { success: 0, failed: 0, remaining: 0 };

    console.log(`[SyncQueue] Replaying ${queue.length} operations...`);

    let success = 0;
    let failed = 0;
    const remaining = [];

    queue.sort((a, b) => a.timestamp - b.timestamp);

    for (const item of queue) {
      try {
        await executor(item.method, item.url, item.data);
        success++;
        console.log(`[SyncQueue] ✅ Replayed: ${item.type}`);
      } catch (e) {
        const status = e.response?.status;

        // 4xx 错误（参数错误等）不重试，直接丢弃
        if (status && status >= 400 && status < 500) {
          console.warn(`[SyncQueue] ⚠️ Dropped (${status}): ${item.type}`, e.response?.data);
          failed++;
          continue;
        }

        // 网络错误或 5xx → 保留重试
        item.retries = (item.retries || 0) + 1;
        if (item.retries < 3) {
          remaining.push(item);
          console.warn(`[SyncQueue] ⚠️ Retry ${item.retries}/3: ${item.type}`);
        } else {
          console.error(`[SyncQueue] ❌ Dropped after 3 retries: ${item.type}`);
        }
        failed++;
      }
    }

    await db.set(QUEUE_KEY, remaining);
    console.log(`[SyncQueue] Done: ${success} success, ${failed} failed, ${remaining.length} remaining`);

    return { success, failed, remaining: remaining.length };
  },

  async clear() {
    await db.set(QUEUE_KEY, []);
  },
};