-- =====================================================
-- Movio AI v4.1  —  m005_seed.sql
-- G6 数据库接口 | 2026-05-08
-- 初始化配置数据: 页面文案/组件文案/业务字典/模板
-- 合计约 250 条
-- =====================================================

-- UP

INSERT INTO config_seed_version (seed_name, version) VALUES ('m005_seed', 1);

-- ==========================================
-- PART 1: 页面文案配置组 — page.*
-- ==========================================

INSERT INTO sys_config_group (group_key, group_name, parent_key, sort_order) VALUES
('page.auth',       '认证页面',         '', 1),
('page.auth.login', '登录页',           'page.auth', 1),
('page.auth.register', '注册页',        'page.auth', 2),
('page.auth.reset', '密码重置页',       'page.auth', 3),
('page.home',       '首页工作台',       '', 2),
('page.home.hero',  'Hero区域',         'page.home', 1),
('page.home.nav',   '快捷入口',         'page.home', 2),
('page.home.dashboard', '用量概览',     'page.home', 3),
('page.video',      '视频创作页',       '', 3),
('page.video.header','视频页头部',      'page.video', 1),
('page.image',      '图片创作页',       '', 4),
('page.image.header','图片页头部',      'page.image', 1),
('page.detail',     '详情图创作页',     '', 5),
('page.detail.header','详情图页头部',   'page.detail', 1),
('page.error',      '错误页面',         '', 6),
('page.error.403',  '403页面',          'page.error', 1),
('page.error.404',  '404页面',          'page.error', 2);

-- --------------------------------------------------
-- page.auth.login
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.auth.login', 'page_title',      'text', '登录 Movio AI', '登录 Movio AI', '页面标题', 1),
('page.auth.login', 'subtitle',        'text', '欢迎回来，继续您的AI创作之旅', '欢迎回来，继续您的AI创作之旅', '副标题', 2),
('page.auth.login', 'phone_label',     'text', '手机号', '手机号', '手机号输入框标签', 3),
('page.auth.login', 'phone_placeholder','text','请输入手机号', '请输入手机号', '', 4),
('page.auth.login', 'password_label',  'text', '密码', '密码', '密码输入框标签', 5),
('page.auth.login', 'password_placeholder','text','请输入密码', '请输入密码', '', 6),
('page.auth.login', 'remember_me',     'text', '记住我', '记住我', '', 7),
('page.auth.login', 'forgot_password', 'text', '忘记密码？', '忘记密码？', '', 8),
('page.auth.login', 'btn_login',       'text', '登录', '登录', '登录按钮', 9),
('page.auth.login', 'btn_register',    'text', '还没有账号？立即注册', '还没有账号？立即注册', '', 10);

-- --------------------------------------------------
-- page.auth.register
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.auth.register', 'page_title',   'text', '注册 Movio AI', '注册 Movio AI', '', 1),
('page.auth.register', 'subtitle',     'text', '开启您的AI电商创作之旅', '开启您的AI电商创作之旅', '', 2),
('page.auth.register', 'phone_label',  'text', '手机号', '手机号', '', 3),
('page.auth.register', 'email_label',  'text', '邮箱', '邮箱', '', 4),
('page.auth.register', 'password_label','text','密码', '密码', '', 5),
('page.auth.register', 'password_hint','text', '8-20位，含字母+数字+特殊字符', '8-20位，含字母+数字+特殊字符', '', 6),
('page.auth.register', 'invite_label', 'text', '邀请码（选填）', '邀请码（选填）', '', 7),
('page.auth.register', 'agreement',    'text', '注册即表示同意《用户协议》和《隐私政策》', '注册即表示同意《用户协议》和《隐私政策》', '', 8),
('page.auth.register', 'btn_submit',   'text', '注册', '注册', '', 9),
('page.auth.register', 'btn_to_login', 'text', '已有账号？去登录', '已有账号？去登录', '', 10);

