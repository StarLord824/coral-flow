import React, { useState } from 'react'
import { Terminal, ChevronDown, X, Maximize2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type TerminalLine = {
  type: 'command' | 'output' | 'success' | 'error' | 'info'
  content: string
}

const DEMO_LINES: TerminalLine[] = [
  { type: 'info', content: '● sandbox coral-7a3f9c — healthy' },
  { type: 'command', content: 'agent@coral-sandbox-7a3f:~$ coral connect github --token ghp_••••a2f3' },
  { type: 'output', content: '→ validating github token... ok' },
  { type: 'output', content: '→ installing coral-github adapter... ok' },
  { type: 'success', content: '✓ connected github (token: ••••a2f3)' },
  { type: 'command', content: 'agent@coral-sandbox-7a3f:~$ coral connect sentry --token sk_••••9d12' },
  { type: 'output', content: '→ validating sentry token... ok' },
  { type: 'success', content: '✓ connected sentry (token: ••••9d12)' },
  { type: 'success', content: '⚡ 22 MCP tools registered. agent is ready.' },
  { type: 'command', content: 'agent@coral-sandbox-7a3f:~$ █' },
]

type TerminalPanelProps = {
  sandboxId?: string
  sandboxState?: string
  collapsed: boolean
  onToggleCollapse: () => void
}

// Reflects the real sandbox state. Live PTY streaming is a follow-up; for now we
// derive provisioning status from the agent's sandbox_state.
function linesForState(sandboxId: string, state: string): TerminalLine[] {
  if (state === 'ready') {
    return [
      { type: 'info', content: `● sandbox ${sandboxId} — healthy` },
      { type: 'output', content: '→ coral sources connected · opencode ready' },
      { type: 'success', content: '⚡ agent ready — ask a question in the chat panel' },
      { type: 'command', content: `agent@${sandboxId}:~$ █` },
    ]
  }
  if (state === 'spawning') {
    return [
      { type: 'info', content: '● provisioning sandbox…' },
      { type: 'output', content: '→ installing coral sources, writing opencode config' },
    ]
  }
  return [
    { type: 'info', content: '● no active sandbox' },
    { type: 'output', content: '→ send a message to spin one up (≈5-10s cold start)' },
  ]
}

export default function TerminalPanel({ sandboxId = '—', sandboxState = 'cold', collapsed, onToggleCollapse }: TerminalPanelProps) {
  const [copied, setCopied] = useState(false)
  const lines = linesForState(sandboxId, sandboxState)

  const copyLogs = () => {
    const text = lines.map(l => l.content).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={cn(
        'flex flex-col border-t border-border bg-[#0c0c0c] transition-all duration-300 ease-in-out',
        collapsed ? 'h-8' : 'h-[200px]'
      )}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>

          <Terminal className="w-3 h-3 text-muted-foreground" />

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="text-emerald-400">●</span>
            <span>sandbox – {sandboxId}</span>
          </div>

          <Badge variant="info" className="text-[9px] py-0 px-1.5">
            mcp.log
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={copyLogs}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5">
            <Maximize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onToggleCollapse}
          >
            <ChevronDown
              className={cn('w-3 h-3 transition-transform duration-200', collapsed && 'rotate-180')}
            />
          </Button>
        </div>
      </div>

      {/* Terminal body */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                'leading-5',
                line.type === 'command' && 'text-white',
                line.type === 'output' && 'text-zinc-400',
                line.type === 'success' && 'text-emerald-400',
                line.type === 'error' && 'text-red-400',
                line.type === 'info' && 'text-orange-400',
              )}
            >
              {line.content}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
