import React from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Search, Plus, ChevronRight, Lock } from 'lucide-react'

type Source = {
  id: string
  label: string
  type: 'github' | 'sentry' | 'slack' | 'linear' | 'postgres' | 'stripe' | 'notion' | 'jira' | 'desktop' | 'aws'
  tags: string[]
  available: boolean
  color: string
}

const SOURCES: Source[] = [
  { id: 'github', label: 'GitHub', type: 'github', tags: ['PRs', 'issues', 'diffs'], available: true, color: '#6e40c9' },
  { id: 'sentry', label: 'Sentry', type: 'sentry', tags: ['errors', 'traces'], available: true, color: '#F55247' },
  { id: 'slack', label: 'Slack', type: 'slack', tags: ['channels', 'threads'], available: true, color: '#4A154B' },
  { id: 'linear', label: 'Linear', type: 'linear', tags: ['issues', 'cycles'], available: true, color: '#5E6AD2' },
  { id: 'postgres', label: 'Postgres', type: 'postgres', tags: ['tables', 'queries'], available: true, color: '#336791' },
  { id: 'stripe', label: 'Stripe', type: 'stripe', tags: ['payments', 'events'], available: true, color: '#635BFF' },
  { id: 'notion', label: 'Notion', type: 'notion', tags: ['pages', 'docs'], available: true, color: '#ffffff' },
  { id: 'jira', label: 'Jira', type: 'jira', tags: ['tickets', 'sprints'], available: true, color: '#0052CC' },
  { id: 'desktop', label: 'Desktop', type: 'desktop', tags: ['files', 'apps'], available: true, color: '#888888' },
  { id: 'aws', label: 'AWS', type: 'aws', tags: ['logs', 'services'], available: true, color: '#FF9900' },
]

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  ),
  sentry: (
    <svg viewBox="0 0 72 66" fill="currentColor" className="w-4 h-4">
      <path d="M29.976 4.71L.613 56.956a4.04 4.04 0 0 0 3.501 6.043h12.42c.45-6.426 2.985-15.474 9.717-23.61C18.11 35.17 12.957 28.82 12.957 21.3c0-7.657 5.323-14.105 12.48-15.728L29.976 4.71zM37.018 0a4.04 4.04 0 0 0-3.503 2.022l-3.26 5.648C32.67 7.128 35.01 6.837 37.018 6.837c12.07 0 21.886 9.815 21.886 21.886 0 5.916-2.347 11.285-6.151 15.224a53.5 53.5 0 0 1 5.532 10.007h6.195L37.018 0z" />
    </svg>
  ),
  slack: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zm2.521-10.123a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  ),
  linear: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M0 13.432L10.568 24l13.43-13.432L13.432 0 0 13.432zm3.316-3.317L12 1.63l9.37 9.37L12 20.37l-8.684-8.684v-.57z" />
    </svg>
  ),
  postgres: <span className="text-[10px] font-bold">PG</span>,
  stripe: <span className="text-[10px] font-bold">ST</span>,
  notion: <span className="text-[10px] font-bold">N</span>,
  jira: <span className="text-[10px] font-bold">J</span>,
  desktop: <span className="text-[10px] font-bold">D</span>,
  aws: <span className="text-[10px] font-bold">AWS</span>,
}

type SidebarProps = {
  onAddSource: (sourceType: string) => void
}

export default function Sidebar({ onAddSource }: SidebarProps) {
  const [search, setSearch] = React.useState('')

  const available = SOURCES.filter(s => s.available && s.label.toLowerCase().includes(search.toLowerCase()))
  const comingSoon = SOURCES.filter(s => !s.available && s.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-[200px] flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="px-3 py-3 border-b border-border flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">CF</span>
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">CoralFlow</span>
        </div>

        {/* Search */}
        <div className="px-2 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-md pl-6 pr-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {/* Available v1 */}
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
              Available · v1
            </span>
          </div>

          <div className="space-y-0.5 px-1.5 mb-3">
            {available.map(source => (
              <Tooltip key={source.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onAddSource(source.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg group transition-all duration-150',
                      'hover:bg-muted/60 hover:border-border border border-transparent'
                    )}
                    style={{ '--src-color': source.color } as React.CSSProperties}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${source.color}22`,
                        border: `1px solid ${source.color}44`,
                        color: source.color,
                      }}
                    >
                      {SOURCE_ICONS[source.id]}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs font-medium text-foreground group-hover:text-white transition-colors">
                        {source.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {source.tags.join(' · ')}
                      </p>
                    </div>
                    <Plus className="w-3 h-3 text-muted-foreground/40 group-hover:text-orange-400 transition-colors opacity-0 group-hover:opacity-100" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Add {source.label} source to canvas</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Separator className="mx-3 mb-3" />

          {/* Coming Soon */}
          <div className="px-3 py-1.5">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">
              Coming Soon
            </span>
          </div>

          <div className="space-y-0.5 px-1.5">
            {comingSoon.map(source => (
              <div
                key={source.id}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg opacity-50 cursor-not-allowed"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${source.color}11`,
                    border: `1px solid ${source.color}22`,
                    color: source.color,
                  }}
                >
                  {SOURCE_ICONS[source.id]}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-medium text-muted-foreground">{source.label}</p>
                  <p className="text-[9px] text-muted-foreground/50">{source.tags.join(' · ')}</p>
                </div>
                <Lock className="w-3 h-3 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-3 py-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[9px] text-white font-bold">
            L
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">luca's workspace</p>
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </div>
      </aside>
    </TooltipProvider>
  )
}