-- --------------------------------------------------
-- page.home.hero (工作台)
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.home.hero', 'title',            'text', 'Movio AI 电商智能体助手', 'Movio AI 电商智能体助手', '', 1),
('page.home.hero', 'subtitle',         'text', 'AI图片处理 · AI短视频创作 · 长视频智能剪辑 · AI数字人', 'AI图片处理 · AI短视频创作 · 长视频智能剪辑 · AI数字人', '', 2),
('page.home.hero', 'slogan',           'text', '一键生成电商素材，让AI为你工作', '一键生成电商素材，让AI为你工作', '', 3),
('page.home.hero', 'btn_start',        'text', '开始创作', '开始创作', '', 4),
('page.home.hero', 'btn_video',        'text', '视频创作', '视频创作', '', 5),
('page.home.hero', 'btn_image',        'text', '图片创作', '图片创作', '', 6),
('page.home.hero', 'btn_detail',       'text', '详情图创作', '详情图创作', '', 7),
('page.home.hero', 'upload_cta',       'text', '拖拽或点击上传素材', '拖拽或点击上传素材', '', 8);

-- --------------------------------------------------
-- page.home.dashboard (用量概览)
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.home.dashboard', 'title',            'text', '用量概览', '用量概览', '', 1),
('page.home.dashboard', 'points_label',     'text', '剩余积分', '剩余积分', '', 2),
('page.home.dashboard', 'tasks_today',      'text', '今日任务', '今日任务', '', 3),
('page.home.dashboard', 'completed_label',  'text', '已完成', '已完成', '', 4),
('page.home.dashboard', 'empty_state',      'text', '暂无创作记录，快去试试吧', '暂无创作记录，快去试试吧', '', 5),
('page.home.dashboard', 'recent_works',     'text', '最近作品', '最近作品', '', 6);

-- --------------------------------------------------
-- page.video.header
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.video.header', 'title',              'text', 'AI 视频创作中心', 'AI 视频创作中心', '', 1),
('page.video.header', 'subtitle',           'text', '智能生成短视频 · 动作迁移 · 爆款复刻 · 一键成片', '智能生成短视频 · 动作迁移 · 爆款复刻 · 一键成片', '', 2),
('page.video.header', 'tab_generate',       'text', '视频生成', '视频生成', '', 3),
('page.video.header', 'tab_action_migrate', 'text', '动作迁移', '动作迁移', '', 4),
('page.video.header', 'tab_viral',          'text', '爆款分析', '爆款分析', '', 5),
('page.video.header', 'tab_live_clip',      'text', '长视频精剪', '长视频精剪', '', 6),
('page.video.header', 'tab_digital_human',  'text', '数字人', '数字人', '', 7);

-- --------------------------------------------------
-- page.image.header
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.image.header', 'title',            'text', 'AI 图片创作中心', 'AI 图片创作中心', '', 1),
('page.image.header', 'subtitle',         'text', '智能生成商品主图 · 批量处理 · 一键复刻', '智能生成商品主图 · 批量处理 · 一键复刻', '', 2),
('page.image.header', 'tab_generate',     'text', '图像生成', '图像生成', '', 3),
('page.image.header', 'tab_batch',        'text', '批量处理', '批量处理', '', 4),
('page.image.header', 'tab_replicate',    'text', '主图复刻', '主图复刻', '', 5);

-- --------------------------------------------------
-- page.detail.header
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.detail.header', 'title',         'text', 'AI 详情图创作中心', 'AI 详情图创作中心', '', 1),
('page.detail.header', 'subtitle',      'text', '套图一键生成 · 详情图复刻 · 智能排版', '套图一键生成 · 详情图复刻 · 智能排版', '', 2);

-- --------------------------------------------------
-- page.error.403 / 404
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.error.403', 'title',   'text', '403 - 无访问权限', '403 - 无访问权限', '', 1),
('page.error.403', 'message', 'text', '抱歉，您没有权限访问此页面', '抱歉，您没有权限访问此页面', '', 2),
('page.error.403', 'btn_back', 'text', '返回首页', '返回首页', '', 3),
('page.error.404', 'title',   'text', '404 - 页面不存在', '404 - 页面不存在', '', 1),
('page.error.404', 'message', 'text', '抱歉，您访问的页面不存在', '抱歉，您访问的页面不存在', '', 2),
('page.error.404', 'btn_back', 'text', '返回首页', '返回首页', '', 3);

-- ==========================================
-- PART 2: 组件文案配置组 — comp.*
-- ==========================================

INSERT INTO sys_config_group (group_key, group_name, parent_key, sort_order) VALUES
('comp.upload',    '上传组件',      '', 10),
('comp.task',      '任务进度组件',  '', 11),
('comp.distrib',   '多平台分发',    '', 12),
('comp.adapt',     '多平台适配预览','', 13),
('comp.prompt',    '提示词增强',    '', 14),
('comp.empty',     '空状态',        '', 15);

