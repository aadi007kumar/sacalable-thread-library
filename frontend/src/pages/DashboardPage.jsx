import ActivityFeed from "../components/ActivityFeed";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import ProgressBar from "../components/ProgressBar";
import StatCard from "../components/StatCard";
import { useAppContext } from "../context/AppContext";

export default function DashboardPage() {
  const {
    state: { totals, activityLog, analytics },
  } = useAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Thread Operations Dashboard"
        description="Monitor thread volume, completion flow, and recent runtime events from a single control surface."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Threads"
          value={totals.total}
          accent="text-signal"
          helper="All queued and processed tasks."
        />
        <StatCard
          label="Active Threads"
          value={totals.active}
          accent="text-lime"
          helper="Currently dispatched by the scheduler."
        />
        <StatCard
          label="Completed"
          value={totals.completed}
          accent="text-amber-200"
          helper={`Throughput ${analytics.throughput}/s`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <h3 className="text-xl font-semibold">Execution Progress</h3>
          <div className="mt-5 space-y-5">
            <ProgressBar
              label="Overall completion"
              value={totals.completionRate}
              tone="bg-lime"
            />
            <ProgressBar
              label="Threads waiting"
              value={totals.total === 0 ? 0 : Math.round((totals.waiting / totals.total) * 100)}
            />
            <ProgressBar
              label="Runtime utilization"
              value={totals.total === 0 ? 0 : Math.round((totals.active / totals.total) * 100)}
              tone="bg-amber-300"
            />
          </div>
        </Panel>

        <Panel>
          <h3 className="text-xl font-semibold">Runtime Snapshot</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Metric title="Avg Wait" value={`${analytics.averageWaitTime}s`} />
            <Metric title="Exec Time" value={`${analytics.totalExecutionTime}s`} />
            <Metric title="Waiting" value={totals.waiting} />
            <Metric title="Runtime" value={`${analytics.runtimeSeconds}s`} />
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Recent Activity</h3>
          <span className="text-sm text-mist/65">{activityLog.length} recent events</span>
        </div>
        <ActivityFeed items={activityLog} />
      </Panel>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm uppercase tracking-[0.28em] text-white/55">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
