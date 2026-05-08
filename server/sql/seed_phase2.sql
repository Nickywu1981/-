USE ai_saas;

-- 异步任务（22条）
INSERT INTO task (id, user_id, type, title, status, input_params, output_result, progress, review_status, create_time, update_time) VALUES
('t001', 1, 'main_image', '夏季连衣裙主图', 2, '{"platform":"taobao","style":"简约白底"}', '{"images":["/uploads/demo/main-1-1.jpg","/uploads/demo/main-1-2.jpg","/uploads/demo/main-1-3.jpg"]}', 100, 0, '2026-05-05 10:00:00', '2026-05-05 10:05:00'),
('t002', 1, 'scene', '咖啡馆场景图', 2, '{"scene":"cafe","count":5}', '{"images":["/uploads/demo/scene-1.jpg","/uploads/demo/scene-2.jpg","/uploads/demo/scene-3.jpg"]}', 100, 0, '2026-05-04 16:00:00', '2026-05-04 16:08:00'),
('t003', 1, 'img2video', '连衣裙带货视频', 2, '{"duration":15,"ratio":"9:16"}', '{"url":"/uploads/demo/video-1.mp4","duration":15,"cover":"/uploads/demo/cover-1.jpg"}', 100, 0, '2026-05-04 10:00:00', '2026-05-04 10:15:00'),
('t004', 2, 'main_image', '蓝牙耳机白底图', 2, '{"platform":"amazon","style":"简约白底"}', '{"images":["/uploads/demo/product-2.jpg"]}', 100, 0, '2026-05-05 14:00:00', '2026-05-05 14:03:00'),
('t005', 2, 'virtual_tryon', 'T恤虚拟模特上身', 1, '{"model":"asian_female","body":"medium","cloth":"T-shirt-01"}', '{}', 65, 0, '2026-05-06 08:00:00', '2026-05-06 08:05:00'),
('t006', 1, 'batch', '批量生成主图-20件', 2, '{"type":"main_image","count":20}', '{"images":["/uploads/demo/batch-1.jpg","/uploads/demo/batch-2.jpg"]}', 100, 0, '2026-05-03 10:00:00', '2026-05-03 10:20:00'),
('t007', 3, 'main_image', '运动鞋主图', 2, '{"platform":"douyin","style":"高级轻奢"}', '{"images":["/uploads/demo/shoe-1.jpg","/uploads/demo/shoe-2.jpg","/uploads/demo/shoe-3.jpg"]}', 100, 0, '2026-05-05 18:00:00', '2026-05-05 18:04:00'),
('t008', 3, 'scene', '户外运动场景-跑鞋', 2, '{"scene":"outdoor","count":5}', '{"images":["/uploads/demo/shoe-scene-1.jpg","/uploads/demo/shoe-scene-2.jpg"]}', 100, 0, '2026-05-05 15:00:00', '2026-05-05 15:06:00'),
('t009', 1, 'detail_h5', '连衣裙详情页', 2, '{"category":"women_dress","platform":"taobao","skus":3}', '{"images":["/uploads/demo/detail-1.jpg","/uploads/demo/detail-2.jpg","/uploads/demo/detail-3.jpg"]}', 100, 0, '2026-05-01 10:00:00', '2026-05-01 10:12:00'),
('t010', 1, 'color_swap', '连衣裙换色', 2, '{"original":"#ffffff","target":["#ff0000","#0000ff","#000000"]}', '{"images":["/uploads/demo/color-red.jpg","/uploads/demo/color-blue.jpg","/uploads/demo/color-black.jpg"]}', 100, 0, '2026-04-30 10:00:00', '2026-04-30 10:06:00'),
('t011', 4, 'main_image', '韩版衬衫主图', 2, '{"platform":"pdd","style":"活动促销"}', '{"images":["/uploads/demo/cloth-main-1.jpg","/uploads/demo/cloth-main-2.jpg"]}', 100, 0, '2026-05-04 20:00:00', '2026-05-04 20:04:00'),
('t012', 4, 'ghost_mannequin', '衬衫幽灵人台', 2, '{"cloth_type":"shirt"}', '{"images":["/uploads/demo/ghost-1.jpg"]}', 100, 0, '2026-05-04 18:00:00', '2026-05-04 18:03:00'),
('t013', 2, 'image_translate', '产品图英文翻译', 2, '{"from":"zh","to":"en"}', '{"images":["/uploads/demo/translate-1.jpg"]}', 100, 0, '2026-05-03 20:00:00', '2026-05-03 20:05:00'),
('t014', 3, 'video_compose', '多图合成带货视频', 2, '{"duration":30,"ratio":"9:16"}', '{"url":"/uploads/demo/compose-video.mp4","duration":30}', 100, 0, '2026-05-03 14:00:00', '2026-05-03 14:25:00'),
('t015', 4, 'style_transfer', '衬衫水彩风格', 2, '{"style":"watercolor"}', '{"images":["/uploads/demo/style-1.jpg"]}', 100, 0, '2026-05-05 08:00:00', '2026-05-05 08:06:00'),
('t016', 3, 'action_transfer', '模特跳舞动作迁移-5人', 2, '{"mode":"one_action_multi_person","count":5}', '{"videos":["/uploads/demo/action-1.mp4","/uploads/demo/action-2.mp4","/uploads/demo/action-3.mp4","/uploads/demo/action-4.mp4","/uploads/demo/action-5.mp4"]}', 100, 0, '2026-05-03 08:00:00', '2026-05-03 08:35:00'),
('t017', 1, 'script_gen', '连衣裙带货脚本', 2, '{"product":"夏季连衣裙","platform":"douyin"}', '{"script":"【5秒吸睛】这条裙子太仙了！【痛点】夏天穿什么？【产品展示】高腰A字版型+冰丝面料【行动号召】限时特惠，手慢无！"}', 100, 0, '2026-05-02 10:00:00', '2026-05-02 10:01:00'),
('t018', 2, 'person_replace', '人物替换-多动作', 2, '{"mode":"one_person_multi_action","count":3}', '{"videos":["/uploads/demo/replace-1.mp4","/uploads/demo/replace-2.mp4","/uploads/demo/replace-3.mp4"]}', 100, 0, '2026-05-03 12:00:00', '2026-05-03 12:20:00'),
('t019', 4, 'wrinkle_remove', '棉质衬衫去褶皱', 2, '{"fabric":"cotton"}', '{"images":["/uploads/demo/wrinkle-1.jpg"]}', 100, 0, '2026-05-04 22:00:00', '2026-05-04 22:03:00'),
('t020', 1, 'viral_clone', '爆款视频复刻-连衣裙', 2, '{"source_video_url":"/uploads/user-source-viral.mp4"}', '{"url":"/uploads/demo/viral-clone.mp4"}', 100, 0, '2026-04-29 10:00:00', '2026-04-29 10:18:00'),
('t021', 2, 'main_image', '新款充电宝主图', 0, '{}', '{}', 0, 0, '2026-05-06 07:00:00', '2026-05-06 07:00:00'),
('t022', 3, 'shot_plan', '运动鞋视频分镜', 2, '{"product":"运动跑鞋","style":"运动风"}', '{"shots":[{"no":1,"desc":"产品360度展示","camera":"推镜头","duration":3},{"no":2,"desc":"鞋底特写","camera":"微距特写","duration":2},{"no":3,"desc":"跑步动态","camera":"跟拍","duration":4},{"no":4,"desc":"对比展示","camera":"分屏","duration":3},{"no":5,"desc":"CTA购买引导","camera":"定镜","duration":3}]}', 100, 0, '2026-05-05 12:00:00', '2026-05-05 12:02:00');