-- --------------------------------------------------
-- comp.upload
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('comp.upload', 'btn_select',     'text', '选择文件', '选择文件', '', 1),
('comp.upload', 'btn_upload',     'text', '开始上传', '开始上传', '', 2),
('comp.upload', 'drag_hint',      'text', '拖拽文件到此处或点击选择', '拖拽文件到此处或点击选择', '', 3),
('comp.upload', 'max_size_hint',  'text', '单个文件最大 {size}MB', '单个文件最大 {size}MB', '', 4),
('comp.upload', 'accept_hint',    'text', '支持 {accept} 格式', '支持 {accept} 格式', '', 5),
('comp.upload', 'uploading',      'text', '上传中...', '上传中...', '', 6),
('comp.upload', 'upload_success', 'text', '上传成功', '上传成功', '', 7),
('comp.upload', 'upload_error',   'text', '上传失败，请重试', '上传失败，请重试', '', 8),
('comp.upload', 'resume_hint',    'text', '检测到未完成的上传，是否继续？', '检测到未完成的上传，是否继续？', '', 9);

-- --------------------------------------------------
-- comp.task
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('comp.task', 'status_queued',    'text', '排队中，前方 {n} 个任务', '排队中，前方 {n} 个任务', '', 1),
('comp.task', 'status_processing','text', '处理中...', '处理中...', '', 2),
('comp.task', 'status_completed', 'text', '处理完成', '处理完成', '', 3),
('comp.task', 'status_failed',    'text', '处理失败', '处理失败', '', 4),
('comp.task', 'btn_retry',        'text', '重试', '重试', '', 5),
('comp.task', 'btn_download',     'text', '下载', '下载', '', 6),
('comp.task', 'remaining_time',   'text', '预计剩余 {time}', '预计剩余 {time}', '', 7),
('comp.task', 'submit_lock_hint', 'text', '任务进行中，请等待完成后再提交', '任务进行中，请等待完成后再提交', '', 8);

-- --------------------------------------------------
-- comp.distrib / comp.adapt / comp.prompt / comp.empty
-- --------------------------------------------------
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('comp.distrib', 'btn_publish',     'text', '一键分发', '一键分发', '', 1),
('comp.distrib', 'select_platform', 'text', '选择分发平台', '选择分发平台', '', 2),
('comp.distrib', 'publishing',      'text', '分发中...', '分发中...', '', 3),
('comp.distrib', 'publish_success', 'text', '分发成功', '分发成功', '', 4),
('comp.adapt',   'preview',         'text', '平台预览', '平台预览', '', 1),
('comp.adapt',   'auto_crop',       'text', '自动裁剪适配', '自动裁剪适配', '', 2),
('comp.prompt',  'btn_enhance',     'text', 'AI 优化提示词', 'AI 优化提示词', '', 1),
('comp.prompt',  'enhancing',       'text', '优化中...', '优化中...', '', 2),
('comp.prompt',  'placeholder',     'text', '描述您想要的画面效果...', '描述您想要的画面效果...', '', 3),
('comp.empty',   'no_data',         'text', '暂无数据', '暂无数据', '', 1),
('comp.empty',   'no_result',       'text', '暂无结果', '暂无结果', '', 2),
('comp.empty',   'no_work',         'text', '暂无作品，快去创作吧', '暂无作品，快去创作吧', '', 3);

-- ==========================================
-- PART 3: 导航菜单配置组 — nav.*
-- ==========================================

INSERT INTO sys_config_group (group_key, group_name, parent_key, sort_order) VALUES
('nav.sidebar',     '侧边导航',     '', 20),
('nav.topbar',      '顶部栏',       '', 21),
('nav.breadcrumb',  '面包屑',       '', 22);

INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('nav.sidebar', 'label_home',           'text', '工作台',    '工作台',    '', 1),
('nav.sidebar', 'label_video',          'text', '视频创作',  '视频创作',  '', 2),
('nav.sidebar', 'label_image',          'text', '图片创作',  '图片创作',  '', 3),
('nav.sidebar', 'label_detail',         'text', '详情图',    '详情图',    '', 4),
('nav.sidebar', 'label_assets',         'text', '素材库',    '素材库',    '', 5),
('nav.sidebar', 'label_distribution',   'text', '分发管理',  '分发管理',  '', 6),
('nav.sidebar', 'label_member',         'text', '会员中心',  '会员中心',  '', 7),
('nav.sidebar', 'label_admin',          'text', '管理后台',  '管理后台',  '', 8),
('nav.sidebar', 'label_config',         'text', '配置中心',  '配置中心',  '', 9),
('nav.topbar',  'label_logout',         'text', '退出登录',  '退出登录',  '', 1),
('nav.topbar',  'label_profile',        'text', '个人设置',  '个人设置',  '', 2),
('nav.topbar',  'label_points',         'text', '积分: ',    '积分: ',    '', 3);

