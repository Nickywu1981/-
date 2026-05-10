<template>
  <Teleport to="body">
    <Transition name="wizard-fade">
      <div v-if="visible" class="wizard-overlay">
        <div class="wizard-dialog">
          <!-- Close / Skip -->
          <button class="wizard-skip" @click="skip">{{ currentStep === 3 ? '关闭' : '跳过' }}</button>

          <!-- Progress bar -->
          <div class="wizard-progress">
            <div
              v-for="s in 3" :key="s"
              class="wizard-dot"
              :class="{ active: s <= currentStep, done: s < currentStep }"
            />
          </div>

          <!-- Step 1: Choose platform -->
          <div v-if="currentStep === 1" class="wizard-step">
            <div class="wizard-illustration">🎯</div>
            <h2 class="wizard-title">选择你的电商平台</h2>
            <p class="wizard-subtitle">我们会为你的平台自动优化图片尺寸和格式</p>
            <div class="platform-grid">
              <button
                v-for="p in platforms" :key="p.id"
                class="platform-card"
                :class="{ selected: selectedPlatforms.includes(p.id) }"
                @click="togglePlatform(p.id)"
              >
                <span class="platform-emoji">{{ p.icon }}</span>
                <span class="platform-name">{{ p.name }}</span>
                <span v-if="selectedPlatforms.includes(p.id)" class="platform-check">✓</span>
              </button>
            </div>
            <button class="wizard-next" :disabled="selectedPlatforms.length === 0" @click="nextStep">
              下一步
            </button>
          </div>

          <!-- Step 2: Upload image -->
          <div v-if="currentStep === 2" class="wizard-step">
            <div class="wizard-illustration">📸</div>
            <h2 class="wizard-title">上传一张商品图试试</h2>
            <p class="wizard-subtitle">拖拽图片到下方区域，或点击选择文件</p>
            <div
              class="upload-zone"
              :class="{ dragging }"
              @dragover.prevent="dragging = true"
              @dragleave="dragging = false"
              @drop.prevent="handleDrop"
              @click="triggerUpload"
            >
              <template v-if="!uploadedImage">
                <span class="upload-icon">📁</span>
                <p class="upload-text">拖拽图片到此处</p>
                <p class="upload-hint">支持 JPG / PNG / WebP，最大 20MB</p>
              </template>
              <template v-else>
                <img :src="uploadedImage" class="upload-preview" alt="预览" />
                <button class="upload-remove" @click.stop="uploadedImage = ''" aria-label="移除图片">✕</button>
              </template>
              <input ref="fileInput" type="file" accept="image/*" hidden @change="handleFile" />
            </div>
            <div class="example-row">
              <span class="example-label">或试试示例图片：</span>
              <button
                v-for="ex in examples" :key="ex.name"
                class="example-chip"
                @click="uploadedImage = ex.url"
              >
                {{ ex.name }}
              </button>
            </div>
            <button class="wizard-next" @click="nextStep">
              {{ uploadedImage ? '下一步' : '跳过，直接下一步' }}
            </button>
          </div>

          <!-- Step 3: Explore tools -->
          <div v-if="currentStep === 3" class="wizard-step">
            <div class="wizard-illustration">🚀</div>
            <h2 class="wizard-title">看看 AI 能帮你做什么</h2>
            <p class="wizard-subtitle">从抠图到视频，一站式电商视觉创作</p>
            <div class="tool-grid">
              <div v-for="t in featuredTools" :key="t.id" class="tool-card" @click="navigateTo(t.route); close()">
                <span class="tool-icon">{{ t.icon }}</span>
                <span class="tool-name">{{ t.name }}</span>
                <span class="tool-time">{{ t.time }}</span>
                <span class="tool-desc">{{ t.desc }}</span>
              </div>
            </div>
            <button class="wizard-finish" @click="finish">
              开始使用 Movio AI
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const STORAGE_KEY = '__movio_onboarding_done';

