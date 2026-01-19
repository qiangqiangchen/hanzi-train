import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('hanzi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  async register(username, password) {
    const res = await api.post('/register', { username, password });
    localStorage.setItem('hanzi_token', res.data.access_token);
    return res.data;
  },
  
  async login(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const res = await api.post('/token', params);
    localStorage.setItem('hanzi_token', res.data.access_token);
    return res.data;
  },
  
  async getMe() {
    const res = await api.get('/users/me');
    return res.data;
  },
  
  logout() {
    localStorage.removeItem('hanzi_token');
  },

  // [Day2] 同步接口
  async uploadSave(jsonString) {
    const res = await api.post('/sync/upload', { data: jsonString });
    return res.data;
  },

  async downloadSave() {
    const res = await api.get('/sync/download');
    return res.data; // { data: "...", updated_at: "..." }
  },
   // [Day7] 生成故事
  async generateStory(knownChars) {
    const res = await api.post('/story/generate', { known_chars: knownChars });
    return res.data;
  }
};

export default api;