-- ==========================================
-- PART 4: 系统参数配置组 — sys.*
-- ==========================================

INSERT INTO sys_config_group (group_key, group_name, parent_key, sort_order) VALUES
('sys.upload',      '上传限制',       '', 30),
('sys.rate_limit',  '接口限流',       '', 31),
('sys.model',       '模型配置',       '', 32),
('sys.theme',       '主题配置',       '', 33),
('sys.platform',    '平台配置',       '', 34);

INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('sys.upload',    'max_size_mb',         'number', '500',  '500',  '文件上传上限(MB)', 1),
('sys.upload',    'chunk_size_mb',       'number', '5',    '5',    '分片大小(MB)', 2),
('sys.upload',    'max_concurrent_chunks','number','3',    '3',    '并发分片数', 3),
('sys.upload',    'allowed_image_types', 'text',   'jpg,png,webp,jpeg', 'jpg,png,webp,jpeg', '支持图片格式', 4),
('sys.upload',    'allowed_video_types', 'text',   'mp4,mov,avi,webm',  'mp4,mov,avi,webm',  '支持视频格式', 5),
('sys.rate_limit','free_user_per_min',   'number', '60',   '60',   '免费用户每分钟请求上限', 1),
('sys.rate_limit','paid_user_per_min',   'number', '300',  '300',  '付费用户每分钟请求上限', 2),
('sys.rate_limit','global_per_min',      'number', '6000', '6000', '全局每分钟请求上限', 3),
('sys.theme',     'primary_color',       'color',  '#4F46E5', '#4F46E5', '主题色', 1),
('sys.theme',     'success_color',       'color',  '#10B981', '#10B981', '成功色', 2),
('sys.theme',     'warning_color',       'color',  '#F59E0B', '#F59E0B', '警告色', 3),
('sys.theme',     'error_color',         'color',  '#EF4444', '#EF4444', '错误色', 4),
('sys.theme',     'font_size_base',      'number', '14',   '14',   '基础字号(px)', 5),
('sys.theme',     'border_radius',       'number', '8',    '8',    '圆角(px)', 6),
('sys.model',     'default_mode',        'text',   'mixed','mixed','默认调度模式: single/mixed/custom', 1),
('sys.model',     'health_check_interval','number','30',   '30',   '健康检查间隔(秒)', 2),
('sys.model',     'circuit_breaker_threshold','number','5','5',    '熔断阈值(连续失败次数)', 3),
('sys.model',     'circuit_cooldown_sec',    'number','60','60',   '熔断冷却时间(秒)', 4),
('sys.model',     'max_retries',             'number','3', '3',    '最大重试次数', 5),
('sys.model',     'request_timeout_sec',     'number','120','120', '请求超时(秒)', 6);

-- ==========================================
-- PART 5: 业务配置 — biz.*
-- ==========================================

INSERT INTO sys_config_group (group_key, group_name, parent_key, sort_order) VALUES
('biz.member',      '会员配置',       '', 40),
('biz.points',      '积分配置',       '', 41),
('biz.distrib',     '分销配置',       '', 42),
('biz.free_trial',  '免费试用配置',   '', 43);

INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
-- 会员
('biz.member', 'plan_free_name',      'text',   '免费版',     '免费版',     '', 1),
('biz.member', 'plan_basic_name',     'text',   '基础会员',   '基础会员',   '', 2),
('biz.member', 'plan_pro_name',       'text',   '高级会员',   '高级会员',   '', 3),
('biz.member', 'plan_basic_price',    'number', '29',         '29',         '月费(元)', 4),
('biz.member', 'plan_pro_price',      'number', '99',         '99',         '月费(元)', 5),
('biz.member', 'plan_basic_points',   'number', '300',        '300',        '每月赠送积分', 6),
('biz.member', 'plan_pro_points',     'number', '1200',       '1200',       '每月赠送积分', 7),
-- 积分
('biz.points',  'recharge_options',   'json',   '[{"points":100,"price":10},{"points":500,"price":45},{"points":1000,"price":80}]', '[{"points":100,"price":10},{"points":500,"price":45},{"points":1000,"price":80}]', '充值选项JSON', 1),
('biz.points',  'cost_image_gen',     'number', '1',          '1',          '生图消耗积分', 2),
('biz.points',  'cost_video_gen',     'number', '3',          '3',          '视频生成消耗积分', 3),
('biz.points',  'cost_action_migrate','number', '5',          '5',          '动作迁移消耗积分', 4),
('biz.points',  'cost_digital_human', 'number', '8',          '8',          '数字人消耗积分', 5),
-- 分销
('biz.distrib', 'commission_rate_l1', 'number', '20',         '20',         '一级返利比例(%)', 1),
('biz.distrib', 'commission_rate_l2', 'number', '10',         '10',         '二级返利比例(%)', 2),
('biz.distrib', 'min_withdraw',       'number', '50',         '50',         '最低提现金额(元)', 3),
-- 免费试用
('biz.free_trial','free_points',      'number', '50',         '50',         '注册赠送积分', 1),
('biz.free_trial','trial_video_count','number', '3',          '3',          '免费试用视频次数', 2),
('biz.free_trial','trial_image_count','number', '10',         '10',         '免费试用图片次数', 3);

-- ==========================================
-- PART 6: 业务字典 — dict.*
-- ==========================================

INSERT INTO sys_dict_group (dict_key, dict_name, parent_key, sort_order) VALUES
('video_duration',     '视频时长',       '', 1),
('video_ratio',        '视频比例',       '', 2),
('image_ratio',        '图片比例',       '', 3),
('image_style',        '图片风格',       '', 4),
('detail_template',    '详情图模板',     '', 5),
('member_level',       '会员等级',       '', 6),
('task_status',        '任务状态',       '', 7),
('platform_list',      '分发平台',       '', 8),
('platform_ratio',     '平台画幅比例',   '', 9),
('clip_style',         '剪辑风格',       '', 10),
('digital_human_style','数字人风格',     '', 11),
('language',           '语种选择',       '', 12),
('audit_action',       '审核动作',       '', 13),
('model_type',         '模型类型',       '', 14),
('distrib_level',      '分销等级',       '', 15),
('user_status',        '用户状态',       '', 16),
('config_type',        '配置项类型',     '', 17),
('template_type',      '模板类型',       '', 18),
('notification_type',  '消息通知类型',   '', 19),
('log_action',         '操作日志类型',   '', 20);

-- --------------------------------------------------
-- video_duration
-- --------------------------------------------------
INSERT INTO sys_dict_item (dict_key, item_key, item_value, item_extra, sort_order) VALUES
('video_duration', '15s', '15秒',  '{"seconds":15}',  1),
('video_duration', '30s', '30秒',  '{"seconds":30}',  2),
('video_duration', '60s', '60秒',  '{"seconds":60}',  3),
('video_duration', '3min','3分钟', '{"seconds":180}', 4),
('video_duration', '5min','5分钟', '{"seconds":300}', 5);

-- --------------------------------------------------
-- video_ratio / image_ratio / image_style
-- --------------------------------------------------
INSERT INTO sys_dict_item (dict_key, item_key, item_value, item_extra, sort_order) VALUES
('video_ratio', '9:16',   '9:16 (抖音/快手)',  '{"w":1080,"h":1920}', 1),
('video_ratio', '16:9',   '16:9 (B站/YouTube)','{"w":1920,"h":1080}', 2),
('video_ratio', '1:1',    '1:1 (微信)',        '{"w":1080,"h":1080}', 3),
('video_ratio', '4:5',    '4:5 (淘宝)',        '{"w":1080,"h":1350}', 4),
('image_ratio', '1:1',    '1:1 正方形',        '{"w":800,"h":800}',   1),
('image_ratio', '3:4',    '3:4 竖版',          '{"w":750,"h":1000}',  2),
('image_ratio', '4:3',    '4:3 横版',          '{"w":1000,"h":750}',  3),
('image_ratio', '16:9',   '16:9 宽屏',         '{"w":1920,"h":1080}', 4),
('image_style', 'realistic','写实风格',         '{}', 1),
('image_style', 'model',    '模特场景',         '{}', 2),
('image_style', 'flatlay',  '平铺摆放',         '{}', 3),
('image_style', 'white_bg', '白底图',           '{}', 4),
('image_style', 'creative', '创意场景',         '{}', 5);

