/**
 * 电商行业配置集中化 — 单一数据源
 *
 * 从 templateEngine.js、unifiedWorkflowEngine.js、unifiedWorkflowController.js
 * 三处硬编码提取统一管理。新增行业只需在此文件追加一行。
 *
 * 派生导出：
 *   INDUSTRY_PARAMS — 模板引擎行业参数注入 { style, scene, composition }
 *   INDUSTRY_SCENES  — 场景图生成的场景列表 (unifiedWorkflowEngine 使用)
 *   INDUSTRY_LIST    — 前端可配置清单使用 { key, label }
 */
export const INDUSTRY_CONFIG = {
  clothing:     { label:'服装',     category:'服装', style:'fashion editorial', scene:'urban street / studio',     composition:'full body + detail',   scenes: ['modern_studio','urban_street','natural_park'] },
  beauty:       { label:'美妆',     category:'美妆', style:'beauty glam',        scene:'vanity / bathroom',          composition:'macro + flatlay',       scenes: ['minimalist_bathroom','vanity_table','spa_setting'] },
  '3c_digital': { label:'3C数码',   category:'3C数码',style:'tech minimal',      scene:'desk / dark studio',         composition:'product hero + detail', scenes: ['modern_desk','coffee_shop','minimalist_office'] },
  food:         { label:'食品',     category:'食品', style:'food photography',   scene:'kitchen / dining',           composition:'overhead + close-up',   scenes: ['rustic_kitchen','dining_table','natural_light'] },
  home:         { label:'家居',     category:'家居', style:'interior design',    scene:'living room / bedroom',      composition:'wide + vignette',       scenes: ['modern_living_room','scandinavian_bedroom','sunlit_balcony'] },
  sports:       { label:'运动户外', category:'运动', style:'sport dynamic',      scene:'gym / outdoor',              composition:'action + detail',       scenes: ['gym_floor','trail_path','arena_stadium'] },
  toys:         { label:'母婴玩具', category:'母婴', style:'soft pastel',        scene:'nursery / playroom',         composition:'close-up + context',    scenes: ['baby_nursery','playroom_bright','toddler_room'] },
  auto:         { label:'汽配用品', category:'汽车', style:'automotive premium', scene:'garage / showroom',          composition:'hero + detail',         scenes: ['garage_clean','showroom_white','workshop'] },
  jewelry:      { label:'珠宝首饰', category:'珠宝', style:'luxury sparkle',     scene:'velvet / macro',             composition:'macro + 360',           scenes: ['velvet_black','marble_white','rotating_stand'] },
  pet:          { label:'宠物用品', category:'宠物', style:'warm lifestyle',     scene:'home / park',                composition:'pet + product',         scenes: ['living_room_cozy','outdoor_park','pet_bed'] },
  office:       { label:'办公文具', category:'办公', style:'clean professional', scene:'desk / office',              composition:'flatlay + detail',      scenes: ['wooden_desk','white_office','coffee_shop'] },
  med:          { label:'医药健康', category:'医药', style:'clinical clean',     scene:'clinic / lab',               composition:'packaging + info',      scenes: ['clinic_white','lab_clean','pharmacy_shelf'] },
  luggage:      { label:'箱包配饰', category:'箱包', style:'fashion editorial',  scene:'studio / street',            composition:'hero + worn',           scenes: ['white_studio','brick_wall','city_street'] },
  appliance:    { label:'家电厨电', category:'家电', style:'modern tech',        scene:'kitchen / living',           composition:'product + scene',       scenes: ['modern_kitchen','living_room','laundry_room'] },
  furniture:    { label:'家装建材', category:'家装', style:'interior design',    scene:'room / before-after',        composition:'wide + detail',         scenes: ['bright_bedroom','scandi_living','patio_outdoor'] },
  education:    { label:'教育培训', category:'教育', style:'professional academic', scene:'classroom / library',          composition:'top-down + infographic', scenes: ['bright_classroom','modern_library','online_learning'] },
  agriculture:  { label:'农资园艺', category:'农业', style:'natural organic',       scene:'garden / greenhouse',         composition:'panoramic + macro',      scenes: ['garden_bloom','greenhouse_modern','farm_field'] },
  musical:      { label:'乐器音像', category:'乐器', style:'artistic immersive',    scene:'stage / studio / practice',   composition:'light-shadow + closeup', scenes: ['dark_stage','recording_studio','practice_room'] },
  'auto_life':  { label:'汽摩生活', category:'汽车生活', style:'dynamic outdoor',  scene:'highway / mountain road',     composition:'wide-angle + motion',    scenes: ['scenic_highway','mountain_pass','underground_parking'] },
  cross_border: { label:'跨境电商', category:'跨境', style:'global premium',        scene:'airport / city landmark',     composition:'contrast + collage',     scenes: ['airport_lounge','city_skyline','multilingual_signage'] },
};

