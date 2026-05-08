-- seed_c1_diy_templates.sql
-- 20 个行业 DIY 页面模板，覆盖移动端/PC端，运营人员开箱即用

INSERT INTO diy_template (title, industry, page_type, thumbnail, description, tags, mobile_config, pc_config, use_count, is_official, status) VALUES
-- 1-4: 电商商品页
('电商商品详情页', 'ecommerce', 'mobile',
  NULL,
  '适用于淘宝/拼多多/Shopee 等电商平台商品展示页', '电商,商品,详情页',
  '{"sections":[{"type":"banner","props":{"images":[],"autoPlay":true,"height":375}},{"type":"productInfo","props":{"showPrice":true,"showRating":true}},{"type":"featureList","props":{"title":"产品亮点","columns":2}},{"type":"ctaButton","props":{"text":"立即购买","color":"#ff4d4f"}}]}',
  '{"sections":[{"type":"banner","props":{"images":[],"autoPlay":true,"height":500}},{"type":"productInfo","props":{"showPrice":true,"showRating":true,"layout":"horizontal"}},{"type":"specTable","props":{"title":"规格参数"}},{"type":"featureList","props":{"title":"产品亮点","columns":3}},{"type":"ctaButton","props":{"text":"立即购买","color":"#ff4d4f"}}]}',
  0, 1, 1),

('促销活动落地页', 'ecommerce', 'mobile',
  NULL,
  '大促活动、限时秒杀、优惠券发放场景', '电商,促销,秒杀',
  '{"sections":[{"type":"countdownTimer","props":{"endTime":"","title":"限时抢购"}},{"type":"productGrid","props":{"columns":2,"showPrice":true}},{"type":"couponBar","props":{"title":"领券"}},{"type":"ctaButton","props":{"text":"立即抢购","color":"#ff6600"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"超级大促","subtitle":"全场5折起"}},{"type":"countdownTimer","props":{"endTime":"","title":"距离结束"}},{"type":"productGrid","props":{"columns":4,"showPrice":true}},{"type":"couponBar","props":{"title":"领取优惠券"}},{"type":"ctaButton","props":{"text":"立即抢购","color":"#ff6600"}}]}',
  0, 1, 1),

('品牌旗舰店首页', 'ecommerce', 'mobile',
  NULL,
  '品牌官方旗舰店首页，适合天猫/京东/独立站', '品牌,旗舰店,首页',
  '{"sections":[{"type":"brandHeader","props":{"logo":"","brandName":"","slogan":""}},{"type":"navGrid","props":{"items":[]}},{"type":"banner","props":{"images":[],"autoPlay":true,"height":300}},{"type":"productGrid","props":{"columns":2,"title":"热销推荐"}},{"type":"storyBlock","props":{"title":"品牌故事"}}]}',
  '{"sections":[{"type":"brandHeader","props":{"logo":"","brandName":"","slogan":""}},{"type":"navTabs","props":{"items":[]}},{"type":"banner","props":{"images":[],"autoPlay":true,"height":500,"effect":"fade"}},{"type":"productGrid","props":{"columns":4,"title":"热销推荐"}},{"type":"videoBlock","props":{"url":"","title":"品牌视频"}},{"type":"storyBlock","props":{"title":"品牌故事"}}]}',
  0, 1, 1),

('新品发布会邀请页', 'ecommerce', 'mobile',
  NULL,
  '新品发布会、预约报名、悬念营销场景', '新品,发布会,预约',
  '{"sections":[{"type":"heroBanner","props":{"title":"新品发布","subtitle":"敬请期待","bgColor":"#000"}},{"type":"countdownTimer","props":{"endTime":"","title":"发布会倒计时"}},{"type":"features","props":{"items":[],"title":"新品看点"}},{"type":"form","props":{"fields":[{"label":"姓名","type":"text"},{"label":"手机号","type":"phone"}],"submitText":"预约报名"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"新品发布","subtitle":"敬请期待","bgColor":"#000","fullScreen":true}},{"type":"countdownTimer","props":{"endTime":"","title":"发布会倒计时"}},{"type":"featureGrid","props":{"items":[],"title":"新品看点","columns":3}},{"type":"form","props":{"fields":[{"label":"姓名","type":"text"},{"label":"手机号","type":"phone"},{"label":"公司","type":"text"}],"submitText":"预约报名"}},{"type":"mapBlock","props":{"title":"发布会地点"}}]}',
  0, 1, 1),