-- --------------------------------------------------
-- task_status / platform_list / member_level / model_type
-- --------------------------------------------------
INSERT INTO sys_dict_item (dict_key, item_key, item_value, item_extra, sort_order) VALUES
('task_status', 'queued',     '排队中',   '{"color":"#9CA3AF"}', 1),
('task_status', 'processing', '处理中',   '{"color":"#3B82F6"}', 2),
('task_status', 'completed',  '已完成',   '{"color":"#10B981"}', 3),
('task_status', 'failed',     '失败',     '{"color":"#EF4444"}', 4),
('task_status', 'cancelled',  '已取消',   '{"color":"#6B7280"}', 5),
('platform_list', 'douyin',   '抖音',     '{"ratio":"9:16","format":"mp4"}',  1),
('platform_list', 'taobao',   '淘宝',     '{"ratio":"1:1","format":"jpg"}',   2),
('platform_list', 'kuaishou', '快手',     '{"ratio":"9:16","format":"mp4"}',  3),
('platform_list', 'bilibili', 'B站',      '{"ratio":"16:9","format":"mp4"}',  4),
('platform_list', 'xiaohongshu','小红书', '{"ratio":"3:4","format":"jpg"}',   5),
('platform_list', 'wechat',   '微信视频号','{"ratio":"9:16","format":"mp4"}', 6),
('platform_list', 'tiktok',   'TikTok',   '{"ratio":"9:16","format":"mp4"}',  7),
('platform_list', 'shopee',   'Shopee',   '{"ratio":"1:1","format":"jpg"}',   8),
('member_level',  'free',     '免费用户', '{}', 1),
('member_level',  'basic',    '基础会员', '{}', 2),
('member_level',  'pro',      '高级会员', '{}', 3),
('model_type',    'seedance', 'Seedance (视频)',   '{"category":"video"}',  1),
('model_type',    'tongyi',   '通义万象 (图片)',   '{"category":"image"}',  2),
('model_type',    'qwen',     '千问 (文本)',       '{"category":"text"}',   3),
('model_type',    'custom',   '自定义模型',        '{"category":"custom"}', 4);

-- --------------------------------------------------
-- language / digital_human_style / clip_style / user_status
-- --------------------------------------------------
INSERT INTO sys_dict_item (dict_key, item_key, item_value, item_extra, sort_order) VALUES
('language', 'zh', '中文', '{}', 1),
('language', 'en', 'English', '{}', 2),
('language', 'ja', '日本語', '{}', 3),
('language', 'ko', '한국어', '{}', 4),
('language', 'ar', 'العربية', '{}', 5),
('language', 'th', 'ไทย', '{}', 6),
('language', 'vi', 'Tiếng Việt', '{}', 7),
('digital_human_style','realistic','真人风格','{}',1),
('digital_human_style','cartoon',  '卡通风格','{}',2),
('digital_human_style','anime',    '二次元',  '{}',3),
('clip_style',  'fast',    '快节奏', '{}', 1),
('clip_style',  'smooth',  '流畅叙事','{}', 2),
('clip_style',  'vlog',    'Vlog风', '{}', 3),
('clip_style',  'drama',   '剧情风', '{}', 4),
('user_status', 'active',  '正常',   '{}', 1),
('user_status', 'disabled','禁用',   '{}', 2),
('user_status', 'deleted', '已删除', '{}', 3);

