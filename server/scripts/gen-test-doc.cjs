const fs = require('fs');
const path = 'I:/智能体助手项目/docs/_TEST_48288_主文档.md';

const chapters = [
  { title: '项目概述与愿景', sections: ['产品定位', '目标用户', '市场分析', '竞品对比', '商业模式', '路线图', '成功指标'] },
  { title: '技术架构设计', sections: ['整体架构', '前端技术栈', '后端技术栈', '数据库设计', '缓存策略', '消息队列', '文件存储', 'CI/CD'] },
  { title: '用户系统', sections: ['注册登录', 'JWT双令牌', 'OAuth第三方', 'RBAC权限', '多租户隔离', '账号安全', '会员体系'] },
  { title: 'AI能力引擎', sections: ['模型适配层', '提示词管理', '图片生成', '视频生成', '背景移除', '人脸替换', '风格迁移', '语音克隆'] },
  { title: '商品工作台', sections: ['商品管理', '图片处理', '视频编辑', '批量处理', '模板系统', '尺寸适配', 'A/B测试'] },
  { title: '内容生成', sections: ['文案生成', '标题优化', 'SEO描述', '多语言翻译', '合规审查', '品牌一致性'] },
  { title: '素材管理中台', sections: ['素材上传', '分类标签', '版本管理', '权限控制', '搜索检索', '批量操作', '回收站'] },
  { title: '电商平台对接', sections: ['淘宝', '拼多多', '抖音', '小红书', '亚马逊', 'Temu', 'Shein', 'Shopee', 'Lazada', 'API统一适配'] },
  { title: '支付与计费', sections: ['会员定价', '积分系统', '消费记录', '发票管理', '优惠券', '分销返佣', '财务对账'] },
  { title: '管理后台', sections: ['仪表盘', '用户管理', '内容审核', '配置管理', '数据统计', '操作日志', '系统监控'] },
  { title: '数据分析', sections: ['用户画像', '行为分析', '转化漏斗', '热力图', 'A/B实验', '日报周报', '预警系统'] },
  { title: '合规与安全', sections: ['内容审核', '版权保护', '数据隐私', 'GDPR合规', '敏感词过滤', '防注入', '审计日志'] },
  { title: '部署运维', sections: ['Docker部署', 'K8S编排', '蓝绿部署', '自动扩容', '灾备方案', '监控告警', '日志收集'] },
  { title: 'API开放平台', sections: ['认证鉴权', '限流策略', 'SDK生成', '文档管理', '版本管理', 'Webhook', '测试沙箱'] },
  { title: '移动端适配', sections: ['H5响应式', '小程序', 'PWA', '离线缓存', '推送通知', '手势操作', '性能优化'] },
  { title: '测试策略', sections: ['单元测试', '集成测试', 'E2E测试', '性能测试', '安全测试', '兼容性测试', '混沌工程'] },
  { title: '国际化与本地化', sections: ['多语言', '多时区', '多币种', '本地化UI', '翻译管理', '文化适配', '区域合规'] },
  { title: '团队协作', sections: ['版本控制', '代码审查', '文档规范', '知识库', '入职培训', '发布流程', '事故复盘'] },
  { title: '未来规划', sections: ['AI代理', '3D生成', 'AR试穿', '直播带货', '智能客服', '个性化推荐', '元宇宙商店'] },
  { title: '附录与参考资料', sections: ['行业标准', '开源项目', '技术论文', '合规法规', '合作伙伴', '术语表完整版', '版本演进史', '贡献者指南', '安全白皮书', '性能调优指南', '代码规范补充'] },
];

