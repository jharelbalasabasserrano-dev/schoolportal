import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent, type ReactNode, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import ccdLogo from './assets/ccd-logo.png';
import collegeGate from './assets/college-gate.jpg';
import { useAuth } from './portalAuth';

// Add once to index.html (or a global stylesheet) so the type system below renders correctly:
// <link rel="preconnect" href="https://fonts.googleapis.com">
// <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";

type FieldErrors = { email?: string; password?: string };

function validate(emailValue: string, passwordValue: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!emailValue.trim()) {
    errors.email = 'Enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!passwordValue) {
    errors.password = 'Enter your password.';
  }
  return errors;
}

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showResetHelp, setShowResetHelp] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  if (user) return <Navigate to="/dashboard" replace />;

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    const errors = validate(loginEmail, loginPassword);
    setFieldErrors(errors);
    setFormError('');

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);

    // Simulate network delay for better UX
    const success = await new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(login(loginEmail.trim(), loginPassword, remember));
      }, 420);
    });

    if (success) {
      navigate('/dashboard');
    } else {
      setFormError('Invalid credentials. Please check your email and password.');
      setIsLoading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    performLogin(email, password);
  };

  const handleCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(event.getModifierState('CapsLock'));
  };

  return (
    <main
      className="min-h-screen bg-[#fbf8f2] text-[#15201a] lg:grid lg:grid-cols-[1fr_520px] xl:grid-cols-[1fr_620px]"
      style={{ fontFamily: FONT_BODY }}
    >
      {/* Hero Section */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#1b5e3a] lg:block">
        <img src={collegeGate} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(27,94,58,.90),rgba(27,94,58,.55)_48%,rgba(63,145,66,.30))]" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative flex min-h-screen flex-col justify-between p-14 text-white">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1 backdrop-blur-md">
              <img src={ccdLogo} alt="City College of Davao logo" className="h-full w-full object-contain" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: FONT_DISPLAY }}>
                CCDPortal
              </h1>
              <p className="text-sm font-semibold uppercase tracking-[.22em] text-white/75">School Request System</p>
            </div>
          </div>

          <div className="max-w-[620px]">
            <h2 className="text-4xl font-bold leading-[1.1] xl:text-5xl" style={{ fontFamily: FONT_DISPLAY }}>
              One portal for every campus request.
            </h2>
            <p className="mt-6 max-w-[580px] text-xl leading-8 text-white/85">
              Submit TOR and COE requests, reserve facilities, file leave applications, and track approvals - all in
              one place.
            </p>

            <div className="mt-10 grid max-w-[620px] grid-cols-3 gap-4">
              {[
                ['Documents', FileText],
                ['Facilities', Building2],
                ['Leave', CalendarClock],
              ].map(([label, Icon]) => (
                <div
                  key={label as string}
                  className="rounded-lg border border-white/20 bg-white/10 p-5 backdrop-blur-md transition-all hover:bg-white/15"
                >
                  <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-[#3f9142]/55 text-white">
                    <Icon size={22} />
                  </div>
                  <p className="font-semibold">{label as string}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-white/70">(c) 2026 CCDPortal. All rights reserved.</p>
        </div>
      </section>

      {/* Login Form */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {/* Mobile Header */}
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white p-2 shadow-sm">
                <img src={ccdLogo} alt="City College of Davao" className="h-full w-full object-contain" />
              </span>
              <div>
                <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: FONT_DISPLAY }}>
                  CCDPortal
                </h1>
                <p className="text-sm text-slate-600">School Request System</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-8" noValidate aria-busy={isLoading}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[.32em] text-[#1b5e3a]">Sign in</p>
                <h2 className="mt-2 text-4xl font-bold tracking-tight" style={{ fontFamily: FONT_DISPLAY }}>
                  Welcome back
                </h2>
                <p className="mt-3 text-xl leading-relaxed text-slate-700">
                  Access your dashboard to manage requests, approvals, and notifications.
                </p>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#dcd3c2] bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
                <Lock size={12} /> Campus accounts only
              </span>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block font-medium text-slate-700">
                Email address
              </label>
              <div
                className={`flex h-14 items-center rounded-lg border bg-white px-4 transition-all focus-within:ring-4 ${
                  fieldErrors.email
                    ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100'
                    : 'border-[#d9d3cc] focus-within:border-[#1b5e3a] focus-within:ring-[#e8a23d]/20'
                }`}
              >
                <Mail size={20} className="mr-3 flex-shrink-0 text-slate-500" />
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="you@edu.portal"
                  className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-slate-400"
                  disabled={isLoading}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  required
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle size={14} /> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-2 block font-medium text-slate-700">
                Password
              </label>
              <div
                className={`flex h-14 items-center rounded-lg border bg-white px-4 transition-all focus-within:ring-4 ${
                  fieldErrors.password
                    ? 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100'
                    : 'border-[#d9d3cc] focus-within:border-[#1b5e3a] focus-within:ring-[#e8a23d]/20'
                }`}
              >
                <Lock size={20} className="mr-3 flex-shrink-0 text-slate-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                  placeholder="Enter your password"
                  className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-slate-400"
                  disabled={isLoading}
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
                  <AlertCircle size={14} /> {fieldErrors.password}
                </p>
              )}
              {capsLockOn && !fieldErrors.password && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-600">
                  <AlertTriangle size={14} /> Caps Lock is on
                </p>
              )}
            </div>

            {/* Options */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-5 w-5 rounded accent-[#3f9142]"
                    disabled={isLoading}
                  />
                  <span className="text-slate-700">Remember me</span>
                </label>

                <button
                  type="button"
                  aria-expanded={showResetHelp}
                  className="font-medium text-[#1b5e3a] transition-colors hover:text-[#123a26]"
                  onClick={() => setShowResetHelp((v) => !v)}
                >
                  Forgot password?
                </button>
              </div>
              <p className="ml-8 mt-1.5 text-sm text-slate-500">Stay signed in for 30 days on this device.</p>

              {showResetHelp && (
                <div
                  role="region"
                  aria-label="Password reset help"
                  className="mt-3 rounded-lg border border-dashed border-[#dcd3c2] bg-white/70 px-4 py-3 text-sm text-slate-600"
                >
                  <p>
                    Password resets go through the registrar's office. Email{' '}
                    <a href="mailto:itsupport@ccd.edu.ph" className="font-medium text-[#1b5e3a] underline">
                      itsupport@ccd.edu.ph
                    </a>{' '}
                    with your student or employee ID.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowResetHelp(false)}
                    className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
                  >
                    Got it
                  </button>
                </div>
              )}
            </div>

            {formError && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#1b5e3a] px-6 text-lg font-semibold text-white transition-all hover:bg-[#154a30] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to dashboard
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" replace />;
}