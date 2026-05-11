<template>
  <div class="work-page">
    <!-- 步骤条 -->
    <div class="steps-bar" v-if="st.length">
      <template v-for="(s, i) in st" :key="i">
        <div class="step" :class="{ active: cs === i, done: cs > i }">
          <div class="step-circle">
            <span v-if="cs > i">✓</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="step-label">{{ s }}</span>
        </div>
        <div v-if="i < st.length - 1" class="step-connector" :class="{ filled: cs > i }" />
      </template>
    </div>
    <div class="work-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const p = defineProps<{ steps?: string[]; currentStep?: number }>();
const cs = computed(() => p.currentStep ?? 0);
const st = computed(() => p.steps ?? []);
</script>

<style scoped>
.work-page { max-width: 960px; margin: 0 auto; padding: 36px 20px 48px; color: var(--text-primary); }

/* ── 步骤条 ── */
.steps-bar { display: flex; align-items: center; justify-content: center; margin-bottom: 44px; }
.step { display: flex; align-items: center; gap: 10px; }
.step-circle {
  width: 34px; height: 34px; min-width: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600;
  background: var(--bg-hover); color: var(--text-muted);
  transition: background var(--transition-slow), color var(--transition-slow), box-shadow var(--transition-slow);
}
.step.active .step-circle {
  background: var(--brand-gradient);
  color: var(--text-inverse, #fff);
  box-shadow: 0 4px 16px var(--brand-alpha-30);
}
.step.done .step-circle { background: var(--success); color: var(--text-inverse, #fff); }
.step-label { font-size: 13px; color: var(--text-muted); white-space: nowrap; font-weight: 500; transition: color var(--transition-fast); }
.step.active .step-label { color: var(--brand); font-weight: 600; }
.step.done .step-label { color: var(--success); }
.step-connector { width: 52px; height: 2px; background: var(--border-light); margin: 0 14px; border-radius: 1px; transition: background var(--transition-slow); }
.step-connector.filled { background: linear-gradient(90deg, var(--success), var(--success)); }

.work-body { min-height: 420px; }

/* ── 上传区（所有 work 页面共用） ── */
:deep(.dropzone) {
  border: 2px dashed var(--border-light);
  border-radius: var(--radius-xl);
  padding: 52px 24px;
  text-align: center;
  transition: border-color var(--transition-fast), background var(--transition-fast);
  background: var(--bg-card);
  cursor: pointer;
}
:deep(.dropzone:hover) { border-color: var(--brand-soft); background: var(--ws-sidebar-hover); }
:deep(.dz-icon) { font-size: 40px; margin-bottom: 12px; }
:deep(.dropzone p) { font-size: 15px; color: var(--text-secondary); margin-bottom: 6px; }
:deep(.dz-hint), :deep(.hint) { font-size: 12px !important; color: var(--text-muted) !important; }

/* ── 按钮 ── */
:deep(.btn) {
  padding: 11px 28px; border-radius: var(--radius-lg); border: none;
  background: var(--brand-gradient);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast), opacity var(--transition-fast);
  box-shadow: 0 4px 16px var(--brand-alpha-20);
  will-change: transform;
}
:deep(.btn:hover) { transform: translateY(-1px); box-shadow: 0 8px 24px var(--brand-alpha-30); }
:deep(.btn:active) { transform: scale(0.97); }
:deep(.btn:disabled) { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
:deep(.btn-outline) {
  padding: 10px 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);
  background: var(--bg-card); color: var(--text-primary); font-size: 13px; font-weight: 500; cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}
:deep(.btn-outline:hover) { border-color: var(--brand); color: var(--brand); }

/* ── 选择区 ── */
:deep(.select-section) { padding: 8px 0; }
:deep(.select-section h3) { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; }
:deep(.select-section h4) { font-size: 14px; font-weight: 600; color: var(--text-secondary); margin: 24px 0 12px; }

/* ── 风格/场景/平台 选中卡片 ── */
:deep(.style-grid), :deep(.scene-grid), :deep(.platform-grid), :deep(.op-grid), :deep(.style-row), :deep(.duration-row) {
  display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;
}
:deep(.style-card), :deep(.scene-card), :deep(.plat-card), :deep(.op-card), :deep(.style-option), :deep(.dur-btn) {
  padding: 12px 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);
  background: var(--bg-card); color: var(--text-secondary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); display: flex; align-items: center; gap: 8px;
}
:deep(.style-card:hover), :deep(.scene-card:hover), :deep(.plat-card:hover), :deep(.op-card:hover), :deep(.style-option:hover), :deep(.dur-btn:hover) {
  border-color: var(--brand-soft); color: var(--brand);
}
:deep(.style-card.active), :deep(.scene-card.active), :deep(.plat-card.active), :deep(.op-card.active), :deep(.style-option.active), :deep(.dur-btn.active) {
  background: var(--brand-gradient); color: #fff; border-color: transparent;
  box-shadow: 0 4px 12px var(--brand-alpha-25);
}

/* ── 进度条 ── */
:deep(.progress-box) { text-align: center; padding: 48px 24px; }
:deep(.spinner) {
  width: 44px; height: 44px; border: 3px solid var(--border-light);
  border-top-color: var(--brand); border-radius: 50%; margin: 0 auto 20px;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
:deep(.bar) { height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; max-width: 360px; margin: 16px auto 0; }
:deep(.bar-fill) { height: 100%; border-radius: 3px; background: var(--brand-gradient); transition: width 0.3s; }

/* ── 结果区 ── */
:deep(.result-section) h3 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 20px; text-align: center; }
:deep(.image-grid), :deep(.image-grid-5), :deep(.image-grid-3) {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;
}
:deep(.result-card) {
  background: var(--bg-card); border: 1px solid var(--border-card);
  border-radius: var(--radius-lg); overflow: hidden;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  will-change: transform;
}
:deep(.result-card:hover) { box-shadow: 0 8px 24px var(--brand-alpha-08); transform: translateY(-2px); }
:deep(.img-placeholder) { height: 180px; background: linear-gradient(135deg, var(--brand-light-alt), var(--brand-light)); display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--brand); }