-- 消费记录（13条）
INSERT INTO consumption_record (user_id, type, action, credit_before, credit_after, consumed, remark, task_id, create_time) VALUES
(1, 3, 'purchase_plan_2', 0, 500, -500, '购买季卡 69元', '', '2026-04-06 10:00:00'),
(1, 2, 'task_main_image', 500, 497, 3, '做主图消耗', 't001', '2026-05-05 10:00:00'),
(1, 2, 'task_scene', 497, 492, 5, '做场景消耗', 't002', '2026-05-04 16:00:00'),
(1, 2, 'task_img2video', 492, 482, 10, '做视频消耗', 't003', '2026-05-04 10:00:00'),
(2, 3, 'purchase_plan_1', 0, 200, -200, '购买月卡 29元', '', '2026-04-21 14:00:00'),
(2, 2, 'task_main_image', 200, 197, 3, '做主图消耗', 't004', '2026-05-05 14:00:00'),
(3, 3, 'purchase_plan_3', 0, 2000, -2000, '购买年卡 199元', '', '2026-04-29 09:00:00'),
(3, 2, 'task_main_image', 2000, 1997, 3, '做主图消耗', 't007', '2026-05-05 18:00:00'),
(4, 3, 'purchase_plan_1', 0, 100, -100, '购买月卡 29元', '', '2026-04-22 16:00:00'),
(4, 2, 'task_main_image', 100, 97, 3, '做主图消耗', 't011', '2026-05-04 20:00:00'),
(1, 2, 'task_batch', 482, 457, 25, '批量生成消耗', 't006', '2026-05-03 10:00:00'),
(1, 2, 'task_action_transfer', 457, 427, 30, '动作迁移消耗', 't016', '2026-05-03 08:00:00'),
(5, 1, 'daily_free', 0, 20, -20, '新用户注册赠送', '', '2026-05-03 10:00:00');

-- 操作日志
INSERT INTO operation_log (user_id, action, target_type, target_id, detail, ip, create_time) VALUES
(1, 'user_login', '', '', NULL, '127.0.0.1', '2026-05-05 20:00:00'),
(1, 'task_submit', 'task', 't001', '{"task_type":"main_image","title":"夏季连衣裙主图"}', '127.0.0.1', '2026-05-05 10:00:00'),
(2, 'user_register', '', '', '{"username":"seller_li"}', '192.168.1.100', '2026-04-21 14:00:00'),
(1, 'batch_submit', 'task', 't006', '{"count":20,"type":"main_image"}', '127.0.0.1', '2026-05-03 10:00:00'),
(3, 'plan_purchase', '', '', '{"plan":"年卡","price":199}', '10.0.0.5', '2026-04-29 09:00:00'),
(NULL, 'admin_login', '', '', NULL, '127.0.0.1', '2026-05-06 09:00:00');

-- 短信日志
INSERT INTO sms_log (template_code, phone, params, content, result, provider, create_time) VALUES
('sms_register_code', '138****5678', '{"code":"482917"}', '验证码: 482917，5分钟内有效。', 1, 'mock', '2026-04-06 10:00:00'),
('sms_login_code', '139****4321', '{"code":"729103"}', '验证码: 729103，5分钟内有效。', 1, 'mock', '2026-04-21 14:00:00'),
('sms_task_complete', '138****5678', '{"count":3}', '您的任务已完成！共生成3个作品。', 1, 'mock', '2026-05-05 10:05:00');

SELECT 'Data phase 2 OK' AS status;
