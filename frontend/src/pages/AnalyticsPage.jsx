import BarChart from "../components/charts/BarChart";
import StackedTimeline from "../components/charts/StackedTimeline";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import StatCard from "../components/StatCard";
import { useAppContext } from "../context/AppContext";

export default function AnalyticsPage() {
  const {
    state: { analytics },
  } = useAppContext();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Runtime Metrics"
        title="Execution Analytics"
        description="Track throughput, wait time, and scheduling distribution with lightweight visual summaries."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Execution Time"
          value={`${analytics.totalExecutionTime}s`}
          accent="text-signal"
        />
        <StatCard
          label="Throughput"
          value={`${analytics.throughput}/s`}
          accent="text-lime"
        />
        <StatCard
          label="Avg Wait"
          value={`${analytics.averageWaitTime}s`}
          accent="text-amber-200"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h3 className="text-xl font-semibold">Priority Distribution</h3>
          <div className="mt-5">
            <BarChart
              data={analytics.priorityBreakdown}
              colors={["#fb7185", "#fcd34d", "#7dd3fc"]}
            />
          </div>
        </Panel>

        <Panel>
          <h3 className="text-xl font-semibold">State Distribution</h3>
          <div className="mt-5">
            <BarChart
              data={analytics.stateBreakdown}
              colors={["#7dd3fc", "#c4f16f", "#fcd34d"]}
            />
          </div>
        </Panel>
      </div>

      <Panel>
        <h3 className="text-xl font-semibold">Wait vs Execution Timeline</h3>
        <div className="mt-5">
          <StackedTimeline data={analytics.timeline} />
        </div>
      </Panel>
    </div>
  );
}
