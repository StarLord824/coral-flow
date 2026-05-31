import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Github, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const { signInWithPassword, signInWithGitHub } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      await signInWithPassword(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGitHub = async () => {
    setError('')
    try {
      await signInWithGitHub() // redirects to GitHub, returns to /dashboard
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub sign in failed.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#0d0500] via-[#180a00] to-background overflow-hidden items-center justify-center">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-orange-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-orange-500/10 rounded-full blur-[80px]" />

        {/* Center content */}
        <div className="relative z-10 text-center px-12 select-none">
          {/* Floating node demo */}
          <div className="relative flex items-center justify-center mb-12 h-64">
            {/* Center agent node */}
            <div className="float-anim relative z-10 px-5 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/40 glow-orange">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-white">agent</span>
              </div>
              <p className="text-[10px] text-orange-400/60 mt-0.5">claude-sonnet-4.6</p>
            </div>

            {/* Source nodes orbiting */}
            {[
              { label: 'GitHub', color: '#6e40c9', angle: -40, dist: 130 },
              { label: 'Sentry', color: '#F55247', angle: 40, dist: 130 },
              { label: 'Slack', color: '#4A154B', angle: 180, dist: 130 },
              { label: 'Linear', color: '#5E6AD2', angle: 220, dist: 130 },
            ].map((src) => {
              const rad = (src.angle * Math.PI) / 180
              const x = Math.cos(rad) * src.dist
              const y = Math.sin(rad) * src.dist
              return (
                <div
                  key={src.label}
                  className="absolute px-3 py-1.5 rounded-xl border text-xs font-medium text-white"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    background: `${src.color}15`,
                    borderColor: `${src.color}50`,
                    boxShadow: `0 0 12px ${src.color}30`,
                  }}
                >
                  {src.label}
                </div>
              )
            })}

            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
              {[
                { angle: -40, color: '#6e40c9' },
                { angle: 40, color: '#F55247' },
                { angle: 180, color: '#4A154B' },
                { angle: 220, color: '#5E6AD2' },
              ].map((line, i) => {
                const rad = (line.angle * Math.PI) / 180
                const x2 = 130 + Math.cos(rad) * 100
                const y2 = 130 + Math.sin(rad) * 100
                return (
                  <line
                    key={i}
                    x1="130" y1="130" x2={x2} y2={y2}
                    stroke={line.color}
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    strokeDasharray="4 4"
                  />
                )
              })}
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Connect your data.<br />
            <span className="text-gradient">Chat with it.</span>
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xs mx-auto">
            Drag & drop data sources onto the canvas, connect them, and get answers in plain English.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {['React Flow canvas', 'E2B sandboxes', 'Coral MCP', 'LangChain'].map(f => (
              <span key={f} className="px-2.5 py-1 rounded-full text-[10px] bg-white/5 border border-white/10 text-zinc-400">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center glow-orange-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">CoralFlow</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1.5">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your workspace and continue building agents.
            </p>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              {/* OAuth */}
              <Button
                variant="outline"
                className="w-full gap-2 h-11 mb-4"
                onClick={handleGitHub}
              >
                <Github className="w-4 h-4" />
                Continue with GitHub
              </Button>

              <div className="relative my-4">
                <Separator />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[11px] text-muted-foreground">
                  or
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                    <button type="button" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-9 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 mt-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign in
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>

          <p className="text-center text-[10px] text-muted-foreground/40 mt-8">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
