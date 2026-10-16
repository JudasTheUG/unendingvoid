import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Captured UI crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-void-bg flex items-center justify-center p-6 text-white font-sans">
          <div className="glass-panel p-8 max-w-lg w-full text-center border-l-4 border-l-neon-red shadow-[0_0_25px_rgba(255,51,68,0.3)]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-red/10 border border-neon-red flex items-center justify-center text-neon-red text-2xl font-bold animate-pulse">
              ⚠️
            </div>
            <h1 className="font-display text-xl font-black text-white tracking-wider mb-2">
              Neural Link Disconnected
            </h1>
            <p className="text-xs text-gray-400 font-mono mb-4">
              An unexpected diagnostic error interrupted the HUD interface.
            </p>
            {this.state.error && (
              <pre className="text-[11px] font-mono bg-black/50 p-3 rounded text-neon-red text-left overflow-x-auto mb-6 border border-white/5 max-h-36">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 text-xs font-mono font-bold uppercase tracking-wider transition-all"
              >
                Re-initialize HUD
              </button>
              <button
                onClick={() => (window.location.href = '/login')}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-mono uppercase tracking-wider transition-all"
              >
                Return to AirLock
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
