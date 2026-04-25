export default function StackedTimeline({ data }) {
  const max = Math.max(...data.map((item) => item.wait + item.execution), 1);

  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <p className="text-sm text-mist/70">Analytics will populate after simulation runs.</p>
      ) : null}
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between text-sm text-mist/75">
            <span>{item.label}</span>
            <span>
              wait {item.wait}s / exec {item.execution}s
            </span>
          </div>
          <div className="flex h-4 overflow-hidden rounded-full bg-white/10">
            <div
              className="bg-amber-300"
              style={{ width: `${((item.wait || 0) / max) * 100}%` }}
            />
            <div
              className="bg-signal"
              style={{ width: `${((item.execution || 0) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
