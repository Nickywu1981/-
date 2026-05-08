-- B4 全链路日志种子数据
INSERT INTO ai_call_log (user_id, model_id, model_name, prompt, prompt_tokens, response_tokens, total_tokens, duration_ms, status, result_type, result_preview, task_id) VALUES
(1, 'gpt-4o', 'GPT-4o', '为夏季连衣裙写一段电商产品描述', 45, 180, 225, 2340, 1, 'text', '【夏季连衣裙】轻盈飘逸，透气亲肤...', 'task_ai_001'),
(1, 'gpt-4o', 'GPT-4o', '将图片中的连衣裙穿在模特身上，背景海滩', 120, 0, 120, 4500, 1, 'image', '/uploads/results/img_scene_001.webp', 'task_ai_002'),
(1, 'dall-e-3', 'DALL-E 3', 'Professional product photo of a perfume bottle, white background, soft lighting', 35, 0, 35, 8200, 1, 'image', '/uploads/results/img_main_001.webp', 'task_ai_003'),
(1, 'sora', 'Sora', '15 seconds fashion video, model walking on street wearing casual blazer', 55, 0, 55, 12500, 1, 'video', '/uploads/results/vid_001.mp4', 'task_ai_004'),
(1, 'gpt-4o', 'GPT-4o', '小红书种草文案，产品：保湿精华液', 40, 320, 360, 3100, 1, 'text', '✨姐妹们，这款精华液真的绝了...', 'task_ai_005'),
(1, 'midjourney', 'Midjourney', 'minimalist furniture lamp in nordic living room, natural light, 4K', 30, 0, 30, 15000, 1, 'image', '/uploads/results/img_scene_002.webp', 'task_ai_006'),
(2, 'gpt-4o', 'GPT-4o', '为蓝牙耳机写朋友圈营销文案', 38, 200, 238, 2800, 1, 'text', '🎧这款耳机性价比太高了...', 'task_ai_007'),
(3, 'gpt-4o', 'GPT-4o', '直播带货口播脚本，产品：防晒霜，3分钟', 50, 450, 500, 5200, 0, 'text', '', ''),
(1, 'dall-e-3', 'DALL-E 3', 'Generate e-commerce main image for smartwatch', 32, 0, 32, 7800, 1, 'image', '/uploads/results/img_main_002.webp', 'task_ai_008'),
(1, 'sora', 'Sora', '30 sec product video, rotating 360 view of ceramic mug', 48, 0, 48, 18000, 1, 'video', '/uploads/results/vid_002.mp4', 'task_ai_009');

INSERT INTO operation_log (user_id, action, target_type, target_id, detail, ip, user_agent) VALUES
(1, 'login', 'user', '1', '{"method":"password"}', '127.0.0.1', 'Mozilla/5.0'),
(1, 'task_create', 'task', 'task_ai_001', '{"type":"scene","params":{"product":"连衣裙"}}', '127.0.0.1', 'Mozilla/5.0'),
(1, 'task_complete', 'task', 'task_ai_001', '{"result":"3 images generated"}', '127.0.0.1', 'Mozilla/5.0'),
(1, 'credit_consume', 'credit', '14', '{"consumed":2,"action":"scene","balance_after":483}', '127.0.0.1', 'Mozilla/5.0'),
(1, 'logout', 'user', '1', '{}', '127.0.0.1', 'Mozilla/5.0'),
(2, 'register', 'user', '2', '{"username":"seller_wang"}', '192.168.1.100', 'Mozilla/5.0'),
(1, 'plan_upgrade', 'membership', '1', '{"from":1,"to":2}', '127.0.0.1', 'Mozilla/5.0'),
(1, 'template_use', 'prompt_template', '1', '{"template_id":1}', '127.0.0.1', 'Mozilla/5.0'),
(3, 'login_failed', 'user', '3', '{"reason":"wrong_password"}', '10.0.0.5', 'Mozilla/5.0'),
(1, 'batch_submit', 'batch', 'batch_001', '{"count":10,"type":"cutout"}', '127.0.0.1', 'Mozilla/5.0');

INSERT INTO generated_image (user_id, task_id, type, platform, original_url, result_url, thumbnail_url, width, height, file_size, format, params_json) VALUES
(1, 'task_img_001', 'main_image', 'taobao', '/uploads/originals/dress_orig.webp', '/uploads/results/dress_main.webp', '/uploads/results/dress_thumb.webp', 800, 800, 124500, 'webp', '{"action":"main_image","product":"连衣裙"}'),
(1, 'task_img_002', 'scene', 'taobao', '/uploads/originals/shirt_orig.webp', '/uploads/results/shirt_scene.webp', '/uploads/results/shirt_thumb.webp', 1200, 800, 215000, 'webp', '{"action":"scene","product":"条纹衬衫","scene":"海滩"}'),
(1, 'task_img_003', 'main_image', '1688', '/uploads/originals/perfume_orig.webp', '/uploads/results/perfume_main.webp', '/uploads/results/perfume_thumb.webp', 800, 800, 98000, 'webp', '{"action":"main_image","product":"香水"}'),
(2, 'task_img_004', 'detail_h5', 'taobao', '/uploads/originals/earphone_orig.webp', '/uploads/results/earphone_detail.webp', '/uploads/results/earphone_thumb.webp', 750, 1334, 187000, 'webp', '{"action":"detail_h5","product":"蓝牙耳机"}'),
(1, 'task_img_005', 'virtual_tryon', 'taobao', '/uploads/originals/model_orig.webp', '/uploads/results/tryon_result.webp', '/uploads/results/tryon_thumb.webp', 1024, 1024, 310000, 'webp', '{"action":"model_tryon","product":"T恤"}');

INSERT INTO generated_video (user_id, task_id, type, platform, original_url, result_url, thumbnail_url, duration, width, height, file_size, has_bgm, has_subtitle, params_json) VALUES
(1, 'task_vid_001', 'img2video', 'taobao', '/uploads/originals/dress_orig.webp', '/uploads/results/dress_video.mp4', '/uploads/results/dress_vid_thumb.webp', 15, 1080, 1920, 2500000, 1, 1, '{"action":"img2video","product":"连衣裙"}'),
(1, 'task_vid_002', 'viral_replicate', 'douyin', '/uploads/originals/ref_video.mp4', '/uploads/results/viral_copy.mp4', '/uploads/results/viral_thumb.webp', 30, 1080, 1920, 4800000, 1, 1, '{"action":"viral_replicate"}'),
(2, 'task_vid_003', 'digital_human', 'kuaishou', '', '/uploads/results/digital_human.mp4', '/uploads/results/dh_thumb.webp', 60, 1080, 1920, 12000000, 1, 0, '{"action":"digital_human","script":"带货口播"}');
