import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
  MarkerType,
  Panel,
} from '@xyflow/react'

import Sidebar from '@/components/Sidebar'
import ChatPanel from '@/components/ChatPanel'
import TerminalPanel from '@/components/TerminalPanel'
import ConnectSourceModal from '@/components/ConnectSourceModal'
import SourceNode, { type SourceNodeData } from '@/components/nodes/SourceNode'
import AgentNode, { type AgentNodeData } from '@/components/nodes/AgentNode'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AgentProvider, useAgent } from '@/lib/agent'
import { useAuth } from '@/lib/auth'
import type { AgentSource } from '@/lib/api'
import { Plus, Settings, Bell, Layers, Zap, GitBranch, Activity, LogOut } from 'lucide-react'

const nodeTypes = { sourceNode: SourceNode, agentNode: AgentNode }

const SOURCE_META: Record<string, { label: string; details: string[]; color: string }> = {
  github: { label: 'GitHub', details: ['PRs', 'issues', 'diffs'], color: '#6e40c9' },
  sentry: { label: 'Sentry', details: ['errors', 'traces'], color: '#F55247' },
  slack: { label: 'Slack', details: ['post', 'notify'], color: '#4A154B' },
  linear: { label: 'Linear', details: ['issues', 'cycles'], color: '#5E6AD2' },
}

// Build canvas nodes/edges from the agent's real sources.
function deriveGraph(
  agentName: string,
  model: string,
  sandboxState: string,
  sources: AgentSource[],
): { nodes: Node[]; edges: Edge[] } {
  const sourceNodes: Node[] = sources.map((s, i) => {
    const meta = SOURCE_META[s.source_type] ?? { label: s.source_type, details: [], color: '#888' }
    return {
      id: `src-${s.source_type}`,
      type: 'sourceNode',
      position: { x: 80, y: 100 + i * 150 },
      data: {
        label: meta.label,
        sourceType: s.source_type as SourceNodeData['sourceType'],
        status: s.connected || s.token_last4 ? 'connected' : 'disconnected',
        scope: s.scope ?? '',
        token: s.token_last4 ?? '',
        details: meta.details,
      } satisfies SourceNodeData,
    }
  })

  const agentNode: Node = {
    id: 'agent-1',
    type: 'agentNode',
    position: { x: 440, y: 160 },
    data: {
      label: agentName,
      status: sandboxState === 'ready' ? 'ready' : 'idle',
      model,
      mcpTools: sources.length ? sources.length * 6 : 0,
      sandbox: '—',
      sources: sources.map(s => s.source_type),
    } satisfies AgentNodeData,
  }

  const edges: Edge[] = sourceNodes.map(n => ({
    id: `e-${n.id}`,
    source: n.id,
    target: 'agent-1',
    animated: true,
    style: { stroke: '#f97316', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316', width: 16, height: 16 },
  }))

  return { nodes: [...sourceNodes, agentNode], edges }
}

function DashboardInner() {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { agent, sources, loading, error } = useAgent()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [terminalCollapsed, setTerminalCollapsed] = useState(false)
  const [connectSourceType, setConnectSourceType] = useState<string | null>(null)

  // Re-derive the canvas whenever the agent/sources change.
  const graph = useMemo(
    () =>
      agent
        ? deriveGraph(agent.name, agent.model, agent.sandbox_state, sources)
        : { nodes: [], edges: [] },
    [agent, sources],
  )
  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [graph, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(eds =>
        addEdge(
          { ...params, animated: true, style: { stroke: '#f97316', strokeWidth: 2 } },
          eds,
        ),
      ),
    [setEdges],
  )

  const connectedCount = sources.filter(s => s.connected || s.token_last4).length
  const initial = (user?.email ?? 'U')[0].toUpperCase()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar onAddSource={setConnectSourceType} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 h-12 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/25">
              <Zap className="w-3 h-3 text-orange-400" />
              <span className="text-xs font-semibold text-orange-300">{agent?.name ?? 'agent'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              <span>{nodes.length} nodes</span><span>·</span><span>{edges.length} edges</span>
            </div>
            <Badge variant={connectedCount > 0 ? 'success' : 'outline'} className="gap-1 text-[10px]">
              <span className={cn('w-1.5 h-1.5 rounded-full', connectedCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500')} />
              {connectedCount > 0 ? `${connectedCount} connected` : 'No sources'}
            </Badge>
            <Badge variant="orange" className="gap-1 text-[10px]">
              <Activity className="w-2.5 h-2.5" />
              {agent?.sandbox_state ?? 'cold'}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-7 w-7"><Bell className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Settings className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { signOut().then(() => navigate('/login')) }}>
              <LogOut className="w-3.5 h-3.5" />
            </Button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-[10px] text-white font-bold ml-1">
              {initial}
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                  <span className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                </div>
              )}
              {error && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
                  {error}
                </div>
              )}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                defaultEdgeOptions={{ animated: true, style: { stroke: '#f97316', strokeWidth: 2 } }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ffffff08" />
                <Controls className="!bottom-4 !left-4" showInteractive={false} />
                <MiniMap
                  className="!bottom-4 !right-4"
                  nodeColor={n => (n.type === 'agentNode' ? '#f97316' : (n.data as SourceNodeData).status === 'connected' ? '#f97316' : '#3f3f46')}
                  maskColor="rgba(0,0,0,0.6)"
                />
                <Panel position="top-right" className="m-3">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg glass text-[10px] text-muted-foreground">
                    <GitBranch className="w-3 h-3" />
                    Add a source from the sidebar to connect it
                  </div>
                </Panel>
              </ReactFlow>
            </div>

            <TerminalPanel
              sandboxId={agent?.sandbox_id ?? 'no sandbox yet'}
              sandboxState={agent?.sandbox_state ?? 'cold'}
              collapsed={terminalCollapsed}
              onToggleCollapse={() => setTerminalCollapsed(c => !c)}
            />
          </div>

          <div className="w-[320px] flex-shrink-0 flex flex-col">
            <ChatPanel />
          </div>
        </div>
      </div>

      <ConnectSourceModal sourceType={connectSourceType} onClose={() => setConnectSourceType(null)} />
    </div>
  )
}

export default function Dashboard() {
  return (
    <AgentProvider>
      <DashboardInner />
    </AgentProvider>
  )
}
