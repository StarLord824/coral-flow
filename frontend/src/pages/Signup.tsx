import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Sparkles, Github, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth'

const PERKS = [
  'Visual drag & drop canvas',
  'Isolated E2B sandboxes per agent',
  'Cross-source natural language queries',
  'GitHub · Sentry · Slack · Linear',
]

export default function Signup() {
  const navigate = useNavigate()
  const { signUpWithPassword, signInWithGitHub } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!name || !email || !password) { setError('Please fill in all fields.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await signUpWithPassword(email, password, name)
      // If email confirmation is enabled, there's no session yet.
      const { data } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession())
      if (data.session) navigate('/dashboard')
      else setInfo('Check your email to confirm your account, then sign in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGitHub = async () => {
    setError('')
    try {
      await signInWithGitHub()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub sign in failed.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#0d0500] via-[#180a00] to-background overflow-hidden items-center justify-center">
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
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px]" />

        <div className="relative z-10 px-12 select-none max-w-sm">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">CoralFlow</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
            Build agents that<br />
            <span className="text-gradient">understand everything.</span>
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed mb-10">
            One canvas. All your tools. Instant answers across GitHub, Slack, Linear, and Sentry.
          </p>

          <div className="space-y-3">
            {PERKS.map(perk => (
              <div key={perk} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
                <span className="text-sm text-zinc-400">{perk}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-white/5">
            <p className="text-xs text-zinc-600">
              Trusted by engineers at early-stage startups and hackathon teams worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">CoralFlow</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1.5">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              Free forever for personal use. No credit card required.
            </p>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
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
                  or create with email
                </span>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs text-muted-foreground">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input id="name" placeholder="Luca Rossi" value={name} onChange={e => setName(e.target.value)} className="pl-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Work email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
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
                  {password && (
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-0.5 flex-1 rounded-full transition-colors ${
                            password.length >= i * 2
                              ? i <= 2 ? 'bg-red-500' : i === 3 ? 'bg-amber-500' : 'bg-emerald-500'
                              : 'bg-border'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                    {error}
                  </p>
                )}
                {info && (
                  <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                    {info}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full gap-2 mt-2" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Get started free
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>

          <p className="text-center text-[10px] text-muted-foreground/40 mt-8">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
