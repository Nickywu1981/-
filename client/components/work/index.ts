// ── Work 组件模块统一导出 ──
// G4 Frontend-B

export { default as WorkPipeline } from './pipeline/WorkPipeline.vue'
export { validatePageConfig, assertValidConfig } from './pipeline/validators'
export { getFieldRenderer, registerFieldType, hasFieldType } from './pipeline/ComponentRegistry'
export type { PageConfig, StepConfig, FieldConfig, ApiConfig, UiConfig, PipelineState } from './pipeline/types'

// Page configs — Batch 1: Image→Image with style
export { removeBgConfig } from './configs/remove-bg'
export { colorChangeConfig } from './configs/color-change'
export { whiteBgConfig } from './configs/white-bg'
export { storyboardConfig } from './configs/storyboard'
export { translateImageConfig, imageTranslateConfig, outpaintConfig, retouchConfig, sceneConfig, wrinkleRemoveConfig, ghostMannequinConfig, virtualTryonConfig, mainImageConfig, productRenderConfig } from './configs/image-batch1'
export { modelGenerateConfig, viralCloneConfig, viralReplicateConfig, platformDetailConfig, posterConfig, colorSwapConfig } from './configs/image-batch2'
export { scriptGenConfig, shotPlanConfig, shotPanoramaConfig, promptHubConfig, voiceGenConfig } from './configs/text-batch'
export { videoEditConfig, videoTranslateConfig, digitalHumanConfig, voiceCloneConfig } from './configs/media-batch'
export { brandSettingsConfig, sizeTemplatesConfig, outputConfig, usageConfig, detailH5Config, distributionConfig, complianceCheckConfig } from './configs/simple-batch'