const visible = ref(false);
const currentStep = ref(1);
const selectedPlatforms = ref<string[]>([]);
const uploadedImage = ref('');
const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const platforms = [
  { id: 'taobao', name: '淘宝', icon: '🛒' },
  { id: 'pdd', name: '拼多多', icon: '📦' },
  { id: 'douyin', name: '抖音', icon: '🎵' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕' },
  { id: 'amazon', name: '亚马逊', icon: '🌍' },
  { id: 'shopee', name: 'Shopee', icon: '🛍️' },
  { id: 'tiktok', name: 'TikTok', icon: '📱' },
  { id: 'temu', name: 'Temu', icon: '📲' },
];

const examples = [
  { name: 'T恤', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#7C3AED" width="200" height="200"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="48">👕</text></svg>') },
  { name: '鞋子', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#10B981" width="200" height="200"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="48">👟</text></svg>') },
  { name: '包包', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#F59E0B" width="200" height="200"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="48">👜</text></svg>') },
];

const featuredTools = [
  { id: 'remove-bg', name: '智能抠图', icon: '✂️', time: '5秒', desc: '一键去背景', route: '/work/remove-bg' },
  { id: 'white-bg', name: '白底图', icon: '⬜', time: '3秒', desc: '电商标准白底', route: '/work/white-bg' },
  { id: 'scene', name: '场景生成', icon: '🏞️', time: '15秒', desc: 'AI场景合成', route: '/work/scene' },
  { id: 'retouch', name: '图片精修', icon: '✨', time: '8秒', desc: '自动美化', route: '/work/retouch' },
  { id: 'video', name: '图生视频', icon: '🎬', time: '30秒', desc: '产品短视频', route: '/work/video' },
  { id: 'batch', name: '批量处理', icon: '📦', time: '1分钟', desc: '批量抠图/场景', route: '/work/batch' },
];

function togglePlatform(id: string) {
  const idx = selectedPlatforms.value.indexOf(id);
  if (idx >= 0) selectedPlatforms.value.splice(idx, 1);
  else selectedPlatforms.value.push(id);
}

function nextStep() {
  if (currentStep.value < 3) currentStep.value++;
}

function triggerUpload() {
  fileInput.value?.click();
}

function handleFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) uploadImage(file);
}

function handleDrop(e: DragEvent) {
  dragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) uploadImage(file);
}

function uploadImage(file: File) {
  const reader = new FileReader();
  reader.onload = () => { uploadedImage.value = reader.result as string; };
  reader.readAsDataURL(file);
}

function skip() {
  currentStep.value === 3 ? close() : finish();
}

function finish() {
  savePreference();
  close();
}

function close() {
  visible.value = false;
}

function savePreference() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      done: true,
      platforms: selectedPlatforms.value,
      date: new Date().toISOString(),
    }));
  } catch { /* localStorage may be blocked */ }
}

function checkFirstVisit() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) { visible.value = true; return; }
  } catch { visible.value = true; }
}

onMounted(() => {
  // Delay to let page render first
  setTimeout(checkFirstVisit, 800);
});
</script>

<style scoped>
.wizard-overlay {
  position: fixed; inset: 0; z-index: var(--cfg-z-modal, 1050);
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.wizard-dialog {
  width: min(520px, 100%); max-height: 85vh; overflow-y: auto;
  background: var(--bg-card); border-radius: 20px;
  padding: 32px 28px 28px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  position: relative;
  border: 1px solid var(--border-light);
}
.wizard-skip {
  position: absolute; top: 14px; right: 16px;
  background: none; border: none; font-size: 13px; color: var(--text-muted);
  cursor: pointer; padding: 4px 8px; border-radius: 6px;
}
.wizard-skip:hover { background: var(--bg-hover); color: var(--text-secondary); }

/* Progress */
.wizard-progress {
  display: flex; justify-content: center; gap: 8px; margin-bottom: 24px;
}
.wizard-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--border-light); transition: all 0.3s;
}
.wizard-dot.active { background: var(--brand); width: 28px; border-radius: 5px; }
.wizard-dot.done { background: rgba(124,58,237,0.4); }

/* Step content */
.wizard-step { text-align: center; }
.wizard-illustration { font-size: 52px; margin-bottom: 12px; line-height: 1; }
.wizard-title { font-size: 20px; color: var(--text-primary); margin: 0 0 6px; font-weight: 700; }
.wizard-subtitle { font-size: 13px; color: var(--text-muted); margin: 0 0 24px; }