// ── 派生: 模板引擎行业参数 (保持与原 INDUSTRY_PARAMS 接口兼容) ──
export const INDUSTRY_PARAMS = Object.fromEntries(
  Object.entries(INDUSTRY_CONFIG).map(([key, v]) => [key, {
    category: v.category,
    style: v.style,
    scene: v.scene,
    composition: v.composition,
  }])
);

// ── 派生: 场景图生成用场景列表 (保持与原 INDUSTRY_SCENES 接口兼容) ──
export const INDUSTRY_SCENES = Object.fromEntries(
  Object.entries(INDUSTRY_CONFIG).map(([key, v]) => [key, v.scenes])
);

// ── 派生: 前端可配置清单用行业列表 ──
export const INDUSTRY_LIST = Object.entries(INDUSTRY_CONFIG).map(([key, v]) => ({
  key,
  label: v.label,
}));

// ── 知识图谱: 跨行业关联 ──
export const INDUSTRY_GRAPH = {
  // 穿搭关联链
  clothing:    { relatedIndustries: ['luggage', 'jewelry', 'beauty'], sharedScenes: ['urban_street', 'modern_studio'] },
  luggage:     { relatedIndustries: ['clothing', 'jewelry', 'cross_border'], sharedScenes: ['white_studio', 'city_street'] },
  jewelry:     { relatedIndustries: ['clothing', 'beauty', 'luggage'], sharedScenes: ['velvet_black', 'marble_white'] },
  beauty:      { relatedIndustries: ['clothing', 'jewelry', 'med'], sharedScenes: ['minimalist_bathroom', 'vanity_table'] },

  // 家庭生活关联链
  home:        { relatedIndustries: ['furniture', 'appliance', 'office'], sharedScenes: ['modern_living_room', 'scandinavian_bedroom'] },
  furniture:   { relatedIndustries: ['home', 'office', 'appliance'], sharedScenes: ['bright_bedroom', 'scandi_living'] },
  appliance:   { relatedIndustries: ['home', 'furniture', 'food'], sharedScenes: ['modern_kitchen', 'laundry_room'] },
  food:        { relatedIndustries: ['appliance', 'agriculture', 'pet'], sharedScenes: ['rustic_kitchen', 'dining_table'] },

  // 科技/办公关联链
  '3c_digital':{ relatedIndustries: ['office', 'education', 'cross_border'], sharedScenes: ['modern_desk', 'coffee_shop'] },
  office:      { relatedIndustries: ['3c_digital', 'education', 'home'], sharedScenes: ['wooden_desk', 'white_office'] },
  education:   { relatedIndustries: ['office', '3c_digital', 'cross_border'], sharedScenes: ['bright_classroom', 'white_office'] },

  // 运动户外关联链
  sports:      { relatedIndustries: ['auto_life', 'pet', 'cross_border'], sharedScenes: ['trail_path', 'arena_stadium'] },
  auto_life:   { relatedIndustries: ['sports', 'auto', 'cross_border'], sharedScenes: ['scenic_highway', 'mountain_pass'] },
  auto:        { relatedIndustries: ['auto_life', 'sports'], sharedScenes: ['garage_clean', 'workshop'] },

  // 母婴关联链
  toys:        { relatedIndustries: ['pet', 'med', 'education'], sharedScenes: ['playroom_bright', 'toddler_room'] },
  pet:         { relatedIndustries: ['toys', 'sports', 'agriculture'], sharedScenes: ['living_room_cozy', 'outdoor_park'] },

  // 健康关联链
  med:         { relatedIndustries: ['beauty', 'toys', 'agriculture'], sharedScenes: ['clinic_white', 'pharmacy_shelf'] },

  // 农业专家
  agriculture: { relatedIndustries: ['food', 'med', 'pet'], sharedScenes: ['garden_bloom', 'farm_field'] },

  // 艺术关联
  musical:     { relatedIndustries: ['cross_border', 'education', '3c_digital'], sharedScenes: ['recording_studio', 'practice_room'] },

  // 跨境全栈
  cross_border:{ relatedIndustries: ['clothing', '3c_digital', 'luggage', 'auto_life', 'education'], sharedScenes: ['airport_lounge', 'city_skyline'] },
};

export default { INDUSTRY_CONFIG, INDUSTRY_PARAMS, INDUSTRY_SCENES, INDUSTRY_LIST, INDUSTRY_GRAPH };
