interface ErrorStateProps {
  message?: string;
  error?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, error, onRetry }: ErrorStateProps) {
  const msg = message ?? error ?? 'An unknown error occurred';
  return (
    <div className="p-6">
      <div className="text-red-400 bg-red-900/20 border border-red-800 rounded p-4 text-sm">
        <p className="font-medium mb-1">Error</p>
        <p>{msg}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-xs bg-red-900 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="p-6 text-gray-500 text-sm animate-pulse">{label}</div>
  );
}
