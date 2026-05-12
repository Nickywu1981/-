<!-- 网关端 — 访问日志 -->
<template>
  <div class="pg">
    <div class="page-header">
      <div>
        <h1 class="page-header-title">访问日志</h1>
        <p class="page-header-subtitle">实时 API 调用日志、错误监控</p>
      </div>
      <input class="search-input" v-model="search" placeholder="搜索路径或 IP..." style="width:240px" />
    </div>

    <div class="card">
      <table class="data-table">
        <thead><tr><th>时间</th><th>方法</th><th>路径</th><th>状态码</th><th>耗时</th><th>IP</th><th>User-Agent</th></tr></thead>
        <tbody>
          <tr v-for="log in filteredLogs" :key="log.id">
            <td>{{ log.time }}</td><td><span class="badge badge-info">{{ log.method }}</span></td>
            <td><code>{{ log.path }}</code></td>
            <td><span :class="log.status < 400 ? 'badge badge-success' : 'badge badge-danger'">{{ log.status }}</span></td>
            <td>{{ log.duration }}ms</td><td><code>{{ log.ip }}</code></td>
            <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ log.ua }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'gateway', middleware: ['auth'] })
const search = ref('')

const logs = reactive([
  { id: 1, time: '10:32:15', method: 'POST', path: '/api/v4/image/generate', status: 200, duration: 142, ip: '192.168.1.100', ua: 'Mozilla/5.0 Chrome/120' },
  { id: 2, time: '10:32:12', method: 'GET', path: '/api/v4/job/j_abc123', status: 200, duration: 28, ip: '192.168.1.101', ua: 'axios/1.6' },
  { id: 3, time: '10:32:08', method: 'POST', path: '/api/auth/login', status: 401, duration: 15, ip: '10.0.0.55', ua: 'PostmanRuntime/7.36' },
])

const filteredLogs = computed(() =>
  logs.filter(l => l.path.includes(search.value) || l.ip.includes(search.value))
)
</script>