/* ── 操作按钮区 ── */
:deep(.actions) { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }

/* ── 视频预览 ── */
:deep(.video-preview) { text-align: center; }
:deep(.video-placeholder) {
  width: 100%; max-width: 400px; aspect-ratio: 9/16; margin: 0 auto 12px;
  background: linear-gradient(135deg, var(--brand-light-alt), var(--brand-light)); border-radius: var(--radius-lg);
  display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--brand);
}

/* ── 上传预览 ── */
:deep(.preview), :deep(.preview-row) { margin-top: 16px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
:deep(.preview img), :deep(.preview-img), :deep(.preview-row img) {
  width: 120px; height: 120px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-light);
}

/* ── 类目/模板 卡片网格 ── */
:deep(.cat-grid), :deep(.tmpl-grid) { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
:deep(.cat-card), :deep(.tmpl-card) {
  padding: 12px 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);
  background: var(--bg-card); color: var(--text-secondary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}
:deep(.cat-card:hover), :deep(.tmpl-card:hover) { border-color: var(--brand-soft); color: var(--brand); }
:deep(.cat-card.active), :deep(.tmpl-card.active) {
  background: var(--brand-gradient); color: #fff; border-color: transparent;
  box-shadow: 0 4px 12px var(--brand-alpha-25);
}

/* ── 选项行（虚拟模特、数字人） ── */
:deep(.opt-row), :deep(.voice-row), :deep(.bg-row), :deep(.avatar-grid), :deep(.action-grid), :deep(.type-grid) {
  display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;
}
:deep(.opt-btn), :deep(.voice-btn), :deep(.bg-btn), :deep(.avatar-card), :deep(.action-card), :deep(.type-card) {
  padding: 10px 18px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);
  background: var(--bg-card); color: var(--text-secondary); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast); display: flex; align-items: center; gap: 8px;
}
:deep(.opt-btn:hover), :deep(.voice-btn:hover), :deep(.bg-btn:hover), :deep(.avatar-card:hover), :deep(.action-card:hover), :deep(.type-card:hover) {
  border-color: var(--brand-soft); color: var(--brand);
}
:deep(.opt-btn.active), :deep(.voice-btn.active), :deep(.bg-btn.active), :deep(.avatar-card.active), :deep(.action-card.active), :deep(.type-card.active) {
  background: var(--brand-gradient); color: #fff; border-color: transparent;
  box-shadow: 0 4px 12px var(--brand-alpha-25);
}

