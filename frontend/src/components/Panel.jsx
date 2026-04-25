import { classNames } from "../utils/classNames";

export default function Panel({ className, children }) {
  return (
    <section
      className={classNames(
        "rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur animate-floatup",
        className
      )}
    >
      {children}
    </section>
  );
}