-- --------------------------------------------------
-- detail_template / distrib_level / audit_action / config_type / template_type / log_action
-- --------------------------------------------------
INSERT INTO sys_dict_item (dict_key, item_key, item_value, item_extra, sort_order) VALUES
('detail_template','standard','标准详情页','{"pages":5}',  1),
('detail_template','fashion', '时尚风格',  '{"pages":5}',  2),
('detail_template','minimal', '极简风格',  '{"pages":5}',  3),
('distrib_level', 'l1', '一级推广员', '{"rate":20}', 1),
('distrib_level', 'l2', '二级推广员', '{"rate":10}', 2),
('audit_action', 'pass',  '通过', '{}', 1),
('audit_action', 'warn',  '警告', '{}', 2),
('audit_action', 'block', '拦截', '{}', 3),
('config_type',  'text','文本','{}', 1),
('config_type',  'textarea','长文本','{}',2),
('config_type',  'number','数字','{}',3),
('config_type',  'boolean','开关','{}',4),
('config_type',  'json','JSON','{}',5),
('config_type',  'image','图片','{}',6),
('config_type',  'color','颜色','{}',7),
('config_type',  'url','链接','{}',8),
('template_type','prompt','提示词模板','{}',1),
('template_type','message','消息模板','{}',2),
('template_type','email','邮件模板','{}',3),
('template_type','page','页面模板','{}',4),
('log_action','login','登录','{}',1),
('log_action','create','创建','{}',2),
('log_action','update','修改','{}',3),
('log_action','delete','删除','{}',4),
('log_action','audit','审核','{}',5),
('log_action','pay','支付','{}',6);

-- ==========================================
-- PART 7: 模板 — tpl.*
-- ==========================================
INSERT INTO sys_config_group (group_key, group_name, parent_key, sort_order) VALUES
('tpl.prompt', '提示词模板', '', 50);

INSERT INTO sys_template (template_key, template_name, template_type, template_content, variables, sort_order) VALUES
('tpl.prompt.image_optimize', '图片提示词优化',
 'prompt',
 '你是一位专业的电商视觉设计师。请根据用户的描述，优化以下图片生成提示词，使其更加详细和专业。要求：1)明确商品主体 2)描述拍摄角度和构图 3)指定光线和氛围 4)给出风格建议。\n\n原始描述：{{user_input}}',
 '[{"name":"user_input","label":"用户描述","type":"text","required":true}]', 1),

('tpl.prompt.video_optimize', '视频提示词优化',
 'prompt',
 '你是一位短视频创作专家。请优化以下视频提示词，考虑：1)视频节奏和转场 2)BGM风格匹配 3)字幕样式建议 4)开头3秒吸引力。\n\n原始描述：{{user_input}}',
 '[{"name":"user_input","label":"用户描述","type":"text","required":true}]', 2),

('tpl.prompt.detail_optimize', '详情图提示词优化',
 'prompt',
 '你是一位电商详情页设计师。请优化以下详情图提示词，关注：1)产品卖点可视化 2)规格参数展示 3)使用场景展示 4)对比效果。\n\n原始描述：{{user_input}}',
 '[{"name":"user_input","label":"用户描述","type":"text","required":true}]', 3),

('tpl.prompt.poster_optimize', '海报提示词优化',
 'prompt',
 '你是一位营销海报设计师。请优化以下海报提示词，关注：1)视觉冲击力 2)文案层次 3)行动号召 4)品牌调性。\n\n原始描述：{{user_input}}',
 '[{"name":"user_input","label":"用户描述","type":"text","required":true}]', 4),

('tpl.prompt.social_optimize', '社媒图文提示词优化',
 'prompt',
 '你是一位社交媒体运营专家。请优化以下社媒封面提示词，关注：1)平台调性匹配 2)吸引点击 3)文字排版 4)色彩搭配。\n\n原始描述：{{user_input}}',
 '[{"name":"user_input","label":"用户描述","type":"text","required":true}]', 5),

('tpl.message.welcome', '新用户欢迎消息',
 'message',
 '欢迎加入 Movio AI！您已获得 {{free_points}} 点免费积分，可免费生成 {{trial_image_count}} 张图片和 {{trial_video_count}} 个视频。快去体验吧！',
 '[{"name":"free_points","label":"赠送积分","type":"number","required":true},{"name":"trial_image_count","label":"试用图片数","type":"number","required":true},{"name":"trial_video_count","label":"试用视频数","type":"number","required":true}]', 6),

('tpl.message.commission', '分销佣金到账通知',
 'message',
 '恭喜！您的推广用户 {{user_nickname}} 完成了消费，您获得 {{amount}} 元佣金，已计入您的推广收益账户。',
 '[{"name":"user_nickname","label":"消费用户昵称","type":"text","required":true},{"name":"amount","label":"佣金金额","type":"number","required":true}]', 7);

-- ==========================================
-- PART 8: 补充页面文案配置组 — page.* (v4.1 新增页面)
-- ==========================================

