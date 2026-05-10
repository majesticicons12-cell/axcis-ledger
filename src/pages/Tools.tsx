import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import {
  Calculator,
  Wallet,
  FileSearch,
  FileText,
  MessageSquare,
  History as HistoryIcon,
  ChevronRight,
} from "lucide-react";

const tools = [
  {
    to: "/calculator",
    icon: Calculator,
    title: "Tax Calculator",
    desc: "Old vs New regime — see your savings",
  },
  {
    to: "/tracker",
    icon: Wallet,
    title: "Income & Expenses",
    desc: "Track money, see tax estimate live",
  },
  {
    to: "/notice",
    icon: FileSearch,
    title: "Notice Analyzer",
    desc: "Decode 143(1), 139(9), 148 notices",
  },
  {
    to: "/itr",
    icon: FileText,
    title: "ITR Filing Helper",
    desc: "Pick the right form, gather docs",
  },
  {
    to: "/chat",
    icon: MessageSquare,
    title: "Ask AI CA",
    desc: "Anything about tax & finance",
  },
  {
    to: "/history",
    icon: HistoryIcon,
    title: "History",
    desc: "All your chats, notices & ITR sessions",
  },
];

const Tools = () => {
  return (
    <AppLayout>
      <header className="flex items-center justify-between px-5 pt-safe pt-4">
        <h1 className="text-xl font-bold">Tools</h1>
      </header>

      <main className="px-5 pt-6">
        <p className="mb-5 text-sm text-muted-foreground">
          All your tax & finance tools in one place.
        </p>

        <div className="space-y-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-soft transition-smooth active:scale-[0.98]"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-6 w-6" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.desc}</div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </main>
    </AppLayout>
  );
};

export default Tools;
