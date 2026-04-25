import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import { useAppContext } from "../context/AppContext";

export default function AISuggestionsPage() {
  const {
    state: { suggestions, totals, settings },
    actions,
  } = useAppContext();

  const switchMode = async (mode) => {
    await actions.updateSettings({
      schedulingType: mode,
      simulationSpeed: settings.simulationSpeed,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mock Assistant"
        title="AI Scheduling Suggestions"
        description="Review simulated optimization advice, bottleneck detection, and tuning tips derived from live queue conditions."
      />

      <Panel>
        <div className="grid gap-4 md:grid-cols-3">
          <SignalCard label="Waiting Threads" value={totals.waiting} />
          <SignalCard label="Completed Threads" value={totals.completed} />
          <SignalCard label="Current Strategy" value={settings.schedulingType} />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Assistant Insights</h3>
            <span className="text-sm text-mist/65">
              {suggestions.generatedAt
                ? `Updated ${new Date(suggestions.generatedAt).toLocaleTimeString()}`
                : "Live recommendations"}
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {suggestions.suggestions.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.5rem] border border-white/10 bg-panel/70 p-5"
              >
                <p className="text-sm uppercase tracking-[0.28em] text-signal/75">
                  {item.title}
                </p>
                <p className="mt-3 text-lg font-medium text-white">{item.insight}</p>
                <p className="mt-3 text-sm text-mist/75">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h3 className="text-xl font-semibold">Quick Actions</h3>
          <div className="mt-5 space-y-3">
            <button
              onClick={() => switchMode("FIFO")}
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left font-medium text-white transition hover:bg-white/15"
            >
              Use FIFO scheduling
            </button>
            <button
              onClick={() => switchMode("Priority")}
              className="w-full rounded-2xl border border-lime/40 bg-lime/10 px-4 py-3 text-left font-medium text-lime transition hover:bg-lime/20"
            >
              Switch to Priority scheduling
            </button>
            <button
              onClick={actions.startScheduler}
              className="w-full rounded-2xl border border-signal/40 bg-signal/10 px-4 py-3 text-left font-medium text-signal transition hover:bg-signal/20"
            >
              Resume scheduler
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SignalCard({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
      <p className="text-sm uppercase tracking-[0.28em] text-white/55">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