/* ── 双列上传 ── */
:deep(.row) { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
:deep(.upload-col) { text-align: center; }
:deep(.upload-col h4) { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; }

/* ── 文本输入 ── */
:deep(textarea.script-input), :deep(textarea.input-area) {
  width: 100%; padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);
  background: var(--bg-card); color: var(--text-primary); font-size: 14px; line-height: 1.7;
  resize: vertical; transition: border-color var(--transition-fast); font-family: inherit;
}
:deep(textarea:focus) { outline: none; border-color: var(--brand-soft); box-shadow: var(--ws-input-focus-shadow); }

/* ── 快捷模板/输入 ── */
:deep(.quick-scripts), :deep(.quick-inputs) { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
:deep(.quick-btn) {
  padding: 6px 14px; border-radius: var(--radius-full); border: 1px solid var(--border-light);
  background: var(--bg-card); color: var(--text-secondary); font-size: 12px;
  cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}
:deep(.quick-btn:hover) { border-color: var(--brand-soft); color: var(--brand); background: var(--ws-sidebar-hover); }

/* ── 成本/字数提示 ── */
:deep(.cost-hint) { font-size: 13px; color: var(--text-muted); margin: 12px 0; text-align: center; }
:deep(.word-count) { font-size: 12px; color: var(--text-muted); margin-top: 6px; }

/* ── 滑块 ── */
:deep(.slider-label) { display: block; text-align: center; font-size: 14px; color: var(--text-secondary); margin: 16px 0; }
:deep(.slider) { width: 100%; max-width: 320px; accent-color: var(--brand); }

/* ── 摘要/脚本输出 ── */
:deep(.summary-box) { background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 16px; }
:deep(.summary-row) { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: var(--text-secondary); }
:deep(.script-output) { max-width: 680px; margin: 0 auto; }
:deep(.script-card) { background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 16px; }
:deep(.script-card h4) { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
:deep(.script-card h5) { font-size: 13px; font-weight: 600; color: var(--brand); margin: 16px 0 8px; }
:deep(.hook-line), :deep(.body-text), :deep(.cta-text), :deep(.section-item) {
  font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 6px;
  padding: 8px 12px; background: var(--bg-hover); border-radius: var(--radius-sm);
}

/* ── 上传预览 ── */
:deep(.upload-preview) { width: 100%; max-height: 180px; object-fit: cover; border-radius: var(--radius-md); }

/* ── 模式选择（批量页） ── */
:deep(.mode-row) { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
:deep(.mode-card) {
  padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border-light);
  background: var(--bg-card); text-align: center; cursor: pointer; transition: border-color var(--transition-fast), background var(--transition-fast);
  position: relative;
}
:deep(.mode-card:hover) { border-color: var(--brand-soft); }
:deep(.mode-card.active) { border-color: var(--brand-soft); background: var(--ws-sidebar-hover); }
:deep(.mode-icon) { font-size: 28px; display: block; margin-bottom: 8px; }
:deep(.mode-name) { font-size: 15px; font-weight: 600; color: var(--text-primary); display: block; }
:deep(.mode-desc) { font-size: 12px; color: var(--text-muted); display: block; margin-top: 4px; }
:deep(.mode-badge) {
  position: absolute; top: -8px; right: -8px; padding: 3px 10px; border-radius: var(--radius-full);
  font-size: 11px; font-weight: 700; background: var(--brand-gradient); color: #fff;
}

/* ── 模板/历史复刻 ── */
:deep(.template-section), :deep(.history-section) { margin-top: 24px; }
:deep(.template-list), :deep(.history-list) { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
:deep(.template-item), :deep(.history-item) {
  padding: 8px 16px; border-radius: var(--radius-full); border: 1px solid var(--border-light);
  background: var(--bg-card); color: var(--text-secondary); font-size: 12px;
  cursor: pointer; transition: border-color var(--transition-fast), color var(--transition-fast);
}
:deep(.template-item:hover), :deep(.history-item:hover) { border-color: var(--brand-soft); color: var(--brand); }

/* ── 上传提示状态 ── */
:deep(.upload-hint.uploading), :deep(.status) { font-size: 12px; color: var(--warning); text-align: center; margin-top: 8px; }
:deep(.upload-hint.uploaded), :deep(.status.ok) { font-size: 12px; color: var(--success); text-align: center; margin-top: 8px; }

/* ── Keyboard accessibility ── */
:deep(button:focus-visible), :deep(a:focus-visible), :deep([role="button"]:focus-visible),
:deep(.style-card:focus-visible), :deep(.scene-card:focus-visible), :deep(.plat-card:focus-visible),
:deep(.result-card:focus-visible), :deep(.cat-card:focus-visible), :deep(.tmpl-card:focus-visible),
:deep(.mode-card:focus-visible), :deep(.template-item:focus-visible), :deep(.history-item:focus-visible),
:deep(.avatar-card:focus-visible), :deep(.action-card:focus-visible) {
  outline: 2px solid var(--brand); outline-offset: 2px;
}
:deep(.file-count) { font-size: 14px; font-weight: 600; color: var(--brand); text-align: center; margin-top: 12px; }

/* ── 视频预览区 ── */
:deep(.meta) { font-size: 12px; color: var(--text-muted); text-align: center; margin-top: 8px; }

/* ── 预览容器 ── */
:deep(.preview-box) { margin-top: 16px; text-align: center; }
:deep(.preview-box img) { max-width: 200px; max-height: 200px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border-light); }

/* ── 复制预览 ── */
:deep(.copy-preview) { font-size: 14px; color: var(--text-secondary); text-align: center; margin-bottom: 16px; padding: 12px; background: var(--bg-hover); border-radius: var(--radius-md); }

@media (max-width: 640px) {
  .work-page { padding: 20px 12px 32px; }
  .steps-bar { margin-bottom: 24px; flex-wrap: wrap; gap: 4px; }
  .step-circle { width: 28px; height: 28px; min-width: 28px; font-size: 11px; }
  .step-label { font-size: 11px; display: none; }
  .step.active .step-label { display: inline; }
  .step-connector { width: 20px; margin: 0 4px; }
  .work-body { min-height: 300px; }

  :deep(.dropzone) { padding: 32px 16px; }
  :deep(.dz-icon) { font-size: 32px; }
  :deep(.dropzone p) { font-size: 13px !important; }

  :deep(.style-grid), :deep(.scene-grid), :deep(.platform-grid), :deep(.op-grid),
  :deep(.style-row), :deep(.duration-row), :deep(.cat-grid), :deep(.tmpl-grid),
  :deep(.opt-row), :deep(.voice-row), :deep(.bg-row), :deep(.avatar-grid),
  :deep(.action-grid), :deep(.type-grid) {
    gap: 6px;
  }
  :deep(.style-card), :deep(.scene-card), :deep(.plat-card), :deep(.op-card),
  :deep(.style-option), :deep(.dur-btn), :deep(.cat-card), :deep(.tmpl-card),
  :deep(.opt-btn), :deep(.voice-btn), :deep(.bg-btn), :deep(.avatar-card),
  :deep(.action-card), :deep(.type-card) {
    padding: 8px 14px; font-size: 12px;
  }
  :deep(.style-preview) { font-size: 24px; }
  :deep(.style-icon) { font-size: 16px; }

  :deep(.select-section h3) { font-size: 16px; margin-bottom: 14px; }
  :deep(.select-section h4) { font-size: 13px; margin: 16px 0 10px; }

  :deep(.image-grid), :deep(.image-grid-5), :deep(.image-grid-3) {
    grid-template-columns: repeat(2, 1fr); gap: 10px;
  }
  :deep(.img-placeholder) { height: 120px; font-size: 12px; }

  :deep(.row) { grid-template-columns: 1fr; gap: 16px; }
  :deep(.mode-row) { grid-template-columns: 1fr; }

  :deep(.preview img), :deep(.preview-img), :deep(.preview-row img) {
    width: 80px; height: 80px;
  }
  :deep(.preview-row) { gap: 6px; }

  :deep(.btn), :deep(.btn-outline) {
    padding: 10px 20px; font-size: 13px;
  }
  :deep(.actions) { flex-direction: column; align-items: center; }

  :deep(.summary-box) { padding: 14px; }
  :deep(.summary-row) { font-size: 13px; }
  :deep(.script-card) { padding: 16px; }

  :deep(textarea.script-input), :deep(textarea.input-area) {
    padding: 12px; font-size: 13px;
  }
}

@media (max-width: 380px) {
  .work-page { padding: 16px 8px 24px; }
  .step-circle { width: 24px; height: 24px; min-width: 24px; font-size: 10px; }
  .step-connector { width: 14px; margin: 0 2px; }

  :deep(.image-grid), :deep(.image-grid-5), :deep(.image-grid-3) {
    grid-template-columns: 1fr;
  }
  :deep(.dropzone) { padding: 24px 12px; }
  :deep(.dz-icon) { font-size: 28px; }
}
</style>