-- 5-8: 跨境/外贸
('跨境电商产品页', 'cross_border', 'mobile',
  NULL,
  'Amazon/Shopee/Lazada 跨境商品页，多语言+多币种', '跨境,多语言,外贸',
  '{"sections":[{"type":"productInfo","props":{"showPrice":true,"currency":"USD","showRating":true}},{"type":"multilingualSwitch","props":{"languages":["en","es","ar"]}},{"type":"featureList","props":{"title":"Features","columns":2}},{"type":"specTable","props":{"title":"Specifications"}},{"type":"faqBlock","props":{"title":"FAQ"}},{"type":"ctaButton","props":{"text":"Add to Cart","color":"#1890ff"}}]}',
  '{"sections":[{"type":"productInfo","props":{"showPrice":true,"currency":"USD","showRating":true,"layout":"horizontal"}},{"type":"multilingualSwitch","props":{"languages":["en","es","ar","fr","de"]}},{"type":"imageCompare","props":{"title":"Before / After"}},{"type":"featureGrid","props":{"title":"Features","columns":3}},{"type":"specTable","props":{"title":"Specifications"}},{"type":"reviewList","props":{"title":"Customer Reviews"}},{"type":"faqBlock","props":{"title":"FAQ"}}]}',
  0, 1, 1),

('外贸公司介绍页', 'cross_border', 'pc',
  NULL,
  '外贸B2B公司官网，适合Alibaba国际站企业展示', '外贸,企业,官网,B2B',
  '{"sections":[{"type":"heroBanner","props":{"title":"Company Name","subtitle":"Your Trusted Partner","bgImage":""}},{"type":"aboutBlock","props":{"title":"About Us","content":""}},{"type":"statsGrid","props":{"items":[],"title":"Why Choose Us"}},{"type":"productGrid","props":{"columns":4,"title":"Our Products"}},{"type":"contactForm","props":{"title":"Get a Quote","fields":[{"label":"Name","type":"text"},{"label":"Email","type":"email"},{"label":"Message","type":"textarea"}]}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"Company Name","subtitle":"Your Trusted Partner","bgImage":"","fullScreen":true}},{"type":"aboutBlock","props":{"title":"About Us","content":""}},{"type":"statsGrid","props":{"items":[],"title":"Why Choose Us","columns":4}},{"type":"productGrid","props":{"columns":4,"title":"Our Products"}},{"type":"certificateBlock","props":{"title":"Certifications"}},{"type":"teamBlock","props":{"title":"Our Team"}},{"type":"contactForm","props":{"title":"Get a Quote"}},{"type":"mapBlock","props":{"title":"Our Location"}}]}',
  0, 1, 1),

('多语种营销落地页', 'cross_border', 'mobile',
  NULL,
  '面向东南亚/拉美市场的多语种落地页', '多语种,跨境,落地页',
  '{"sections":[{"type":"heroBanner","props":{"title":"","subtitle":"","bgImage":""}},{"type":"multilingualSwitch","props":{"languages":["en","es","pt","th"]}},{"type":"featureList","props":{"title":"","columns":2}},{"type":"testimonialBlock","props":{"title":"Reviews"}},{"type":"ctaButton","props":{"text":"Buy Now","color":"#1890ff"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"","subtitle":"","bgImage":"","fullScreen":true}},{"type":"multilingualSwitch","props":{"languages":["en","es","pt","th","vi","id"]}},{"type":"featureGrid","props":{"title":"","columns":3}},{"type":"videoBlock","props":{"title":"Product Demo"}},{"type":"testimonialBlock","props":{"title":"Customer Reviews"}},{"type":"trustBadge","props":{"title":"Secure Payment"}},{"type":"ctaButton","props":{"text":"Buy Now","color":"#1890ff"}}]}',
  0, 1, 1),