INSERT INTO sys_config_group (group_key, group_name, parent_key, sort_order) VALUES
('page.action_migrate',        '动作迁移页',         '', 7),
('page.action_migrate.header', '动作迁移页头部',     'page.action_migrate', 1),
('page.digital_human',         '数字人页',           '', 8),
('page.digital_human.header',  '数字人页头部',       'page.digital_human', 1),
('page.distribution',          '分销中心页',         '', 9),
('page.distribution.header',   '分销中心页头部',     'page.distribution', 1),
('page.points',                '积分中心页',         '', 10),
('page.points.header',         '积分中心页头部',     'page.points', 1),
('page.video_edit',            '长视频精剪页',       '', 11),
('page.video_edit.header',     '长视频精剪页头部',   'page.video_edit', 1),
('page.viral_replicate',       '爆款视频复刻页',     '', 12),
('page.viral_replicate.header','爆款视频复刻页头部', 'page.viral_replicate', 1);

-- page.action_migrate.header
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.action_migrate.header', 'title',    'text', 'AI 动作迁移',            'AI 动作迁移',            '', 1),
('page.action_migrate.header', 'subtitle', 'text', '将动作视频的舞蹈/姿态迁移到您的产品模特上 — 全球独家', '将动作视频的舞蹈/姿态迁移到您的产品模特上 — 全球独家', '', 2);

-- page.digital_human.header
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.digital_human.header', 'title',    'text', 'AI 数字人口播',        'AI 数字人口播',        '', 1),
('page.digital_human.header', 'subtitle', 'text', '文本/音频驱动 — 选择形象+语音+背景 — 一键生成口播视频', '文本/音频驱动 — 选择形象+语音+背景 — 一键生成口播视频', '', 2);

-- page.distribution.header
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.distribution.header', 'title',    'text', '分销中心',            '分销中心',            '', 1),
('page.distribution.header', 'subtitle', 'text', '邀请好友使用Movio AI — 赚取推广佣金', '邀请好友使用Movio AI — 赚取推广佣金', '', 2);

-- page.points.header
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.points.header', 'title',    'text', '积分中心',                  '积分中心',                  '', 1),
('page.points.header', 'subtitle', 'text', '完成任务赚积分 · 兑换点数 · 解锁更多功能', '完成任务赚积分 · 兑换点数 · 解锁更多功能', '', 2);

-- page.video_edit.header
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.video_edit.header', 'title',    'text', 'AI 长视频精剪',          'AI 长视频精剪',          '', 1),
('page.video_edit.header', 'subtitle', 'text', '智能识别高光片段 · 自动去冗余 · 杂音优化 · 字幕校对', '智能识别高光片段 · 自动去冗余 · 杂音优化 · 字幕校对', '', 2);

-- page.viral_replicate.header
INSERT INTO sys_config_item (group_key, item_key, item_type, item_value, default_val, placeholder, sort_order) VALUES
('page.viral_replicate.header', 'title',    'text', '爆款视频复刻',      '爆款视频复刻',      '', 1),
('page.viral_replicate.header', 'subtitle', 'text', '分析爆款视频 → 提取节奏/转场/文案 → 应用到你的产品', '分析爆款视频 → 提取节奏/转场/文案 → 应用到你的产品', '', 2);

-- DOWN

DELETE FROM config_seed_version WHERE seed_name = 'm005_seed';
DELETE FROM sys_template WHERE template_key LIKE 'tpl.%';
DELETE FROM sys_config_item WHERE group_key LIKE 'page.%' OR group_key LIKE 'comp.%' OR group_key LIKE 'nav.%' OR group_key LIKE 'sys.%' OR group_key LIKE 'biz.%';
DELETE FROM sys_config_group WHERE group_key LIKE 'page.%' OR group_key LIKE 'comp.%' OR group_key LIKE 'nav.%' OR group_key LIKE 'sys.%' OR group_key LIKE 'biz.%' OR group_key LIKE 'tpl.%';
DELETE FROM sys_dict_item WHERE dict_key IN ('video_duration','video_ratio','image_ratio','image_style','detail_template','member_level','task_status','platform_list','platform_ratio','clip_style','digital_human_style','language','audit_action','model_type','distrib_level','user_status','config_type','template_type','notification_type','log_action');
DELETE FROM sys_dict_group WHERE dict_key IN ('video_duration','video_ratio','image_ratio','image_style','detail_template','member_level','task_status','platform_list','platform_ratio','clip_style','digital_human_style','language','audit_action','model_type','distrib_level','user_status','config_type','template_type','notification_type','log_action');
