<template>
  <div class="copywriting-page">
    <div class="page-header">
      <h1>电商文案生成</h1>
      <p class="subtitle">商品标题 · 卖点文案 · 跨境翻译 — 9 语种 × 9 平台规则</p>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 商品标题 -->
      <el-tab-pane label="商品标题" name="title">
        <el-form :model="titleForm" label-width="100px" class="gen-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="商品名称" required>
                <el-input v-model="titleForm.productName" placeholder="如：夏季冰丝凉席三件套" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="商品类目">
                <el-input v-model="titleForm.category" placeholder="如：家纺/凉席" maxlength="100" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="核心卖点">
            <el-input v-model="titleForm.sellingPoints" type="textarea" :rows="2" placeholder="如：冰丝面料、清凉透气、可水洗、防螨抗菌" maxlength="1000" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="目标平台">
                <el-select v-model="titleForm.platform" placeholder="选择平台" style="width:100%">
                  <el-option v-for="(v,k) in platforms" :key="k" :label="v.name" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="语言">
                <el-select v-model="titleForm.language" placeholder="选择语言" style="width:100%">
                  <el-option v-for="(v,k) in languages" :key="k" :label="v" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="生成数量">
                <el-input-number v-model="titleForm.count" :min="1" :max="20" style="width:100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item>
            <el-button type="primary" :loading="titleGenning" @click="doGenerateTitles" :icon="MagicStick">
              {{ titleGenning ? '生成中...' : '智能生成标题' }}
            </el-button>
            <el-button @click="titleForm = getDefaultTitleForm()">重置</el-button>
          </el-form-item>
        </el-form>

        <!-- 平台规则提示 -->
        <el-alert v-if="titleForm.platform" type="info" :closable="false" show-icon class="mb-4">
          <template #title>
            {{ platforms[titleForm.platform]?.name }} 规则：标题最长 {{ platforms[titleForm.platform]?.maxTitleLen }} 字符，
            {{ platforms[titleForm.platform]?.minKeywords }}-{{ platforms[titleForm.platform]?.maxKeywords }} 个关键词
          </template>
        </el-alert>

        <!-- 结果 -->
        <div v-if="titleResults.length" class="results-section">
          <h3>生成结果 <el-tag size="small">{{ titleMeta.model }}</el-tag> <el-tag size="small" type="info">{{ titleMeta.latency }}ms</el-tag></h3>
          <el-card v-for="(t, i) in titleResults" :key="i" class="result-card" shadow="hover">
            <div class="result-row">
              <span class="result-index">{{ i + 1 }}</span>
              <span class="result-text">{{ t }}</span>
              <el-button size="small" type="primary" plain @click="copyText(t)">复制</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 卖点文案 -->
      <el-tab-pane label="卖点文案" name="desc">
        <el-form :model="descForm" label-width="100px" class="gen-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="商品名称" required>
                <el-input v-model="descForm.productName" placeholder="如：无线降噪蓝牙耳机" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="目标平台">
                <el-select v-model="descForm.platform" style="width:100%">
                  <el-option v-for="(v,k) in platforms" :key="k" :label="v.name" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="语言">
                <el-select v-model="descForm.language" style="width:100%">
                  <el-option v-for="(v,k) in languages" :key="k" :label="v" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="核心卖点">
            <el-input v-model="descForm.features" type="textarea" :rows="3" placeholder="如：主动降噪/40小时续航/蓝牙5.3/Hi-Res音质" maxlength="2000" />
          </el-form-item>
          <el-form-item label="规格参数">
            <el-input v-model="descForm.specs" type="textarea" :rows="2" placeholder="如：驱动单元40mm/频率响应20Hz-20kHz/阻抗32Ω" maxlength="2000" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="descGenning" @click="doGenerateDesc" :icon="MagicStick">
              {{ descGenning ? '生成中...' : '生成卖点文案' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="descResultRaw" class="results-section">
          <h3>生成结果 <el-tag size="small">{{ descMeta.model }}</el-tag></h3>
          <el-card shadow="hover" class="desc-result-card">
            <div class="desc-content">{{ descResultRaw }}</div>
            <div class="desc-actions">
              <el-button type="primary" size="small" @click="copyText(descResultRaw)">复制全文</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 跨境翻译 -->
      <el-tab-pane label="跨境翻译" name="translate">
        <el-form :model="transForm" label-width="100px" class="gen-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="商品名称" required>
                <el-input v-model="transForm.productName" placeholder="输入商品名称" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="源语言">
                <el-select v-model="transForm.sourceLang" style="width:100%">
                  <el-option v-for="(v,k) in languages" :key="k" :label="v" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="目标语言" required>
                <el-select v-model="transForm.targetLang" style="width:100%">
                  <el-option v-for="(v,k) in languages" :key="k" :label="v" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="商品描述">
            <el-input v-model="transForm.description" type="textarea" :rows="3" placeholder="输入需要翻译的商品描述" maxlength="5000" />
          </el-form-item>
          <el-form-item label="卖点/特性">
            <el-input v-model="transForm.features" type="textarea" :rows="2" placeholder="输入关键卖点" maxlength="2000" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="transRunning" @click="doTranslate" :icon="MagicStick">
              {{ transRunning ? '翻译中...' : '翻译 + 本地化润色' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="transResult" class="results-section">
          <h3>翻译结果 <el-tag size="small">{{ transMeta.model }}</el-tag></h3>
          <el-card shadow="hover">
            <div class="desc-content">{{ transResult }}</div>
            <div class="desc-actions">
              <el-button type="primary" size="small" @click="copyText(transResult)">复制译文</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 历史记录 -->
      <el-tab-pane label="历史记录" name="history">
        <el-select v-model="historyType" placeholder="筛选类型" clearable style="width:160px" class="mb-4" @change="loadHistory">
          <el-option label="标题生成" value="title" />
          <el-option label="卖点文案" value="description" />
          <el-option label="翻译" value="translate" />
        </el-select>
        <el-table :data="historyList" v-loading="historyLoading" stripe>
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === 'title' ? 'success' : row.type === 'description' ? 'primary' : 'warning'" size="small">
                {{ row.type === 'title' ? '标题' : row.type === 'description' ? '文案' : '翻译' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="inputs" label="输入" min-width="200">
            <template #default="{ row }">
              <span v-if="row.inputs">{{ (typeof row.inputs === 'string' ? JSON.parse(row.inputs) : row.inputs).productName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="model_id" label="模型" width="160" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">{{ row.status === 'success' ? '成功' : '失败' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="时间" width="170" />
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button size="small" type="danger" text @click="deleteRecord(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination v-if="historyTotal" class="mt-4" layout="prev, pager, next" :total="historyTotal" :page-size="20" @current-change="(p) => { historyPage = p; loadHistory(); }" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { MagicStick } from '@element-plus/icons-vue';
import { copyToClipboard } from '@/utils/format';
const activeTab = ref('title');

// 平台 & 语言
const platforms = ref({});
const languages = ref({});
onMounted(async () => {
  try {
    const [p, l] = await Promise.all([
      $fetch('/api/copywriting/platforms'),
      $fetch('/api/copywriting/languages'),
    ]);
    platforms.value = p?.data || {};
    languages.value = l?.data || {};
  } catch { /* ignore */ }
});

// ===== 标题 =====
const titleGenning = ref(false);
const titleResults = ref([]);
const titleMeta = ref({});
const titleForm = reactive(getDefaultTitleForm());
function getDefaultTitleForm() {
  return { productName: '', category: '', sellingPoints: '', platform: 'taobao', language: 'zh-CN', count: 5 };
}
async function doGenerateTitles() {
  if (!titleForm.productName) return ElMessage.warning('请输入商品名称');
  titleGenning.value = true;
  try {
    const r = await $fetch('/api/copywriting/titles', { method: 'POST', body: titleForm });
    titleResults.value = r?.data?.titles || [];
    titleMeta.value = { model: r?.data?.model, latency: r?.data?.latency };
  } catch (e) { ElMessage.error(e?.data?.msg || '生成失败'); }
  finally { titleGenning.value = false; }
}

// ===== 卖点文案 =====
const descGenning = ref(false);
const descResultRaw = ref('');
const descMeta = ref({});
const descForm = reactive({ productName: '', features: '', specs: '', platform: 'taobao', language: 'zh-CN' });
async function doGenerateDesc() {
  if (!descForm.productName) return ElMessage.warning('请输入商品名称');
  descGenning.value = true;
  try {
    const r = await $fetch('/api/copywriting/description', { method: 'POST', body: descForm });
    descResultRaw.value = r?.data?.description || '';
    descMeta.value = { model: r?.data?.model };
  } catch (e) { ElMessage.error(e?.data?.msg || '生成失败'); }
  finally { descGenning.value = false; }
}

// ===== 翻译 =====
const transRunning = ref(false);
const transResult = ref('');
const transMeta = ref({});
const transForm = reactive({ productName: '', description: '', features: '', sourceLang: 'zh-CN', targetLang: 'en' });
async function doTranslate() {
  if (!transForm.productName || !transForm.targetLang) return ElMessage.warning('请填写商品名称和目标语言');
  transRunning.value = true;
  try {
    const r = await $fetch('/api/copywriting/translate', { method: 'POST', body: transForm });
    transResult.value = r?.data?.translation || '';
    transMeta.value = { model: r?.data?.model };
  } catch (e) { ElMessage.error(e?.data?.msg || '翻译失败'); }
  finally { transRunning.value = false; }
}

// ===== 历史 =====
const historyList = ref([]);
const historyTotal = ref(0);
const historyLoading = ref(false);
const historyType = ref('');
const historyPage = ref(1);
async function loadHistory() {
  historyLoading.value = true;
  try {
    const r = await $fetch(`/api/copywriting/history?type=${historyType.value}&page=${historyPage.value}&pageSize=20`);
    historyList.value = r?.data?.list || [];
    historyTotal.value = r?.data?.total || 0;
  } catch { /* ignore */ }
  finally { historyLoading.value = false; }
}
async function deleteRecord(id) {
  try {
    await $fetch(`/api/copywriting/history/${id}`, { method: 'DELETE' });
    ElMessage.success('删除成功');
    loadHistory();
  } catch { ElMessage.error('删除失败'); }
}

// 工具
const copyText = async (text: string) => {
  const ok = await copyToClipboard(text);
  if (ok) ElMessage.success('已复制');
}
</script>

<style scoped>
.copywriting-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; margin-bottom: 4px; }
.subtitle { color: var(--el-text-color-secondary); font-size: 14px; }
.gen-form { margin-top: 16px; }
.results-section { margin-top: 24px; }
.results-section h3 { font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.result-card { margin-bottom: 8px; }
.result-row { display: flex; align-items: center; gap: 12px; }
.result-index { width: 28px; height: 28px; border-radius: 50%; background: var(--el-color-primary-light-9); color: var(--el-color-primary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; }
.result-text { flex: 1; font-size: 14px; }
.desc-result-card { font-size: 14px; line-height: 1.8; }
.desc-content { white-space: pre-wrap; }
.desc-actions { margin-top: 12px; }
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
</style>
