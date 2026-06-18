import { Building2, CalendarClock, ChevronDown, Eye, EyeOff, FileText, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import ccdLogo from './assets/ccd-logo.png'
import collegeGate from './assets/college-gate.jpg'
import { useAuth } from './portalAuth'

export function LoginPage() {
  const { isInitializing, login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  if (isInitializing) return <AuthLoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (login(email, password, remember)) navigate('/dashboard')
    else setError('Invalid email or password.')
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-[#111111] lg:grid lg:grid-cols-[1fr_520px] xl:grid-cols-[1fr_620px]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#228b22] lg:block">
        <img src={collegeGate} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,139,34,.88),rgba(34,139,34,.58)_48%,rgba(76,187,23,.34))]" />
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative flex min-h-screen flex-col justify-between p-14 text-white">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden">
              <img src={ccdLogo} alt="City College of Davao logo" className="h-full w-full object-contain" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">CCDPortal</h1>
              <p className="text-sm font-semibold uppercase tracking-[.22em] text-white/75">School Request System</p>
            </div>
          </div>
          <div className="max-w-[620px]">
            <h2 className="text-5xl font-bold leading-tight">One portal for every campus request.</h2>
            <p className="mt-6 max-w-[580px] text-xl leading-8 text-white/85">Submit TOR and COE requests, reserve facilities, file leave applications, and track approvals all in one place.</p>
            <div className="mt-10 grid max-w-[620px] grid-cols-3 gap-4">
              {[
                ['Documents', FileText],
                ['Facilities', Building2],
                ['Leave', CalendarClock],
              ].map(([label, Icon]) => (
                <div key={label as string} className="rounded-lg border border-white/20 bg-white/15 p-4 backdrop-blur-md">
                  <span className="mb-8 flex h-10 w-10 items-center justify-center rounded-md bg-[#4cbb17]/55 text-white">
                    <Icon size={20} />
                  </span>
                  <p className="font-semibold">{label as string}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-white/70">Â© 2026 CCDPortal. A unified school request platform.</p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-10 lg:hidden">
            <span className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden">
              <img src={ccdLogo} alt="City College of Davao logo" className="h-full w-full object-contain" />
            </span>
            <h1 className="text-3xl font-bold">CCDPortal</h1>
          </div>
          <form onSubmit={submit}>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[.32em] text-[#228b22]">Sign in</p>
            <h2 className="text-4xl font-bold">Welcome back</h2>
            <p className="mt-4 max-w-lg text-xl leading-8 text-slate-700">Access your dashboard to manage requests, approvals, and notifications.</p>

            <label className="mt-10 block">
              <span className="mb-2 block font-medium">Email address</span>
              <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] bg-white px-4 focus-within:border-[#228b22] focus-within:ring-4 focus-within:ring-[#4cbb17]/20">
                <Mail size={20} className="mr-3 text-slate-500" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@edu.portal" className="min-w-0 flex-1 bg-transparent text-lg outline-none" />
              </span>
            </label>
            <label className="mt-5 block">
              <span className="mb-2 block font-medium">Password</span>
              <span className="flex h-14 items-center rounded-md border border-[#d9d3cc] bg-white px-4 focus-within:border-[#228b22] focus-within:ring-4 focus-within:ring-[#4cbb17]/20">
                <Lock size={20} className="mr-3 text-slate-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="min-w-0 flex-1 bg-transparent text-lg outline-none" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <div className="mt-5 flex items-center justify-between">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-5 w-5 rounded accent-[#4cbb17]" />
                Remember me
              </label>
              <button type="button" className="font-medium text-[#228b22]">Forgot password?</button>
            </div>
            {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 text-lg font-semibold text-white hover:bg-[#228b22]">
              Sign in to dashboard
              <ChevronDown className="-rotate-90" size={18} />
            </button>
          </form>

        </div>
      </section>
    </main>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isInitializing, user } = useAuth()
  if (isInitializing) return <AuthLoadingScreen />
  return user ? <>{children}</> : <Navigate to="/" replace />
}

function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f7] text-[#111111]">
      <div className="flex items-center gap-3 rounded-md border border-[#d9d3cc] bg-white px-5 py-4 shadow-sm">
        <span className="h-3 w-3 animate-pulse rounded-full bg-[#228b22]" />
        <span className="font-semibold text-slate-700">Loading your session...</span>
      </div>
    </main>
  )
}
