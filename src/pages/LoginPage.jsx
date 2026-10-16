import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { signInGoogle, signInEmail, registerEmail } from '../lib/authService';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await registerEmail(email, password, displayName);
      } else {
        await signInEmail(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(isRegister ? t('auth.registerError') : t('auth.loginError'));
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
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-void-bg relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5"
           style={{
             backgroundImage: 'linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)',
             backgroundSize: '60px 60px',
           }} />

      {/* Floating glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-cyan/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-magenta/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in">
        {/* Language selector */}
        <div className="flex justify-center gap-2 mb-6">
          {['en', 'tr', 'nl'].map((lng) => (
            <button
              key={lng}
              id={`lang-${lng}`}
              onClick={() => changeLanguage(lng)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wider transition-all duration-200
                ${i18n.language === lng
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-gray-700'
                }`}
            >
              {lng}
            </button>
          ))}
        </div>

        {/* Login card */}
        <div className="glass-panel p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-neon-cyan tracking-wider mb-2">
              {t('app.title')}
            </h1>
            <p className="text-sm text-gray-400 tracking-wide">
              {t('app.subtitle')}
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-neon-red/10 border border-neon-red/30 text-neon-red text-sm text-center">
              {error}
            </div>
          )}

          {/* Auth form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="displayName" className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                  {t('auth.displayName')}
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-void-surface border border-void-border text-gray-200
                             placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30
                             transition-all duration-200"
                  placeholder="Commander Shepard"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg bg-void-surface border border-void-border text-gray-200
                           placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30
                           transition-all duration-200"
                placeholder="pilot@void.net"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wider">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg bg-void-surface border border-void-border text-gray-200
                           placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30
                           transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <button
              id="submit-auth"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-neon-cyan/20 text-neon-cyan font-semibold tracking-wider uppercase
                         border border-neon-cyan/40 hover:bg-neon-cyan/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? '...' : isRegister ? t('auth.register') : t('auth.login')}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-void-border" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-void-border" />
          </div>

          {/* Google sign-in */}
          <button
            id="google-sign-in"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-void-surface border border-void-border text-gray-300
                       hover:border-gray-600 hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('auth.googleSignIn')}
          </button>

          {/* Toggle login/register */}
          <p className="text-center mt-6 text-sm text-gray-500">
            {isRegister ? t('auth.hasAccount') : t('auth.noAccount')}{' '}
            <button
              id="toggle-auth-mode"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-neon-cyan hover:text-neon-cyan/80 transition-colors"
            >
              {isRegister ? t('auth.login') : t('auth.register')}
            </button>
          </p>
        </div>

        {/* Footer branding */}
        <p className="text-center mt-6 text-xs text-gray-600 tracking-widest uppercase">
          Unending Void v0.1
        </p>
      </div>
    </div>
  );
}