('海外众筹项目页', 'cross_border', 'mobile',
  NULL,
  'Kickstarter/Indiegogo 众筹项目页', '众筹,海外,Kickstarter',
  '{"sections":[{"type":"heroBanner","props":{"title":"Project Name","subtitle":"Revolutionary Innovation","bgColor":"#1a1a2e"}},{"type":"videoBlock","props":{"title":"Story"}},{"type":"progressBar","props":{"goal":10000,"current":0,"title":"Funding Progress"}},{"type":"rewardTiers","props":{"title":"Rewards"}},{"type":"storyBlock","props":{"title":"Our Story"}},{"type":"ctaButton","props":{"text":"Back This Project","color":"#2ecc71"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"Project Name","subtitle":"Revolutionary Innovation","bgColor":"#1a1a2e","fullScreen":true}},{"type":"videoBlock","props":{"title":"Product Story"}},{"type":"progressBar","props":{"goal":10000,"current":0,"title":"Funding Progress"}},{"type":"statsGrid","props":{"title":"Project Stats","columns":3}},{"type":"rewardTiers","props":{"title":"Choose Your Reward"}},{"type":"timelineBlock","props":{"title":"Project Timeline"}},{"type":"teamBlock","props":{"title":"Meet the Team"}},{"type":"faqBlock","props":{"title":"FAQ"}},{"type":"ctaButton","props":{"text":"Back This Project","color":"#2ecc71"}}]}',
  0, 1, 1),

-- 9-12: 内容/自媒体
('自媒体个人主页', 'media', 'mobile',
  NULL,
  '抖音/小红书/B站 KOL 个人主页', '自媒体,个人主页,KOL',
  '{"sections":[{"type":"profileHeader","props":{"avatar":"","name":"","bio":"","socials":[]}},{"type":"navGrid","props":{"items":[{"icon":"video","label":"视频"},{"icon":"article","label":"文章"},{"icon":"photo","label":"相册"}]}},{"type":"feedList","props":{"title":"最新内容"}}]}',
  '{"sections":[{"type":"profileHeader","props":{"avatar":"","name":"","bio":"","socials":[],"coverImage":""}},{"type":"navTabs","props":{"items":[{"label":"全部"},{"label":"视频"},{"label":"文章"},{"label":"相册"},{"label":"关于"}]}},{"type":"feedGrid","props":{"title":"最新内容","columns":3}},{"type":"statsBlock","props":{"title":"数据总览"}}]}',
  0, 1, 1),

('短视频合集页', 'media', 'mobile',
  NULL,
  '抖音/TikTok/视频号 短视频合集展示页', '短视频,合集,自媒体',
  '{"sections":[{"type":"heroBanner","props":{"title":"系列名称","subtitle":"","bgImage":""}},{"type":"videoGrid","props":{"title":"","columns":2}},{"type":"textBlock","props":{"title":"系列简介","content":""}},{"type":"subscribeButton","props":{"text":"关注更新","color":"#ff0050"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"系列名称","subtitle":"","bgImage":""}},{"type":"videoGrid","props":{"title":"全部视频","columns":4}},{"type":"playlistBlock","props":{"title":"播放列表"}},{"type":"textBlock","props":{"title":"系列简介","content":""}},{"type":"subscribeButton","props":{"text":"关注更新","color":"#ff0050"}}]}',
  0, 1, 1),

('图文种草合集', 'media', 'mobile',
  NULL,
  '小红书/Ins 风格图文种草合集页', '种草,图文,小红书,Ins',
  '{"sections":[{"type":"profileHeader","props":{"avatar":"","name":"","bio":"好物分享|生活方式"}},{"type":"masonryGrid","props":{"title":"最新分享","columns":2}},{"type":"tagCloud","props":{"tags":[],"title":"热门标签"}}]}',
  '{"sections":[{"type":"profileHeader","props":{"avatar":"","name":"","bio":"好物分享|生活方式","coverImage":""}},{"type":"masonryGrid","props":{"title":"最新分享","columns":4}},{"type":"tagCloud","props":{"tags":[],"title":"热门标签"}},{"type":"subscribeButton","props":{"text":"关注种草","color":"#ff0050"}}]}',
  0, 1, 1),

