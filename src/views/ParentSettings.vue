<template>
    <div class="p-4">
        <h2 class="text-xl font-bold mb-4">学习计划管理</h2>

        <!-- 添加区 -->
        <div class="flex gap-2 mb-6">
            <input v-model="inputChar" placeholder="输入汉字 (如: 赢)" class="border p-2 rounded flex-1" />
            <button @click="add" class="bg-blue-500 text-white px-4 py-2 rounded">插队学习</button>
        </div>

        <!-- 列表区 -->
        <h3 class="font-bold text-gray-600 mb-2">优先学习队列 ({{ userStore.priorityList.length }})</h3>
        <div class="flex flex-wrap gap-2">
            <div v-for="char in userStore.priorityList" :key="char"
                class="bg-yellow-100 px-3 py-1 rounded-full flex items-center gap-2">
                <span>{{ char }}</span>
                <button @click="userStore.removePriorityChar(char)" class="text-red-500">×</button>
            </div>
        </div>
        <!-- 添加生字 -->
        <div class="mt-8 pt-6 border-t">
            <h3 class="font-bold text-gray-600 mb-4">添加生字 (字库里没有的)</h3>
            <div class="flex flex-col gap-3">
                <div class="flex gap-2">
                    <input v-model="form.char" placeholder="汉字 (如: 赢)" class="border p-2 rounded w-24" maxlength="1" />
                    <input v-model="form.example" placeholder="组词 (如: 输赢)" class="border p-2 rounded flex-1" />
                </div>
                <div class="flex gap-2">
                    <input v-model="form.distractors" placeholder="干扰项 (用逗号分隔，如: 贝,月,凡)"
                        class="border p-2 rounded flex-1" />
                </div>
                <button @click="addNewChar" class="bg-green-500 text-white px-4 py-2 rounded font-bold"
                    :disabled="loading">
                    {{ loading ? '生成资源中...' : '保存并添加' }}
                </button>
            </div>
        </div>

        <!-- 在 "添加生字" 下方，新增 "干扰项管理" -->
        <div class="mt-8 pt-6 border-t pb-20">
            <h3 class="font-bold text-gray-600 mb-4">编辑干扰项 (针对易错字)</h3>

            <div class="flex gap-2 mb-4">
                <input v-model="editSearch" placeholder="搜索汉字 (如: 人)" class="border p-2 rounded flex-1" maxlength="1" />
                <button @click="searchForEdit" class="bg-blue-500 text-white px-4 py-2 rounded">搜索</button>
            </div>

            <div v-if="editingChar" class="bg-gray-50 p-4 rounded-xl border">
                <div class="font-bold text-2xl mb-2">{{ editingChar.char }}</div>
                <div class="text-sm text-gray-500 mb-2">当前干扰项: {{ currentDistractors.join(', ') || '无' }}</div>

                <div class="flex gap-2">
                    <input v-model="editDistractors" placeholder="新干扰项 (逗号分隔)" class="border p-2 rounded flex-1" />
                    <button @click="saveDistractors" class="bg-green-500 text-white px-4 py-2 rounded">保存</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../stores/user';
import api from '../utils/api';

const userStore = useUserStore();
const loading = ref(false);
const form = ref({ char: '', example: '', distractors: '' });

const editSearch = ref('');
const editingChar = ref(null);
const editDistractors = ref('');
const currentDistractors = ref([]);

const searchForEdit = async () => {
  const char = editSearch.value.trim();
  if (!char) return;
  
  // 获取详情
  const detail = await userStore.getCharDetail(char);
  if (!detail) {
      alert('未找到该字，请先添加或去闯关解锁');
      return;
  }
  
  editingChar.value = detail;
  // 读取现有干扰项 (优先读 custom，再读默认)
  // 注意：我们需要在 userStore 里存一个 "用户自定义配置表"
  // 因为 getCharDetail 返回的是静态文件，不可改。
  // 所以我们需要在 userStore 新增 customConfigs
  
  const customConf = userStore.customConfigs[char] || {};
  const list = customConf.distractors || detail.confusingChars?.hard || [];
  currentDistractors.value = list;
  editDistractors.value = list.join(',');
};

const saveDistractors = () => {
    if (!editingChar.value) return;
    const list = editDistractors.value.split(/[,，\s]+/).filter(s => s);
    
    userStore.updateCustomConfig(editingChar.value.char, { distractors: list });
    alert('保存成功！下次遇到这个字时，将优先使用这些干扰项。');
    editingChar.value = null;
    editSearch.value = '';
};

const add = () => {
    const char = inputChar.value.trim();
    if (!char) return;
    // TODO: 可以在这里校验字库里有没有这个字
    // 如果没有，Day 2 会处理“新字添加”逻辑
    userStore.addPriorityChar(char);
    inputChar.value = '';
};
const addNewChar = async () => {
    if (!form.value.char) return;
    loading.value = true;

    try {
        // 构造请求数据
        const payload = {
            char: form.value.char,
            example: form.value.example,
            // 将干扰项字符串转数组
            distractors: form.value.distractors.split(/[,，\s]+/).filter(s => s)
        };

        const res = await api.post('/char/create', payload);
        userStore.addCustomChar(res.data);
        userStore.addPriorityChar(res.data.char);

        alert('添加成功！');
        form.value = { char: '', example: '', distractors: '' };
    } catch (e) {
        alert('添加失败: ' + e.message);
    } finally {
        loading.value = false;
    }
};
</script>