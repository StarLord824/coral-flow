import React, { useState, useRef, useEffect } from 'react'
import {
  Send, Sparkles, Bot, ChevronRight, RefreshCw,
  GitPullRequest, AlertTriangle, CheckCircle2,
  Loader2, ExternalLink, BookOpen, Bell, GitMerge,
  Diff, Zap, Clock, Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAgent } from '@/lib/agent'
import { api, ApiError } from '@/lib/api'

// ─── Types ─────────────────────────────────────────────────────────────────

type ToolCall = {
  id: string
  tool: string          // e.g. "coral.query"
  status: 'running' | 'done' | 'new'
  args: Record<string, string>
  result?: string
}

type EvidenceItem = {
  type: 'pr' | 'error' | 'commit'
  id: string
  title: string
  meta: string
  color: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolCalls?: ToolCall[]
  evidence?: EvidenceItem[]
  actions?: string[]
}

// ─── opencode output → tool-call cards (best-effort parse) ───────────────────
// opencode prints tool invocations as lines like:  ⚙ coral_sql {"sql":"..."}
// We surface those as ToolCall cards and treat the rest as the answer body.
function parseAgentOutput(raw: string): { content: string; toolCalls: ToolCall[] } {
  const toolCalls: ToolCall[] = []
  const bodyLines: string[] = []
  raw.split('\n').forEach((line, i) => {
    const m = line.match(/^[⚙*\s]*([a-z_]*coral[a-z_]*|coral_\w+)\s*(\{.*\})?/i)
    if (m && /coral/i.test(m[1])) {
      let args: Record<string, string> = {}
      try {
        if (m[2]) {
          const parsed = JSON.parse(m[2])
          args = Object.fromEntries(
            Object.entries(parsed).map(([k, v]) => [k, JSON.stringify(v)]),
          )
        }
      } catch {
        /* leave args empty */
      }
      toolCalls.push({ id: `tc-${i}`, tool: m[1], status: 'done', args })
    } else if (line.trim() && !line.startsWith('> build')) {
      bodyLines.push(line)
    }
  })
  return { content: bodyLines.join('\n').trim(), toolCalls }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ToolCallCard({ tc }: { tc: ToolCall }) {
  const statusConfig = {
    done: {
      dot: 'bg-emerald-400',
      label: 'done',
      labelClass: 'text-emerald-400',
      border: 'border-l-emerald-500/60',
      bg: 'bg-emerald-500/5',
    },
    running: {
      dot: 'bg-amber-400 animate-pulse',
      label: 'running',
      labelClass: 'text-amber-400',
      border: 'border-l-amber-500/60',
      bg: 'bg-amber-500/5',
    },
    new: {
      dot: 'bg-blue-400',
      label: 'new',
      labelClass: 'text-blue-400',
      border: 'border-l-blue-500/60',
      bg: 'bg-blue-500/5',
    },
  }[tc.status]

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 border-l-2 overflow-hidden',
        statusConfig.border,
        statusConfig.bg
      )}
    >
      {/* Tool header */}
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <Database className="w-3 h-3 text-muted-foreground/60" />
          <span className="text-[11px] font-mono font-semibold text-foreground/80">
            {tc.tool}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn('w-1.5 h-1.5 rounded-full', statusConfig.dot)} />
          <span className={cn('text-[9px] font-semibold uppercase tracking-wider', statusConfig.labelClass)}>
            {tc.status === 'running' ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                running
              </span>
            ) : statusConfig.label}
          </span>
        </div>
      </div>

      {/* Args */}
      {Object.keys(tc.args).length > 0 && (
        <div className="px-2.5 pb-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
          {Object.entries(tc.args).map(([k, v]) => (
            <span key={k} className="text-[10px] font-mono text-muted-foreground/60">
              <span className="text-muted-foreground/40">{k}=</span>
              <span className="text-sky-400/70">{v}</span>
            </span>
          ))}
        </div>
      )}

      {/* Result */}
      {tc.result && (
        <div className="border-t border-border/30 px-2.5 py-1 flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground/40">→</span>
          <span className="text-[10px] text-foreground/60 font-mono">{tc.result}</span>
        </div>
      )}
    </div>
  )
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const Icon = item.type === 'pr' ? GitPullRequest : item.type === 'error' ? AlertTriangle : GitMerge
  return (
    <div
      className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-border/40 hover:border-border/70 bg-background/40 hover:bg-background/60 cursor-pointer transition-all group"
      style={{ borderLeftColor: `${item.color}50`, borderLeftWidth: 2 }}
    >
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${item.color}18`, color: item.color }}
      >
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground/50">{item.id}</span>
          <span className="text-[11px] font-medium text-foreground/80 truncate">{item.title}</span>
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-0.5">{item.meta}</p>
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0 transition-colors" />
    </div>
  )
}

function MessageContent({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))
          return (
            <code key={i} className="px-1 py-0.5 rounded text-[11px] bg-orange-500/10 text-orange-300 font-mono">
              {part.slice(1, -1)}
            </code>
          )
        if (part.startsWith("'") && part.endsWith("'"))
          return <em key={i} className="not-italic text-foreground/80">{part.slice(1, -1)}</em>
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

// ─── Main ChatPanel ──────────────────────────────────────────────────────────

import { useAuth } from '@/lib/auth'

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function ChatPanel() {
  const { agent, sources } = useAgent()
  const { user } = useAuth()
  const initial = (user?.email ?? 'U')[0].toUpperCase()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hasConnectedSource = sources.some(s => s.connected || s.token_last4)

  // Load prior conversation for this agent.
  useEffect(() => {
    if (!agent) return
    api.messages(agent.id)
      .then(({ messages }) =>
        setMessages(
          messages.map((m, i) => ({
            id: `${i}`,
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })),
        ),
      )
      .catch(() => {/* empty history is fine */})
  }, [agent])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isLoading || !agent) return

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content, timestamp: nowTime() }])
    setInput('')
    setIsLoading(true)

    const msgId = (Date.now() + 1).toString()
    let answerBuffer = ''
    
    setMessages(prev => [
      ...prev,
      {
        id: msgId,
        role: 'assistant',
        content: '',
        timestamp: nowTime(),
      },
    ])

    try {
      for await (const chunk of api.chatStream(agent.id, content)) {
        if (chunk.event === 'message') {
          answerBuffer += chunk.data + '\n'
          const { content: body, toolCalls } = parseAgentOutput(answerBuffer)
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: body, toolCalls: toolCalls.length ? toolCalls : undefined } : m))
        } else if (chunk.event === 'done') {
          try {
            const parsed = JSON.parse(chunk.data)
            if (parsed.evidence) {
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, evidence: parsed.evidence } : m))
            }
          } catch {}
        } else if (chunk.event === 'error') {
          let errMsg = chunk.data
          let code = 500
          try {
            const parsed = JSON.parse(chunk.data)
            errMsg = parsed.message || errMsg
            code = parsed.code || code
          } catch {}
          throw new ApiError(errMsg, code)
        }
      }
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 503
          ? 'The model is rate-limited right now. Try again in a moment.'
          : e instanceof ApiError && e.status === 400
          ? 'Connect a data source (e.g. GitHub) from the sidebar first.'
          : e instanceof Error
          ? e.message
          : 'Something went wrong.'
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 2).toString(), role: 'assistant', content: `⚠️ ${msg}`, timestamp: nowTime() },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] border-l border-border overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <span className="text-sm font-semibold text-foreground">Ask the agent</span>
          <span className="text-[10px] text-muted-foreground/50">via</span>
          <Badge variant="orange" className="text-[9px] px-1.5 py-0 font-mono">Coral MCP</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3 h-3" />
          </Button>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[9px] text-white font-bold">
            {initial}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center float-anim">
              <Zap className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Ready when you are</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
                Ask anything that spans the sources you've wired up. The agent will pick tools, fetch, and answer.
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="space-y-1.5 animate-fade-in">

            {/* ── User message ── */}
            {msg.role === 'user' && (
              <div className="flex items-end justify-end gap-2">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted-foreground/40">{msg.timestamp}</span>
                    <span className="text-[10px] font-medium text-muted-foreground/60">you</span>
                  </div>
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/25 text-sm text-foreground/90 leading-relaxed">
                    {msg.content}
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0 mb-0.5">
                  {initial}
                </div>
              </div>
            )}

            {/* ── Assistant message ── */}
            {msg.role === 'assistant' && (
              <div className="flex items-start gap-2">
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-border flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-orange-400" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Timestamp + label */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground/60">agent</span>
                    <span className="text-[9px] text-muted-foreground/40">{msg.timestamp}</span>
                  </div>

                  {/* Tool calls */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="space-y-1.5">
                      {msg.toolCalls.map(tc => (
                        <ToolCallCard key={tc.id} tc={tc} />
                      ))}
                    </div>
                  )}

                  {/* Response text */}
                  {msg.content && (
                    <div className="text-[13px] text-muted-foreground leading-relaxed">
                      <MessageContent text={msg.content} />
                    </div>
                  )}

                  {/* Evidence section */}
                  {msg.evidence && msg.evidence.length > 0 && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => setEvidenceOpen(o => ({ ...o, [msg.id]: !o[msg.id] }))}
                        className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span className="font-medium">Linked evidence</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span>{msg.evidence.length} views</span>
                        <ChevronRight
                          className={cn(
                            'w-3 h-3 transition-transform duration-200',
                            evidenceOpen[msg.id] && 'rotate-90'
                          )}
                        />
                      </button>

                      {evidenceOpen[msg.id] && (
                        <div className="space-y-1 animate-fade-in">
                          {msg.evidence.map(item => (
                            <EvidenceCard key={item.id + item.title} item={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.actions.map(action => {
                        const Icon = action.startsWith('Show')
                          ? Diff
                          : action.startsWith('Open')
                          ? ExternalLink
                          : Bell
                        return (
                          <button
                            key={action}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/60 hover:border-orange-500/40 bg-muted/30 hover:bg-orange-500/5 text-[10px] text-muted-foreground hover:text-orange-400 transition-all group"
                          >
                            <Icon className="w-2.5 h-2.5" />
                            {action}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-border flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3 text-orange-400" />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl rounded-tl-sm bg-muted/30 border border-border/40">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-orange-400/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggested prompts (if input empty) ── */}
      {input === '' && messages.length > 0 && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
          {['Show the diff', 'Open the Sentry issue', 'Notify #eng-alerts'].map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border border-border/50 hover:border-orange-500/30 bg-muted/20 hover:bg-orange-500/5 text-muted-foreground hover:text-orange-400 transition-all whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-end gap-2 bg-muted/20 border border-border/60 rounded-xl px-3 py-2 focus-within:border-orange-500/40 focus-within:bg-muted/30 transition-all">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What broke after the last deploy?"
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/35 resize-none focus:outline-none min-h-[24px] max-h-[100px] py-0.5 leading-5"
            style={{ scrollbarWidth: 'none' }}
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] text-muted-foreground/30 font-mono hidden sm:block">↵ send</span>
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-7 w-7 rounded-lg shrink-0"
            >
              {isLoading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Send className="w-3 h-3" />
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
