# Movio AI 产品架构分级 — 创作类

> 产品统筹 | 2026-05-12  
> 所有功能统一归入「创作」大板块，拆分 5 个子类目，每类按 3 级优先级分级  
> 定级依据：电商卖家 & 短视频创作者的日常使用频率 + 付费转化贡献

---

## 总览

| 子类目 | 一级 | 二级 | 三级 | 合计 |
|---|---|---|---|---|
| AI图片创作类 | 7 | 7 | 4 | **18** |
| AI视频创作类 | 5 | 8 | 9 | **22** |
| AI文案&语音创作类 | 4 | 2 | 2 | **8** |
| 电商详情页&海报设计创作类 | 3 | 2 | 2 | **7** |
| 其他综合创意创作类 | 1 | 2 | 5 | **8** |
| **合计** | **20** | **21** | **22** | **63** |

> 注：作品管理类接口（/works、/tasks、历史记录等）归入对应类目的三级，不单独计为独立功能。

---

## 一、AI图片创作类（18项）

> 电商卖家最核心的图片生产工具链，覆盖从「生成→精修→适配」全流程

### 一级（核心刚需 — 卖家每日必用）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 1 | **AI图片生成** | `POST /api/image/generate` | 文生图，输入 prompt 直接出商品图 |
| 2 | **主图复刻** | `POST /api/image/replicate` | 参考图+商品名 → 同风格主图，爆款跟款利器 |
| 3 | **批量图片生成** | `POST /api/image/batch-generate` | 一次生成多张（≤20），批量铺货必备 |
| 4 | **AI虚拟试穿** | `POST /api/advanced-image/virtual-tryon` | 服装上身效果，选肤色/体型，替代实拍 |
| 5 | **颜色替换** | `POST /api/advanced-image/color-swap` | SKU 多色延展，保留纹理一键换色 |
| 6 | **背景/场景替换** | `POST /api/image/batch-replace` | 批量替换背景/场景，白底→场景图 |
| 7 | **幽灵模特** | `POST /api/advanced-image/ghost-mannequin` | 假模→真人模特效果，服装类核心需求 |

### 二级（高频使用 — 周级/活动期密集使用）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 8 | **批量图片编辑** | `POST /api/image/batch-edit` | 批量调色/裁剪/优化，运营提效 |
| 9 | **风格迁移** | `POST /api/advanced-image/style-transfer` | 商品图→指定风格（油画/3D/卡通等） |
| 10 | **去褶皱** | `POST /api/advanced-image/wrinkle-remove` | 服装面料智能化平整 |
| 11 | **AI模特生成** | `POST /api/advanced-image/model-generate` | 服装上身数字模特，替代真人拍摄 |
| 12 | **AI模特生成(独立)** | `POST /api/model/generate` | 独立模特生成服务，支持性别/肤色/姿势 |
| 13 | **图片扩展** | `POST /api/advanced-image/outpaint` | 图片外扩/画面延伸/比例适配 |
| 14 | **图片翻译** | `POST /api/advanced-image/image-translate` | 图片内文字跨语言翻译，跨境电商刚需 |
| 15 | **提示词增强** | `POST /api/image/enhance-prompt` | 简单描述 → 专业AI提示词，降低使用门槛 |

### 三级（增值/探索 — 差异化竞争力）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 16 | **换脸** | `POST /api/advanced-image/swap-face` | 面部替换，定制化需求 |
| 17 | **全景拍摄** | `POST /api/advanced-image/shot-panorama` | 多角度全景商品展示 |
| 18 | **文字特效** | `POST /api/advanced-image/text-effect` | 艺术字生成，海报/封面用 |

---

## 二、AI视频创作类（22项）

> 视频内容生产全链路，从「脚本→素材→剪辑→分析」覆盖抖音/TikTok 卖家需求

