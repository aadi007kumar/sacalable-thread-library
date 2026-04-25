import { useState } from "react";
import PageHeader from "../components/PageHeader";
import Panel from "../components/Panel";
import ThreadCard from "../components/ThreadCard";
import { useAppContext } from "../context/AppContext";

const initialForm = {
  name: "",
  priority: "medium",
  duration: 6,
};

export default function ThreadManagementPage() {
  const {
    state: { threads, settings },
    actions,
  } = useAppContext();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await actions.createThread(form);
      setForm(initialForm);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Queue Control"
        title="Thread Management"
        description={`Create tasks, assign priority, and inspect queue order. Current scheduler mode is ${settings.schedulingType}.`}
      />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel>
          <h3 className="text-xl font-semibold">Create Thread</h3>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <Field label="Thread Name">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-signal"
                placeholder="Example: Render Worker"
              />
            </Field>

            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({ ...current, priority: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-panel px-4 py-3 text-white outline-none focus:border-signal"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>

            <Field label="Estimated Duration">
              <input
                type="range"
                min="2"
                max="20"
                value={form.duration}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    duration: Number(event.target.value),
                  }))
                }
                className="w-full accent-lime"
              />
              <p className="mt-2 text-sm text-mist/70">{form.duration}s workload</p>
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-lime px-5 py-3 font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Queuing..." : "Add Thread"}
            </button>
          </form>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Queue Order</h3>
            <span className="text-sm text-mist/65">
              {settings.schedulingType === "FIFO"
                ? "Strict FIFO order"
                : "Priority with FIFO tie-break"}
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {threads.length === 0 ? (
              <p className="text-sm text-mist/70">Create your first thread to populate the queue.</p>
            ) : null}
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm uppercase tracking-[0.28em] text-white/55">
        {label}
      </span>
      {children}
    </label>
  );
}
