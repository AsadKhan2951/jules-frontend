import { useLocation } from "wouter";
import { ArrowDownLeft, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, BookOpen, ClipboardList, FilePlus2, PackageCheck } from "lucide-react";

/** The everyday jobs as big, plainly named buttons (the way the shop worked in Zewar). */
const TASKS = [
  { icon: FilePlus2, label: "New Sales Order", hint: "Customer ka naya order", path: "/orders/new" },
  { icon: ArrowDownLeft, label: "Cash Receive", hint: "Paisa aaya", path: "/finance?new=receipt" },
  { icon: ArrowUpRight, label: "Cash Payment", hint: "Paisa diya", path: "/finance?new=payment" },
  { icon: ArrowUpFromLine, label: "Issue to Karigar", hint: "Karigar ko sona diya", path: "/stock/VI" },
  { icon: ArrowDownToLine, label: "Return from Karigar", hint: "Karigar ne sona wapas kiya", path: "/stock/VR" },
  { icon: ClipboardList, label: "Karigar Statement", hint: "Karigar ka hisaab", path: "/stock-reports?tab=statement" },
  { icon: BookOpen, label: "Ledger Report", hint: "Kisi bhi account ka khata", path: "/finance?tab=ledger" },
  { icon: PackageCheck, label: "Stock Ready Item", hint: "Tayyar maal, deliver baqi", path: "/stock-reports?tab=ready" },
];

export function QuickTasks() {
  const [, setLocation] = useLocation();
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Quick tasks</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TASKS.map(task => (
          <button
            key={task.path}
            type="button"
            onClick={() => setLocation(task.path.includes("new=") ? `${task.path}&at=${Date.now()}` : task.path)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <task.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-foreground">{task.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{task.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default QuickTasks;