### 一级（核心刚需 — 卖家每周必用）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 19 | **AI视频生成** | `POST /api/video/generate` | 文生视频，prompt 直接出短视频 |
| 20 | **图生视频** | `POST /api/video/image-to-video` | 静态商品图→动态展示视频 |
| 21 | **商品广告视频** | `POST /api/video/product-ad` | 商品名+图片+卖点→完整广告片 |
| 22 | **动作迁移** | `POST /api/video/action-migrate` | 模特动作→商品人物，杀手级功能 |
| 23 | **智能剪辑** | `POST /api/video/smart-clip` | 长视频→高光片段自动提取 |

### 二级（高频使用 — 活动期/批量化使用）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 24 | **多图生视频** | `POST /api/video/multi-image-to-video` | 多图轮播/转场动画视频 |
| 25 | **批量动作迁移** | `POST /api/video/action-migrate/batch` | 最高50条视频批量迁移 |
| 26 | **批量动作迁移(v2)** | `POST /api/advanced-video/action-batch` | 增强版批量动作迁移 |
| 27 | **爆款视频分析** | `POST /api/video/viral/analyze` | 分析爆款视频结构/节奏/BGM/文案 |
| 28 | **爆款视频复刻** | `POST /api/video/viral/replicate` | 基于分析结果复刻爆款模板 |
| 29 | **视频美化** | `POST /api/advanced-video/beautify` | 一键美颜/调色/滤镜 |
| 30 | **视频编辑** | `POST /api/advanced-video/video-edit` | BGM+字幕+裁剪综合编辑 |
| 31 | **分镜生成** | `POST /api/video/storyboard` | prompt→分镜脚本+视觉预览 |

### 三级（增值/探索 — 高阶创作者/代理商用）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 32 | **自动包装视频** | `POST /api/video/package` | 自动添加片头片尾/水印 |
| 33 | **角色替换** | `POST /api/video/replace-character` | 视频中角色替换 |
| 34 | **去冗余片段** | `POST /api/video/remove-redundant` | 自动删除静默/重复片段 |
| 35 | **音频优化** | `POST /api/video/optimize-audio` | 降噪/音量均衡/音质增强 |
| 36 | **字幕修复** | `POST /api/video/subtitle-fix` | 自动校对/同步字幕 |
| 37 | **数字人视频** | `POST /api/digital-human/create` | 虚拟形象口播视频 |
| 38 | **视频脚本生成** | `POST /api/advanced-video/script-gen` | 商品信息→口播脚本 |
| 39 | **拍摄计划** | `POST /api/advanced-video/shot-plan` | 产品→拍摄分镜计划 |
| 40 | **视频配音** | `POST /api/advanced-video/voice-gen` | 为视频生成AI配音 |

---

## 三、AI文案&语音创作类（8项）

> 商品文案 + 多语言 + 语音合成，跨境电商全语种覆盖

### 一级（核心刚需 — 上新/活动必用）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 41 | **AI标题生成** | `POST /api/copywriting/titles` | 商品名→多平台标题，支持语调/受众 |
| 42 | **AI商品描述** | `POST /api/copywriting/description` | 特性+规格→结构化商品描述 |
| 43 | **AI带货脚本** | `POST /api/copywriting/script` | 商品→短视频/直播带货脚本 |
| 44 | **TTS文字转语音** | `POST /api/voice/generate` | 文本→自然语音，支持语速调节 |

### 二级（高频使用 — 多语言场景）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 45 | **AI商品翻译** | `POST /api/copywriting/translate` | 商品名+描述+特性全量翻译 |
| 46 | **声音克隆** | `POST /api/voice/clone` | 样本音频→克隆声音，品牌IP化 |

### 三级（增值/探索）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 47 | **平台/语言参考** | `GET /api/copywriting/platforms` `/languages` | 各平台文案规范参考数据 |
| 48 | **文案历史管理** | `GET /api/copywriting/history` `DELETE /:id` | 历史文案查询/删除 |

