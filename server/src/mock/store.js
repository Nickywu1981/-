const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
const t = (offset) => {
  const d = new Date(Date.now() + offset * 86400000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

// ======================== 丰富种子数据 ========================
const MOCK_STORE = {
  // ---- 用户（5人） ----
  user: [
    { id: 1, username: 'demo', password: '$2b$10$ewMeGEB/Hi7auXHNj8TbP.T2Qu7kritVv5vr2R48N8HTbkSk6i4Dq', nickname: '电商达人小王', role: 'admin', phone: '13812345678', email: 'demo@example.com', avatar: '', status: 1, plan_type: 2, credit_balance: 485, last_login_time: t(-0.1), create_time: '2025-01-15 10:30:00', update_time: now, is_deleted: 0 },
    { id: 6, username: 'admin', password: '$2b$10$QK/IX2N73x9vN1D4pvqrX.QkJFBSAEIYbptk/JrKXfyCc4vpSqw7.', nickname: '超级管理员', role: 'admin', phone: '13800000001', email: 'admin@example.com', avatar: '', status: 1, plan_type: 3, credit_balance: 9999, last_login_time: t(-0.1), create_time: '2025-01-01 00:00:00', update_time: now, is_deleted: 0 },
    { id: 2, username: 'seller_li', password: '$2b$10$xxx', nickname: '跨境卖家老李', phone: '13987654321', email: 'li@example.com', avatar: '', status: 1, plan_type: 1, credit_balance: 197, last_login_time: t(-0.5), create_time: '2025-03-20 14:00:00', update_time: now, is_deleted: 0 },
    { id: 3, username: 'studio_zhang', password: '$2b$10$xxx', nickname: '美工张', phone: '13611112222', email: 'zhang@studio.com', avatar: '', status: 1, plan_type: 3, credit_balance: 1975, last_login_time: t(-0.2), create_time: '2025-04-01 09:15:00', update_time: now, is_deleted: 0 },
    { id: 4, username: 'xiaomei_shop', password: '$2b$10$xxx', nickname: '小美服饰旗舰店', phone: '13733445566', email: 'xiaomei@shop.com', avatar: '', status: 1, plan_type: 1, credit_balance: 85, last_login_time: t(-1), create_time: '2025-04-10 16:20:00', update_time: now, is_deleted: 0 },
    { id: 5, username: 'test_user', password: '$2b$10$xxx', nickname: '测试新用户', phone: '13500001111', email: '', avatar: '', status: 1, plan_type: 0, credit_balance: 20, last_login_time: t(-0.02), create_time: t(-3), update_time: now, is_deleted: 0 },
  ],

  // ---- 作品任务（20+条，覆盖所有类型） ----
  task: [
    { id: 't001', user_id: 1, type: 'main_image', status: 2, credits_consumed: 3, progress: 100, input_params: JSON.stringify({ platform: 'taobao', style: '简约白底' }), output_result: JSON.stringify({ images: ['/uploads/demo/main-1-1.jpg', '/uploads/demo/main-1-2.jpg', '/uploads/demo/main-1-3.jpg'] }), title: '夏季连衣裙主图', create_time: t(-1), update_time: t(-1) },
    { id: 't002', user_id: 1, type: 'scene', status: 2, credits_consumed: 5, progress: 100, input_params: JSON.stringify({ scene: 'cafe', count: 5 }), output_result: JSON.stringify({ images: ['/uploads/demo/scene-1.jpg', '/uploads/demo/scene-2.jpg', '/uploads/demo/scene-3.jpg'] }), title: '咖啡馆场景图', create_time: t(-1.5), update_time: t(-1.5) },
    { id: 't003', user_id: 1, type: 'img2video', status: 2, credits_consumed: 10, progress: 100, input_params: JSON.stringify({ duration: 15, ratio: '9:16' }), output_result: JSON.stringify({ url: '/uploads/demo/video-1.mp4', duration: 15, cover: '/uploads/demo/cover-1.jpg' }), title: '连衣裙带货视频', create_time: t(-2), update_time: t(-2) },
    { id: 't004', user_id: 2, type: 'main_image', status: 2, credits_consumed: 3, progress: 100, input_params: JSON.stringify({ platform: 'amazon', style: '简约白底' }), output_result: JSON.stringify({ images: ['/uploads/demo/product-2.jpg'] }), title: '蓝牙耳机白底图', create_time: t(-0.5), update_time: t(-0.5) },
    { id: 't005', user_id: 2, type: 'virtual_tryon', status: 1, credits_consumed: 8, progress: 65, input_params: JSON.stringify({ model: 'asian_female', body: 'medium', cloth: 'T-shirt-01' }), output_result: '{}', title: 'T恤虚拟模特上身', create_time: t(-0.1), update_time: t(-0.1) },
    { id: 't006', user_id: 1, type: 'batch', status: 2, credits_consumed: 25, progress: 100, input_params: JSON.stringify({ type: 'main_image', count: 20 }), output_result: JSON.stringify({ images: Array.from({ length: 20 }, (_, i) => `/uploads/demo/batch-${i + 1}.jpg`) }), title: '批量生成主图-20件', create_time: t(-3), update_time: t(-3) },
    { id: 't007', user_id: 3, type: 'main_image', status: 2, credits_consumed: 3, progress: 100, input_params: JSON.stringify({ platform: 'douyin', style: '高级轻奢' }), output_result: JSON.stringify({ images: ['/uploads/demo/shoe-1.jpg', '/uploads/demo/shoe-2.jpg', '/uploads/demo/shoe-3.jpg'] }), title: '运动鞋主图', create_time: t(-0.3), update_time: t(-0.3) },
    { id: 't008', user_id: 3, type: 'scene', status: 2, credits_consumed: 5, progress: 100, input_params: JSON.stringify({ scene: 'outdoor', count: 5 }), output_result: JSON.stringify({ images: ['/uploads/demo/shoe-scene-1.jpg', '/uploads/demo/shoe-scene-2.jpg'] }), title: '户外运动场景-跑鞋', create_time: t(-0.4), update_time: t(-0.4) },
    { id: 't009', user_id: 1, type: 'detail_h5', status: 2, credits_consumed: 8, progress: 100, input_params: JSON.stringify({ category: 'women_dress', platform: 'taobao', skus: 3 }), output_result: JSON.stringify({ images: ['/uploads/demo/detail-1.jpg', '/uploads/demo/detail-2.jpg', '/uploads/demo/detail-3.jpg'] }), title: '连衣裙详情页', create_time: t(-5), update_time: t(-5) },
    { id: 't010', user_id: 1, type: 'color_swap', status: 2, credits_consumed: 4, progress: 100, input_params: JSON.stringify({ original: '#ffffff', target: ['#ff0000', '#0000ff', '#000000'] }), output_result: JSON.stringify({ images: ['/uploads/demo/color-red.jpg', '/uploads/demo/color-blue.jpg', '/uploads/demo/color-black.jpg'] }), title: '连衣裙换色', create_time: t(-6), update_time: t(-6) },
    { id: 't011', user_id: 4, type: 'main_image', status: 2, credits_consumed: 3, progress: 100, input_params: JSON.stringify({ platform: 'pdd', style: '活动促销' }), output_result: JSON.stringify({ images: ['/uploads/demo/cloth-main-1.jpg', '/uploads/demo/cloth-main-2.jpg'] }), title: '韩版衬衫主图', create_time: t(-1.2), update_time: t(-1.2) },
    { id: 't012', user_id: 4, type: 'ghost_mannequin', status: 2, credits_consumed: 3, progress: 100, input_params: JSON.stringify({ cloth_type: 'shirt' }), output_result: JSON.stringify({ images: ['/uploads/demo/ghost-1.jpg'] }), title: '衬衫幽灵人台', create_time: t(-1.3), update_time: t(-1.3) },
    { id: 't013', user_id: 2, type: 'image_translate', status: 2, credits_consumed: 5, progress: 100, input_params: JSON.stringify({ from: 'zh', to: 'en' }), output_result: JSON.stringify({ images: ['/uploads/demo/translate-1.jpg'] }), title: '产品图英文翻译', create_time: t(-1.8), update_time: t(-1.8) },
    { id: 't014', user_id: 3, type: 'video_compose', status: 2, credits_consumed: 20, progress: 100, input_params: JSON.stringify({ duration: 30, ratio: '9:16' }), output_result: JSON.stringify({ url: '/uploads/demo/compose-video.mp4', duration: 30 }), title: '多图合成带货视频', create_time: t(-2.5), update_time: t(-2.5) },
    { id: 't015', user_id: 4, type: 'style_transfer', status: 2, credits_consumed: 6, progress: 100, input_params: JSON.stringify({ style: 'watercolor' }), output_result: JSON.stringify({ images: ['/uploads/demo/style-1.jpg'] }), title: '衬衫水彩风格', create_time: t(-0.8), update_time: t(-0.8) },
    { id: 't016', user_id: 3, type: 'action_transfer', status: 2, credits_consumed: 30, progress: 100, input_params: JSON.stringify({ mode: 'one_action_multi_person', count: 5 }), output_result: JSON.stringify({ videos: Array.from({ length: 5 }, (_, i) => `/uploads/demo/action-${i + 1}.mp4`) }), title: '模特跳舞动作迁移-5人', create_time: t(-3), update_time: t(-3) },
    { id: 't017', user_id: 1, type: 'script_gen', status: 2, credits_consumed: 2, progress: 100, input_params: JSON.stringify({ product: '夏季连衣裙', platform: 'douyin' }), output_result: JSON.stringify({ script: '【5秒吸睛】这条裙子太仙了！\n【痛点】夏天穿什么？\n【产品展示】高腰A字版型+冰丝面料\n【行动号召】限时特惠，手慢无！' }), title: '连衣裙带货脚本', create_time: t(-4), update_time: t(-4) },
    { id: 't018', user_id: 2, type: 'person_replace', status: 2, credits_consumed: 25, progress: 100, input_params: JSON.stringify({ mode: 'one_person_multi_action', count: 3 }), output_result: JSON.stringify({ videos: Array.from({ length: 3 }, (_, i) => `/uploads/demo/replace-${i + 1}.mp4`) }), title: '人物替换-多动作', create_time: t(-2.8), update_time: t(-2.8) },
    { id: 't019', user_id: 4, type: 'wrinkle_remove', status: 2, credits_consumed: 3, progress: 100, input_params: JSON.stringify({ fabric: 'cotton' }), output_result: JSON.stringify({ images: ['/uploads/demo/wrinkle-1.jpg'] }), title: '棉质衬衫去褶皱', create_time: t(-1.1), update_time: t(-1.1) },
    { id: 't020', user_id: 1, type: 'viral_clone', status: 2, credits_consumed: 15, progress: 100, input_params: JSON.stringify({ source_video_url: '/uploads/user-source-viral.mp4' }), output_result: JSON.stringify({ url: '/uploads/demo/viral-clone.mp4' }), title: '爆款视频复刻-连衣裙', create_time: t(-7), update_time: t(-7) },
    { id: 't021', user_id: 2, type: 'main_image', status: 0, credits_consumed: 0, progress: 0, input_params: '{}', output_result: '{}', title: '新款充电宝主图', create_time: t(-0.02), update_time: t(-0.02) },
    { id: 't022', user_id: 3, type: 'shot_plan', status: 2, credits_consumed: 2, progress: 100, input_params: JSON.stringify({ product: '运动跑鞋', style: '运动风' }), output_result: JSON.stringify({ shots: [{ no: 1, desc: '产品360度展示', camera: '推镜头', duration: 3 }, { no: 2, desc: '鞋底特写', camera: '微距特写', duration: 2 }, { no: 3, desc: '跑步动态', camera: '跟拍', duration: 4 }, { no: 4, desc: '对比展示', camera: '分屏', duration: 3 }, { no: 5, desc: 'CTA购买引导', camera: '定镜', duration: 3 }] }), title: '运动鞋视频分镜', create_time: t(-0.6), update_time: t(-0.6) },
  ],

  // ---- 积分流水 ----
  credit_record: [
    { id: 1, user_id: 1, action: 'purchase_plan', credit_before: 0, credit_after: 500, consumed: -500, remark: '购买季卡', plan_type: 2, amount: 69, create_time: t(-30) },
    { id: 2, user_id: 1, action: 'task_main_image', credit_before: 500, credit_after: 497, consumed: 3, remark: '做主图消耗', plan_type: null, amount: null, create_time: t(-1) },
    { id: 3, user_id: 1, action: 'task_scene', credit_before: 497, credit_after: 492, consumed: 5, remark: '做场景消耗', plan_type: null, amount: null, create_time: t(-1.5) },
    { id: 4, user_id: 1, action: 'task_img2video', credit_before: 492, credit_after: 482, consumed: 10, remark: '做视频消耗', plan_type: null, amount: null, create_time: t(-2) },
    { id: 5, user_id: 2, action: 'purchase_plan', credit_before: 0, credit_after: 200, consumed: -200, remark: '购买月卡', plan_type: 1, amount: 29, create_time: t(-15) },
    { id: 6, user_id: 2, action: 'task_main_image', credit_before: 200, credit_after: 197, consumed: 3, remark: '做主图消耗', plan_type: null, amount: null, create_time: t(-0.5) },
    { id: 7, user_id: 3, action: 'purchase_plan', credit_before: 0, credit_after: 2000, consumed: -2000, remark: '购买年卡', plan_type: 3, amount: 199, create_time: t(-7) },
    { id: 8, user_id: 3, action: 'task_main_image', credit_before: 2000, credit_after: 1997, consumed: 3, remark: '做主图消耗', plan_type: null, amount: null, create_time: t(-0.3) },
    { id: 9, user_id: 4, action: 'purchase_plan', credit_before: 0, credit_after: 100, consumed: -100, remark: '购买月卡', plan_type: 1, amount: 29, create_time: t(-14) },
    { id: 10, user_id: 4, action: 'task_main_image', credit_before: 100, credit_after: 97, consumed: 3, remark: '做主图消耗', plan_type: null, amount: null, create_time: t(-1.2) },
    { id: 11, user_id: 1, action: 'task_batch', credit_before: 482, credit_after: 457, consumed: 25, remark: '批量生成消耗', plan_type: null, amount: null, create_time: t(-3) },
    { id: 12, user_id: 1, action: 'task_action_transfer', credit_before: 457, credit_after: 427, consumed: 30, remark: '动作迁移消耗', plan_type: null, amount: null, create_time: t(-3) },
    { id: 13, user_id: 5, action: 'daily_free', credit_before: 0, credit_after: 20, consumed: -20, remark: '新用户注册赠送', plan_type: null, amount: null, create_time: t(-3) },
  ],

  // ---- 通知 ----
  notification: [
    { id: 1, user_id: 1, title: '任务完成', content: '您的主图"夏季连衣裙主图"已生成完毕，共3张风格。', is_read: 0, type: 'task_complete', create_time: t(-1) },
    { id: 2, user_id: 1, title: '任务完成', content: '您的场景图"咖啡馆场景图"已生成完毕。', is_read: 0, type: 'task_complete', create_time: t(-1.5) },
    { id: 3, user_id: 1, title: '系统通知', content: '欢迎使用AI电商工具箱！新用户赠送50点算力，会员每日额外赠送。', is_read: 1, type: 'system', create_time: t(-30) },
    { id: 4, user_id: 1, title: '任务完成', content: '您的详情页"连衣裙详情页"已生成完毕。', is_read: 1, type: 'task_complete', create_time: t(-5) },
    { id: 5, user_id: 2, title: '任务完成', content: '您的"蓝牙耳机白底图"已生成完毕。', is_read: 0, type: 'task_complete', create_time: t(-0.5) },
    { id: 6, user_id: 1, title: '算力提醒', content: '您的算力余额已不足50点，建议尽快续费以免影响使用。', is_read: 0, type: 'credit_warning', create_time: t(-0.2) },
    { id: 7, user_id: 3, title: '系统通知', content: '欢迎成为年卡会员！全部功能已解锁，夜间托管已开启。', is_read: 1, type: 'system', create_time: t(-7) },
  ],

  // ---- 品牌设置 ----
  brand: [
    { id: 1, user_id: 1, logo_url: '', brand_name: '小王的店', watermarked: 1, watermark_position: 'bottom-right', watermark_opacity: 30, brand_color: '#FF6B3D', updated_at: now },
    { id: 2, user_id: 3, logo_url: '', brand_name: '运动达人旗舰店', watermarked: 1, watermark_position: 'bottom-right', watermark_opacity: 40, brand_color: '#007AFF', updated_at: t(-7) },
  ],

  // ---- 平台尺寸模板（13平台全覆盖） ----
  size_template: [
    // 国内
    { id: 1, platform: 'taobao', name: '淘宝主图-800x800', width: 800, height: 800, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 2, platform: 'taobao', name: '淘宝详情-750宽', width: 750, height: 0, unit: 'px', category: 'detail', sort: 2, created_at: '2025-01-01' },
    { id: 3, platform: 'douyin', name: '抖音商品-1:1', width: 800, height: 800, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 4, platform: 'douyin', name: '抖音短视频-9:16', width: 1080, height: 1920, unit: 'px', category: 'video', sort: 2, created_at: '2025-01-01' },
    { id: 5, platform: 'pdd', name: '拼多多主图-1:1', width: 800, height: 800, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 6, platform: 'xiaohongshu', name: '小红书-3:4', width: 1080, height: 1440, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 7, platform: 'xiaohongshu', name: '小红书-竖版', width: 1080, height: 1920, unit: 'px', category: 'video', sort: 2, created_at: '2025-01-01' },
    { id: 8, platform: 'shipinhao', name: '视频号-9:16', width: 1080, height: 1920, unit: 'px', category: 'video', sort: 1, created_at: '2025-01-01' },
    // 跨境
    { id: 9, platform: 'amazon', name: '亚马逊主图-白底2000x2000', width: 2000, height: 2000, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 10, platform: 'temu', name: 'Temu主图-1:1', width: 1000, height: 1000, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 11, platform: 'shein', name: 'Shein主图-3:4', width: 1200, height: 1600, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 12, platform: 'tiktok', name: 'TikTok Shop-9:16', width: 1080, height: 1920, unit: 'px', category: 'video', sort: 1, created_at: '2025-01-01' },
    { id: 13, platform: 'mercado', name: '美客多主图-1:1', width: 1000, height: 1000, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 14, platform: 'ozon', name: 'Ozon主图-1:1', width: 900, height: 900, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 15, platform: 'shopee', name: 'Shopee主图-1:1', width: 800, height: 800, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
    { id: 16, platform: 'lazada', name: 'Lazada主图-1:1', width: 800, height: 800, unit: 'px', category: 'main_image', sort: 1, created_at: '2025-01-01' },
  ],

  user_template: [
    { id: 1, user_id: 1, name: '我的淘宝主图', platform: 'taobao', width: 800, height: 800, unit: 'px', is_public: 0, created_at: t(-20) },
    { id: 2, user_id: 1, name: '抖音竖版视频', platform: 'douyin', width: 1080, height: 1920, unit: 'px', is_public: 0, created_at: t(-18) },
    { id: 3, user_id: 3, name: '亚马逊宽版', platform: 'amazon', width: 2000, height: 2000, unit: 'px', is_public: 0, created_at: t(-5) },
  ],

  // ---- 批量任务模板 ----
  batch_template: [
    { id: 1, user_id: 1, name: '每日上新品', operation: 'main_image', config: JSON.stringify({ platform: 'taobao', style: '简约白底' }), created_at: t(-10) },
    { id: 2, user_id: 1, name: '每周视频', operation: 'img2video', config: JSON.stringify({ duration: 15, ratio: '9:16' }), created_at: t(-8) },
  ],

  // ---- 套餐 ----
  payment_plan: [
    { id: 1, name: '免费试用', plan_type: 0, price: 0, original_price: 0, daily_credits: 20, description: '每日20点，作品保存7天，体验全部功能', features: JSON.stringify(['AI抠图', '白底图', '场景图', '15s短视频', '去水印']) },
    { id: 2, name: '月卡', plan_type: 1, price: 29, original_price: 39, daily_credits: 100, description: '每日100点，作品永久保存，批量50张/次', features: JSON.stringify(['全部图片功能', '15s/30s视频', '批量50张', '作品永久保存', '去水印']) },
    { id: 3, name: '季卡', plan_type: 2, price: 69, original_price: 99, daily_credits: 200, description: '每日200点，批量200张/次，优先处理队列', features: JSON.stringify(['全部图片+视频', '批量200张', '优先队列', '品牌Logo嵌入', '高级场景素材']) },
    { id: 4, name: '年卡', plan_type: 3, price: 199, original_price: 299, daily_credits: 500, description: '全部功能无限制，夜间托管6折，专属客服', features: JSON.stringify(['全部功能', '批量无上限', '夜间托管6折', '动作迁移', '数字人解说', '专属客服']) },
  ],

  // ---- 订单（含真实财务数据） ----
  payment_order: [
    { id: 'ord-001', user_id: 1, plan_type: 2, plan_name: '季卡', amount: 69, paid: 1, paid_at: t(-30), create_time: t(-30) },
    { id: 'ord-002', user_id: 2, plan_type: 1, plan_name: '月卡', amount: 29, paid: 1, paid_at: t(-15), create_time: t(-15) },
    { id: 'ord-003', user_id: 3, plan_type: 3, plan_name: '年卡', amount: 199, paid: 1, paid_at: t(-7), create_time: t(-7) },
    { id: 'ord-004', user_id: 4, plan_type: 1, plan_name: '月卡', amount: 29, paid: 1, paid_at: t(-14), create_time: t(-14) },
    { id: 'ord-005', user_id: 1, plan_type: 3, plan_name: '年卡', amount: 199, paid: 0, paid_at: null, create_time: t(-0.1) },
  ],

  // ---- 短信 ----
  sms_log: [
    { id: 1, phone: '138****5678', template_code: 'sms_register_code', content: '验证码：482917，5分钟内有效', result: 1, provider: 'mock', create_time: t(-30) },
    { id: 2, phone: '139****4321', template_code: 'sms_login_code', content: '验证码：729103，5分钟内有效', result: 1, provider: 'mock', create_time: t(-15) },
    { id: 3, phone: '138****5678', template_code: 'sms_task_complete', content: '【AI电商】您的主图任务已完成，点击查看结果', result: 1, provider: 'mock', create_time: t(-1) },
  ],

  sms_template: [
    { id: 1, code: 'sms_register_code', name: '注册验证码', content: '您的注册验证码：{code}，5分钟内有效', provider_id: '', status: 1, daily_limit: 10 },
    { id: 2, code: 'sms_login_code', name: '登录验证码', content: '您的登录验证码：{code}，5分钟内有效', provider_id: '', status: 1, daily_limit: 20 },
    { id: 3, code: 'sms_reset_password', name: '找回密码', content: '密码重置验证码：{code}，5分钟内有效', provider_id: '', status: 1, daily_limit: 5 },
    { id: 4, code: 'sms_task_complete', name: '任务完成通知', content: '【AI电商】您的{task_type}已完成，点击查看结果', provider_id: '', status: 1, daily_limit: 50 },
    { id: 5, code: 'sms_batch_complete', name: '批量完成通知', content: '【AI电商】批量处理已完成，共{count}件', provider_id: '', status: 1, daily_limit: 50 },
  ],

  email_template: [
    { id: 1, template_code: 'email_register_code', name: '注册验证码', subject: '【AI电商工具箱】注册验证码', content: '<h2>AI电商工具箱</h2><p>您的注册验证码为：<b>{code}</b>，5分钟内有效。</p>', provider_template_id: '', provider: 'mock', status: 1, remark: '注册页面使用' },
    { id: 2, template_code: 'email_login_code', name: '登录验证码', subject: '【AI电商工具箱】登录验证码', content: '<h2>AI电商工具箱</h2><p>您的登录验证码为：<b>{code}</b>，5分钟内有效。</p>', provider_template_id: '', provider: 'mock', status: 1, remark: '邮箱登录页面使用' },
    { id: 3, template_code: 'email_reset_password', name: '找回密码验证码', subject: '【AI电商工具箱】密码重置', content: '<h2>AI电商工具箱</h2><p>您正在重置密码，验证码：<b>{code}</b>，5分钟内有效。</p>', provider_template_id: '', provider: 'mock', status: 1, remark: '找回密码页面使用' },
    { id: 4, template_code: 'email_bind_code', name: '绑定邮箱验证码', subject: '【AI电商工具箱】邮箱绑定验证', content: '<h2>AI电商工具箱</h2><p>您的邮箱绑定验证码为：<b>{code}</b>，5分钟内有效。</p>', provider_template_id: '', provider: 'mock', status: 1, remark: '个人设置绑定邮箱使用' },
    { id: 5, template_code: 'email_task_complete', name: '任务完成通知', subject: '【AI电商工具箱】任务完成通知', content: '<h2>AI电商工具箱</h2><p>您的{task_type}任务已完成！共生成{count}个作品。</p>', provider_template_id: '', provider: 'mock', status: 1, remark: '任务完成自动通知' },
    { id: 6, template_code: 'email_welcome', name: '欢迎邮件', subject: '欢迎加入AI电商工具箱！', content: '<h2>欢迎加入AI电商工具箱</h2><p>免费体验AI抠图/场景/视频生成，开启您的电商AI创作之旅。</p>', provider_template_id: '', provider: 'mock', status: 1, remark: '新用户注册后发送' },
  ],

  // ---- 操作日志（含管理审计） ----
  operation_log: [
    { id: 1, user_id: 1, action: 'user_login', ip: '127.0.0.1', detail: '', create_time: t(-1) },
    { id: 2, user_id: 1, action: 'task_submit', ip: '127.0.0.1', detail: '提交主图任务', create_time: t(-1) },
    { id: 3, user_id: 2, action: 'user_register', ip: '192.168.1.100', detail: '新用户注册', create_time: t(-15) },
    { id: 4, user_id: 1, action: 'batch_submit', ip: '127.0.0.1', detail: '提交批量任务-20张', create_time: t(-3) },
    { id: 5, user_id: 3, action: 'plan_purchase', ip: '10.0.0.5', detail: '购买年卡', create_time: t(-7) },
    { id: 6, user_id: null, action: 'admin_login', ip: '127.0.0.1', detail: '管理员登录', create_time: t(-0.5) },
  ],

  // ---- 内容审核 ----
  content_review: [
    { id: 1, task_id: 't009', user_id: 1, type: 'image', status: 2, reason: '', reviewer_id: null, create_time: t(-5), review_time: t(-4.9) },
    { id: 2, task_id: 't013', user_id: 2, type: 'image', status: 0, reason: '', reviewer_id: null, create_time: t(-1.8), review_time: null },
    { id: 3, task_id: 't020', user_id: 1, type: 'video', status: 0, reason: '', reviewer_id: null, create_time: t(-7), review_time: null },
  ],

  // ---- 营销标签 ----
  marketing_badges: [
    { id: 1, name: '热卖爆款', icon: 'fire', color: '#FF4757', category: 'sales', description: '销量TOP商品专属标签', status: 1, sort_order: 1, create_time: t(-30), update_time: t(-30) },
    { id: 2, name: '新品上市', icon: 'star', color: '#FF6B6B', category: 'sales', description: '上架7天内新品标识', status: 1, sort_order: 2, create_time: t(-30), update_time: t(-30) },
    { id: 3, name: '限时特惠', icon: 'clock', color: '#FFA502', category: 'promotion', description: '限时折扣活动标签', status: 1, sort_order: 3, create_time: t(-25), update_time: t(-25) },
    { id: 4, name: '满减优惠', icon: 'discount', color: '#FF6348', category: 'promotion', description: '满减活动标识', status: 1, sort_order: 4, create_time: t(-25), update_time: t(-25) },
    { id: 5, name: '品质保证', icon: 'shield', color: '#2ED573', category: 'trust', description: '质检通过认证标签', status: 1, sort_order: 5, create_time: t(-20), update_time: t(-20) },
    { id: 6, name: '7天无理由', icon: 'undo', color: '#1E90FF', category: 'trust', description: '七天无理由退换标识', status: 1, sort_order: 6, create_time: t(-20), update_time: t(-20) },
    { id: 7, name: '跨境免税', icon: 'global', color: '#3742FA', category: 'cross_border', description: '跨境免税商品标识', status: 1, sort_order: 7, create_time: t(-15), update_time: t(-15) },
    { id: 8, name: '海外直邮', icon: 'plane', color: '#5352ED', category: 'cross_border', description: '海外直邮发货标识', status: 1, sort_order: 8, create_time: t(-15), update_time: t(-15) },
    { id: 9, name: '买一送一', icon: 'gift', color: '#FF4757', category: 'promotion', description: '买赠活动标签', status: 0, sort_order: 9, create_time: t(-10), update_time: t(-10) },
  ],

  // ---- 滥用记录 ----
  abuse_records: [
    { id: 1, user_id: 1, api_path: '/api/images/generate', ip: '192.168.1.50', user_agent: 'Mozilla/5.0', create_time: t(-0.01) },
    { id: 2, user_id: 1, api_path: '/api/images/generate', ip: '192.168.1.50', user_agent: 'Mozilla/5.0', create_time: t(-0.02) },
    { id: 3, user_id: 1, api_path: '/api/images/generate', ip: '192.168.1.50', user_agent: 'Mozilla/5.0', create_time: t(-0.03) },
    { id: 4, user_id: 5, api_path: '/api/images/generate', ip: '10.0.0.99', user_agent: 'python-requests/2.28', create_time: t(-0.01) },
    { id: 5, user_id: 5, api_path: '/api/images/generate', ip: '10.0.0.99', user_agent: 'python-requests/2.28', create_time: t(-0.02) },
    { id: 6, user_id: 5, api_path: '/api/videos/generate', ip: '10.0.0.99', user_agent: 'python-requests/2.28', create_time: t(-0.03) },
  ],
};

export default MOCK_STORE;