('直播预约页', 'media', 'mobile',
  NULL,
  '抖音/视频号直播预告预约页', '直播,预约,自媒体',
  '{"sections":[{"type":"heroBanner","props":{"title":"直播主题","subtitle":"特邀嘉宾","bgColor":"#ff0050"}},{"type":"countdownTimer","props":{"endTime":"","title":"开播倒计时"}},{"type":"textBlock","props":{"title":"直播看点","content":""}},{"type":"form","props":{"fields":[{"label":"手机号","type":"phone"}],"submitText":"预约开播提醒"}},{"type":"shareButton","props":{"text":"分享给好友"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"直播主题","subtitle":"特邀嘉宾","bgColor":"#ff0050","fullScreen":true}},{"type":"countdownTimer","props":{"endTime":"","title":"开播倒计时"}},{"type":"speakerBlock","props":{"title":"嘉宾介绍"}},{"type":"textBlock","props":{"title":"直播看点","content":""}},{"type":"form","props":{"fields":[{"label":"手机号","type":"phone"},{"label":"想了解的问题","type":"textarea"}],"submitText":"预约开播提醒"}},{"type":"shareButton","props":{"text":"分享给好友"}}]}',
  0, 1, 1),

-- 13-16: 企业/服务
('企业官网首页', 'corporate', 'pc',
  NULL,
  '标准企业官网首页，适合科技/制造/服务行业', '企业,官网,公司,PC端',
  '{"sections":[{"type":"navTabs","props":{"items":[{"label":"首页"},{"label":"产品"},{"label":"关于"},{"label":"联系"}]}},{"type":"heroBanner","props":{"title":"公司名称","subtitle":"专业·创新·共赢","bgImage":"","fullScreen":true}},{"type":"featureGrid","props":{"title":"核心优势","columns":3,"items":[]}},{"type":"productGrid","props":{"title":"产品中心","columns":4}},{"type":"statsGrid","props":{"title":"成就数据","columns":4}},{"type":"testimonialBlock","props":{"title":"客户评价"}},{"type":"contactForm","props":{"title":"联系我们"}},{"type":"footerBlock","props":{"copyright":"© 2024 Company Name"}}]}',
  '{"sections":[{"type":"navTabs","props":{"items":[{"label":"首页"},{"label":"产品"},{"label":"解决方案"},{"label":"客户案例"},{"label":"关于"},{"label":"联系"}]}},{"type":"heroBanner","props":{"title":"公司名称","subtitle":"专业·创新·共赢","bgImage":"","fullScreen":true}},{"type":"featureGrid","props":{"title":"核心优势","columns":3,"items":[]}},{"type":"productGrid","props":{"title":"产品中心","columns":4}},{"type":"statsGrid","props":{"title":"成就数据","columns":4}},{"type":"testimonialBlock","props":{"title":"客户评价"}},{"type":"partnerBlock","props":{"title":"合作伙伴"}},{"type":"contactForm","props":{"title":"联系我们"}},{"type":"footerBlock","props":{"copyright":"© 2024 Company Name"}}]}',
  0, 1, 1),

('服务预约页', 'corporate', 'mobile',
  NULL,
  '美容/医疗/教育/家政 服务预约页', '预约,服务,本地生活',
  '{"sections":[{"type":"heroBanner","props":{"title":"服务名称","subtitle":"专业团队·品质保障"}},{"type":"featureList","props":{"title":"服务亮点","columns":2}},{"type":"pricingTable","props":{"title":"服务套餐"}},{"type":"form","props":{"fields":[{"label":"姓名","type":"text"},{"label":"手机号","type":"phone"},{"label":"预约时间","type":"datetime"}],"submitText":"立即预约"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"服务名称","subtitle":"专业团队·品质保障"}},{"type":"featureGrid","props":{"title":"服务亮点","columns":3}},{"type":"pricingTable","props":{"title":"服务套餐"}},{"type":"teamBlock","props":{"title":"服务团队"}},{"type":"form","props":{"fields":[{"label":"姓名","type":"text"},{"label":"手机号","type":"phone"},{"label":"预约时间","type":"datetime"},{"label":"备注","type":"textarea"}],"submitText":"立即预约"}},{"type":"mapBlock","props":{"title":"服务地点"}}]}',
  0, 1, 1),

