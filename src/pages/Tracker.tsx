import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

type Tx = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  note: string | null;
  occurred_on: string;
};

const incomeCats = ["Salary", "Freelance", "Business", "Capital gains", "Interest", "Rental", "Other"];
const expenseCats = ["Rent", "Food", "Travel", "Bills", "Health", "Investments", "Education", "Other"];

const Tracker = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Tx[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("Salary");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("occurred_on", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else setList((data ?? []) as Tx[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setCategory(type === "income" ? incomeCats[0] : expenseCats[0]);
  }, [type]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;
    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type,
      category,
      amount: Number(amount),
      note: note || null,
      occurred_on: date,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setAmount("");
    setNote("");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const totals = list.reduce(
    (acc, t) => {
      const a = Number(t.amount);
      if (t.type === "income") acc.income += a;
      else acc.expense += a;
      return acc;
    },
    { income: 0, expense: 0 }
  );
  const taxable = Math.max(0, totals.income - 75000);
  let est = 0;
  const slabs = [
    [300000, 0],
    [700000, 0.05],
    [1000000, 0.10],
    [1200000, 0.15],
    [1500000, 0.20],
    [Infinity, 0.30],
  ] as const;
  let prev = 0;
  for (const [u, r] of slabs) {
    if (taxable > prev) {
      est += (Math.min(taxable, u) - prev) * r;
      prev = u;
    }
  }
  if (taxable <= 700000) est = 0;
  est *= 1.04;

  return (
    <AppLayout>
      <MobileHeader
        title="Tracker"
        right={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground transition-smooth active:scale-95"
                aria-label="Add entry"
              >
                <Plus className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl border-border/60 bg-card">
              <SheetHeader>
                <SheetTitle>Add entry</SheetTitle>
              </SheetHeader>
              <form onSubmit={add} className="mt-4 space-y-3 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={type === "income" ? "default" : "outline"}
                    onClick={() => setType("income")}
                    className={type === "income" ? "bg-primary" : ""}
                  >
                    Income
                  </Button>
                  <Button
                    type="button"
                    variant={type === "expense" ? "default" : "outline"}
                    onClick={() => setType("expense")}
                    className={type === "expense" ? "bg-primary" : ""}
                  >
                    Expense
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1 h-11 rounded-xl bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(type === "income" ? incomeCats : expenseCats).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min={1}
                    className="mt-1 h-11 rounded-xl bg-secondary"
                  />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 h-11 rounded-xl bg-secondary"
                  />
                </div>
                <div>
                  <Label className="text-xs">Note (optional)</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. March salary"
                    className="mt-1 h-11 rounded-xl bg-secondary"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-primary-grad font-semibold shadow-glow"
                >
                  <Plus className="mr-1 h-4 w-4" /> Add entry
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <main className="px-5 pt-4">
        <div className="mb-5 rounded-2xl bg-primary-grad p-5 text-primary-foreground shadow-glow">
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">
            Estimated tax (new regime)
          </p>
          <div className="mt-1 text-3xl font-extrabold">{fmt(est)}</div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Income</p>
            <p className="mt-1 text-lg font-bold text-success">{fmt(totals.income)}</p>
          </div>
          <div className="rounded-2xl bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Expenses</p>
            <p className="mt-1 text-lg font-bold text-destructive">{fmt(totals.expense)}</p>
          </div>
        </div>

        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Recent entries</h3>
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="grid h-32 place-items-center rounded-2xl bg-card text-sm text-muted-foreground">
              No entries yet — tap + to add
            </div>
          ) : (
            list.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft"
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                    t.type === "income"
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {t.type === "income" ? "+" : "−"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t.category}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.occurred_on}
                    {t.note ? ` · ${t.note}` : ""}
                  </div>
                </div>
                <div
                  className={`shrink-0 text-sm font-bold ${
                    t.type === "income" ? "text-success" : "text-destructive"
                  }`}
                >
                  {fmt(Number(t.amount))}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-smooth active:bg-secondary"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </AppLayout>
  );
};

export default Tracker;
