import { classNames } from "../utils/classNames";

const statusStyles = {
  waiting: "border-white/10 bg-white/5",
  running: "border-lime/40 bg-lime/10 shadow-[0_0_0_1px_rgba(196,241,111,0.25)]",
  completed: "border-signal/30 bg-signal/10",
};

const priorityStyles = {
  low: "text-signal",
  medium: "text-amber-200",
  high: "text-rose",
};

export default function ThreadCard({ thread, active }) {
  const completion = Math.round(
    ((thread.initialDuration - thread.remainingTime) / thread.initialDuration) * 100
  );

  return (
    <div
      className={classNames(
        "rounded-[1.5rem] border p-4 transition duration-300",
        statusStyles[thread.status],
        active ? "scale-[1.01]" : ""
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-lg font-semibold text-white">{thread.name}</p>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-mist/75">
              {thread.id}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-mist/75">
            <span className={priorityStyles[thread.priority]}>
              Priority: {thread.priority}
            </span>
            <span>Status: {thread.status}</span>
            <span>
              Queue: {thread.queuePosition ? `#${thread.queuePosition}` : "n/a"}
            </span>
          </div>
        </div>

        <div className="min-w-44 text-sm text-mist/75">
          <p>Remaining: {thread.remainingTime}s</p>
          <p>Execution: {thread.executionTime}s</p>
          <p>Wait: {thread.waitTime}s</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={classNames(
            "h-full rounded-full transition-all duration-500",
            thread.status === "running" ? "bg-lime" : "bg-signal"
          )}
          style={{ width: `${completion}%` }}
        />
      </div>
    </div>
  );
}