('活动报名页', 'corporate', 'mobile',
  NULL,
  '行业峰会/展会/培训/沙龙 报名邀请页', '活动,报名,会议,展会',
  '{"sections":[{"type":"heroBanner","props":{"title":"活动名称","subtitle":"时间|地点","bgColor":"#722ed1"}},{"type":"timelineBlock","props":{"title":"活动流程"}},{"type":"speakerBlock","props":{"title":"演讲嘉宾"}},{"type":"form","props":{"fields":[{"label":"姓名","type":"text"},{"label":"手机","type":"phone"},{"label":"公司","type":"text"}],"submitText":"立即报名"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"活动名称","subtitle":"时间|地点","bgColor":"#722ed1","fullScreen":true}},{"type":"countdownTimer","props":{"endTime":"","title":"报名截止"}},{"type":"timelineBlock","props":{"title":"活动流程"}},{"type":"speakerGrid","props":{"title":"演讲嘉宾","columns":4}},{"type":"form","props":{"fields":[{"label":"姓名","type":"text"},{"label":"手机","type":"phone"},{"label":"公司","type":"text"},{"label":"职位","type":"text"}],"submitText":"立即报名"}},{"type":"mapBlock","props":{"title":"活动地点"}}]}',
  0, 1, 1),

('餐饮店铺页', 'corporate', 'mobile',
  NULL,
  '餐饮/咖啡/甜品店铺介绍页', '餐饮,店铺,本地生活',
  '{"sections":[{"type":"heroBanner","props":{"title":"店铺名称","subtitle":"","bgImage":""}},{"type":"profileHeader","props":{"name":"","bio":"营业时间 10:00-22:00","avatar":""}},{"type":"navGrid","props":{"items":[{"icon":"menu","label":"菜单"},{"icon":"star","label":"评价"},{"icon":"location","label":"地址"}]}},{"type":"productGrid","props":{"title":"推荐菜品","columns":2,"showPrice":true}},{"type":"ctaButton","props":{"text":"在线点餐","color":"#ff6600"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"店铺名称","subtitle":"","bgImage":""}},{"type":"profileHeader","props":{"name":"","bio":"营业时间 10:00-22:00","avatar":""}},{"type":"navTabs","props":{"items":[{"label":"菜单"},{"label":"评价"},{"label":"环境"},{"label":"地址"}]}},{"type":"productGrid","props":{"title":"推荐菜品","columns":3,"showPrice":true}},{"type":"reviewList","props":{"title":"顾客评价"}},{"type":"mapBlock","props":{"title":"店铺位置"}},{"type":"ctaButton","props":{"text":"在线预订","color":"#ff6600"}}]}',
  0, 1, 1),

-- 17-20: 教育培训
('在线课程详情页', 'education', 'mobile',
  NULL,
  '知识付费/在线教育课程详情页', '教育,课程,知识付费',
  '{"sections":[{"type":"heroBanner","props":{"title":"课程名称","subtitle":"零基础到精通","bgColor":"#5b5ea6"}},{"type":"progressBar","props":{"goal":100,"current":0,"title":"课程进度"}},{"type":"featureList","props":{"title":"课程亮点","columns":2}},{"type":"pricingTable","props":{"title":"课程套餐"}},{"type":"teacherBlock","props":{"title":"讲师介绍"}},{"type":"ctaButton","props":{"text":"立即报名","color":"#5b5ea6"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"课程名称","subtitle":"零基础到精通","bgColor":"#5b5ea6"}},{"type":"featureGrid","props":{"title":"课程亮点","columns":3}},{"type":"curriculumBlock","props":{"title":"课程大纲"}},{"type":"pricingTable","props":{"title":"课程套餐"}},{"type":"teacherBlock","props":{"title":"讲师介绍"}},{"type":"testimonialBlock","props":{"title":"学员评价"}},{"type":"faqBlock","props":{"title":"常见问题"}},{"type":"ctaButton","props":{"text":"立即报名","color":"#5b5ea6"}}]}',
  0, 1, 1),

