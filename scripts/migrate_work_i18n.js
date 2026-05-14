/**
 * Migrate work/ page templates using prepared i18n key mappings.
 * Usage: node scripts/migrate_work_i18n.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORK_DIR = path.join(ROOT, 'client/pages/work');
const DRY_RUN = process.argv.includes('--dry-run');

// Mappings from add_work_i18n_keys.js: [pageFile, namespace, [[chinese, key], ...]]
const PAGE_MAPS = {
  'storyboard.vue': {
    ns: 'work_pages',
    map: [
      ['智能分镜生成', 'storyboard_title'],
      ['AI 脚本→分镜画面→配音→字幕全流程', 'storyboard_subtitle'],
      ['输入脚本', 'storyboard_step_input'],
      ['选择风格', 'storyboard_step_style'],
      ['生成分镜', 'storyboard_step_generate'],
      ['输入视频脚本', 'storyboard_script_title'],
      ['粘贴文案脚本，AI 自动拆分为分镜画面', 'storyboard_script_desc'],
      ['粘贴你的视频脚本...', 'storyboard_script_placeholder'],
      ['快捷模板：', 'storyboard_quick_templates'],
      ['画面风格', 'storyboard_style_title'],
      ['现代简约', 'storyboard_style_modern'],
      ['电影质感', 'storyboard_style_cinematic'],
      ['二次元', 'storyboard_style_anime'],
      ['写实风格', 'storyboard_style_realistic'],
      ['极简白底', 'storyboard_style_minimal'],
      ['重新生成', 'storyboard_btn_reset'],
      ['提交中...', 'storyboard_submitting'],
      ['正在提交任务...', 'storyboard_processing'],
      ['分镜生成完成', 'storyboard_done'],
      ['暂无分镜数据', 'storyboard_empty'],
      ['中景', 'storyboard_shot_camera_mid'],
      ['分镜生成失败，请重试', 'storyboard_error'],
      ['电商产品', 'storyboard_tpl_ecommerce'],
      ['美食教程', 'storyboard_tpl_food'],
      ['请输入脚本内容', 'storyboard_warn_input'],
      ['任务创建失败', 'storyboard_error_create'],
      ['提交失败', 'storyboard_error_submit'],
      ['分镜预览', 'storyboard_img_alt'],
    ],
  },
  'script-gen.vue': {
    ns: 'work_pages',
    map: [
      ['输入卖点', 'script_gen_step_sell'],
      ['选类型+语言', 'script_gen_step_type'],
      ['生成脚本', 'script_gen_step_gen'],
      ['输入产品卖点信息', 'script_gen_input_title'],
      ['描述你的产品卖点信息...', 'script_gen_input_placeholder'],
      ['下一步：选脚本类型', 'script_gen_btn_next'],
      ['选择脚本类型', 'script_gen_type_title'],
      ['短视频口播', 'script_gen_type_short_video'],
      ['15-30s带货口播', 'script_gen_type_short_video_desc'],
      ['直播脚本', 'script_gen_type_live'],
      ['分段直播话术', 'script_gen_type_live_desc'],
      ['种草文案', 'script_gen_type_social'],
      ['小红书/抖音图文', 'script_gen_type_social_desc'],
      ['选择目标语言', 'script_gen_lang_title'],
      ['目标平台（可选）', 'script_gen_platform_title'],
      ['通用', 'script_gen_platform_any'],
      ['返回', 'script_gen_btn_back'],
      ['开头钩子（3选1）', 'script_gen_hook_title'],
      ['正文', 'script_gen_body_title'],
      ['转化引导', 'script_gen_cta_title'],
      ['直播分段脚本', 'script_gen_sections_title'],
      ['种草文案', 'script_gen_captions_title'],
      ['再生成一个', 'script_gen_btn_redo'],
      ['复制脚本', 'script_gen_btn_copy'],
      ['重试', 'script_gen_btn_retry'],
      ['正在提交任务...', 'script_gen_processing'],
      ['服装类', 'script_gen_quick_clothing'],
      ['电子类', 'script_gen_quick_electronics'],
      ['家居类', 'script_gen_quick_home'],
      ['加载语言列表失败', 'script_gen_error_langs'],
      ['提交失败，请重试', 'script_gen_error_submit'],
    ],
  },
  'my-templates.vue': {
    ns: 'work_pages',
    map: [
      ['我的提示词模板', 'my_templates_title'],
      ['全部分类', 'my_templates_all'],
      ['图片类', 'my_templates_cat_image'],
      ['文案类', 'my_templates_cat_text'],
      ['视频类', 'my_templates_cat_video'],
      ['语音类', 'my_templates_cat_voice'],
      ['搜索我的模板...', 'my_templates_search_placeholder'],
      ['去官方模板库复制', 'my_templates_btn_browse'],
      ['编辑', 'my_templates_btn_edit'],
      ['提交收录', 'my_templates_btn_submit'],
      ['删除', 'my_templates_btn_delete'],
      ['还没有私有模板', 'my_templates_empty'],
      ['去官方模板库一键复制', 'my_templates_empty_action'],
      ['更新于 ', 'my_templates_updated'],
      ['编辑模板', 'my_templates_modal_title'],
      ['标题', 'my_templates_label_title'],
      ['内容（支持 {{变量名}} 占位符）', 'my_templates_label_content'],
      ['输入提示词模板内容...', 'my_templates_placeholder_content'],
      ['行业/风格标签（逗号分隔）', 'my_templates_label_tags'],
      ['如：服装,抖音,简约', 'my_templates_placeholder_tags'],
      ['描述', 'my_templates_label_desc'],
      ['简短描述模板用途', 'my_templates_placeholder_desc'],
      ['取消', 'my_templates_btn_cancel'],
      ['保存', 'my_templates_btn_save'],
      ['草稿', 'my_templates_status_draft'],
      ['待审核', 'my_templates_status_pending'],
      ['已收录', 'my_templates_status_approved'],
      ['已驳回', 'my_templates_status_rejected'],
      ['详情页', 'my_templates_cat_detail'],
      ['主图', 'my_templates_cat_main_image'],
      ['场景图', 'my_templates_cat_scene'],
      ['文案', 'my_templates_cat_copy'],
      ['脚本', 'my_templates_cat_script'],
      ['爆款复刻', 'my_templates_cat_viral'],
      ['保存成功，工作流实时生效', 'my_templates_save_ok'],
      ['确认提交此模板给运营审核吗？审核通过后将收录为官方模板，全平台商家可用。', 'my_templates_confirm_submit'],
      ['已提交审核', 'my_templates_submitted'],
      ['确认删除此模板吗？删除后工作流将回退到官方模板。', 'my_templates_confirm_delete'],
      ['已删除', 'my_templates_deleted'],
      ['加载失败', 'my_templates_error_load'],
      ['网络错误', 'my_templates_error_network'],
      ['保存失败', 'my_templates_error_save'],
      ['提交失败', 'my_templates_error_submit'],
      ['删除失败', 'my_templates_error_delete'],
    ],
  },
  'shot-plan.vue': {
    ns: 'work_pages',
    map: [
      ['输入产品', 'shot_plan_step_product'],
      ['选风格', 'shot_plan_step_style'],
      ['生成分镜', 'shot_plan_step_gen'],
      ['输入产品信息', 'shot_plan_input_title'],
      ['描述你的产品和拍摄需求...', 'shot_plan_input_placeholder'],
      ['下一步：选风格', 'shot_plan_btn_next'],
      ['选择视频风格', 'shot_plan_style_title'],
      ['视频时长', 'shot_plan_duration_title'],
      ['返回', 'shot_plan_btn_back'],
      ['分镜脚本', 'shot_plan_done_title'],
      ['总时长：', 'shot_plan_total_duration'],
      ['镜', 'shot_plan_shot_num'],
      ['拍摄建议', 'shot_plan_tips_title'],
      ['再生成', 'shot_plan_btn_redo'],
      ['复制分镜', 'shot_plan_btn_copy'],
      ['重试', 'shot_plan_btn_retry'],
      ['带货转化', 'shot_plan_style_sales'],
      ['种草测评', 'shot_plan_style_review'],
      ['开箱体验', 'shot_plan_style_unbox'],
      ['科普干货', 'shot_plan_style_edu'],
      ['服装', 'shot_plan_quick_clothing'],
      ['美妆', 'shot_plan_quick_beauty'],
      ['电子', 'shot_plan_quick_electronics'],
      ['任务提交失败，请重试', 'shot_plan_error_submit'],
    ],
  },
  'person-replace.vue': {
    ns: 'work_pages',
    map: [
      ['人物替换', 'person_replace_title'],
      ['AI 智能替换模特/人物，保留服装细节', 'person_replace_subtitle'],
      ['上传素材', 'person_replace_step_upload'],
      ['设置参数', 'person_replace_step_params'],
      ['生成结果', 'person_replace_step_result'],
      ['产品/服装图', 'person_replace_upload_product'],
      ['目标人物图', 'person_replace_upload_person'],
      ['点击更换', 'person_replace_click_change'],
      ['上传产品图', 'person_replace_upload_product_btn'],
      ['上传人物图', 'person_replace_upload_person_btn'],
      ['选择图片', 'person_replace_btn_select'],
      ['上传中...', 'person_replace_uploading'],
      ['已上传', 'person_replace_uploaded'],
      ['参数设置', 'person_replace_params_title'],
      ['肤色', 'person_replace_skin'],
      ['白皙', 'person_replace_skin_fair'],
      ['自然', 'person_replace_skin_natural'],
      ['小麦', 'person_replace_skin_wheat'],
      ['深色', 'person_replace_skin_dark'],
      ['体型', 'person_replace_body'],
      ['纤细', 'person_replace_body_slim'],
      ['标准', 'person_replace_body_standard'],
      ['丰满', 'person_replace_body_plump'],
      ['肌肉', 'person_replace_body_muscular'],
      ['穿搭风格', 'person_replace_style'],
      ['休闲', 'person_replace_style_casual'],
      ['商务', 'person_replace_style_business'],
      ['甜美', 'person_replace_style_sweet'],
      ['运动', 'person_replace_style_sporty'],
      ['街头', 'person_replace_style_street'],
      ['预计消耗', 'person_replace_cost'],
      ['积分', 'person_replace_cost_unit'],
      ['开始生成', 'person_replace_btn_start'],
      ['人物替换结果将显示在这里', 'person_replace_result_placeholder'],
      ['替换前', 'person_replace_before'],
      ['替换后', 'person_replace_after'],
      ['生成失败', 'person_replace_error'],
      ['重试', 'person_replace_btn_retry'],
      ['请先上传图片', 'person_replace_warn_upload'],
      ['上传失败', 'person_replace_error_upload'],
      ['任务提交失败，请重试', 'person_replace_error_submit'],
    ],
  },
  'voice-gen.vue': {
    ns: 'work_pages',
    map: [
      ['语音生成', 'voice_gen_title'],
      ['AI 配音/TTS 语音合成', 'voice_gen_subtitle'],
      ['输入文案', 'voice_gen_step_input'],
      ['选择音色', 'voice_gen_step_select'],
      ['生成语音', 'voice_gen_step_generate'],
      ['输入配音文案', 'voice_gen_input_title'],
      ['输入需要配音的文案内容...', 'voice_gen_input_placeholder'],
      ['选择音色', 'voice_gen_voice_title'],
      ['甜美女声', 'voice_gen_voice_sweet_female'],
      ['温柔亲切·带货推荐', 'voice_gen_voice_sweet_female_style'],
      ['磁性男声', 'voice_gen_voice_magnetic_male'],
      ['沉稳大气·品牌旁白', 'voice_gen_voice_magnetic_male_style'],
      ['可爱童声', 'voice_gen_voice_cute_child'],
      ['活泼轻快·趣味配音', 'voice_gen_voice_cute_child_style'],
      ['沉稳播报', 'voice_gen_voice_steady_news'],
      ['专业清晰·资讯播报', 'voice_gen_voice_steady_news_style'],
      ['活泼带货', 'voice_gen_voice_lively_sales'],
      ['热情激昂·直播带货', 'voice_gen_voice_lively_sales_style'],
      ['温柔治愈', 'voice_gen_voice_gentle_heal'],
      ['安静舒缓·情感叙述', 'voice_gen_voice_gentle_heal_style'],
      ['语速', 'voice_gen_speed_title'],
      ['预计消耗', 'voice_gen_cost'],
      ['积分', 'voice_gen_cost_unit'],
      ['开始生成', 'voice_gen_btn_start'],
      ['生成中...', 'voice_gen_btn_generating'],
      ['AI 正在合成语音...', 'voice_gen_processing'],
      ['音色：', 'voice_gen_result_meta'],
      ['生成后的语音将显示在这里', 'voice_gen_result_placeholder'],
      ['生成失败', 'voice_gen_error'],
      ['重试', 'voice_gen_btn_retry'],
      ['请输入配音文案', 'voice_gen_warn_input'],
      ['提交失败', 'voice_gen_error_submit'],
    ],
  },
  'digital-human.vue': {
    ns: 'work_pages',
    map: [
      ['AI 数字人口播', 'digital_human_title'],
      ['文本/音频驱动 — 选择形象+语音+背景 — 一键生成口播视频', 'digital_human_subtitle'],
      ['口播文案', 'digital_human_script_label'],
      ['请输入口播文案...', 'digital_human_script_placeholder'],
      ['字 · 约', 'digital_human_word_count_suffix'],
      ['秒', 'digital_human_word_count_sec'],
      ['或上传音频文件（可选，不传则用AI语音合成）', 'digital_human_audio_label'],
      ['✓ 已上传音频', 'digital_human_audio_uploaded'],
      ['选择数字人形象', 'digital_human_avatar_title'],
      ['职场女性', 'digital_human_avatar_default'],
      ['休闲女生', 'digital_human_avatar_casual_female'],
      ['商务男士', 'digital_human_avatar_business_man'],
      ['休闲男生', 'digital_human_avatar_casual_male'],
      ['知性女性', 'digital_human_avatar_senior_female'],
      ['时尚潮男', 'digital_human_avatar_fashion_male'],
      ['选择背景', 'digital_human_bg_title'],
      ['录播棚', 'digital_human_bg_studio'],
      ['纯白背景', 'digital_human_bg_white'],
      ['商务办公', 'digital_human_bg_office'],
      ['温馨家居', 'digital_human_bg_living'],
      ['成本：', 'digital_human_cost'],
      ['点/次', 'digital_human_cost_unit'],
      ['生成口播视频', 'digital_human_btn_submit'],
      ['提交中...', 'digital_human_btn_submitting'],
      ['生成中...', 'digital_human_btn_generating'],
      ['排队中...', 'digital_human_btn_queued'],
      ['下载', 'digital_human_download'],
      ['复制链接', 'digital_human_copy_link'],
    ],
  },
  'distribution.vue': {
    ns: 'work_pages',
    map: [
      ['多平台一键分发', 'distribution_page_title'],
      ['13 个主流平台，内容一键推送，批量追踪', 'distribution_subtitle'],
      ['选择目标平台', 'distribution_platform_title'],
      ['已授权', 'distribution_platform_connected'],
      ['待授权', 'distribution_platform_disconnected'],
      ['内容配置', 'distribution_content_title'],
      ['标题', 'distribution_label_title'],
      ['输入发布标题', 'distribution_placeholder_title'],
      ['描述', 'distribution_label_description'],
      ['输入描述文案（支持 #话题标签）', 'distribution_placeholder_description'],
      ['图片素材', 'distribution_label_images'],
      ['支持多图，自动适配各平台尺寸', 'distribution_images_hint'],
      ['定时发布', 'distribution_label_schedule'],
      ['留空则立即发布', 'distribution_schedule_hint'],
      ['个平台', 'distribution_btn_publish_suffix'],
      ['发布中...', 'distribution_btn_publishing'],
      ['保存草稿', 'distribution_btn_draft'],
      ['发布记录', 'distribution_history_title'],
      ['暂无发布记录', 'distribution_history_empty'],
      ['内容', 'distribution_table_content'],
      ['平台', 'distribution_table_platform'],
      ['状态', 'distribution_table_status'],
      ['时间', 'distribution_table_time'],
      ['操作', 'distribution_table_actions'],
      ['等待中', 'distribution_status_pending'],
      ['已发布', 'distribution_status_success'],
      ['失败', 'distribution_status_failed'],
      ['重试', 'distribution_btn_retry'],
      ['发布成功！', 'distribution_success_publish'],
      ['草稿已保存', 'distribution_success_draft'],
      ['发布失败', 'distribution_error_publish'],
      ['保存草稿失败，请稍后重试', 'distribution_error_draft'],
      ['重试分发失败，请稍后重试', 'distribution_error_retry'],
      ['加载分发历史失败', 'distribution_error_load'],
      ['请输入标题', 'distribution_warn_title'],
    ],
  },
  'ghost-mannequin.vue': {
    ns: 'work_pages',
    map: [
      ['幽灵模特', 'ghost_mannequin_title'],
      ['AI 去假模 → 立体悬浮展示，无需真人拍摄', 'ghost_mannequin_subtitle'],
      ['上传图片', 'ghost_mannequin_step_upload'],
      ['选择效果', 'ghost_mannequin_step_effect'],
      ['生成展示', 'ghost_mannequin_step_generate'],
      ['上传假人模特图', 'ghost_mannequin_upload_title'],
      ['上传穿在假模上的服装图，AI 自动去除假模，生成立体悬浮展示效果', 'ghost_mannequin_upload_desc'],
      ['点击上传或拖拽假模服装图', 'ghost_mannequin_upload_placeholder'],
      ['支持 JPG / PNG / WebP，最大 20MB', 'ghost_mannequin_upload_hint'],
      ['上传中...', 'ghost_mannequin_uploading'],
      ['已上传', 'ghost_mannequin_uploaded'],
      ['展示效果', 'ghost_mannequin_effect_title'],
      ['立体悬浮', 'ghost_mannequin_effect_floating'],
      ['3D 立体悬浮展示，带自然阴影', 'ghost_mannequin_effect_floating_desc'],
      ['平铺展示', 'ghost_mannequin_effect_flat'],
      ['干净利落的平铺陈列效果', 'ghost_mannequin_effect_flat_desc'],
      ['3D 旋转', 'ghost_mannequin_effect_rotate3d'],
      ['360° 缓慢旋转展示', 'ghost_mannequin_effect_rotate3d_desc'],
      ['动态飘动', 'ghost_mannequin_effect_dynamic'],
      ['模拟微风吹拂自然飘动', 'ghost_mannequin_effect_dynamic_desc'],
      ['服装类别', 'ghost_mannequin_category_title'],
      ['上衣', 'ghost_mannequin_cat_tops'],
      ['裤装', 'ghost_mannequin_cat_pants'],
      ['裙装', 'ghost_mannequin_cat_skirts'],
      ['外套', 'ghost_mannequin_cat_outerwear'],
      ['内衣', 'ghost_mannequin_cat_underwear'],
      ['运动服', 'ghost_mannequin_cat_sportswear'],
      ['预计消耗', 'ghost_mannequin_cost'],
      ['积分', 'ghost_mannequin_cost_unit'],
      ['开始生成', 'ghost_mannequin_btn_start'],
      ['提交中...', 'ghost_mannequin_btn_submitting'],
      ['AI 正在处理...', 'ghost_mannequin_processing'],
      ['处理前（假模）', 'ghost_mannequin_before_label'],
      ['处理后（立体展示）', 'ghost_mannequin_after_label'],
      ['AI 去除假模', 'ghost_mannequin_ai_badge'],
      ['任务失败', 'ghost_mannequin_error'],
      ['重试', 'ghost_mannequin_btn_retry'],
      ['幽灵模特展示图将显示在这里', 'ghost_mannequin_result_placeholder'],
      ['请先上传图片', 'ghost_mannequin_warn_upload'],
      ['上传失败', 'ghost_mannequin_error_upload'],
      ['提交失败', 'ghost_mannequin_error_submit'],
    ],
  },
  'poster/index.vue': {
    ns: 'work_pages',
    map: [
      ['海报与封面生成', 'poster_page_title'],
      ['AI 智能生成营销海报与社媒封面，支持多种风格与尺寸适配', 'poster_page_desc'],
      ['海报描述', 'poster_label_description'],
      ['尺寸规格', 'poster_label_size'],
      ['比例', 'poster_size_ratio'],
      ['风格偏好', 'poster_label_style'],
      ['(可选)', 'poster_label_style_optional'],
      ['快速模板', 'poster_label_templates'],
      ['生成海报', 'poster_btn_generate'],
      ['生成中...', 'poster_btn_generating'],
      ['润色结果', 'poster_enhanced_title'],
      ['还原', 'poster_btn_revert'],
      ['上传商品参考图，AI 自动生成海报描述文案', 'poster_upload_hint'],
      ['确认并生成描述', 'poster_upload_confirm'],
      ['AI 正在为您创作海报，请稍候...', 'poster_generating_status'],
      ['核心卖点', 'poster_smart_apply_template'],
      ['目标风格：专业电商展示，高清细节，干净背景', 'poster_smart_apply_style'],
      ['润色服务暂不可用，将使用原始描述', 'poster_error_enhance_unavailable'],
      ['提示词润色失败，将使用原始描述', 'poster_error_enhance_failed'],
      ['海报生成失败，请重试', 'poster_error_generate_failed'],
      ['任务超时，请刷新页面查看结果', 'poster_error_timeout'],
      ['网络不稳定，查询任务状态失败，请刷新查看结果', 'poster_error_network'],
      ['已复制到剪贴板', 'poster_success_copy'],
    ],
  },
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let totalReplacements = 0;
const modifiedFiles = [];

function processFile(relativePath, config) {
  const filePath = path.join(WORK_DIR, relativePath);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${relativePath} (not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Sort by length descending to avoid partial matches
  const sorted = [...config.map].sort((a, b) => b[0].length - a[0].length);

  for (const [chinese, key] of sorted) {
    const i18nCall = `$t('${config.ns}.${key}')`;
    const escaped = escapeRegex(chinese);

    // 1. Text nodes: >chinese<
    const textRe = new RegExp(`>${escaped}<`, 'g');
    if (textRe.test(content)) {
      textRe.lastIndex = 0;
      content = content.replace(textRe, `>{{ ${i18nCall} }}<`);
      changed = true;
      totalReplacements++;
    }

    // 2. Text nodes with surrounding whitespace: >  chinese  <
    const wsTextRe = new RegExp(`>(\\s*)${escaped}(\\s*)<`, 'g');
    let wsMatch;
    while ((wsMatch = wsTextRe.exec(content)) !== null) {
      if (wsMatch[0].includes('{{') || wsMatch[0].includes('$t(')) continue;
      content = content.replace(wsMatch[0], `>${wsMatch[1]}{{ ${i18nCall} }}${wsMatch[2]}<`);
      changed = true;
      totalReplacements++;
    }

    // 3. placeholder="chinese"
    const phRe = new RegExp(`placeholder="${escaped}"`, 'g');
    if (phRe.test(content)) {
      phRe.lastIndex = 0;
      content = content.replace(phRe, `:placeholder="${i18nCall}"`);
      changed = true;
      totalReplacements++;
    }

    // 4. title="chinese"
    const titleRe = new RegExp(`title="${escaped}"`, 'g');
    if (titleRe.test(content)) {
      titleRe.lastIndex = 0;
      content = content.replace(titleRe, `:title="${i18nCall}"`);
      changed = true;
      totalReplacements++;
    }

    // 5. Label: >chinese:</label> or similar
    const labelRe = new RegExp(`>${escaped}:</`, 'g');
    if (labelRe.test(content)) {
      labelRe.lastIndex = 0;
      content = content.replace(labelRe, `>{{ ${i18nCall} }}:</`);
      changed = true;
      totalReplacements++;
    }
  }

  if (changed) {
    if (!DRY_RUN) fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles.push(relativePath);
    console.log(`  ${DRY_RUN ? '[DRY] ' : ''}✓ ${relativePath}`);
  } else {
    console.log(`  - ${relativePath} (no changes)`);
  }
}

console.log(`Work Pages i18n Migration ${DRY_RUN ? '(DRY RUN)' : '(WRITE MODE)'}\n`);

for (const [file, config] of Object.entries(PAGE_MAPS)) {
  processFile(file, config);
}

console.log(`\nDone: ${modifiedFiles.length} files modified, ${totalReplacements} total replacements`);
if (DRY_RUN) console.log('(DRY RUN — no files were written. Remove --dry-run to apply.)');
