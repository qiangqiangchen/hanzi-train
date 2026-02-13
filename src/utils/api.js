import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// ==================== 拦截器 ====================

api.interceptors.request.use(config => {
  const token = localStorage.getItem('hanzi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hanzi_token');
      // 不强制跳转，让应用降级为离线模式
      console.warn('[API] Token expired, falling back to offline mode');
    }
    return Promise.reject(error);
  }
);

// ==================== Auth ====================

export const authApi = {
  async register(username, password, displayName) {
    const res = await api.post('/api/auth/register', {
      username,
      password,
      display_name: displayName,
    });
    localStorage.setItem('hanzi_token', res.data.access_token);
    return res.data;
  },

  async login(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const res = await api.post('/api/auth/login', params);
    localStorage.setItem('hanzi_token', res.data.access_token);
    return res.data;
  },

  async getMe() {
    const res = await api.get('/api/auth/me');
    return res.data;
  },

  logout() {
    localStorage.removeItem('hanzi_token');
  },

  isLoggedIn() {
    return !!localStorage.getItem('hanzi_token');
  },
};

// ==================== Progress ====================

export const progressApi = {
  async getProgress() {
    const res = await api.get('/api/progress/');
    return res.data;
  },

  async updateLevel(levelId, stars, score) {
    const res = await api.post('/api/progress/update-level', {
      level_id: String(levelId),
      stars,
      score,
    });
    return res.data;
  },

  async equipTrain(trainId) {
    return api.post('/api/progress/equip-train', { train_id: trainId });
  },

  async equipParts(parts) {
    return api.post('/api/progress/equip-parts', { parts });
  },

  async updatePriority(action, char) {
    return api.post('/api/progress/priority', { action, char });
  },

  async updateSkip(action, char) {
    return api.post('/api/progress/skip', { action, char });
  },

  async updateCustomConfig(char, distractors) {
    return api.post('/api/progress/custom-config', { char, distractors });
  },

  async getChars() {
    const res = await api.get('/api/progress/chars');
    return res.data;
  },

  async batchUpdateChars(results) {
    return api.post('/api/progress/chars/batch-update', { results });
  },

  async getReviewList() {
    const res = await api.get('/api/progress/chars/review');
    return res.data;
  },
};

// ==================== Game ====================

export const gameApi = {
  async getLevelConfig(levelId) {
    const res = await api.get(`/api/game/level/${levelId}`);
    return res.data;
  },

  async getCharsIndex() {
    const res = await api.get('/api/game/chars-index');
    return res.data;
  },

  async submitSession(sessionData) {
    return api.post('/api/game/session', sessionData);
  },

  async getHistory(limit = 20) {
    const res = await api.get(`/api/game/history?limit=${limit}`);
    return res.data;
  },
};

// ==================== Story ====================

export const storyApi = {
  async generateStory(knownChars) {
    const res = await api.post('/api/story/generate', { known_chars: knownChars });
    return res.data;
  },

  async generateScenario(level, chars) {
    try {
      const res = await api.post(
        '/api/story/scenario',
        { level, chars },
        { timeout: 5000 }
      );
      return res.data;
    } catch (e) {
      console.warn('[Story] AI API Error:', e.message);
      return null;
    }
  },
};

// ==================== TTS ====================

export const ttsApi = {
  async createChar(char, example = '', distractors = []) {
    const res = await api.post('/api/tts/create-char', {
      char,
      example,
      distractors,
    });
    return res.data;
  },
};

// ==================== Parent ====================

export const parentApi = {
  async getDashboard() {
    const res = await api.get('/api/parent/dashboard');
    return res.data;
  },

  async getSettings() {
    const res = await api.get('/api/parent/settings');
    return res.data;
  },

  async updateSettings(data) {
    // ★ 注意这里要返回 res.data
    const res = await api.put('/api/parent/settings', data);
    return res.data;
  },

  async uploadSave(jsonString) {
    const res = await api.post('/api/parent/sync/upload', { data: jsonString });
    return res.data;
  },

  async downloadSave() {
    const res = await api.get('/api/parent/sync/download');
    return res.data;
  },
};

// ==================== 兼容旧接口 ====================
// 保持 auth 对象以兼容现有代码逐步迁移
export const auth = {
  register: authApi.register,
  login: authApi.login,
  getMe: authApi.getMe,
  logout: authApi.logout,
  uploadSave: parentApi.uploadSave,
  downloadSave: parentApi.downloadSave,
  generateStory: storyApi.generateStory,
  generateScenario: storyApi.generateScenario,
};

export default api;