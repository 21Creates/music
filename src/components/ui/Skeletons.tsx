export function CardSkeleton() {
  return (
    <div className="surface p-4 animate-fade-in">
      <div className="skeleton w-full aspect-square rounded-xl mb-3" />
      <div className="skeleton h-4 w-3/4 rounded mb-2" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

export function TrackRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl">
      <div className="skeleton w-12 h-12 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-3 w-1/5 rounded" />
      </div>
      <div className="skeleton h-3 w-12 rounded" />
    </div>
  );
}

export function SkeletonRow() {
  return <TrackRowSkeleton />;
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <TrackRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: typeof import('lucide-react').Music;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="glass-card p-8 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-ink-800 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-muted" />
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      {description && <p className="text-xs text-muted max-w-xs mx-auto">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-4 text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
}

export function EqualizerBars({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-end gap-0.5 h-5 ${className}`}>
      <div className="eq-bar h-3" />
      <div className="eq-bar h-5" />
      <div className="eq-bar h-2.5" />
      <div className="eq-bar h-4" />
    </div>
  );
}
