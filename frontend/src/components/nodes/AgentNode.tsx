import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Cpu, Database, Zap } from 'lucide-react'

export type AgentNodeData = {
  label: string
  status: 'ready' | 'running' | 'idle' | 'error'
  model?: string
  sandbox?: string
  mcpTools?: number
  sources?: string[]
}

function AgentNode({ data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData

  const statusColor = {
    ready: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    running: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    idle: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30',
    error: 'text-red-400 bg-red-400/10 border-red-400/30',
  }[nodeData.status]

  const statusDot = {
    ready: 'bg-emerald-400',
    running: 'bg-orange-400 animate-pulse',
    idle: 'bg-zinc-500',
    error: 'bg-red-400',
  }[nodeData.status]

  return (
    <div
      className={cn(
        'min-w-[220px] rounded-xl overflow-hidden node-shadow transition-all duration-200',
        'border border-orange-500/40 bg-gradient-to-br from-orange-500/10 to-[#1a0f00]/80',
        selected && 'ring-2 ring-orange-500 ring-offset-0 glow-orange'
      )}
    >
      {/* Header strip */}
      <div className="h-0.5 w-full bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />

      {/* Title */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-orange-500/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{nodeData.label}</p>
            <p className="text-[10px] text-orange-400/60 uppercase tracking-wider">agent</p>
          </div>
        </div>

        <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold', statusColor)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', statusDot)} />
          {nodeData.status}
        </div>
      </div>

      {/* Info rows */}
      <div className="px-3 py-2 space-y-1.5">
        {nodeData.model && (
          <div className="flex items-center gap-2">
            <Cpu className="w-3 h-3 text-orange-400/60 shrink-0" />
            <span className="text-[10px] text-white/40">model</span>
            <span className="text-[10px] font-mono text-white/70 ml-auto">{nodeData.model}</span>
          </div>
        )}
        {nodeData.mcpTools !== undefined && (
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-orange-400/60 shrink-0" />
            <span className="text-[10px] text-white/40">mcp</span>
            <span className="text-[10px] font-mono text-white/70 ml-auto">
              {nodeData.mcpTools} tools via Coral MCP
            </span>
          </div>
        )}
        {nodeData.sandbox && (
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-orange-400/60 shrink-0" />
            <span className="text-[10px] text-white/40">sandbox</span>
            <span className="text-[10px] font-mono text-orange-400/80 ml-auto">{nodeData.sandbox}</span>
          </div>
        )}
      </div>

      {/* Source connections */}
      {nodeData.sources && nodeData.sources.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex gap-1 flex-wrap">
            {nodeData.sources.map((s) => (
              <span
                key={s}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400/70"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-6px]"
        style={{ background: '#f97316', borderColor: '#f97316' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-6px]"
        style={{ background: '#f97316', borderColor: '#f97316' }}
      />
    </div>
  )
}

export default memo(AgentNode)
