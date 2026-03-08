interface ErrorStateProps {
  message?: string;
  error?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, error, onRetry }: ErrorStateProps) {
  const msg = message ?? error ?? 'An unknown error occurred';
  return (
    <div className="p-6">
      <div className="border border-red-900/50 bg-red-950/20 rounded p-4">
        <p className="text-red-400 font-display font-semibold text-[10px] tracking-widest uppercase mb-1">
          Error
        </p>
        <p className="text-[#9c8f80] text-xs font-mono">{msg}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-xs bg-[#252018] hover:bg-[#3a3028] border border-[#3a3028] text-[#9c8f80] hover:text-[#f0ebe4] px-3 py-1.5 rounded transition-colors font-mono"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="p-6 space-y-2">
      <div className="h-4 w-32 bg-[#252018] rounded animate-pulse" />
      <div className="h-3 w-48 bg-[#1c1816] rounded animate-pulse" />
      <div className="h-3 w-40 bg-[#1c1816] rounded animate-pulse opacity-60" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
