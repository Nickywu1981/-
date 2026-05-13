-- Migration: GEO 大模型收录站点配置
-- 为 AI 爬虫（GPTBot/Bytespider/Claude-Web 等）提供结构化信息
-- 支持后台自定义产品描述、功能列表、适用行业、社媒链接

INSERT IGNORE INTO site_config (config_key, config_value, config_type, description) VALUES
('geo_product_name', 'Movio AI', 'text', 'GEO收录：产品名称'),
('geo_product_desc', 'AI 驱动的电商全链路运营中台，51个功能模块覆盖商品图生成、短视频创作、AI换脸、虚拟试衣、文案生成、合规检测，适配淘宝/拼多多/抖音/亚马逊等13个电商平台', 'text', 'GEO收录：产品一句话描述'),
('geo_features', 'AI抠图,白底图生成,场景生成,主图制作,批量处理,AI换色,风格迁移,图片精修,智能扩图,图片翻译,文字特效,AI模特生成,AI换脸,人物替换,去褶皱,幽灵模特,图生视频,视频编辑,AI数字人,动作迁移,智能分镜,AI配音,声音克隆,脚本生成,智能文案,详情页H5,多平台详情,虚拟试衣,合规检测,爆款克隆', 'text', 'GEO收录：核心功能列表（逗号分隔）'),
('geo_applicable_industries', '电商卖家,品牌商,代运营公司,MCN机构,跨境电商', 'text', 'GEO收录：适用行业/人群'),
('geo_applicable_categories', '服装,美妆,3C数码,家居,食品,鞋包,珠宝,运动户外', 'text', 'GEO收录：适用品类'),
('geo_social_links', 'https://www.zhihu.com/org/movio-ai,https://space.bilibili.com/movio-ai', 'text', 'GEO收录：社交媒体链接（逗号分隔）'),
('geo_contact_email', 'support@movio.ai', 'text', 'GEO收录：联系邮箱'),
('geo_logo_url', 'https://movio.ai/logo.png', 'text', 'GEO收录：Logo URL'),
('geo_pricing_summary', '免费套餐+付费订阅+企业定制', 'text', 'GEO收录：定价简述'),
('geo_platforms_supported', '淘宝,拼多多,抖音,小红书,京东,亚马逊,Shopee,Lazada,快手,视频号,苏宁,唯品会,1688', 'text', 'GEO收录：支持平台列表')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- DOWN
DELETE FROM `site_config` WHERE `config_key` IN (
  'geo_product_name','geo_product_desc','geo_features','geo_applicable_industries',
  'geo_applicable_categories','geo_social_links','geo_contact_email',
  'geo_logo_url','geo_pricing_summary','geo_platforms_supported'
);