/* Step 1: Platform grid */
.platform-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  margin-bottom: 20px;
}
.platform-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px; border: 2px solid var(--border-light); border-radius: 14px;
  background: var(--bg-page); cursor: pointer; transition: all 0.2s;
  position: relative;
}
.platform-card:hover { border-color: var(--brand); transform: translateY(-2px); }
.platform-card.selected { border-color: var(--brand); background: rgba(124,58,237,0.06); }
.platform-emoji { font-size: 28px; }
.platform-name { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.platform-check {
  position: absolute; top: 6px; right: 8px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--brand); color: #fff; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
}

/* Step 2: Upload zone */
.upload-zone {
  border: 2px dashed var(--border-light); border-radius: 16px;
  padding: 36px 16px; cursor: pointer; transition: all 0.2s;
  margin-bottom: 16px; position: relative; min-height: 140px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.upload-zone:hover, .upload-zone.dragging { border-color: var(--brand); background: rgba(124,58,237,0.04); }
.upload-icon { font-size: 40px; margin-bottom: 8px; }
.upload-text { font-size: 14px; color: var(--text-secondary); margin: 0 0 4px; font-weight: 500; }
.upload-hint { font-size: 12px; color: var(--text-muted); margin: 0; }
.upload-preview { max-width: 100%; max-height: 200px; border-radius: 10px; object-fit: contain; }
.upload-remove {
  position: absolute; top: 10px; right: 10px;
  width: 24px; height: 24px; border-radius: 50%;
  background: rgba(0,0,0,0.5); color: #fff; border: none; cursor: pointer;
  font-size: 12px; display: flex; align-items: center; justify-content: center;
}
.example-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 16px; }
.example-label { font-size: 12px; color: var(--text-muted); }
.example-chip {
  padding: 5px 14px; border: 1px solid var(--border-light); border-radius: 20px;
  background: var(--bg-page); font-size: 12px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.example-chip:hover { border-color: var(--brand); color: var(--brand); }

/* Step 3: Tool grid */
.tool-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  margin-bottom: 20px;
}
.tool-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 16px 10px; border: 1px solid var(--border-light); border-radius: 14px;
  cursor: pointer; transition: all 0.2s; background: var(--bg-page);
}
.tool-card:hover { border-color: var(--brand); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(124,58,237,0.1); }
.tool-icon { font-size: 28px; }
.tool-name { font-size: 13px; color: var(--text-primary); font-weight: 600; }
.tool-time { font-size: 11px; color: var(--brand); background: rgba(124,58,237,0.08); padding: 1px 8px; border-radius: 10px; }
.tool-desc { font-size: 11px; color: var(--text-muted); }

/* Buttons */
.wizard-next, .wizard-finish {
  width: 100%; padding: 12px; border: none; border-radius: 12px;
  font-size: 15px; cursor: pointer; font-weight: 600; transition: all 0.2s;
}
.wizard-next {
  background: var(--brand-gradient); color: #fff;
}
.wizard-next:disabled { opacity: 0.4; cursor: not-allowed; }
.wizard-next:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(124,58,237,0.35); }
.wizard-finish {
  background: var(--brand-gradient); color: #fff; font-size: 16px;
}
.wizard-finish:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(124,58,237,0.4); }

/* Transitions */
.wizard-fade-enter-active { transition: opacity 0.2s ease-out; }
.wizard-fade-enter-active .wizard-dialog { animation: wizard-enter 0.25s ease-out; }
.wizard-fade-leave-active { transition: opacity 0.15s ease-in; }
.wizard-fade-leave-active .wizard-dialog { animation: wizard-leave 0.15s ease-in; }
.wizard-fade-enter-from, .wizard-fade-leave-to { opacity: 0; }

@keyframes wizard-enter {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes wizard-leave {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.92) translateY(12px); }
}

/* Mobile */
@media (max-width: 480px) {
  .wizard-dialog { padding: 24px 16px 20px; }
  .platform-grid { grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .tool-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .wizard-title { font-size: 17px; }
}
</style>
