<template>
  <div class="copywriting-page">
    <div class="page-header">
      <h1>{{ $t('work_pages.copywriting.title') }}</h1>
      <p class="subtitle">{{ $t('work_pages.copywriting.subtitle') }}</p>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 商品标题 -->
      <el-tab-pane :label="$t('work_pages.copywriting.tab_title')" name="title">
        <SmartRecognitionPanel
          :hint="$t('work_pages.copywriting.smart_hint')"
          :confirm-label="$t('work_pages.copywriting.smart_confirm')"
          @confirm="onSmartApply"
        />
        <el-form :model="titleForm" label-width="100px" class="gen-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('work_pages.copywriting.product_name')" required>
                <el-input v-model="titleForm.productName" :placeholder="$t('work_pages.copywriting.product_name_placeholder')" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item :label="$t('work_pages.copywriting.product_category')">
                <el-input v-model="titleForm.category" :placeholder="$t('work_pages.copywriting.category_placeholder')" maxlength="100" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item :label="$t('work_pages.copywriting.core_selling_points')">
            <el-input v-model="titleForm.sellingPoints" type="textarea" :rows="2" :placeholder="$t('work_pages.copywriting.selling_points_placeholder')" maxlength="1000" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item :label="$t('work_pages.copywriting.target_platform')">
                <el-select v-model="titleForm.platform" :placeholder="$t('work_pages.copywriting.target_platform')" class="w-full">
                  <el-option v-for="(v,k) in platforms" :key="k" :label="v.name" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="$t('work_pages.copywriting.language')">
                <el-select v-model="titleForm.language" :placeholder="$t('work_pages.copywriting.language')" class="w-full">
                  <el-option v-for="(v,k) in languages" :key="k" :label="v" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="$t('work_pages.copywriting.generate_count')">
                <el-input-number v-model="titleForm.count" :min="1" :max="20" class="w-full" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item>
            <el-button type="primary" :loading="titleGenning" @click="doGenerateTitles" :icon="MagicStick">
              {{ titleGenning ? $t('work_pages.copywriting.gen_running') : $t('work_pages.copywriting.gen_title_btn') }}
            </el-button>
            <el-button @click="titleForm = getDefaultTitleForm()">{{ $t('work_pages.copywriting.reset') }}</el-button>
          </el-form-item>
        </el-form>

        <!-- 平台规则提示 -->
        <el-alert v-if="titleForm.platform" type="info" :closable="false" show-icon class="mb-4">
          <template #title>
            {{ platforms[titleForm.platform]?.name }} {{ $t('work_pages.copywriting.platform_rules_prefix') }} {{ platforms[titleForm.platform]?.maxTitleLen }} {{ $t('work_pages.copywriting.platform_rules_chars') }}
            {{ platforms[titleForm.platform]?.minKeywords }}-{{ platforms[titleForm.platform]?.maxKeywords }} {{ $t('work_pages.copywriting.platform_rules_keywords') }}
          </template>
        </el-alert>

        <!-- 结果 -->
        <div v-if="titleResults.length" class="results-section">
          <h3>{{ $t('work_pages.copywriting.result_label') }} <el-tag size="small">{{ titleMeta.model }}</el-tag> <el-tag size="small" type="info">{{ titleMeta.latency }}ms</el-tag></h3>
          <el-card v-for="(t, i) in titleResults" :key="i" class="result-card" shadow="hover">
            <div class="result-row">
              <span class="result-index">{{ i + 1 }}</span>
              <span class="result-text">{{ t }}</span>
              <el-button size="small" type="primary" plain @click="copyText(t)">{{ $t('work_pages.copywriting.copy') }}</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 卖点文案 -->
      <el-tab-pane :label="$t('work_pages.copywriting.tab_desc')" name="desc">
        <el-form :model="descForm" label-width="100px" class="gen-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('work_pages.copywriting.product_name')" required>
                <el-input v-model="descForm.productName" :placeholder="$t('work_pages.copywriting.product_name_placeholder')" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="$t('work_pages.copywriting.target_platform')">
                <el-select v-model="descForm.platform" class="w-full">
                  <el-option v-for="(v,k) in platforms" :key="k" :label="v.name" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="$t('work_pages.copywriting.language')">
                <el-select v-model="descForm.language" class="w-full">
                  <el-option v-for="(v,k) in languages" :key="k" :label="v" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item :label="$t('work_pages.copywriting.core_selling_points')">
            <el-input v-model="descForm.features" type="textarea" :rows="3" :placeholder="$t('work_pages.copywriting.features_placeholder')" maxlength="2000" />
          </el-form-item>
          <el-form-item :label="$t('work_pages.copywriting.specs')">
            <el-input v-model="descForm.specs" type="textarea" :rows="2" :placeholder="$t('work_pages.copywriting.specs_placeholder')" maxlength="2000" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="descGenning" @click="doGenerateDesc" :icon="MagicStick">
              {{ descGenning ? $t('work_pages.copywriting.gen_running') : $t('work_pages.copywriting.gen_desc_btn') }}
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="descResultRaw" class="results-section">
          <h3>{{ $t('work_pages.copywriting.result_label') }} <el-tag size="small">{{ descMeta.model }}</el-tag></h3>
          <el-card shadow="hover" class="desc-result-card">
            <div class="desc-content">{{ descResultRaw }}</div>
            <div class="desc-actions">
              <el-button type="primary" size="small" @click="copyText(descResultRaw)">{{ $t('work_pages.copywriting.copy_full') }}</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 跨境翻译 -->
      <el-tab-pane :label="$t('work_pages.copywriting.tab_translate')" name="translate">
        <el-form :model="transForm" label-width="100px" class="gen-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item :label="$t('work_pages.copywriting.product_name')" required>
                <el-input v-model="transForm.productName" :placeholder="$t('work_pages.copywriting.product_name_input_ph')" maxlength="200" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="$t('work_pages.copywriting.source_lang')">
                <el-select v-model="transForm.sourceLang" class="w-full">
                  <el-option v-for="(v,k) in languages" :key="k" :label="v" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item :label="$t('work_pages.copywriting.target_lang')" required>
                <el-select v-model="transForm.targetLang" class="w-full">
                  <el-option v-for="(v,k) in languages" :key="k" :label="v" :value="k" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item :label="$t('work_pages.copywriting.product_desc')">
            <el-input v-model="transForm.description" type="textarea" :rows="3" :placeholder="$t('work_pages.copywriting.desc_input_ph')" maxlength="5000" />
          </el-form-item>
          <el-form-item :label="$t('work_pages.copywriting.features')">
            <el-input v-model="transForm.features" type="textarea" :rows="2" :placeholder="$t('work_pages.copywriting.features_input_ph')" maxlength="2000" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="transRunning" @click="doTranslate" :icon="MagicStick">
              {{ transRunning ? $t('work_pages.copywriting.translating') : $t('work_pages.copywriting.translate_btn') }}
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="transResult" class="results-section">
          <h3>{{ $t('work_pages.copywriting.translate_result_label') }} <el-tag size="small">{{ transMeta.model }}</el-tag></h3>
          <el-card shadow="hover">
            <div class="desc-content">{{ transResult }}</div>
            <div class="desc-actions">
              <el-button type="primary" size="small" @click="copyText(transResult)">{{ $t('work_pages.copywriting.copy_trans') }}</el-button>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 历史记录 -->
      <el-tab-pane :label="$t('work_pages.copywriting.tab_history')" name="history">
        <el-select v-model="historyType" :placeholder="$t('work_pages.copywriting.filter_type')" clearable style="width:160px" class="mb-4" @change="loadHistory">
          <el-option :label="$t('work_pages.copywriting.history_title_label')" value="title" />
          <el-option :label="$t('work_pages.copywriting.tab_desc')" value="description" />
          <el-option :label="$t('work_pages.copywriting.history_trans_label')" value="translate" />
        </el-select>
        <el-table :data="historyList" v-loading="historyLoading" stripe>
          <el-table-column prop="type" :label="$t('work_pages.copywriting.type')" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === 'title' ? 'success' : row.type === 'description' ? 'primary' : 'warning'" size="small">
                {{ (row.type === 'title' ? $t('work_pages.copywriting.type_title') : row.type === 'description' ? $t('work_pages.copywriting.type_desc') : $t('work_pages.copywriting.type_trans')) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="inputs" :label="$t('work_pages.copywriting.input')" min-width="200">
            <template #default="{ row }">
              <span v-if="row.inputs">{{ safeParseJson(row.inputs)?.productName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="model_id" :label="$t('work_pages.copywriting.model')" width="160" />
          <el-table-column prop="status" :label="$t('work_pages.copywriting.status')" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">{{ row.status === 'success' ? $t('work_pages.copywriting.success') : $t('work_pages.copywriting.failed') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" :label="$t('work_pages.copywriting.time')" width="170" />
          <el-table-column :label="$t('work_pages.copywriting.operation')" width="80">
            <template #default="{ row }">
              <el-button size="small" type="danger" text @click="deleteRecord(row.id)">{{ $t('work_pages.copywriting.delete') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination v-if="historyTotal" class="mt-4" layout="prev, pager, next" :total="historyTotal" :page-size="20" @current-change="(p) => { historyPage = p; loadHistory(); }" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
const toast = useToast()
const { t } = useI18n()
import { MagicStick } from '@element-plus/icons-vue';
import { copyToClipboard } from '@/utils/format';
import SmartRecognitionPanel from '~/components/shared/SmartRecognitionPanel.vue'

function safeParseJson(v: unknown): Record<string, unknown> | null {
  if (typeof v !== 'string') return v as Record<string, unknown> | null;
  try { return JSON.parse(v); } catch { return null; }
}

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
  } catch { toast.warn($t('work_pages.copywriting.config_load_failed')) }
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
  if (!titleForm.productName) return ElMessage.warning($t('work_pages.copywriting.product_name_required'));
  titleGenning.value = true;
  try {
    const r = await $fetch('/api/copywriting/titles', { method: 'POST', body: titleForm });
    titleResults.value = r?.data?.titles || [];
    titleMeta.value = { model: r?.data?.model, latency: r?.data?.latency };
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; ElMessage.error(err?.data?.msg || e?.message || $t('work_pages.copywriting.generate_failed')); }
  finally { titleGenning.value = false; }
}

// ===== 卖点文案 =====
const descGenning = ref(false);
const descResultRaw = ref('');
const descMeta = ref({});
const descForm = reactive({ productName: '', features: '', specs: '', platform: 'taobao', language: 'zh-CN' });
async function doGenerateDesc() {
  if (!descForm.productName) return ElMessage.warning($t('work_pages.copywriting.product_name_required'));
  descGenning.value = true;
  try {
    const r = await $fetch('/api/copywriting/description', { method: 'POST', body: descForm });
    descResultRaw.value = r?.data?.description || '';
    descMeta.value = { model: r?.data?.model };
  } catch (e: unknown) { const err = e as { data?: { msg?: string }; message?: string }; ElMessage.error(err?.data?.msg || e?.message || $t('work_pages.copywriting.generate_failed')); }
  finally { descGenning.value = false; }
}

// ===== 翻译 =====
const transRunning = ref(false);
const transResult = ref('');
const transMeta = ref({});
const transForm = reactive({ productName: '', description: '', features: '', sourceLang: 'zh-CN', targetLang: 'en' });
async function doTranslate() {
  if (!transForm.productName || !transForm.targetLang) return ElMessage.warning($t('work_pages.copywriting.trans_fields_required'));
  transRunning.value = true;
  try {
    const r = await $fetch('/api/copywriting/translate', { method: 'POST', body: transForm });
    transResult.value = r?.data?.translation || '';
    transMeta.value = { model: r?.data?.model };
  } catch (e) { ElMessage.error(e?.data?.msg || $t('work_pages.copywriting.translate_failed')); }
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
  } catch { toast.warn($t('work_pages.copywriting.config_load_failed')) }
  finally { historyLoading.value = false; }
}
async function deleteRecord(id) {
  try {
    await $fetch(`/api/copywriting/history/${id}`, { method: 'DELETE' });
    ElMessage.success($t('work_pages.copywriting.delete_success'));
    loadHistory();
  } catch { ElMessage.error($t('work_pages.copywriting.delete_failed')); }
}

// 工具
const copyText = async (text: string) => {
  const ok = await copyToClipboard(text);
  if (ok) ElMessage.success($t('work_pages.copywriting.copy_success'));
}

function onSmartApply(info: { productName: string; category: string; features: string[]; refUrl: string }) {
  titleForm.productName = info.productName
  titleForm.category = info.category
  titleForm.sellingPoints = info.features.join('、')
}
definePageMeta({ layout: 'workspace', middleware: ['auth'] })
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