---

## 四、电商详情页&海报设计创作类（7项）

> 详情页套装 + 营销海报 + 长图，一站式店铺视觉物料

### 一级（核心刚需 — 上新必用）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 49 | **详情页套装生成** | `POST /api/detail/generate-set` | 商品图+卖点→完整详情页套图 |
| 50 | **海报生成** | `POST /api/posters/generate` | 6种类型海报（商品/节日/活动/私域/小红书/微信） |
| 51 | **长图合成** | `POST /api/detail/long-image` | 多场景图垂直拼接为详情长图 |

### 二级（高频使用 — 活动期）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 52 | **详情页复刻** | `POST /api/detail/replicate` | 参考详情页→同风格复刻 |
| 53 | **海报提示词增强** | `POST /api/posters/enhance-prompt` | 简单描述→专业海报提示词 |

### 三级（增值/探索）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 54 | **海报尺寸参考** | `GET /api/posters/sizes` | 各平台海报尺寸规范 |
| 55 | **作品管理** | `GET /api/detail/works` `/api/posters/works` | 详情页/海报作品列表 |

---

## 五、其他综合创意创作类（8项）

> 跨境翻译、生态对接、3D展示等跨类目综合能力

### 一级（核心刚需）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 56 | **视频翻译(三维)** | `POST /api/video-translate/voice` `/subtitles` `/face` | 语音翻译+字幕翻译+口型同步，跨境内容本土化 |

### 二级（高频使用）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 57 | **剪映导出** | `POST /api/cut-ecosystem/export/jianying` | 作品→剪映草稿，无缝衔接剪辑工作流 |
| 58 | **CapCut导出** | `POST /api/cut-ecosystem/export/capcut` | 作品→CapCut草稿，海外版剪映 |

### 三级（增值/探索）

| # | 功能 | 路由 | 说明 |
|---|---|---|---|
| 59 | **3D模型上传** | `POST /api/3d/upload` | 商品3D模型上传(GLBF/FBX/OBJ/STL) |
| 60 | **3D模型列表** | `GET /api/3d/models` | 用户3D模型管理 |
| 61 | **3D示例模型** | `GET /api/3d/demo/:key` | 鞋/表/包/瓶 4类示例GLB |
| 62 | **画幅参数参考** | `GET /api/cut-ecosystem/ratios` | 各平台视频画幅规范 |
| 63 | **可导出作品列表** | `GET /api/cut-ecosystem/works` | 跨类型作品统一导出入口 |

---

## 优先级定级逻辑

| 等级 | 定义 | 典型特征 |
|---|---|---|
| **一级** | 卖家每日/每周必用的核心生产功能 | 高调用量、付费意愿强、直接替代人工 |
| **二级** | 活动期/批量化场景高频使用 | 锦上添花、提升效率、搭配一级使用 |
| **三级** | 差异化增值功能，面向高阶/代理商 | 探索期、建立竞争壁垒、低频但高价值 |

---

## 用户画像 × 类目使用热力图

| 类目 | 淘宝/拼多多卖家 | TikTok/抖音创作者 | 跨境卖家 | 代理商/MCN |
|---|---|---|---|---|
| 图片创作 | ★★★★★ | ★★★☆☆ | ★★★★★ | ★★★★☆ |
| 视频创作 | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| 文案&语音 | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★☆☆ |
| 详情页&海报 | ★★★★★ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ |
| 综合创意 | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ |

---

## 后续建议

1. **首页布局**：按一级功能排列快捷入口，类目间用 Tab/分组切换
2. **新手引导**：一级功能标配「一键生成」模板，降低 prompt 门槛
3. **付费墙**：一级功能限制免费额度，二级/三级作为付费升级卖点
4. **菜单结构**：保持5个一级菜单 + 每个菜单内按优先级排序
5. **资源倾斜**：一级功能优先保障模型可用性 + 响应速度；三级功能可降级
