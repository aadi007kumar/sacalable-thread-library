import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import { useAppContext } from "../context/AppContext";

export default function SettingsPage() {
  const {
    state: { settings },
    actions,
  } = useAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Scheduler Settings"
        description="Tune scheduling behavior, control simulation speed, and reset the environment."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel>
          <h3 className="text-xl font-semibold">Scheduling Mode</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["FIFO", "Priority"].map((mode) => (
              <button
                key={mode}
                onClick={() =>
                  actions.updateSettings({
                    schedulingType: mode,
                    simulationSpeed: settings.simulationSpeed,
                  })
                }
                className={`rounded-[1.5rem] border px-5 py-4 text-left transition ${
                  settings.schedulingType === mode
                    ? "border-lime/40 bg-lime/10 text-lime"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <p className="text-lg font-semibold">{mode}</p>
                <p className="mt-2 text-sm text-mist/75">
                  {mode === "FIFO"
                    ? "Process threads strictly by queue arrival."
                    : "Favor high-priority tasks while preserving FIFO ties."}
                </p>
              </button>
            ))}
          </div>

          <h3 className="mt-8 text-xl font-semibold">Simulation Speed</h3>
          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
            <input
              type="range"
              min="1"
              max="4"
              step="1"
              value={settings.simulationSpeed}
              onChange={(event) =>
                actions.updateSettings({
                  schedulingType: settings.schedulingType,
                  simulationSpeed: Number(event.target.value),
                })
              }
              className="w-full accent-sky-300"
            />
            <div className="mt-4 flex items-center justify-between text-sm text-mist/75">
              <span>1x</span>
              <span className="text-lg font-semibold text-white">
                {settings.simulationSpeed}x
              </span>
              <span>4x</span>
            </div>
          </div>
        </Panel>

        <Panel>
          <h3 className="text-xl font-semibold">System Controls</h3>
          <div className="mt-5 space-y-3">
            <button
              onClick={actions.resetSimulation}
              className="w-full rounded-2xl border border-signal/40 bg-signal/10 px-4 py-3 text-left font-medium text-signal transition hover:bg-signal/20"
            >
              Reset simulation state
            </button>
            <button
              onClick={actions.resetSystem}
              className="w-full rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-left font-medium text-rose transition hover:bg-rose/20"
            >
              Reset entire system
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