const designPatterns = ['适配器模式', '策略模式', '观察者模式', '工厂模式', '装饰器模式', '责任链模式'];
const databases = ['MySQL 8.0 InnoDB', 'PostgreSQL 15', 'MongoDB 7.0', 'Elasticsearch 8.x'];
const queues = ['BullMQ + Redis', 'RabbitMQ', 'Kafka', 'AWS SQS'];
const callChains = [
  'Controller → Service → ModelAdapter → AI Engine',
  'Controller → Service → DAO → MySQL',
  'Controller → Service → Queue → Worker → DAO',
  'WebSocket → Auth → Service → Broadcast'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

let output = '# Movio AI 电商视觉创作平台 — 完整需求规格说明书\n\n';
output += '> 文档版本: v3.0 | 目标行数: ~48,000+ | 生成日期: 2026-05-07\n';
output += '> 涵盖: 19章 × 7-10节 × ~350行/节\n\n';
output += '---\n\n';

let sectionId = 0;

for (let ch = 0; ch < chapters.length; ch++) {
  const chapter = chapters[ch];
  output += `\n# 第${ch + 1}章 ${chapter.title}\n\n`;

  for (let sec = 0; sec < chapter.sections.length; sec++) {
    sectionId++;
    const section = chapter.sections[sec];
    const slug = section.toLowerCase().replace(/\s+/g, '-');
    output += `## ${ch + 1}.${sec + 1} ${section}\n\n`;

    // Block 1: 需求背景
    output += `### 需求背景与场景分析\n\n`;
    output += `该模块源于电商运营团队在${section}过程中的实际痛点。根据市场调研数据，超过${rand(65, 90)}%的电商卖家在日常运营中面临效率低下的问题。传统工具需要手动切换多个平台，平均每次操作耗时${rand(15, 60)}分钟，而Movio AI通过一站式解决方案可将耗时降低至${rand(1, 8)}分钟以内。\n\n`;
    output += `**关键业务指标(KPI)：**\n`;
    output += `- 运营效率提升：${rand(200, 700)}%\n`;
    output += `- 人力成本节省：每月约${rand(5000, 25000)}元\n`;
    output += `- 用户满意度：${(4.0 + Math.random() * 1.0).toFixed(1)}/5.0\n`;
    output += `- ROI回报周期：${rand(1, 6)}个月\n`;
    output += `- 日活跃用户(DAU)：${rand(1000, 50000)}人\n`;
    output += `- 月生成素材量：${rand(10000, 500000)}件\n\n`;

    // Block 2: 功能设计
    output += `### 功能详细设计\n\n`;
    output += `**输入参数：**\n`;
    output += `| 参数名 | 类型 | 必填 | 默认值 | 说明 |\n`;
    output += `|--------|------|------|--------|------|\n`;
    output += `| platformId | integer | 是 | - | 目标平台ID(${sectionId}) |\n`;
    output += `| quality | enum | 否 | high | 输出质量(low/medium/high/original) |\n`;
    output += `| format | string | 否 | jpg | 输出格式(jpg/png/webp/avif) |\n`;
    output += `| compression | float | 否 | 0.85 | 压缩比(0.1-1.0) |\n`;
    output += `| metadata | object | 否 | {} | 附加元数据 |\n\n`;
    output += `**错误码映射：**\n`;
    output += `| 错误码 | HTTP | 说明 | 重试建议 |\n`;
    output += `|--------|------|------|----------|\n`;
    output += `| EC_${sectionId}_0001 | 400 | 参数校验失败 | 否 |\n`;
    output += `| EC_${sectionId}_0002 | 401 | 认证令牌过期 | 是(刷新token) |\n`;
    output += `| EC_${sectionId}_0003 | 429 | 调用频率超限 | 是(指数退避) |\n`;
    output += `| EC_${sectionId}_0004 | 500 | 内部服务异常 | 是(最多3次) |\n\n`;

    // Block 3: 技术方案
    output += `### 技术实现方案\n\n`;
    output += `**架构决策：**\n`;
    output += `1. 采用${pick(designPatterns)}实现模块解耦\n`;
    output += `2. 数据库选用${pick(databases)}作为主存储引擎\n`;
    output += `3. 缓存层采用Redis Cluster，设置${rand(30, 600)}秒的TTL过期策略\n`;
    output += `4. 异步任务通过${pick(queues)}实现可靠消息传递\n\n`;
    output += `**性能指标要求：**\n`;
    output += `- P50延迟 ≤ ${rand(50, 200)}ms\n`;
    output += `- P95延迟 ≤ ${rand(200, 800)}ms\n`;
    output += `- P99延迟 ≤ ${rand(500, 1500)}ms\n`;
    output += `- QPS目标 ≥ ${rand(100, 900)} req/s\n`;
    output += `- 可用性 ≥ 99.${rand(90, 99)}%\n\n`;

    // Block 4: 数据模型
    output += `### 数据模型\n\n`;
    output += "```sql\n";
    output += `CREATE TABLE IF NOT EXISTS section_${sectionId}_records (\n`;
    output += `  id INT PRIMARY KEY AUTO_INCREMENT,\n`;
    output += `  user_id INT NOT NULL COMMENT '用户ID',\n`;
    output += `  tenant_id INT NOT NULL DEFAULT 0 COMMENT '租户ID',\n`;
    output += `  platform_id INT NOT NULL COMMENT '平台ID',\n`;
    output += `  task_type ENUM("sync","async","batch") NOT NULL DEFAULT "async",\n`;
    output += `  input_params JSON COMMENT '输入参数',\n`;
    output += `  output_result JSON COMMENT '输出结果',\n`;
    output += `  status TINYINT NOT NULL DEFAULT 0 COMMENT '0=排队 1=处理中 2=完成 3=失败',\n`;
    output += `  progress DECIMAL(5,2) DEFAULT 0.00,\n`;
    output += `  cost DECIMAL(10,4) DEFAULT 0.0000,\n`;
    output += `  duration_ms INT DEFAULT 0,\n`;
    output += `  retry_count TINYINT DEFAULT 0,\n`;
    output += `  error_message TEXT,\n`;
    output += `  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,\n`;
    output += `  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n`;
    output += `  is_deleted TINYINT DEFAULT 0,\n`;
    output += `  INDEX idx_user_tenant (user_id, tenant_id),\n`;
    output += `  INDEX idx_status_time (status, create_time),\n`;
    output += `  INDEX idx_platform (platform_id)\n`;
    output += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n`;
    output += "```\n\n";

    // Block 5: API
    const method = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'][rand(0, 4)];
    output += `### 接口定义\n\n`;
    output += `**${method} /api/v${rand(1, 2)}/${slug}**\n\n`;
    output += "请求示例：\n```bash\n";
    output += `curl -X ${method} https://api.movio.ai/v1/${slug} \\\n`;
    output += `  -H "Authorization: Bearer eyJhbG..." \\\n`;
    output += `  -H "Content-Type: application/json" \\\n`;
    output += `  -H "X-Tenant-Id: ${1000 + sectionId}"\n`;
    output += "```\n\n";
    output += "响应示例：\n```json\n";
    output += `{\n  "code": 200,\n  "msg": "success",\n  "data": {\n    "id": ${sectionId},\n`;
    output += `    "result": "处理完成",\n    "metadata": {\n`;
    output += `      "cost": ${(0.01 + Math.random() * 0.5).toFixed(4)},\n`;
    output += `      "duration_ms": ${rand(100, 3000)}\n    }\n  }\n}\n`;
    output += "```\n\n";

    // Block 6: 安全
    output += `### 安全策略\n\n`;
    output += `| 安全层级 | 措施 | 说明 |\n`;
    output += `|----------|------|------|\n`;
    output += `| 传输层 | TLS 1.3 + HSTS | 全站HTTPS强制 |\n`;
    output += `| 应用层 | JWT双令牌 + CSRF | 15min access + 7d refresh |\n`;
    output += `| 数据层 | AES-256-GCM加密 | 敏感字段加密存储 |\n`;
    output += `| 网络层 | WAF + DDoS防护 | 基于Cloudflare |\n`;
    output += `| 业务层 | 多租户隔离 + RBAC | tenant_id强制注入 |\n`;
    output += `| 审计层 | 全操作日志 | 不可篡改审计链 |\n\n`;

    // Block 7: 测试
    output += `### 测试用例\n\n`;
    for (let i = 1; i <= 5; i++) {
      const cases = [
        { desc: '正常流程：输入合法参数，期望返回200', pre: '用户已登录且配额充足', expect: '返回200 + 正确数据' },
        { desc: '边界测试：空参数/超长参数/特殊字符', pre: '准备边界值数据集', expect: '返回400 + 参数校验错误' },
        { desc: '异常测试：网络超时/服务不可用/数据库故障', pre: '模拟相应故障场景', expect: '返回500 + 降级响应' },
        { desc: `并发测试：${i * 10}个并发请求，检查幂等性`, pre: '准备并发测试脚本', expect: '所有请求返回一致结果' },
        { desc: '安全测试：未认证/无权限/跨租户访问', pre: '准备不同权限级别token', expect: '返回401/403' },
      ];
      const c = cases[i - 1];
      output += `**TC-${sectionId}.${i}** ${c.desc}\n`;
      output += `- 前置条件：${c.pre}\n`;
      output += `- 预期结果：${c.expect}\n\n`;
    }

    // Block 8: 监控
    output += `### 监控与告警\n\n`;
    output += `**Prometheus指标：**\n`;
    output += `- movio_${slug}_requests_total{status="success|fail"} — 请求总量\n`;
    output += `- movio_${slug}_duration_seconds{quantile="0.5|0.95|0.99"} — 处理耗时\n`;
    output += `- movio_${slug}_queue_length — 队列积压\n`;
    output += `- movio_${slug}_error_rate — 错误率\n\n`;
    output += `**告警阈值：**\n`;
    output += `| 级别 | 条件 | 通知方式 | 响应时间 |\n`;
    output += `|------|------|----------|----------|\n`;
    output += `| P0-紧急 | 错误率>5% 或 服务不可用 | 电话+短信+企微 | 5分钟 |\n`;
    output += `| P1-严重 | P95延迟>3s持续5分钟 | 短信+企微 | 15分钟 |\n`;
    output += `| P2-警告 | QPS超阈值80% | 企微 | 30分钟 |\n`;
    output += `| P3-通知 | 磁盘>80%/证书将过期 | 企微 | 2小时 |\n\n`;

    // Block 9: 部署
    output += `### 部署要求\n\n`;
    output += `**环境依赖：**\n`;
    output += `- Node.js ≥ 18.0.0（推荐20 LTS）\n`;
    output += `- MySQL ≥ 8.0.33, Redis ≥ 7.0, MinIO ≥ 2024-01\n`;
    output += `- Docker ≥ 24.0\n\n`;
    output += `**资源需求：**\n`;
    output += `- CPU: ${rand(1, 4)}核(最低) / ${rand(4, 8)}核(推荐)\n`;
    output += `- 内存: ${rand(256, 1024)}MB(最低) / ${rand(2, 8)}GB(推荐)\n`;
    output += `- 磁盘: ${rand(10, 50)}GB SSD\n`;
    output += `- 带宽: ${rand(10, 100)}Mbps\n\n`;

    // Block 10: 依赖
    output += `### 依赖关系\n\n`;
    output += `**上游依赖：** 用户服务、计费服务、文件服务\n`;
    output += `**下游影响：** 数据分析、通知服务、审计系统\n`;
    output += `**调用链：** ${pick(callChains)}\n\n`;

    // Block 11: 前端
    output += `### 前端交互设计\n\n`;
    output += `**组件树：** <WorkLayout> → <${section.replace(/\s+/g, '')}Panel> → <LoadingSkeleton/ErrorState>\n`;
    output += `**UX指标：** LCP≤1.5s, FID≤100ms, CLS≤0.1, Lighthouse≥90\n\n`;

    // Block 12: 风险
    output += `### 风险评估\n\n`;
    output += `| 风险项 | 概率 | 影响 | 缓解措施 |\n`;
    output += `|--------|------|------|----------|\n`;
    output += `| AI服务不可用 | ${pick(['低','中','高'])} | ${pick(['低','中','高'])} | 多模型降级 |\n`;
    output += `| DB性能瓶颈 | ${pick(['低','中','高'])} | ${pick(['低','中','高'])} | 读写分离+分库分表 |\n`;
    output += `| 第三方API变更 | ${pick(['低','中','高'])} | ${pick(['低','中','高'])} | 适配器隔离 |\n`;
    output += `| 安全漏洞 | ${pick(['低','中','高'])} | ${pick(['低','中','高'])} | 月度渗透测试 |\n\n`;

    // Block 13: 集成策略
    output += `### 集成与对接策略\n\n`;
    output += `**对接方式：**\n`;
    output += `| 系统 | 方式 | 协议 | SLA |\n`;
    output += `|------|------|------|-----|\n`;
    output += `| 电商平台API | RESTful OAuth2 | HTTPS | 99.9% |\n`;
    output += `| 支付网关 | SDK集成 | HTTPS+签名 | 99.99% |\n`;
    output += `| 物流系统 | Webhook回调 | HTTPS | 99.5% |\n`;
    output += `| CDN | DNS CNAME | HTTPS/HTTP2 | 99.95% |\n`;
    output += `**集成检查清单：**\n`;
    output += `- [ ] API Key/Secret已申请并加密存储\n`;
    output += `- [ ] 回调URL已配置白名单\n`;
    output += `- [ ] 限流策略已对齐双方约定\n`;
    output += `- [ ] 异常降级方案已准备\n`;
    output += `- [ ] 沙箱环境测试通过\n\n`;

    // Block 14: 数据迁移
    output += `### 数据迁移方案\n\n`;
    output += `**迁移路线图：**\n`;
    output += `1. 阶段一(Week 1-2)：数据模型对齐与映射表建立\n`;
    output += `2. 阶段二(Week 3-4)：历史数据批量清洗与校验(${rand(10000, 100000)}条)\n`;
    output += `3. 阶段三(Week 5)：增量数据同步与双写验证\n`;
    output += `4. 阶段四(Week 6)：灰度切流(10%→50%→100%)\n`;
    output += `5. 阶段五(Week 7)：旧系统数据归档与下线\n`;
    output += `**数据校验规则：**\n`;
    output += `- 必填字段完整性检查，缺失率<0.01%\n`;
    output += `- 关联数据一致性检查，外键完整率>99.9%\n`;
    output += `- 业务数据逻辑校验，金额差异<$0.01\n\n`;

    // Block 15: 性能基准
    output += `### 性能基准测试\n\n`;
    output += `**基准环境：** ${rand(2, 4)}核CPU / ${rand(4, 8)}GB RAM / SSD / 千兆网络\n`;
    output += `**测试结果：**\n`;
    output += `| 场景 | 并发数 | QPS | P50 | P95 | P99 | CPU | 内存 |\n`;
    output += `|------|--------|-----|-----|-----|-----|-----|------|\n`;
    output += `| 轻量查询 | ${rand(50, 200)} | ${rand(500, 2000)} | ${rand(5, 20)}ms | ${rand(30, 80)}ms | ${rand(100, 200)}ms | ${rand(20, 40)}% | ${rand(200, 500)}MB |\n`;
    output += `| 中等处理 | ${rand(20, 100)} | ${rand(100, 500)} | ${rand(50, 100)}ms | ${rand(200, 400)}ms | ${rand(500, 1000)}ms | ${rand(40, 60)}% | ${rand(400, 800)}MB |\n`;
    output += `| AI生成 | ${rand(5, 30)} | ${rand(10, 50)} | ${rand(500, 2000)}ms | ${rand(2000, 5000)}ms | ${rand(5000, 10000)}ms | ${rand(60, 90)}% | ${rand(800, 2000)}MB |\n\n`;

    // Block 16: 容量规划
    output += `### 容量规划\n\n`;
    output += `**增长预测：**\n`;
    output += `- 当前用户基数：${rand(1000, 50000)}\n`;
    output += `- 月增长率：${rand(5, 25)}%\n`;
    output += `- 年度预测：${rand(10000, 500000)}用户\n`;
    output += `**存储容量：**\n`;
    output += `- 数据库：当前${rand(5, 50)}GB → 年度${rand(50, 500)}GB\n`;
    output += `- 对象存储：当前${rand(50, 500)}GB → 年度${rand(500, 5000)}GB\n`;
    output += `- 日志存储：当前${rand(10, 100)}GB → 年度${rand(100, 1000)}GB\n`;
    output += `**扩容触发条件：**\n`;
    output += `- 磁盘使用率 > 70%：提前扩容\n`;
    output += `- CPU持续 > 60% (30min)：水平扩容\n`;
    output += `- 内存使用 > 80%：垂直扩容\n\n`;

    // Block 17: 故障处理手册
    output += `### 故障处理手册\n\n`;
    output += `| 故障类型 | 检测方式 | 自动恢复 | 手动处理 |\n`;
    output += `|----------|----------|----------|----------|\n`;
    output += `| MySQL主库故障 | 健康检查5s超时 | 自动切换从库 | 检查数据一致性 |\n`;
    output += `| Redis集群分裂 | 哨兵检测 | 自动故障转移 | 验证缓存一致性 |\n`;
    output += `| AI服务不可用 | 错误率监控 | 自动切换备用模型 | 通知AI供应商 |\n`;
    output += `| 存储空间满 | 磁盘监控>85% | 自动清理临时文件 | 手动扩容 |\n`;
    output += `| DDoS攻击 | 流量异常检测 | 自动启用WAF | 联系安全团队 |\n\n`;

    // Block 18: 版本兼容性
    output += `### API版本兼容性矩阵\n\n`;
    output += `| 客户端版本 | API v1 | API v2 | API v3 | 支持截止 |\n`;
    output += `|------------|--------|--------|--------|----------|\n`;
    output += `| Web v2.x | ✅ | ✅ | ❌ | 2026-12 |\n`;
    output += `| Web v3.x | ❌ | ✅ | ✅ | 2027-06 |\n`;
    output += `| iOS v3.x | ❌ | ✅ | ✅ | — |\n`;
    output += `| Android v3.x | ❌ | ✅ | ✅ | — |\n`;
    output += `| 小程序 v2.x | ✅ | ✅ | ❌ | 2026-09 |\n\n`;

    // Block 19: 最佳实践
    output += `### 开发最佳实践\n\n`;
    output += `1. **幂等性设计**：所有写操作使用requestId去重，重复请求返回一致结果\n`;
    output += `2. **超时控制**：上游${rand(3, 10)}s超时 → 中游${rand(10, 30)}s → AI调用${rand(30, 120)}s\n`;
    output += `3. **重试策略**：指数退避(1s→2s→4s→8s)，最多${rand(3, 5)}次\n`;
    output += `4. **熔断降级**：连续失败${rand(5, 10)}次 → 熔断${rand(30, 120)}s → 半开探测\n`;
    output += `5. **日志规范**：[模块][级别][traceId] 消息 {key: value}\n`;
    output += `6. **监控覆盖**：所有API端点必须有4个黄金指标(延迟/流量/错误/饱和度)\n\n`;

    // Block 20: FAQ
    output += `### 常见问题(FAQ)\n\n`;
    const faqs = [
      { q: 'Q: 如何处理高并发场景下的积分扣减？', a: '采用Redis Lua脚本实现原子性扣减，配合数据库最终一致性校验。单用户并发限制为' + rand(5, 20) + '次/秒。' },
      { q: 'Q: AI生成失败如何重试？', a: '自动指数退避重试最多' + rand(3, 5) + '次。超过限制后降级到备用模型（如Claude→GPT），最终失败通知用户并返还积分。' },
      { q: 'Q: 跨租户数据隔离如何实现？', a: '所有SQL查询通过TenantPool自动注入tenant_id条件，RBAC校验用户所属租户。管理员通过adminPool跨租户访问。' },
      { q: 'Q: 文件上传大小限制是多少？', a: '图片≤' + rand(10, 50) + 'MB，视频≤' + rand(100, 500) + 'MB。超过限制前端预检拦截，后端Nginx client_max_body_size兜底。' },
      { q: 'Q: API调用的频率限制是多少？', a: '普通用户' + rand(60, 120) + '次/分钟，会员' + rand(300, 600) + '次/分钟，企业版' + rand(1000, 3000) + '次/分钟。超过限制返回429。' },
    ];
    for (const faq of faqs) {
      output += `${faq.q}\n${faq.a}\n\n`;
    }

    // Block 21: 术语表
    output += `### 术语与缩写\n\n`;
    output += `| 术语 | 全称 | 说明 |\n`;
    output += `|------|------|------|\n`;
    output += `| LCP | Largest Contentful Paint | 最大内容绘制时间(W3C标准) |\n`;
    output += `| FID | First Input Delay | 首次输入延迟 |\n`;
    output += `| CLS | Cumulative Layout Shift | 累计布局偏移 |\n`;
    output += `| RBAC | Role-Based Access Control | 基于角色的访问控制 |\n`;
    output += `| CSRF | Cross-Site Request Forgery | 跨站请求伪造 |\n`;
    output += `| SLA | Service Level Agreement | 服务等级协议(可用性99.${rand(5, 9)}%) |\n`;
    output += `| RTO | Recovery Time Objective | 恢复时间目标(≤${rand(1, 4)}小时) |\n`;
    output += `| RPO | Recovery Point Objective | 数据恢复点目标(≤${rand(1, 24)}小时) |\n\n`;

    // Block 22: 参考实现
    output += `### 参考实现与示例代码\n\n`;
    output += "```javascript\n";
    output += `// ${section} 完整实现示例\n`;
    output += `import { ${section.replace(/\s+/g, '')}Service } from '../services/${slug.replace(/-/g, '')}Service.js';\n\n`;
    output += `export async function handle${section.replace(/\s+/g, '')}(req, res) {\n`;
    output += `  const startTime = Date.now();\n`;
    output += `  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();\n`;
    output += `  try {\n`;
    output += `    const { input, options } = validateInput(req.body);\n`;
    output += `    const result = await ${section.replace(/\s+/g, '')}Service.process({\n`;
    output += `      userId: req.user.id,\n`;
    output += `      tenantId: req.tenantId,\n`;
    output += `      input,\n`;
    output += `      options: { quality: 'high', format: 'jpg', ...options },\n`;
    output += `      traceId,\n`;
    output += `    });\n`;
    output += `    const duration = Date.now() - startTime;\n`;
    output += `    logger.info('[${section}][INFO]', { traceId, duration, userId: req.user.id });\n`;
    output += `    return success(res, { ...result, duration_ms: duration });\n`;
    output += `  } catch (err) {\n`;
    output += `    logger.error('[${section}][ERROR]', { traceId, error: err.message });\n`;
    output += `    return error(res, err.statusCode || 500, err.message);\n`;
    output += `  }\n`;
    output += `}\n`;
    output += "```\n\n";
    output += `---\n\n`;
  }
}

fs.writeFileSync(path, output, 'utf8');
const lines = output.split('\n').length;
const sizeMB = (Buffer.byteLength(output, 'utf8') / 1024 / 1024).toFixed(2);
console.log(`File: ${path}`);
console.log(`Lines: ${lines}`);
console.log(`Size: ${sizeMB} MB`);
console.log(`Chapters: ${chapters.length}`);
console.log(`Sections: ${chapters.reduce((s,c) => s + c.sections.length, 0)}`);
