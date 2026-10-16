export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-void-bg z-50">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="relative w-16 h-16">
          {/* Outer ring */}
          <div className="absolute inset-0 border-2 border-neon-cyan/30 rounded-full animate-spin"
               style={{ animationDuration: '3s' }} />
          {/* Inner ring */}
          <div className="absolute inset-2 border-2 border-transparent border-t-neon-magenta rounded-full animate-spin"
               style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
          {/* Core dot */}
          <div className="absolute inset-[26px] bg-neon-cyan rounded-full"
               style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
        </div>
        <span className="text-sm text-gray-400 font-body tracking-widest uppercase">
          Loading...
        </span>
      </div>
    </div>
  );
}
