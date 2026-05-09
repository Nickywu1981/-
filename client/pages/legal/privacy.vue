<template>
  <div class="page">
    <h1>隐私政策</h1>
    <p class="update">更新日期：2025年1月1日</p>

    <section>
      <h2>一、信息收集</h2>
      <p>我们仅收集提供AI图像与视频处理服务所必需的信息，包括：</p>
      <ul>
        <li><strong>账号信息</strong>：用户名、手机号、邮箱，用于账号注册与身份识别。</li>
        <li><strong>上传内容</strong>：您上传的商品图片、视频素材，仅用于生成AI处理结果，不会用于其他目的。</li>
        <li><strong>使用日志</strong>：操作记录、任务记录，用于服务优化与问题排查。</li>
      </ul>
    </section>

    <section>
      <h2>二、信息使用</h2>
      <p>我们使用收集的信息用于：</p>
      <ul>
        <li>提供AI图像处理、视频生成等核心服务</li>
        <li>发送任务完成通知、系统消息</li>
        <li>优化服务质量与用户体验</li>
        <li>保障平台安全，防止滥用</li>
      </ul>
    </section>

    <section>
      <h2>三、信息存储与保护</h2>
      <p>您的数据存储于安全服务器，采用加密传输与访问控制。上传的商品图片处理完成后会定期清理，不会长期保留原始文件。我们采取业界标准的安全措施保护您的个人信息。</p>
    </section>

    <section>
      <h2>四、信息共享</h2>
      <p>我们不会将您的信息出售给第三方。仅在以下情况可能共享：</p>
      <ul>
        <li>您主动选择分享生成结果</li>
        <li>法律法规要求或政府机关依法请求</li>
        <li>向第三方AI服务商传输必要的图像数据进行处理（完成即删）</li>
      </ul>
    </section>

    <section>
      <h2>五、您的权利</h2>
      <ul>
        <li>随时查看、修改您的个人信息</li>
        <li>可申请删除账号及所有相关数据</li>
        <li>可撤回同意、注销账号</li>
        <li>如有隐私相关问题，请联系 privacy@example.com</li>
      </ul>
    </section>

    <section>
      <h2>六、Cookie 使用</h2>
      <p>我们使用必要的Cookie维护登录状态。您可在浏览器设置中管理Cookie偏好。</p>
    </section>

    <section>
      <h2>七、政策更新</h2>
      <p>我们可能适时更新本政策，重大变更将通过站内通知或短信告知。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'landing' })
useHead({ title: '隐私政策 - Movio AI' })
</script>

<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 40px 16px; line-height: 1.8; color: var(--text-primary); }
h1 { font-size: 28px; margin-bottom: 8px; }
.update { font-size: 13px; color: var(--text-tertiary); margin-bottom: 32px; }
section { margin-bottom: 28px; }
h2 { font-size: 18px; margin-bottom: 12px; color: var(--text-primary); }
p { margin-bottom: 8px; }
ul { padding-left: 20px; }
li { margin-bottom: 6px; }
</style>
