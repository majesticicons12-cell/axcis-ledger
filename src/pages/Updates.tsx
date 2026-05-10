import AppLayout from "@/components/AppLayout";
import { Newspaper, Calendar } from "lucide-react";

const updates = [
  {
    date: "Apr 2026",
    tag: "Budget 2026",
    title: "New tax slabs announced for FY 2026-27",
    desc: "Standard deduction raised to ₹85,000 in the new regime. 80C limit unchanged.",
  },
  {
    date: "Mar 2026",
    tag: "Deadline",
    title: "ITR filing for FY 2025-26 opens July 1",
    desc: "Don't wait till the last week. Salary class can use ITR-1 if income < ₹50L.",
  },
  {
    date: "Feb 2026",
    tag: "GST",
    title: "GST rate rationalisation effective April 1",
    desc: "Several daily-use items moved from 12% to 5% slab. Check the full list inside.",
  },
  {
    date: "Jan 2026",
    tag: "Compliance",
    title: "PAN-Aadhaar linking — final reminder",
    desc: "Inoperative PANs lead to higher TDS deduction. Link via the Income Tax portal.",
  },
];

const Updates = () => {
  return (
    <AppLayout>
      <header className="flex items-center justify-between px-5 pt-safe pt-4">
        <h1 className="text-xl font-bold">Tax Updates</h1>
        <Newspaper className="h-5 w-5 text-primary" />
      </header>

      <main className="px-5 pt-6">
        <p className="mb-5 text-sm text-muted-foreground">
          Latest news, deadlines & rule changes.
        </p>

        <div className="space-y-3">
          {updates.map((u, i) => (
            <article
              key={i}
              className="rounded-2xl bg-card p-5 shadow-soft transition-smooth active:scale-[0.99]"
            >
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-primary">
                  {u.tag}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {u.date}
                </span>
              </div>
              <h3 className="mb-1.5 text-base font-semibold leading-snug">
                {u.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {u.desc}
              </p>
            </article>
          ))}
        </div>
      </main>
    </AppLayout>
  );
};

export default Updates;
