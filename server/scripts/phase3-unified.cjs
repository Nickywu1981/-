/**
 * Phase 3 Unified Migration — single-pass, callback-based
 * Converts: BusinessError(NNN, '中文') → BusinessError(ERROR_CODE.XXX)
 * Cleans:   BusinessError(ERROR_CODE.XXX, '中文') → BusinessError(ERROR_CODE.XXX)
 * Translates template literals and || fallback patterns
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'src');

// =========== ERROR CODE MAP (value → constant name) ===========
const EM = {};
[
  ['SUCCESS',200],['BAD_REQUEST',400],['UNAUTHORIZED',401],['PAYMENT_REQUIRED',402],
  ['FORBIDDEN',403],['NOT_FOUND',404],['CONFLICT',409],['INTERNAL_ERROR',500],
  ['USER_EXISTS',4001],['USER_NOT_FOUND',4002],['PASSWORD_WRONG',4003],
  ['TOKEN_EXPIRED',4004],['TOKEN_INVALID',4005],['ACCOUNT_DISABLED',4006],
  ['EC_AUTH_002',4007],['REFRESH_TOKEN_EXPIRED',4008],['REFRESH_TOKEN_INVALID',4009],
  ['EC_AUTH_003',4010],['EC_AUTH_004',4011],['EC_AUTH_005',4012],
  ['EC_AUTH_006',4013],['EC_AUTH_007',4014],['EC_AUTH_008',4015],
  ['EC_AUTH_009',4016],['EC_AUTH_010',4017],
  ['EC_CSRF_001',4020],['EC_CSRF_002',4021],
  ['EC_RATE_CONCURRENCY',4030],['EC_RATE_GENERAL',4031],['EC_RATE_AUTH',4032],
  ['EC_RATE_CODE',4033],['EC_RATE_VERIFY',4034],['EC_RATE_HEAVY',4035],
  ['EC_RATE_UPLOAD',4036],['EC_RATE_PAYMENT',4037],['EC_RATE_ADMIN',4038],
  ['EC_RATE_E2B',4039],['EC_RATE_E2B_EXEC',4040],['EC_RATE_E2B_READ',4041],
  ['EC_RATE_E2B_DELETE',4042],
  ['RESOURCE_NOT_FOUND',4101],['RESOURCE_DUPLICATE',4102],['QUOTA_EXCEEDED',4103],
  ['PARAM_MISSING',4201],['PARAM_INVALID',4202],['PARAM_ERROR',4203],
  ['PAY_ORDER_NOT_FOUND',4301],['PAY_ORDER_EXPIRED',4302],['PAY_SIGN_FAILED',4303],
  ['PAY_CHANNEL_ERROR',4304],['PAY_AMOUNT_MISMATCH',4305],['PAY_NOTIFY_FAILED',4306],
  ['CONTENT_MODERATION',4401],['PUBLISH_VALIDATION',4402],
  ['VALIDATION_ERROR',4901],
].forEach(([k,v]) => { EM[v] = k; });

// =========== MESSAGE → CONSTANT (priority ordered) ===========
const RULES = [
  // Auth
  ['账号已被禁用，请联系客服','ACCOUNT_DISABLED'],['账号已被禁用','ACCOUNT_DISABLED'],
  ['用户名已存在','USER_EXISTS'],['用户不存在','USER_NOT_FOUND'],
  ['账号或密码错误','PASSWORD_WRONG'],['用户名或密码错误','PASSWORD_WRONG'],
  ['原密码错误','PASSWORD_WRONG'],['账号或验证码错误','PASSWORD_WRONG'],
  ['重置链接已过期或无效','TOKEN_EXPIRED'],['重置链接已被使用','TOKEN_EXPIRED'],
  ['无效的重置令牌','TOKEN_INVALID'],
  // Not found
  ['不存在','RESOURCE_NOT_FOUND'],['未找到','RESOURCE_NOT_FOUND'],
  ['未配置','INTERNAL_ERROR'],['SDK未集成','INTERNAL_ERROR'],
  // Param
  ['不能为空','PARAM_MISSING'],['为必填','PARAM_MISSING'],['请提供','PARAM_MISSING'],
  ['请上传','PARAM_MISSING'],['请输入','PARAM_MISSING'],['请选择','PARAM_MISSING'],
  ['缺少必要参数','PARAM_MISSING'],['至少需要','PARAM_MISSING'],
  ['没有可更新的字段','PARAM_MISSING'],['无有效更新字段','PARAM_MISSING'],
  ['无更新字段','PARAM_MISSING'],['没有需要更新的字段','PARAM_MISSING'],
  ['没有有效的更新字段','PARAM_MISSING'],['请指定','PARAM_MISSING'],
  ['需提供','PARAM_MISSING'],['请至少','PARAM_MISSING'],['至少','PARAM_MISSING'],
  ['长度不能少于','PARAM_MISSING'],['必须大于0','PARAM_MISSING'],
  ['数量必须大于','PARAM_MISSING'],['chainState.chainId 必填','PARAM_MISSING'],
  // Invalid params
  ['支付方式仅支持 wechat / alipay / unionpay','PARAM_INVALID'],
  ['支付方式无效','PARAM_INVALID'],['支付渠道无效','PARAM_INVALID'],
  ['无效的充值金额','PARAM_INVALID'],['无效套餐','PARAM_INVALID'],
  ['无效的订单金额','PARAM_INVALID'],['无效的任务类型','PARAM_INVALID'],
  ['无效的邮箱','PARAM_INVALID'],['无效的音频','PARAM_INVALID'],
  ['无效的上游地址','PARAM_INVALID'],['无效的重置令牌','PARAM_INVALID'],
  ['标记类型无效','PARAM_INVALID'],['状态值无效','PARAM_INVALID'],
  ['不支持的平台','PARAM_INVALID'],['不支持的邮件场景','PARAM_INVALID'],
  ['不支持该兑换档位','PARAM_INVALID'],['尺寸参数不合法','PARAM_INVALID'],
  ['不支持的','PARAM_INVALID'],['不支持','PARAM_INVALID'],
  ['未知','RESOURCE_NOT_FOUND'],['未定义','INTERNAL_ERROR'],
  ['域名模式不能为空','PARAM_INVALID'],['评分需在','PARAM_INVALID'],
  ['提现金额必须','PARAM_INVALID'],
  ['审核状态仅可为','PARAM_INVALID'],['已禁用','PARAM_INVALID'],
  ['未发布','PARAM_INVALID'],
  // Param error
  ['参数校验失败','PARAM_ERROR'],['参数错误','PARAM_ERROR'],
  ['请检查输入信息','PARAM_ERROR'],['注册失败','PARAM_ERROR'],
  ['只能取消','PARAM_ERROR'],['只能暂停','PARAM_ERROR'],['只能恢复','PARAM_ERROR'],
  ['当前状态','PARAM_ERROR'],['状态不允许','PARAM_ERROR'],
  ['仅可取消','PARAM_ERROR'],['仅运行中','PARAM_ERROR'],['仅暂停','PARAM_ERROR'],
  ['已达最大','PARAM_ERROR'],['只能复制','PARAM_ERROR'],['只能编辑自己','PARAM_ERROR'],
  ['已在运行中','PARAM_ERROR'],['非运行状态','PARAM_ERROR'],
  ['运行中','PARAM_ERROR'],['未能','INTERNAL_ERROR'],
  ['未完成','PARAM_ERROR'],['模式需要','PARAM_ERROR'],['自动匹配','PARAM_ERROR'],
  ['不能绑定自己','PARAM_ERROR'],['视频类工作流禁止','PARAM_ERROR'],
  ['必填步骤不可删除','PARAM_ERROR'],['包含未知步骤','PARAM_ERROR'],
  ['表单尚未开放','PARAM_ERROR'],['表单已结束','PARAM_ERROR'],
  ['只有失败','PARAM_ERROR'],
  // Duplicate
  ['编码已存在','RESOURCE_DUPLICATE'],['模型标识已存在','RESOURCE_DUPLICATE'],
  ['已申请过','RESOURCE_DUPLICATE'],['已被并发回调','RESOURCE_DUPLICATE'],
  ['今日已签到','RESOURCE_DUPLICATE'],['积分更新冲突','RESOURCE_DUPLICATE'],
  // Quota
  ['超出','QUOTA_EXCEEDED'],['上限','QUOTA_EXCEEDED'],['余额不足','QUOTA_EXCEEDED'],
  ['点数不足','QUOTA_EXCEEDED'],['积分不足','QUOTA_EXCEEDED'],
  ['可提现余额不足','QUOTA_EXCEEDED'],['每日消费','QUOTA_EXCEEDED'],
  ['每月消费','QUOTA_EXCEEDED'],['批量上限','QUOTA_EXCEEDED'],
  ['发送次数已达','QUOTA_EXCEEDED'],['已达提交上限','QUOTA_EXCEEDED'],
  ['已达个人提交上限','QUOTA_EXCEEDED'],['无可提取','QUOTA_EXCEEDED'],
  ['最多','QUOTA_EXCEEDED'],['配额已用完','QUOTA_EXCEEDED'],
  // Content
  ['违规','CONTENT_MODERATION'],['内容不合规','CONTENT_MODERATION'],
  // Permission
  ['无权','FORBIDDEN'],['无权限','FORBIDDEN'],
  ['不允许代理到内网','FORBIDDEN'],['上游域名不在白名单','FORBIDDEN'],
  ['此表单不公开','FORBIDDEN'],
  ['沙箱支付不可在生产','FORBIDDEN'],['沙箱支付仅开发','FORBIDDEN'],
  // Rate
  ['发送过于频繁','EC_RATE_CODE'],['限流','EC_RATE_HEAVY'],
  ['熔断','EC_RATE_HEAVY'],['已熔断','EC_RATE_HEAVY'],
  ['验证码错误次数过多','EC_RATE_VERIFY'],
  // Payment
  ['签名验证失败','PAY_SIGN_FAILED'],['支付网关','PAY_CHANNEL_ERROR'],
  ['订单状态异常','PAY_ORDER_EXPIRED'],['支付下单失败','PAY_CHANNEL_ERROR'],
  // Internal
  ['暂时不可用','INTERNAL_ERROR'],['服务暂时不可用','INTERNAL_ERROR'],
  ['扣费失败','INTERNAL_ERROR'],['生成失败','INTERNAL_ERROR'],
  ['执行失败','INTERNAL_ERROR'],['处理失败','INTERNAL_ERROR'],
  ['提取失败','INTERNAL_ERROR'],['解析失败','INTERNAL_ERROR'],
  ['识别不到','INTERNAL_ERROR'],['调度失败','INTERNAL_ERROR'],
  ['请求失败','INTERNAL_ERROR'],['发送失败','INTERNAL_ERROR'],
  ['创建失败','INTERNAL_ERROR'],['迁移失败','INTERNAL_ERROR'],
  ['响应异常','INTERNAL_ERROR'],['存储不可用','INTERNAL_ERROR'],
  ['无法创建','INTERNAL_ERROR'],['未安装','INTERNAL_ERROR'],
  ['未注册','INTERNAL_ERROR'],['未返回','INTERNAL_ERROR'],
  ['不可用','INTERNAL_ERROR'],
  // Additional patterns from remaining files
  ['不存在或','RESOURCE_NOT_FOUND'],['不存在','RESOURCE_NOT_FOUND'],
  ['不完整','PARAM_MISSING'],['损坏','INTERNAL_ERROR'],
  ['已被使用','PARAM_INVALID'],['已被','RESOURCE_DUPLICATE'],
  ['格式不正确','PARAM_INVALID'],['格式无效','PARAM_INVALID'],
  ['已被禁用','FORBIDDEN'],['已被禁用或','FORBIDDEN'],
  ['未关联任何企业','FORBIDDEN'],['未关联','FORBIDDEN'],
  ['请先登录','UNAUTHORIZED'],
  ['仅回收站','PARAM_ERROR'],['仅已通过','PARAM_ERROR'],['仅已停用','PARAM_ERROR'],
  ['主色格式无效','PARAM_INVALID'],
  ['驳回原因','PARAM_MISSING'],
  ['银行卡号格式','PARAM_INVALID'],
  ['该用户已是','RESOURCE_DUPLICATE'],
  ['无企业权限','FORBIDDEN'],
  ['无权操作','FORBIDDEN'],
  ['不是企业管理员','FORBIDDEN'],
  ['请先购买','PAYMENT_REQUIRED'],
  ['免费模板','PARAM_ERROR'],
  ['密码长度不能','PARAM_INVALID'],
  ['旧密码和新密码','PARAM_MISSING'],
  ['缺少 refreshToken','PARAM_MISSING'],
  ['refreshToken','TOKEN_INVALID'],
  ['验证码无效','PARAM_INVALID'],
  ['验证码登录需','PARAM_MISSING'],
  ['验证码已过期','PARAM_INVALID'],['验证码错误','PARAM_INVALID'],
  ['请先获取验证码','PARAM_MISSING'],
  ['密码重置失败','PARAM_ERROR'],['账号或验证码错误','PASSWORD_WRONG'],
  ['原密码不正确','PASSWORD_WRONG'],
  // General fallback patterns (lower priority — place after specific rules)
  ['无效','PARAM_INVALID'],['失败','INTERNAL_ERROR'],
  ['超时','INTERNAL_ERROR'],['数据异常','INTERNAL_ERROR'],
  ['未集成','INTERNAL_ERROR'],['不可用','INTERNAL_ERROR'],
  ['未返回','INTERNAL_ERROR'],['错误','INTERNAL_ERROR'],
  ['已用完','QUOTA_EXCEEDED'],
];

function findConst(statusCode, msg) {
  if (EM[statusCode] && statusCode >= 1000) return EM[statusCode];
  for (const [kw, constName] of RULES) {
    if (msg.includes(kw)) return constName;
  }
  return null;
}

// =========== TRANSLATION MAP ===========
const TR = {
  // Auth
  '验证码无效':'Invalid verification code',
  '验证码登录需提供手机号或邮箱':'Phone or email required for code login',
  '验证码已过期，请重新获取':'Code expired, request new',
  '验证码错误':'Invalid verification code',
  '请先获取验证码':'Request verification code first',
  '账号或验证码错误':'Invalid account or verification code',
  '账号已被禁用':'Account disabled',
  '请提供手机号或邮箱':'Phone or email required',
  '请提供手机号、邮箱或用户名':'Phone, email, or username required',
  '密码重置失败，请检查输入信息':'Password reset failed, check input',
  '用户不存在':'User not found',
  // Upload
  '请上传服装图':'Upload clothing image',
  '请上传产品图':'Upload product image',
  '请上传产品图并选择目标风格':'Upload product image and select target style',
  '请上传包含文字的图片':'Upload image containing text',
  '请选择目标语言':'Select target language',
  '请上传需要扩图的图片':'Upload image to expand',
  '请上传假模服装图':'Upload mannequin clothing image',
  '请上传商品图片':'Upload product image',
  '请上传底图和面部图片':'Upload base and face images',
  '请输入文字内容':'Enter text content',
  '请输入产品卖点信息':'Enter product selling points',
  '请提供手机号或邮箱':'Phone or email required',
  // Experiments
  '实验已在运行中':'Experiment already running',
  '实验非运行状态':'Experiment not running',
  '至少需要2个变体才能创建实验':'At least 2 variants required',
  '至少需要1个指标':'At least 1 metric required',
  '实验不存在':'Experiment not found',
  // File storage
  '文件存储不可用':'File storage unavailable',
  '无法创建克隆声音':'Failed to create cloned voice',
  // Limits
  '最多10个源视频':'Max 10 source videos',
  '最多20张目标人物图':'Max 20 target images',
  '最多20张图片':'Max 20 images',
  '最多20个场景':'Max 20 scenes',
  '单次批量最多50个':'Batch limit: 50',
  '单次批量最多30张':'Batch limit: 30 images',
  '至少1个场景':'At least 1 scene',
  // Tasks
  '任务未完成，无法下载':'Task not completed',
  // AI
  '背景替换失败，请稍后重试':'Background replacement failed',
  'AI分析结果解析失败，请重试':'AI analysis parsing failed',
  'AI未能识别到足够的商品信息，请换一张清晰的商品图':'AI could not recognize product info',
  '商品信息提取失败，请稍后重试':'Product info extraction failed',
  // Email
  '邮件发送失败，请稍后重试':'Email send failed',
  '模板未找到':'Template not found',
  '请至少选择一个目标平台':'Select at least one target platform',
  '所有可用模型暂不可用，请稍后重试':'All models unavailable',
  '代理请求失败，请稍后重试':'Proxy request failed',
  // Video
  '视频生成查询失败，请稍后重试':'Video generation query failed',
  '视频生成超时':'Video generation timeout',
  'Replicate 生成超时':'Replicate generation timeout',
  // Membership
  '会员信息不存在':'Membership info not found',
  '会员套餐信息暂时不可用，请稍后再试':'Plan info temporarily unavailable',
  // Validation
  '新密码长度不能少于6位':'Password must be at least 6 chars',
  '提现金额必须大于0':'Withdrawal amount must be positive',
  '积分数量必须大于0':'Points amount must be positive',
  // Templates
  '模板未发布':'Template not published',
  '表单配置数据异常':'Form config data error',
  // Image processing
  '图片处理失败，请稍后重试':'Image processing failed',
  '图片处理模块未安装，请联系管理员':'Image processing module not installed',
  '白底图生成失败，请稍后重试':'Background removal failed',
  '自定义组合全部执行失败':'All custom combinations failed',
  // Agents
  '未知Agent':'Unknown agent',
  '未知扩展':'Unknown extension',
  // Tasks
  '虚拟模特任务已提交':'Virtual try-on task submitted',
  '换色任务已提交':'Color swap task submitted',
  '风格转化任务已提交':'Style transfer task submitted',
  // Template literals
  '页面状态为「${DIY_PAGE_STATUS_LABEL[currentStatus] || currentStatus}」，不允许此操作':'Page status is "${DIY_PAGE_STATUS_LABEL[currentStatus] || currentStatus}", operation not allowed',
  '页面标识 "${slug}" 已被使用':'Page slug "${slug}" already in use',
  '页面标识 "${fields.slug}" 已被使用':'Page slug "${fields.slug}" already in use',
  '发布校验未通过: ${issues.join(\'; \')}':'Publish validation failed: ${issues.join("; ")}',
  '代码安全拦截: ${msg}':'Code security blocked: ${msg}',
  '代码过长: ${lang} 上限 ${maxLen} 字符，当前 ${code.length} 字符':'Code too long: ${lang} max ${maxLen} chars, current ${code.length} chars',
  '沙箱数量已达上限 (${config.maxSandboxesPerUser})':'Sandbox limit reached (${config.maxSandboxesPerUser})',
  '已达到企业子账号上限 (${tenant.max_users}人)':'Enterprise sub-account limit reached (${tenant.max_users})',
  '当前状态 ${tenant.review_status} 不可审批通过':'Status ${tenant.review_status} cannot be approved',
  '当前状态 ${tenant.review_status} 不可驳回':'Status ${tenant.review_status} cannot be rejected',
  '最低提现金额为 ¥${minAmount}':'Minimum withdrawal amount: ¥${minAmount}',
  '余额不足，当前可用余额 ¥${balance}':'Insufficient balance, available: ¥${balance}',
  'Unknown extension: ${name}. 可用: ${Object.keys(extensionHooks).join(\', \')}':'Unknown extension: ${name}. Available: ${Object.keys(extensionHooks).join(", ")}',
  '模型 ${modelKey} 不存在':'Model ${modelKey} not found',
  '文件内容与声明的类型 (${ext}) 不匹配':'File content does not match declared type (${ext})',
  '不支持的文件格式: ${fileExt}':'Unsupported file format: ${fileExt}',
  '分片不完整 (${meta.receivedChunks.length}/${meta.totalChunks})':'Incomplete chunk (${meta.receivedChunks.length}/${meta.totalChunks})',
  '文件内容与声明的类型 (${extClean}) 不匹配，已删除':'File content does not match type (${extClean}), deleted',
  '不支持的文件类型: ${file.mimetype}':'Unsupported file type: ${file.mimetype}',
  '${label} 无效':'${label} is invalid',
  '${label} 格式不正确':'${label} has invalid format',
  '${label} 协议不受支持':'${label} uses unsupported protocol',
  '${label} 仅支持 http/https':'${label} only supports http/https',
  '${label} 指向受限制的地址':'${label} points to a restricted address',
  'Agent链路执行失败: ${err.message}':'Agent chain execution failed: ${err.message}',
  '不支持的步骤类型: ${step.type}':'Unsupported step type: ${step.type}',
  '单次批量上限为 ${plan.batch_limit} 张':'Batch limit: ${plan.batch_limit} images',
  '未定义的队列: ${name}':'Undefined queue: ${name}',
  '未知Agent: ${agentName}':'Unknown agent: ${agentName}',
  '运行中的实验不可修改 ${k}，请先暂停':'Running experiment, cannot modify ${k}, pause first',
  'Claude API 错误 ${res.status}':'Claude API error ${res.status}',
  'SD API 错误 ${res.status}':'SD API error ${res.status}',
  'SD img2img API 错误 ${res.status}':'SD img2img API error ${res.status}',
  'Replicate API 错误 ${createRes.status}':'Replicate API error ${createRes.status}',
  '下载图片失败: HTTP ${resp.status}':'Image download failed: HTTP ${resp.status}',
  '下载场景图失败: HTTP ${resp.status}':'Scene download failed: HTTP ${resp.status}',
  '视频生成查询失败，请稍后重试':'Video generation query failed',
  '视频生成超时':'Video generation timeout',
  '背景替换失败，请稍后重试':'Background replacement failed',
  '兑换失败，请重试':'Exchange failed',
  '邀请码无效':'Invalid invite code',
  'AI未能识别到足够的商品信息，请换一张清晰的商品图':'AI could not recognize product info, use a clearer image',
  '至少1个场景':'At least 1 scene required',
  'SendGrid SDK 未集成，请联系管理员':'SendGrid SDK not integrated',
  '表单配置数据异常':'Form config data error',
  'Replicate 生成超时':'Replicate generation timeout',
  'Replicate 生成失败: ':'Replicate generation failed: ',
  '批量上限100个任务，当前${totalJobs}个':'Batch limit 100, current: ${totalJobs}',
  'ElevenLabs TTS 返回 ${ttsResp.status}':'ElevenLabs TTS returned ${ttsResp.status}',
  '模型调度失败: ${err.message}':'Model dispatch failed: ${err.message}',
  '提示词"${p.substring(0, 20)}..."包含违规内容':'Prompt "${p.substring(0, 20)}..." contains prohibited content',
  '模型 ${modelKey} 不可用':'Model ${modelKey} unavailable',
  '订单状态异常: ${order.status}':'Order status abnormal: ${order.status}',
  '无法自动匹配工作流: inputType=${inputType}, 请手动指定 chain':'Cannot auto-match workflow: inputType=${inputType}, specify chain manually',
  '输入文件不存在: ${inputPath}':'Input file not found: ${inputPath}',
  '未找到平台规格: ${platformCode}':'Platform spec not found: ${platformCode}',
  '不支持该兑换档位，可选: ${Object.keys(rates).join(\', \')}':'Unsupported exchange tier, options: ${Object.keys(rates).join(", ")}',
  '不支持该兑换档位，可选: ${Object.keys(rates).join(", ")}':'Unsupported exchange tier, options: ${Object.keys(rates).join(", ")}',
  '不支持的平台: ${invalid.join(\', \')}':'Unsupported platforms: ${invalid.join(", ")}',
  '不支持的平台: ${platformCode}':'Unsupported platform: ${platformCode}',
  '当前状态 ${record.status} 不可重发':'Status ${record.status} cannot be resent',
  '上游域名不在白名单: ${proxy.upstream_url}':'Upstream domain not allowlisted: ${proxy.upstream_url}',
  '限流: ${proxy.rate_limit_rpm}/min':'Rate limited: ${proxy.rate_limit_rpm}/min',
  '请求体超过上限 ${proxy.body_max_bytes} 字节':'Request body exceeds limit: ${proxy.body_max_bytes} bytes',
  '输出目录创建失败':'Output directory creation failed',
  '工作流不存在: ${workflowId}':'Workflow not found: ${workflowId}',
  '必填步骤不可删除: ${deletedRequired.join(\', \')}':'Required steps cannot be deleted: ${deletedRequired.join(", ")}',
  'stepOrder 包含未知步骤: ${invalidKeys.join(\', \')}':'stepOrder contains unknown steps: ${invalidKeys.join(", ")}',
  '临时目录创建失败':'Temp directory creation failed',
  '当前状态 ${rows[0].status} 不可取消':'Status ${rows[0].status} cannot be cancelled',
  '当前状态 ${rows[0].status} 不可重试':'Status ${rows[0].status} cannot be retried',
  'Redis 不可用: ${name}':'Redis unavailable: ${name}',
  'Stability AI 服务暂时不可用，':'Stability AI service unavailable,',
  '${modelId} 未返回任务ID':'${modelId} returned no task ID',
  '视频生成失败: ${data.error || \'未知错误\'}':'Video generation failed: ${data.error || "unknown error"}',
  '视频生成失败: ${data.error || "未知错误"}':'Video generation failed: ${data.error || "unknown error"}',
  '未知错误':'Unknown error',
  '内容不合规':'Content non-compliant',
  '支付下单失败':'Payment order creation failed',
  '模型配额已用完':'Model quota exhausted',
  '[${modelName || \'AI\'}] 熔断器已开启，':'[${modelName || "AI"}] Circuit breaker open,',
};

function translateInPlace(msg) {
  let r = msg;
  for (const [zh, en] of Object.entries(TR)) {
    if (r.includes(zh)) r = r.replace(zh, en);
  }
  // Generic patterns
  r = r.replace(/请稍后重试/g, '');
  r = r.replace(/请联系管理员/g, '');
  r = r.replace(/  +/g, ' ').trim();
  return r;
}

function hasChinese(s) { return /[\u4e00-\u9fff]/.test(s); }

function getImportPath(filePath) {
  let rel = path.relative(path.dirname(filePath), path.join(SRC, 'constants', 'errorCode.js'));
  rel = rel.replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : './' + rel;
}

/**
 * Single unified processing function using callback-based replacement.
 * Handles ALL patterns in one pass, no while+exec index drift bugs.
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const orig = content;

  // === PATTERN 1: Numeric code + static Chinese string ===
  // BusinessError(NNN, '中文') → BusinessError(ERROR_CODE.XXX)
  content = content.replace(
    /throw new BusinessError\((\d{3,4}),\s*'([^']*[\u4e00-\u9fff][^']*)'\)/g,
    (match, codeStr, msg) => {
      const code = parseInt(codeStr);
      const c = findConst(code, msg);
      if (!c) {
        console.log('  [SKIP_NUM_STATIC] ' + path.basename(filePath) + ': ' + code + ' "' + msg.substring(0,40) + '"');
        return match;
      }
      return 'throw new BusinessError(ERROR_CODE.' + c + ')';
    }
  );

  // === PATTERN 2: Numeric code + Chinese template literal ===
  // BusinessError(NNN, `中文模板`) → translate
  content = content.replace(
    /throw new BusinessError\((\d{3,4}),\s*`([^`]*[\u4e00-\u9fff][^`]*)`\)/g,
    (match, codeStr, msg) => {
      const code = parseInt(codeStr);
      const c = findConst(code, msg);
      if (!c) {
        console.log('  [SKIP_NUM_TPL] ' + path.basename(filePath) + ': ' + code + ' `' + msg.substring(0,40) + '`');
        return match;
      }
      const eng = translateInPlace(msg);
      return 'throw new BusinessError(ERROR_CODE.' + c + ', `' + eng + '`)';
    }
  );

  // === PATTERN 3: Numeric code + expr || '中文fallback' ===
  content = content.replace(
    /throw new BusinessError\((\d{3,4}),\s*(\S+?\s*\|\|\s*)'([^']*[\u4e00-\u9fff][^']*)'\)/g,
    (match, codeStr, expr, fb) => {
      const code = parseInt(codeStr);
      const c = findConst(code, fb);
      if (!c) {
        console.log('  [SKIP_NUM_FB] ' + path.basename(filePath) + ': ' + code);
        return match;
      }
      const eng = translateInPlace(fb);
      return 'throw new BusinessError(ERROR_CODE.' + c + ', ' + expr + "'" + eng + "')";
    }
  );

  // === PATTERN 4: ERROR_CODE + static Chinese string (cleanup) ===
  // BusinessError(ERROR_CODE.XXX, '中文') → BusinessError(ERROR_CODE.XXX)
  content = content.replace(
    /throw new BusinessError\(ERROR_CODE\.\w+,\s*'([^']*[\u4e00-\u9fff][^']*)'\)/g,
    (match, msg) => {
      // Just strip the message parameter
      return match.replace(/,\s*'[^']*'\)/, ')');
    }
  );

  // === PATTERN 5: ERROR_CODE + Chinese template literal (translate) ===
  content = content.replace(
    /throw new BusinessError\(ERROR_CODE\.(\w+),\s*`([^`]*[\u4e00-\u9fff][^`]*)`\)/g,
    (match, constName, msg) => {
      const eng = translateInPlace(msg);
      if (eng === msg) return match; // No translation found
      return 'throw new BusinessError(ERROR_CODE.' + constName + ', `' + eng + '`)';
    }
  );

  // === PATTERN 6: ERROR_CODE + expr || '中文fallback' (translate fallback) ===
  content = content.replace(
    /(throw new BusinessError\(ERROR_CODE\.\w+,\s*[^,)]+\s*\|\|\s*)'([^']*[\u4e00-\u9fff][^']*)'(\))/g,
    (match, prefix, fb, suffix) => {
      const eng = translateInPlace(fb);
      if (eng === fb) return match;
      return prefix + "'" + eng + "'" + suffix;
    }
  );

  if (content === orig) return false;

  // Add ERROR_CODE import if needed
  if (content.includes('ERROR_CODE.') &&
      !/import\s+\{[^}]*ERROR_CODE[^}]*\}\s+from\s+['"].*errorCode\.js['"]/.test(content)) {
    const ip = getImportPath(filePath);
    const importStmt = "import { ERROR_CODE } from '" + ip + "';";
    const imps = content.match(/^import\s+.+$/gm);
    if (imps && imps.length > 0) {
      const last = imps[imps.length - 1];
      content = content.replace(last, last + '\n' + importStmt);
    } else {
      content = importStmt + '\n' + content;
    }
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

// Walk all JS files
function walkDir(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
      results.push(...walkDir(p));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(p);
    }
  }
  return results;
}

const files = walkDir(SRC);
console.log('Scanning ' + files.length + ' files...\n');

let changed = 0;
for (const fp of files) {
  const c = fs.readFileSync(fp, 'utf8');
  if (!c.includes('BusinessError')) continue;
  if (!hasChinese(c)) continue;
  if (processFile(fp)) {
    changed++;
    console.log('  [OK] ' + path.relative(SRC, fp));
  }
}

console.log('\nFiles modified: ' + changed);
