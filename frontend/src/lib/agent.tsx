import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, type Agent, type AgentSource } from './api'

type AgentState = {
  agent: Agent | null
  sources: AgentSource[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  connectSource: (sourceType: string, credentials: Record<string, string>, scope?: string) => Promise<void>
}

const AgentContext = createContext<AgentState | undefined>(undefined)

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [sources, setSources] = useState<AgentSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const { agent, sources } = await api.myAgent()
      setAgent(agent)
      setSources(sources)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load agent')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connectSource = useCallback(
    async (sourceType: string, credentials: Record<string, string>, scope?: string) => {
      if (!agent) throw new Error('No agent loaded')
      const { sources } = await api.injectToken(agent.id, sourceType, credentials, scope)
      setSources(sources)
    },
    [agent],
  )

  return (
    <AgentContext.Provider value={{ agent, sources, loading, error, refresh, connectSource }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be used within AgentProvider')
  return ctx
}
