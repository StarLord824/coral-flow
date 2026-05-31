import { supabase } from './supabase'

const BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000'

// ─── Types (mirror backend responses) ───────────────────────────────────────
export type AgentSource = {
  source_type: string
  scope: string | null
  token_last4: string | null
  connected: boolean
}

export type Agent = {
  id: string
  name: string
  model: string
  sandbox_id: string | null
  sandbox_state: 'cold' | 'spawning' | 'ready' | 'dead'
}

export type ChatMessageRow = {
  role: 'user' | 'assistant' | 'tool'
  content: string
  evidence_json: unknown
  created_at: string
}

// ─── Core request helper (attaches the Supabase JWT) ─────────────────────────
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const resp = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })

  if (!resp.ok) {
    let detail = `${resp.status}`
    try {
      const body = await resp.json()
      detail = body.detail ?? detail
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, resp.status)
  }
  return resp.json() as Promise<T>
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// ─── Endpoints ────────────────────────────────────────────────────────────────
export const api = {
  myAgent: () => request<{ agent: Agent; sources: AgentSource[] }>('/agents/me'),

  injectToken: (agentId: string, source_type: string, credentials: Record<string, string>, scope?: string) =>
    request<{ ok: true; sources: AgentSource[] }>(`/agents/${agentId}/tokens`, {
      method: 'POST',
      body: JSON.stringify({ source_type, credentials, scope }),
    }),

  chat: (agentId: string, question: string, notify = true) =>
    request<{ agent_id: string; answer: string; message_id: string }>(
      `/agents/${agentId}/chat`,
      { method: 'POST', body: JSON.stringify({ question, notify }) },
    ),

  chatStream: async function*(agentId: string, question: string, notify = true) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Not authenticated')

    const resp = await fetch(`${BASE}/agents/${agentId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ question, notify }),
    })

    if (!resp.ok) {
      let detail = `${resp.status}`
      try { const body = await resp.json(); detail = body.detail ?? detail } catch {}
      throw new ApiError(detail, resp.status)
    }

    const reader = resp.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      
      const parts = buffer.split(/\r?\n\r?\n/)
      buffer = parts.pop() || ''
      
      for (const part of parts) {
        if (!part.trim()) continue
        const lines = part.split(/\r?\n/)
        let evt = 'message'
        let dat = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) evt = line.substring(7).trim()
          else if (line.startsWith('data: ')) dat = line.substring(6)
        }
        if (dat) {
          yield { event: evt, data: dat }
        }
      }
    }
  },

  messages: (agentId: string) =>
    request<{ messages: ChatMessageRow[] }>(`/agents/${agentId}/messages`),

  killSandbox: (agentId: string) =>
    request<{ ok: true }>(`/agents/${agentId}/sandbox`, { method: 'DELETE' }),
}
