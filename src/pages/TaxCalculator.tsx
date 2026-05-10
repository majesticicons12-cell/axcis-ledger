import { useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const oldSlabs = [
  { upto: 250000, rate: 0 },
  { upto: 500000, rate: 0.05 },
  { upto: 1000000, rate: 0.20 },
  { upto: Infinity, rate: 0.30 },
];
const newSlabs = [
  { upto: 300000, rate: 0 },
  { upto: 700000, rate: 0.05 },
  { upto: 1000000, rate: 0.10 },
  { upto: 1200000, rate: 0.15 },
  { upto: 1500000, rate: 0.20 },
  { upto: Infinity, rate: 0.30 },
];

function tax(income: number, slabs: typeof oldSlabs) {
  let t = 0;
  let prev = 0;
  for (const s of slabs) {
    if (income > prev) {
      const taxable = Math.min(income, s.upto) - prev;
      t += taxable * s.rate;
      prev = s.upto;
    }
  }
  return Math.max(0, t);
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const TaxCalculator = () => {
  const [salary, setSalary] = useState(1500000);
  const [d80c, set80c] = useState(150000);
  const [d80d, set80d] = useState(25000);
  const [hra, setHra] = useState(0);
  const [other, setOther] = useState(0);

  const result = useMemo(() => {
    const standardDed = 50000;
    const oldTaxable = Math.max(0, salary - standardDed - d80c - d80d - hra - other);
    const newTaxable = Math.max(0, salary - 75000);
    let oldTax = tax(oldTaxable, oldSlabs);
    let newTax = tax(newTaxable, newSlabs);
    if (oldTaxable <= 500000) oldTax = 0;
    if (newTaxable <= 700000) newTax = 0;
    oldTax = oldTax * 1.04;
    newTax = newTax * 1.04;
    return {
      oldTax,
      newTax,
      oldTaxable,
      newTaxable,
      savings: Math.abs(oldTax - newTax),
      better: oldTax < newTax ? "old" : "new",
    };
  }, [salary, d80c, d80d, hra, other]);

  const fields = [
    { label: "Annual gross salary", v: salary, set: setSalary },
    { label: "80C investments (PPF, ELSS, EPF)", v: d80c, set: set80c },
    { label: "80D — health insurance", v: d80d, set: set80d },
    { label: "HRA exemption", v: hra, set: setHra },
    { label: "Other deductions (80E, 80G, NPS)", v: other, set: setOther },
  ];

  return (
    <AppLayout>
      <MobileHeader title="Tax Calculator" />
      <main className="px-5 pt-4">
        <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-primary">
          FY 2024–25 · Old vs New regime
        </p>

        {/* Result summary first */}
        <div className="mb-6 rounded-2xl bg-primary-grad p-5 text-primary-foreground shadow-glow">
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">
            You save
          </p>
          <div className="mt-1 text-3xl font-extrabold">{fmt(result.savings)}</div>
          <p className="mt-1 text-sm opacity-95">
            by choosing the {result.better === "old" ? "Old" : "New"} regime.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div
            className={`rounded-2xl bg-card p-4 shadow-soft ${
              result.better === "old" ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground">Old regime</div>
            <div className="mt-1 text-xl font-bold">{fmt(result.oldTax)}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Taxable {fmt(result.oldTaxable)}
            </div>
          </div>
          <div
            className={`rounded-2xl bg-card p-4 shadow-soft ${
              result.better === "new" ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground">New regime</div>
            <div className="mt-1 text-xl font-bold">{fmt(result.newTax)}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Taxable {fmt(result.newTaxable)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-5 shadow-soft">
          <h2 className="mb-4 text-base font-semibold">Your inputs</h2>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.label}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input
                  type="number"
                  value={f.v}
                  onChange={(e) => f.set(Number(e.target.value) || 0)}
                  className="mt-1 h-11 rounded-xl bg-secondary"
                />
              </div>
            ))}
            <Button
              onClick={() => {
                set80c(150000);
                set80d(25000);
                setHra(0);
                setOther(0);
                setSalary(1500000);
              }}
              variant="outline"
              className="w-full rounded-xl"
            >
              Reset
            </Button>
          </div>
        </div>

        <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted-foreground">
          Indicative numbers only. Surcharge for income above ₹50L not included.
        </p>
      </main>
    </AppLayout>
  );
};

export default TaxCalculator;
