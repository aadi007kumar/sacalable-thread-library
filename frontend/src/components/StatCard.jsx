export default function StatCard({ label, value, accent, helper }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-panel/70 p-5">
      <p className="text-sm uppercase tracking-[0.28em] text-white/55">{label}</p>
      <p className={`mt-4 text-4xl font-semibold ${accent}`}>{value}</p>
      {helper ? <p className="mt-3 text-sm text-mist/75">{helper}</p> : null}
    </div>
  );
}
