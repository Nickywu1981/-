<template>
  <div class="page">
    <div class="header-bar">
      <h2>通知中心</h2>
      <button v-if="unreadCount > 0" class="btn-text" @click="markAllRead">全部已读</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else-if="list.length === 0" class="empty">
      <p>暂无通知</p>
    </div>

    <div v-else class="list">
      <div
        v-for="item in list"
        :key="item.id"
        class="notif-item"
        :class="{ unread: !item.is_read }"
        @click="item.is_read || readOne(item)"
      >
        <div class="notif-icon">{{ typeIcon(item.type) }}</div>
        <div class="notif-body">
          <div class="notif-title">{{ item.title }}</div>
          <div class="notif-content">{{ item.content }}</div>
          <div class="notif-time">{{ item.create_time }}</div>
        </div>
        <span v-if="!item.is_read" class="dot"></span>
      </div>
    </div>

    <div v-if="total > pageSize" class="pager">
      <button :disabled="page <= 1" @click="page--; fetch()">上一页</button>
      <span>{{ page }} / {{ Math.ceil(total / pageSize) }}</span>
      <button :disabled="page >= Math.ceil(total / pageSize)" @click="page++; fetch()">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const unreadCount = ref(0);
const loading = ref(true);

function typeIcon(type: string) {
  const map: Record<string, string> = { system: '📢', task: '✅', promotion: '🎁' };
  return map[type] || '📌';
}

async function fetch() {
  loading.value = true;
  const res: any = await $fetch('/api/notifications', { params: { page: page.value, pageSize: pageSize.value } });
  list.value = res.data?.list || [];
  total.value = res.data?.total || 0;
  loading.value = false;
}

async function fetchUnread() {
  const res: any = await $fetch('/api/notifications/unread-count');
  unreadCount.value = res.data?.count || 0;
}

async function readOne(item: any) {
  await $fetch(`/api/notifications/${item.id}/read`, { method: 'PUT' });
  item.is_read = 1;
  unreadCount.value = Math.max(0, unreadCount.value - 1);
}

async function markAllRead() {
  await $fetch('/api/notifications/read-all', { method: 'PUT' });
  list.value.forEach((n: any) => (n.is_read = 1));
  unreadCount.value = 0;
}

onMounted(() => { fetch(); fetchUnread(); });
</script>

<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 24px 16px; }
.header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-bar h2 { font-size: 20px; font-weight: 700; }
.btn-text { background: none; border: none; color: var(--text-link); font-size: 14px; cursor: pointer; }
.loading, .empty { text-align: center; padding: 60px; color: var(--text-tertiary); }
.list { display: flex; flex-direction: column; gap: 8px; }
.notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 10px; cursor: pointer; position: relative; }
.notif-item.unread { background: var(--brand-light); border-color: var(--brand); }
.notif-icon { font-size: 24px; flex-shrink: 0; }
.notif-body { flex: 1; }
.notif-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.notif-content { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 6px; }
.notif-time { font-size: 11px; color: var(--text-tertiary); }
.dot { width: 8px; height: 8px; background: var(--brand); border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.pager { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; }
.pager button { padding: 6px 16px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg-card); cursor: pointer; font-size: 13px; }
.pager button:disabled { opacity: 0.4; cursor: not-allowed; }
.pager span { font-size: 13px; color: var(--text-secondary); }
</style>
