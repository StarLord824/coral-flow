import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAgent } from '@/lib/agent'

const SOURCE_HELP: Record<string, { label: string; hint: string }> = {
  github: { label: 'GitHub', hint: 'Personal access token with repo + read:org scope.' },
  sentry: { label: 'Sentry', hint: 'Auth token with project:read scope.' },
  linear: { label: 'Linear', hint: 'Personal API key from Linear settings.' },
  slack: { label: 'Slack', hint: 'Bot token (chat:write). Invite the bot to your channel.' },
}

const CONNECTOR_ENV_MAP: Record<string, { env: string; label: string; required: boolean }[]> = {
  github: [{ env: 'GITHUB_TOKEN', label: 'Personal Access Token', required: true }],
  sentry: [
    { env: 'SENTRY_TOKEN', label: 'Auth Token', required: true },
    { env: 'SENTRY_ORG', label: 'Organization Slug', required: true },
  ],
  linear: [{ env: 'LINEAR_API_KEY', label: 'API Key', required: true }],
  datadog: [
    { env: 'DD_API_KEY', label: 'API Key', required: true },
    { env: 'DD_APPLICATION_KEY', label: 'Application Key', required: true },
    { env: 'DD_SITE', label: 'Site (e.g. datadoghq.com)', required: false },
  ],
  pagerduty: [{ env: 'PAGERDUTY_TOKEN', label: 'API Token', required: true }],
  slack: [{ env: 'SLACK_BOT_TOKEN', label: 'Bot OAuth Token (xoxb-)', required: true }],
  notion: [{ env: 'NOTION_API_KEY', label: 'Integration Token', required: true }],
  stripe: [{ env: 'STRIPE_API_KEY', label: 'Secret Key', required: true }],
  jira: [
    { env: 'JIRA_URL', label: 'Instance URL', required: true },
    { env: 'JIRA_USERNAME', label: 'Email', required: true },
    { env: 'JIRA_API_TOKEN', label: 'API Token', required: true },
  ],
  confluence: [
    { env: 'CONFLUENCE_URL', label: 'Instance URL', required: true },
    { env: 'CONFLUENCE_USERNAME', label: 'Email', required: true },
    { env: 'CONFLUENCE_API_TOKEN', label: 'API Token', required: true },
  ],
  gitlab: [
    { env: 'GITLAB_TOKEN', label: 'Personal Access Token', required: true },
    { env: 'GITLAB_BASE_URL', label: 'Base URL (self-hosted)', required: false },
  ],
  grafana: [
    { env: 'GRAFANA_URL', label: 'Instance URL', required: true },
    { env: 'GRAFANA_TOKEN', label: 'Service Account Token', required: true },
  ],
  clickup: [{ env: 'CLICKUP_API_KEY', label: 'API Key', required: true }],
  intercom: [{ env: 'INTERCOM_ACCESS_TOKEN', label: 'Access Token', required: true }],
  launchdarkly: [{ env: 'LAUNCHDARKLY_SDK_KEY', label: 'SDK Key', required: true }],
  incident_io: [{ env: 'INCIDENT_IO_API_KEY', label: 'API Key', required: true }],
  posthog: [
    { env: 'POSTHOG_API_KEY', label: 'Personal API Key', required: true },
    { env: 'POSTHOG_HOST', label: 'Host (cloud or self-hosted)', required: false },
  ],
  wandb: [{ env: 'WANDB_API_KEY', label: 'API Key', required: true }],
  openobserve: [
    { env: 'OPENOBSERVE_URL', label: 'Instance URL', required: true },
    { env: 'OPENOBSERVE_USERNAME', label: 'Username', required: true },
    { env: 'OPENOBSERVE_PASSWORD', label: 'Password', required: true },
  ],
  statusgator: [{ env: 'STATUSGATOR_API_KEY', label: 'API Key', required: true }],
  cloudwatch_logs: [
    { env: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID', required: true },
    { env: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key', required: true },
    { env: 'AWS_REGION', label: 'Region', required: true },
  ],
  cloudwatch_metrics: [
    { env: 'AWS_ACCESS_KEY_ID', label: 'Access Key ID', required: true },
    { env: 'AWS_SECRET_ACCESS_KEY', label: 'Secret Access Key', required: true },
    { env: 'AWS_REGION', label: 'Region', required: true },
  ],
}

type Props = {
  sourceType: string | null
  onClose: () => void
}

export default function ConnectSourceModal({ sourceType, onClose }: Props) {
  const { connectSource } = useAgent()
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [scope, setScope] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    setCredentials({})
    setScope('')
    setError('')
  }, [sourceType])

  const help = sourceType ? SOURCE_HELP[sourceType] ?? { label: sourceType, hint: '' } : null
  const fields = sourceType ? (CONNECTOR_ENV_MAP[sourceType] || [{ env: 'TOKEN', label: 'Token', required: true }]) : []
  const canSubmit = fields.every(f => !f.required || !!credentials[f.env]?.trim())

  const submit = async () => {
    if (!sourceType || !canSubmit) return
    setLoading(true); setError('')
    try {
      await connectSource(sourceType, credentials, scope.trim() || undefined)
      setCredentials(''); setScope('')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect source')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={!!sourceType} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-orange-400" />
              </div>
              <Dialog.Title className="text-base font-semibold text-foreground">
                Connect {help?.label}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-xs text-muted-foreground mb-4">{help?.hint}</p>

          <div className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.env} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{f.label} {f.required ? '' : '(Optional)'}</Label>
                <Input
                  type={f.env.toLowerCase().includes('password') || f.env.toLowerCase().includes('token') || f.env.toLowerCase().includes('secret') || f.env.toLowerCase().includes('key') ? "password" : "text"}
                  placeholder={f.label}
                  value={credentials[f.env] || ''}
                  onChange={e => setCredentials(prev => ({ ...prev, [f.env]: e.target.value }))}
                  autoFocus={i === 0}
                />
              </div>
            ))}
            {sourceType === 'github' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Scope (optional)</Label>
                <Input placeholder="owner/repo or owner/*" value={scope} onChange={e => setScope(e.target.value)} />
              </div>
            )}
            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </Dialog.Close>
            <Button size="sm" onClick={submit} disabled={!canSubmit || loading} className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Connect
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 mt-4">
            Tokens are encrypted at rest and injected only into your isolated sandbox.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
