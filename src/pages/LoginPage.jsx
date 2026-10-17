import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  signInGoogle,
  signInEmail,
  registerWithCredentials,
  loginLocalGuest,
  validateEmail,
  validateUsername,
  isUsernameAvailable,
} from '../lib/authService';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');

  // Username live availability state
  const [usernameStatus, setUsernameStatus] = useState(null); // 'available' | 'taken' | 'invalid' | null
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check username availability when user finishes typing
  const handleUsernameBlur = async () => {
    const clean = regUsername.trim();
    if (!clean) {
      setUsernameStatus(null);
      return;
    }
    if (!validateUsername(clean)) {
      setUsernameStatus('invalid');
      return;
    }

    setCheckingUsername(true);
    try {
      const available = await isUsernameAvailable(clean);
      setUsernameStatus(available ? 'available' : 'taken');
    } catch {
      setUsernameStatus(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanIdentifier = loginIdentifier.trim();
    if (!cleanIdentifier || cleanIdentifier.length < 3) {
      setError(t('auth.usernameMinLength'));
      return;
    }

    if (!loginPassword || loginPassword.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    setLoading(true);

    try {
      await signInEmail(cleanIdentifier, loginPassword);
      navigate('/dashboard');
    } catch (err) {
      console.error('[LoginPage] Login error:', err);
      if (
        err.message === 'INVALID_PASSWORD' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError(t('auth.invalidCredentials'));
      } else {
        setError(t('auth.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUsername = regUsername.trim();
    const cleanEmail = regEmail.trim();

    // 1. Username validation
    if (!validateUsername(cleanUsername)) {
      setError(t('auth.invalidUsernameFormat'));
      return;
    }

    // 2. Email validation
    if (!validateEmail(cleanEmail)) {
      setError(t('auth.invalidEmail'));
      return;
    }

    // 3. Password validation
    if (!regPassword || regPassword.length < 6) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    setLoading(true);

    try {
      await registerWithCredentials({
        username: cleanUsername,
        email: cleanEmail,
        password: regPassword,
        displayName: regDisplayName.trim() || cleanUsername,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('[LoginPage] Register error:', err);
      if (err.message === 'USERNAME_TAKEN') {
        setError(t('auth.usernameTaken'));
        setUsernameStatus('taken');
      } else if (err.message === 'EMAIL_IN_USE' || err.code === 'auth/email-already-in-use') {
        setError(t('auth.emailInUse'));
      } else if (err.message === 'INVALID_EMAIL') {
        setError(t('auth.invalidEmail'));
      } else if (err.message === 'INVALID_USERNAME_FORMAT') {
        setError(t('auth.invalidUsernameFormat'));
      } else {
        setError(t('auth.registerError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLocalGuest = async () => {
    setError('');
    setLoading(true);
    try {
      await loginLocalGuest('Void Operative');
      navigate('/dashboard');
    } catch (err) {
      console.error('[LoginPage] Guest login error:', err);
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInGoogle();
      navigate('/dashboard');
    } catch (err) {
      console.error('[LoginPage] Google sign-in error:', err);
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-void-bg relative overflow-hidden py-8">
      {/* Background grid effect */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-magenta/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        {/* Language selector */}
        <div className="flex justify-center gap-2 mb-6">
          {['en', 'tr', 'de'].map((lng) => (
            <button
              key={lng}
              id={`lang-${lng}`}
              onClick={() => changeLanguage(lng)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider transition-all duration-200 ${
                i18n.language === lng
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-gray-700'
              }`}
            >
              {lng}
            </button>
          ))}
        </div>

        {/* Login / Register Card */}
        <div className="glass-panel p-8 border border-neon-cyan/30 shadow-[0_0_25px_rgba(0,240,255,0.15)] rounded-xl">
          {/* Title */}
          <div className="text-center mb-6">
            <div className="inline-block px-2.5 py-0.5 mb-2 rounded border border-neon-cyan/40 bg-neon-cyan/10 text-[10px] uppercase font-mono tracking-widest text-neon-cyan">
              {t('auth.localModeBadge')}
            </div>
            <h1 className="font-display text-3xl font-bold text-neon-cyan tracking-wider mb-2">
              {t('app.title')}
            </h1>
            <p className="text-sm text-gray-400 tracking-wide">
              {t('app.subtitle')}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm text-center font-mono animate-fade-in">
              {error}
            </div>
          )}

          {isRegister ? (
            /* ========================================================
             * REGISTRATION FORM: Username + Email + Password + Callsign
             * ======================================================== */
            <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
              {/* Username Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="reg-username"
                    className="block text-xs text-gray-400 uppercase tracking-wider"
                  >
                    {t('auth.username')}
                  </label>
                  {checkingUsername ? (
                    <span className="text-[10px] text-gray-400 font-mono">
                      {t('auth.checkingAvailability')}
                    </span>
                  ) : usernameStatus === 'available' ? (
                    <span className="text-[10px] text-neon-green font-mono">
                      ✓ {t('auth.usernameAvailable')}
                    </span>
                  ) : usernameStatus === 'taken' ? (
                    <span className="text-[10px] text-neon-red font-mono">
                      ✕ {t('auth.usernameTaken')}
                    </span>
                  ) : null}
                </div>
                <input
                  id="reg-username"
                  type="text"
                  autoComplete="username"
                  value={regUsername}
                  onChange={(e) => {
                    setRegUsername(e.target.value);
                    if (usernameStatus) setUsernameStatus(null);
                  }}
                  onBlur={handleUsernameBlur}
                  required
                  minLength={3}
                  maxLength={20}
                  className={`w-full px-4 py-3 rounded-lg bg-void-surface border text-gray-200
                             placeholder-gray-600 focus:outline-none focus:ring-1 transition-all duration-200 font-mono text-sm ${
                               usernameStatus === 'taken'
                                 ? 'border-neon-red/60 focus:border-neon-red focus:ring-neon-red/30'
                                 : usernameStatus === 'available'
                                 ? 'border-neon-green/60 focus:border-neon-green focus:ring-neon-green/30'
                                 : 'border-void-border focus:border-neon-cyan/50 focus:ring-neon-cyan/30'
                             }`}
                  placeholder={t('auth.usernameInputPlaceholder')}
                />
              </div>

              {/* Email Address Field */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider"
                >
                  {t('auth.email')}
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-void-surface border border-void-border text-gray-200
                             placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30
                             transition-all duration-200 font-mono text-sm"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider"
                >
                  {t('auth.password')}
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-lg bg-void-surface border border-void-border text-gray-200
                             placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30
                             transition-all duration-200 font-mono text-sm"
                  placeholder="••••••••"
                />
              </div>

              {/* Callsign / Display Name Field */}
              <div>
                <label
                  htmlFor="reg-displayName"
                  className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider"
                >
                  {t('auth.displayName')}
                </label>
                <input
                  id="reg-displayName"
                  type="text"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-void-surface border border-void-border text-gray-200
                             placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30
                             transition-all duration-200 font-mono text-sm"
                  placeholder="Commander Shepard"
                />
              </div>

              {/* Submit Registration Button */}
              <button
                id="submit-auth"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-neon-cyan/20 text-neon-cyan font-semibold tracking-wider uppercase
                           border border-neon-cyan/40 hover:bg-neon-cyan/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? '...' : t('auth.register')}
              </button>
            </form>
          ) : (
            /* ========================================================
             * LOGIN FORM: Username or Email + Password
             * ======================================================== */
            <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider"
                >
                  {t('auth.usernameOrEmail')}
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  required
                  minLength={3}
                  className="w-full px-4 py-3 rounded-lg bg-void-surface border border-void-border text-gray-200
                             placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30
                             transition-all duration-200 font-mono text-sm"
                  placeholder={t('auth.usernamePlaceholder')}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider"
                >
                  {t('auth.password')}
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-lg bg-void-surface border border-void-border text-gray-200
                             placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30
                             transition-all duration-200 font-mono text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                id="submit-auth"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-neon-cyan/20 text-neon-cyan font-semibold tracking-wider uppercase
                           border border-neon-cyan/40 hover:bg-neon-cyan/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? '...' : t('auth.login')}
              </button>
            </form>
          )}

          {/* Quick Local Guest Access */}
          <div className="mt-4">
            <button
              id="quick-guest-btn"
              type="button"
              onClick={handleLocalGuest}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-neon-purple/10 text-neon-purple text-xs font-semibold tracking-wider uppercase
                         border border-neon-purple/40 hover:bg-neon-purple/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]
                         disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>{t('auth.localGuest')}</span>
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-1">
              {t('auth.guestNotice')}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-5">
            <div className="flex-1 h-px bg-void-border" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-void-border" />
          </div>

          {/* Google sign-in */}
          <button
            id="google-sign-in"
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-void-surface border border-void-border text-gray-300
                       hover:border-gray-600 hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center justify-center gap-3 text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t('auth.googleSignIn')}
          </button>

          {/* Toggle login/register */}
          <p className="text-center mt-6 text-sm text-gray-500">
            {isRegister ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
            <button
              id="toggle-auth-mode"
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setUsernameStatus(null);
              }}
              className="text-neon-cyan hover:text-neon-cyan/80 transition-colors font-medium ml-1"
            >
              {isRegister ? t('auth.login') : t('auth.register')}
            </button>
          </p>
        </div>

        {/* Footer branding */}
        <p className="text-center mt-6 text-xs text-gray-600 tracking-widest uppercase font-mono">
          Unending Void v1.0 // Cybernetic VTT
        </p>
      </div>
    </div>
  );
}
