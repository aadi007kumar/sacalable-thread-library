import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import ThreadCard from "../components/ThreadCard";
import { useAppContext } from "../context/AppContext";

export default function SchedulerSimulationPage() {
  const {
    state: { threads, scheduler },
    actions,
  } = useAppContext();

  const runningThread = threads.find((thread) => thread.id === scheduler.currentThreadId);
  const waitingThreads = threads.filter((thread) => thread.status === "waiting");
  const completedThreads = threads.filter((thread) => thread.status === "completed");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Execution Flow"
        title="Scheduler Simulation"
        description="Run the queue, pause execution, or reset the simulation to replay thread dispatch behavior."
        actions={[
          <button
            key="start"
            onClick={actions.startScheduler}
            className="rounded-full bg-lime px-5 py-3 font-semibold text-ink transition hover:brightness-110"
          >
            Start
          </button>,
          <button
            key="pause"
            onClick={actions.pauseScheduler}
            className="rounded-full border border-white/10 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
          >
            Pause
          </button>,
          <button
            key="reset"
            onClick={actions.resetSimulation}
            className="rounded-full border border-rose/30 bg-rose/10 px-5 py-3 font-semibold text-rose transition hover:bg-rose/20"
          >
            Reset
          </button>,
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h3 className="text-xl font-semibold">Current Execution</h3>
          <div className="mt-5">
            {runningThread ? (
              <ThreadCard thread={runningThread} active />
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 p-6 text-sm text-mist/75">
                No thread is running. Start the scheduler to dispatch the next item.
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <h3 className="text-xl font-semibold">State Breakdown</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <StatePill label="Running" value={runningThread ? 1 : 0} tone="bg-lime/15 text-lime" />
            <StatePill label="Waiting" value={waitingThreads.length} tone="bg-signal/15 text-signal" />
            <StatePill label="Completed" value={completedThreads.length} tone="bg-amber-300/15 text-amber-200" />
          </div>
          <div className="mt-6 space-y-3">
            {waitingThreads.slice(0, 4).map((thread) => (
              <div
                key={thread.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{thread.name}</p>
                  <p className="text-sm text-mist/70">{thread.priority} priority</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-mist/75">
                  Queue #{thread.queuePosition}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Execution Timeline</h3>
          <span className="text-sm text-mist/65">
            Running: {scheduler.isRunning ? "yes" : "no"}
          </span>
        </div>
        <div className="space-y-4">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              active={thread.id === scheduler.currentThreadId}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function StatePill({ label, value, tone }) {
  return (
    <div className={`rounded-[1.5rem] p-4 ${tone}`}>
      <p className="text-sm uppercase tracking-[0.28em] text-white/55">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
    </div>
  );
}