('教育机构官网', 'education', 'pc',
  NULL,
  'K12/留学/职业培训 教育机构官网', '教育,机构,官网',
  '{"sections":[{"type":"heroBanner","props":{"title":"机构名称","subtitle":"专注教育·成就未来","bgImage":"","fullScreen":true}},{"type":"statsGrid","props":{"title":"教学成果","columns":4,"items":[]}},{"type":"featureGrid","props":{"title":"课程体系","columns":3}},{"type":"teacherGrid","props":{"title":"师资团队","columns":4}},{"type":"testimonialBlock","props":{"title":"学员心声"}},{"type":"form","props":{"fields":[{"label":"学生姓名","type":"text"},{"label":"家长手机","type":"phone"},{"label":"意向课程","type":"select"}],"submitText":"免费试听"}},{"type":"footerBlock","props":{"copyright":"© 2024 Education"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"机构名称","subtitle":"专注教育·成就未来","bgImage":"","fullScreen":true}},{"type":"statsGrid","props":{"title":"教学成果","columns":4,"items":[{"label":"累计学员","value":"50,000+"},{"label":"合作院校","value":"200+"},{"label":"教师团队","value":"500+"},{"label":"好评率","value":"98%"}]}},{"type":"featureGrid","props":{"title":"课程体系","columns":3}},{"type":"teacherGrid","props":{"title":"师资团队","columns":4}},{"type":"testimonialBlock","props":{"title":"学员心声"}},{"type":"partnerBlock","props":{"title":"合作院校"}},{"type":"form","props":{"fields":[{"label":"学生姓名","type":"text"},{"label":"家长手机","type":"phone"},{"label":"意向课程","type":"select"}],"submitText":"免费试听"}},{"type":"footerBlock","props":{"copyright":"© 2024 Education"}}]}',
  0, 1, 1),

('简历/个人作品集', 'education', 'mobile',
  NULL,
  '求职简历/设计师作品集/开发者Portfolio', '简历,作品集,求职',
  '{"sections":[{"type":"profileHeader","props":{"avatar":"","name":"","bio":"","socials":["github","linkedin"]}},{"type":"timelineBlock","props":{"title":"工作经历"}},{"type":"featureGrid","props":{"title":"技能专长","columns":2}},{"type":"projectGrid","props":{"title":"项目作品","columns":2}},{"type":"contactForm","props":{"title":"联系我"}}]}',
  '{"sections":[{"type":"profileHeader","props":{"avatar":"","name":"","bio":"","socials":["github","linkedin","twitter"]}},{"type":"timelineBlock","props":{"title":"工作经历"}},{"type":"featureGrid","props":{"title":"技能专长","columns":3}},{"type":"projectGrid","props":{"title":"项目作品","columns":3}},{"type":"statsGrid","props":{"title":"技术数据","columns":4}},{"type":"contactForm","props":{"title":"联系我"}}]}',
  0, 1, 1),

('在线考试/测评页', 'education', 'mobile',
  NULL,
  '在线考试/心理测评/能力测试 入口页', '考试,测评,教育',
  '{"sections":[{"type":"heroBanner","props":{"title":"测试名称","subtitle":"共20题·限时30分钟","bgColor":"#13c2c2"}},{"type":"textBlock","props":{"title":"测试说明","content":"请认真阅读题目后作答，提交后不可修改"}},{"type":"form","props":{"fields":[{"label":"姓名","type":"text"},{"label":"手机号","type":"phone"}],"submitText":"开始答题"}}]}',
  '{"sections":[{"type":"heroBanner","props":{"title":"测试名称","subtitle":"共20题·限时30分钟","bgColor":"#13c2c2"}},{"type":"textBlock","props":{"title":"测试说明","content":"满分100分，及格60分。请认真阅读题目后作答，提交后不可修改"}},{"type":"form","props":{"fields":[{"label":"姓名","type":"text"},{"label":"手机号","type":"phone"},{"label":"部门/班级","type":"text"}],"submitText":"开始答题"}},{"type":"faqBlock","props":{"title":"注意事项"}}]}',
  0, 1, 1);
