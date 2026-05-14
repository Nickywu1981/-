/**
 * useAIChat — SSE 消费层 composable
 *
 * 职责：
 *  - 发送消息到 POST /api/chat/message
 *  - 消费 SSE 流式响应 (chunk / prompts / status / blocked / error / done)
 *  - 管理本地消息列表和提示词预览状态
 *  - 会话管理 (sessionId 持久化)
 */
import { ref, reactive } from 'vue'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  streaming?: boolean
  timestamp?: string
}

export interface PromptState {
  positive: string
  negative: string
}

export function useAIChat() {
  const messages = ref<ChatMessage[]>([])
  const streaming = ref(false)
  const sessionId = ref<string | null>(null)
  const prompts = reactive<PromptState>({ positive: '', negative: '' })

  let abortController: AbortController | null = null

  async function send(
    text: string,
    attachments?: Array<{ type: 'image' | 'video' | 'link'; url: string }>,
  ) {
    if (!text.trim() || streaming.value) return

    streaming.value = true
    abortController = new AbortController()

    // Add user message
    messages.value.push({
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    })

    // Add placeholder assistant message (will be updated with streamed content)
    const aiMsgIdx = messages.value.length
    messages.value.push({
      role: 'assistant',
      content: '',
      streaming: true,
      timestamp: new Date().toISOString(),
    })

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.value,
          mode: 'chat',
          attachments: attachments?.length ? attachments : undefined,
          context: {},
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ msg: 'Request failed' }))
        throw new Error(err.msg || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Stream not supported')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('event: ') && !line.startsWith('data: ')) continue

          const eventMatch = line.match(/^event: (.+)$/)
          const dataMatch = line.match(/^data: (.+)$/)

          if (eventMatch) {
            // event type line — wait for data
            continue
          }

          if (dataMatch) {
            const data = dataMatch[1]

            if (data === '[DONE]') {
              streaming.value = false
              if (messages.value[aiMsgIdx]) messages.value[aiMsgIdx].streaming = false
              return
            }

            try {
              const parsed = JSON.parse(data)
              handleSSEEvent(parsed, aiMsgIdx)
            } catch {
              // Plain text chunk — append to assistant message
              if (messages.value[aiMsgIdx]) {
                messages.value[aiMsgIdx].content += data
              }
            }
          }
        }
      }

      streaming.value = false
      if (messages.value[aiMsgIdx]) messages.value[aiMsgIdx].streaming = false
    } catch (err: any) {
      if (err.name === 'AbortError') return
      streaming.value = false
      if (messages.value[aiMsgIdx]) {
        messages.value[aiMsgIdx].content = '抱歉，对话服务暂时不可用，请稍后重试。'
        messages.value[aiMsgIdx].streaming = false
      }
    }
  }

  function handleSSEEvent(data: any, aiMsgIdx: number) {
    switch (data.type) {
      case 'chunk':
        if (messages.value[aiMsgIdx]) {
          messages.value[aiMsgIdx].content += data.content || ''
        }
        break
      case 'prompts':
        prompts.positive = data.positive || ''
        prompts.negative = data.negative || ''
        break
      case 'status':
        // Status update — could show as inline indicator, for now skip
        break
      case 'blocked':
        if (messages.value[aiMsgIdx]) {
          messages.value[aiMsgIdx].content = `⚠️ 内容被拦截：${data.reason}`
          messages.value[aiMsgIdx].streaming = false
        }
        streaming.value = false
        break
      case 'error':
        if (messages.value[aiMsgIdx]) {
          messages.value[aiMsgIdx].content = `❌ ${data.message || '处理失败'}`
          messages.value[aiMsgIdx].streaming = false
        }
        streaming.value = false
        break
    }
  }

  function clear() {
    messages.value = []
    prompts.positive = ''
    prompts.negative = ''
    sessionId.value = null
    abortController?.abort()
    streaming.value = false
  }

  return {
    messages,
    streaming,
    prompts,
    send,
    clear,
  }
}
