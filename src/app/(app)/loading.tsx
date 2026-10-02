export default function AppLoading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full rounded-md bg-muted" />
      </div>
      <div className="h-24 rounded-xl border bg-muted/40" />
      <div className="overflow-hidden rounded-xl border">
        <div className="h-10 border-b bg-muted/50" />
        <div className="space-y-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-12 items-center gap-3 border-b px-4 last:border-b-0"
            >
              <div className="h-3 w-1/3 rounded bg-muted" />
              <div className="h-3 w-1/5 rounded bg-muted" />
              <div className="ml-auto h-3 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
