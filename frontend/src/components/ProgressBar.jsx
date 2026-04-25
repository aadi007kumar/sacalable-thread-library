export default function ProgressBar({ label, value, tone = "bg-signal" }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-mist/75">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${tone} animate-pulsebar`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
