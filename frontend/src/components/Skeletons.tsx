export function ClassCardSkeleton() {
  return (
    <div className="bg-surface border border-line rounded-sm overflow-hidden">
      <div className="w-full h-44 bg-line/40 animate-pulse-soft" />
      <div className="p-4 space-y-2">
        <div className="h-5 bg-line/40 rounded-sm w-3/4 animate-pulse-soft" />
        <div className="h-3 bg-line/30 rounded-sm w-1/3 animate-pulse-soft" />
        <div className="h-3 bg-line/30 rounded-sm w-full animate-pulse-soft" />
      </div>
    </div>
  );
}

export function ClassDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 w-full">
      <div className="w-full h-72 bg-line/40 rounded-sm animate-pulse-soft" />
      <div className="h-8 bg-line/40 rounded-sm w-2/3 mt-6 animate-pulse-soft" />
      <div className="h-4 bg-line/30 rounded-sm w-full mt-4 animate-pulse-soft" />
      <div className="h-4 bg-line/30 rounded-sm w-5/6 mt-2 animate-pulse-soft" />
    </div>
  );
}
