import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { FileText, Calendar, ExternalLink, AlertCircle } from "lucide-react";

const docs = [
  { title: "Form 16", desc: "TDS certificate from your employer (issued by 15 June)", who: "Salaried" },
  { title: "Form 26AS", desc: "Consolidated tax statement — download from the IT portal", who: "Everyone" },
  { title: "AIS / TIS", desc: "Annual Information Statement — shows reported income", who: "Everyone" },
  { title: "Form 16A", desc: "TDS on non-salary income (FD interest, rent, contractor)", who: "Most" },
  { title: "Capital gains statement", desc: "From your broker / mutual fund (CAMS, KFintech)", who: "Investors" },
  { title: "Investment proofs", desc: "80C: PPF, ELSS, LIC, school fees. 80D: health insurance", who: "Tax savers" },
  { title: "Home loan certificate", desc: "Principal (80C) and interest (Sec 24) breakup", who: "Home owners" },
  { title: "Rent receipts", desc: "For HRA exemption — landlord's PAN if rent > ₹1L/year", who: "Renters" },
];

const TaxDocuments = () => {
  return (
    <AppLayout>
      <MobileHeader title="Tax Documents" />
      <main className="px-4 pt-4 pb-8">
        <section className="mb-4 rounded-2xl border border-warning/30 bg-tip-grad p-4">
          <div className="mb-1 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-warning">Filing window</h3>
          </div>
          <p className="text-sm text-foreground/85">
            ITR for FY 2024-25 (AY 2025-26): <b>1 Jul – 31 Jul 2025</b>. Late fee up to ₹5,000 after that.
          </p>
        </section>

        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Documents you should keep ready
        </h2>
        <div className="space-y-2">
          {docs.map((d) => (
            <article key={d.title} className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{d.title}</h3>
                </div>
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">
                  {d.who.toUpperCase()}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{d.desc}</p>
            </article>
          ))}
        </div>

        <a
          href="https://www.incometax.gov.in/iec/foportal/"
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 p-4 transition-smooth active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-semibold">Income Tax Portal</div>
              <div className="text-xs text-muted-foreground">Download AIS, 26AS & file ITR</div>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-primary" />
        </a>
      </main>
    </AppLayout>
  );
};

export default TaxDocuments;
