export default function Loading() {
  return (
    <div className="container max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-4 w-72 bg-muted rounded" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-12 bg-muted rounded" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-10 bg-muted rounded" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-10 bg-muted rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}
