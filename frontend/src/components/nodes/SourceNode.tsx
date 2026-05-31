import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export type SourceNodeData = {
  label: string
  sourceType: 'github' | 'sentry' | 'slack' | 'linear' | 'postgres' | 'stripe'
  status: 'connected' | 'disconnected' | 'connecting'
  scope?: string
  token?: string
  details?: string[]
}

const SOURCE_CONFIG = {
  github: {
    color: '#6e40c9',
    bg: 'from-[#6e40c9]/15 to-[#6e40c9]/5',
    border: 'border-[#6e40c9]/40',
    dot: 'bg-[#6e40c9]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
      </svg>
    ),
  },
  sentry: {
    color: '#F55247',
    bg: 'from-[#F55247]/15 to-[#F55247]/5',
    border: 'border-[#F55247]/40',
    dot: 'bg-[#F55247]',
    icon: (
      <svg viewBox="0 0 72 66" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M29.976 4.71L.613 56.956a4.04 4.04 0 0 0 3.501 6.043h12.42c.45-6.426 2.985-15.474 9.717-23.61C18.11 35.17 12.957 28.82 12.957 21.3c0-7.657 5.323-14.105 12.48-15.728L29.976 4.71zM37.018 0a4.04 4.04 0 0 0-3.503 2.022l-3.26 5.648C32.67 7.128 35.01 6.837 37.018 6.837c12.07 0 21.886 9.815 21.886 21.886 0 5.916-2.347 11.285-6.151 15.224a53.5 53.5 0 0 1 5.532 10.007h6.195L37.018 0z" />
        <path d="M37.018 15.38c-7.458 0-13.345 5.887-13.345 13.345 0 6.013 3.974 11.091 9.46 12.793a55.7 55.7 0 0 1 4.76-5.468 7.237 7.237 0 0 1-5.01-6.882 7.134 7.134 0 1 1 10.43 6.316 55.56 55.56 0 0 1 4.67 5.418c5.24-1.812 9.044-6.775 9.044-12.177 0-7.458-5.887-13.345-13.345-13.345h-.664z" />
      </svg>
    ),
  },
  slack: {
    color: '#E01E5A',
    bg: 'from-[#4A154B]/20 to-[#4A154B]/5',
    border: 'border-[#4A154B]/50',
    dot: 'bg-[#E01E5A]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zm2.521-10.123a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
  },
  linear: {
    color: '#5E6AD2',
    bg: 'from-[#5E6AD2]/15 to-[#5E6AD2]/5',
    border: 'border-[#5E6AD2]/40',
    dot: 'bg-[#5E6AD2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M0 13.432L10.568 24l13.43-13.432L13.432 0 0 13.432zm3.316-3.317L12 1.63l9.37 9.37L12 20.37l-8.684-8.684v-.57z" />
      </svg>
    ),
  },
  postgres: {
    color: '#336791',
    bg: 'from-[#336791]/15 to-[#336791]/5',
    border: 'border-[#336791]/40',
    dot: 'bg-[#336791]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#336791]">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/>
      </svg>
    ),
  },
  stripe: {
    color: '#635BFF',
    bg: 'from-[#635BFF]/15 to-[#635BFF]/5',
    border: 'border-[#635BFF]/40',
    dot: 'bg-[#635BFF]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#635BFF]">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
      </svg>
    ),
  },
}

function SourceNode({ data, selected }: NodeProps) {
  const nodeData = data as SourceNodeData
  const config = SOURCE_CONFIG[nodeData.sourceType] || SOURCE_CONFIG.github

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl border bg-gradient-to-br node-shadow transition-all duration-200 overflow-hidden',
        config.bg,
        config.border,
        selected && 'ring-2 ring-orange-500/60 ring-offset-0'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${config.color}22`, border: `1px solid ${config.color}44` }}
          >
            {config.icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{nodeData.label}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              {nodeData.sourceType} source
            </p>
          </div>
        </div>

        <Badge
          variant={nodeData.status === 'connected' ? 'orange' : nodeData.status === 'connecting' ? 'warning' : 'outline'}
          className="text-[10px] gap-1"
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              nodeData.status === 'connected' && 'bg-orange-400 animate-pulse',
              nodeData.status === 'connecting' && 'bg-amber-400 animate-pulse',
              nodeData.status === 'disconnected' && 'bg-zinc-500'
            )}
          />
          {nodeData.status}
        </Badge>
      </div>

      {/* Details */}
      {nodeData.details && nodeData.details.length > 0 && (
        <div className="px-3 py-2 space-y-1">
          {nodeData.details.map((detail, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="text-[10px] text-white/50 font-mono">{detail}</span>
            </div>
          ))}
        </div>
      )}

      {nodeData.scope && (
        <div className="px-3 py-1.5 border-t border-white/5 flex items-center gap-2">
          <span className="text-[10px] text-white/30">scope</span>
          <span className="text-[10px] font-mono text-white/60">{nodeData.scope}</span>
        </div>
      )}

      {nodeData.token && (
        <div className="px-3 py-1 border-t border-white/5 flex items-center gap-2">
          <span className="text-[10px] text-white/30">token</span>
          <span className="text-[10px] font-mono text-white/60">
            ●●●● {nodeData.token.slice(-4)}
          </span>
        </div>
      )}

      {/* Handles */}
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-6px]"
        style={{ background: config.color, borderColor: config.color }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-6px]"
        style={{ background: config.color, borderColor: config.color }}
      />
    </div>
  )
}

export default memo(SourceNode)
