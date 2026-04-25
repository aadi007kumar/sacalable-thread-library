export default function ActivityFeed({ items }) {
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-mist/70">No activity yet.</p>
      ) : null}
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-white">{item.title}</p>
            <span className="text-xs text-mist/60">
              {new Date(item.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="mt-2 text-sm text-mist/75">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}
