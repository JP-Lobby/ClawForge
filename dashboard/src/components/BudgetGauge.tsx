interface BudgetGaugeProps {
  spentCents: number;
  limitCents: number;
  label?: string;
  paused?: boolean;
}

export default function BudgetGauge({ spentCents, limitCents, label, paused }: BudgetGaugeProps) {
  const pct = limitCents > 0 ? Math.min((spentCents / limitCents) * 100, 100) : 0;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500';

  return (
    <div className="space-y-1">
      {(label || paused) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-gray-200 capitalize">{label}</span>}
          {paused && <span className="text-xs bg-red-800 text-red-200 px-1.5 py-0.5 rounded">paused</span>}
        </div>
      )}
      {limitCents > 0 ? (
        <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      ) : (
        <div className="h-1.5 bg-gray-800 rounded" />
      )}
      <div className="text-xs text-gray-500">
        ${(spentCents / 100).toFixed(4)}
        {limitCents > 0 && <span className="text-gray-600"> / ${(limitCents / 100).toFixed(2)}</span>}
        {limitCents > 0 && <span className="text-gray-600"> ({pct.toFixed(0)}%)</span>}
      </div>
    </div>
  );
}

export { BudgetGauge }
