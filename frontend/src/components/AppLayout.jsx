import { NavLink } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { classNames } from "../utils/classNames";

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/threads", label: "Threads" },
  { to: "/scheduler", label: "Scheduler" },
  { to: "/analytics", label: "Analytics" },
  { to: "/ai-suggestions", label: "AI Suggestions" },
  { to: "/settings", label: "Settings" },
];

export default function AppLayout({ children }) {
  const {
    state: { scheduler, settings, error },
  } = useAppContext();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.14),_transparent_30%),linear-gradient(160deg,_#07111f_15%,_#102844_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 lg:px-6">
        <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-signal/80">
                Scalable Thread Library
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Management System
              </h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatusBadge
                label="Scheduler"
                value={scheduler.isRunning ? "Running" : "Paused"}
                tone={scheduler.isRunning ? "lime" : "rose"}
              />
              <StatusBadge
                label="Mode"
                value={settings.schedulingType}
                tone="signal"
              />
              <StatusBadge
                label="Speed"
                value={`${settings.simulationSpeed}x`}
                tone="ember"
              />
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-3">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  classNames(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-lime text-ink"
                      : "bg-white/10 text-mist hover:bg-white/15"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function StatusBadge({ label, value, tone }) {
  const tones = {
    lime: "border-lime/40 bg-lime/10 text-lime",
    rose: "border-rose/40 bg-rose/10 text-rose",
    signal: "border-signal/40 bg-signal/10 text-signal",
    ember: "border-ember/40 bg-ember/10 text-amber-200",
  };

  return (
    <div className={classNames("rounded-2xl border px-4 py-3", tones[tone])}>
      <p className="text-xs uppercase tracking-[0.28em] text-white/60">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
