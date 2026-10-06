import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ShoppingCart, Package, FileText, Users, BarChart3, Camera, Landmark, MoreHorizontal, X, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function formatTZS(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function Dashboard() {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [tab, setTab] = useState("SALES");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: todaySales = 0 } = useQuery({
    queryKey: ["today-sales"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("sales")
        .select("total")
        .gte("created_at", start.toISOString());
      return (data ?? []).reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
    },
    refetchInterval: 30000,
  });

  const { data: lowStock = 0 } = useQuery({
    queryKey: ["low-stock-count-dash"],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .lt("stock_quantity", 5);
      return count ?? 0;
    },
  });

  const { data: recentSalesCount = 0 } = useQuery({
    queryKey: ["today-sales-count"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("sales")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString());
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: todayExpenses = 0 } = useQuery({
    queryKey: ["today-expenses"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("tax_expenses")
        .select("amount,status")
        .eq("date", today);
      return (data ?? [])
        .filter((r: any) => r.status !== "Pending")
        .reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

    },
    refetchInterval: 30000,
  });

  const { data: customerCount = 0 } = useQuery({
    queryKey: ["customer-count-dash"],
    queryFn: async () => {
      const { count } = await supabase.from("customers").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const tabs = [
    { label: "SALES", to: "/m/sales" },
    { label: "INVENTORY", to: "/m/inventory" },
    { label: "FINANCE", to: "/m/finance" },
    { label: "EMPLOYEES", to: "/m/employees" },
  ];

  const stats = [
    { label: "Stock", value: `${lowStock} low`, icon: Package },
    { label: "Sales", value: String(recentSalesCount), icon: ShoppingCart },
    { label: "Expenses", value: `TZS ${formatTZS(Number(todayExpenses))}`, icon: BarChart3 },
  ];

  const quickActions = [
    { label: "Invoice", icon: FileText, onClick: () => navigate({ to: "/m/sales/invoices" }) },
    { label: "Customers & CRM", icon: Users, onClick: () => navigate({ to: "/m/crm" }) },
    { label: "Reports", icon: BarChart3, onClick: () => navigate({ to: "/m/reports" }) },
  ] as const;

  return (
    <div className="relative -mx-3 -mt-6 min-h-[calc(100vh-4.5rem)] overflow-hidden text-white sm:-mx-6">
      <style>{`
        @keyframes goldSpin { to { transform: rotate(360deg); } }
        .gold-ring {
          background: conic-gradient(from 200deg, rgba(255,255,255,0.03) 0deg, rgba(245,158,11,0.85) 40deg, #F59E0B 150deg, rgba(146,64,14,0.9) 260deg, rgba(255,255,255,0.03) 330deg);
          animation: goldSpin 14s linear infinite;
        }
      `}</style>

      <div className="mx-auto w-full max-w-md px-3 pb-28 pt-4 sm:px-4 md:max-w-6xl md:px-8 md:pb-12 md:pt-6">
        {/* Tabs — glass track with a gold pill for the active tab */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 text-center text-[10px] backdrop-blur-xl sm:text-xs md:text-sm">
          {tabs.map((t) => {
            const active = tab === t.label;
            return (
              <button
                key={t.label}
                onClick={() => { setTab(t.label); navigate({ to: t.to as any }); }}
                className={`relative min-w-0 truncate rounded-xl px-2 py-2.5 font-semibold tracking-wide transition md:py-3 ${
                  active
                    ? "bg-amber-500 font-bold text-slate-950 shadow-lg shadow-amber-500/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
          {/* Circular ring */}
          <div className="flex justify-center">
            <div className="relative grid aspect-square w-full max-w-[18rem] min-w-0 place-items-center">
              <div className="gold-ring absolute inset-[5px] rounded-full" />
              <div className="absolute inset-[14px] rounded-full bg-slate-950/95" />
              <div className="absolute inset-[26px] rounded-full border border-white/5 bg-slate-950/95" />
              <div className="relative w-[70%] text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 sm:text-[11px]">Today Sales</p>
                <p className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">TZS</p>
                <p className="break-words font-display text-2xl font-bold text-amber-500 [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl">{formatTZS(Number(todaySales))}</p>
              </div>
            </div>

          </div>

          <div className="space-y-5">
            {/* Metrics panel — glass card, eyebrow label on top */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl md:p-6">
              <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.28em] text-amber-500">Today's overview</p>
              <div className="grid grid-cols-3 gap-x-4 md:gap-x-8">
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex min-w-0 items-start gap-2.5 md:px-2 ${i !== 0 ? "border-l border-white/5 pl-3 md:pl-6" : ""}`}
                  >
                    <s.icon className="mt-1 h-4 w-4 shrink-0 text-amber-500/90 md:h-5 md:w-5" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[10px] font-semibold uppercase leading-tight tracking-[0.18em] text-slate-500">{s.label}</p>
                      <p className="mt-1 break-words font-display text-base font-bold leading-tight text-white [overflow-wrap:anywhere] sm:text-lg md:text-xl">
                        {s.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary gold action */}
            <button
              onClick={() => navigate({ to: "/m/sales/new" })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/10 transition hover:bg-amber-400 active:scale-[0.98]"
            >
              <ShoppingCart className="h-4 w-4" />
              New Sale
            </button>

            {/* Quick Actions — glass tiles */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="group flex min-w-0 flex-col items-center gap-2 transition hover:scale-105 md:gap-3"
                >
                  <div className="grid aspect-square w-full max-w-[7rem] place-items-center rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition group-hover:border-white/20 group-hover:bg-white/[0.08] md:rounded-3xl">
                    <a.icon className="h-[38%] w-[38%] min-h-5 min-w-5 text-amber-500" />
                  </div>
                  <span className="w-full break-words text-center text-[10px] font-semibold leading-tight text-slate-400 [overflow-wrap:anywhere] transition group-hover:text-white sm:text-[11px] md:text-xs lg:text-sm">
                    {a.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent activity — glass card with hairline separators */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-amber-500">Recent Activity</p>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Today</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 md:grid-cols-4 md:gap-x-8">
            {[
              { label: "Sales completed", value: String(recentSalesCount), icon: ShoppingCart },
              { label: "Low stock alerts", value: String(lowStock), icon: Package },
              { label: "Expenses today", value: `TZS ${formatTZS(Number(todayExpenses))}`, icon: BarChart3 },
              { label: "Customers", value: String(customerCount), icon: Users },
            ].map((a, i) => (
              <div
                key={a.label}
                className={`flex min-w-0 items-start gap-2.5 md:px-2 ${i !== 0 ? "border-l border-white/5 pl-3 md:pl-6" : ""}`}
              >
                <a.icon className="mt-1 h-4 w-4 shrink-0 text-amber-500/90 md:h-5 md:w-5" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[10px] font-semibold uppercase leading-tight tracking-[0.18em] text-slate-500">{a.label}</p>
                  <p className="mt-1 font-display text-base font-bold leading-tight text-white sm:text-lg md:text-xl">{a.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Resting line at the bottom of the panel */}
          <div className="mt-6 h-px w-full bg-white/5" />
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Built for growth</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Bizz Automators</span>
          </div>
        </div>

      </div>

      {/* Hidden camera input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) toast.success(`Picha imepigwa: ${file.name}`);
          e.target.value = "";
        }}
      />

      {/* More bottom sheet — slate glass, matches the auth drawer */}
      {moreOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 flex h-[75vh] flex-col overflow-y-auto rounded-t-[2.5rem] border-t border-white/10 bg-slate-950/90 p-5 pb-8 text-white backdrop-blur-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.28em] text-amber-500">Bizz Automators</p>
                <h3 className="font-display text-2xl font-extrabold text-white">More</h3>
              </div>
              <button
                aria-label="Close"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-2">
              <button
                onClick={() => { setMoreOpen(false); navigate({ to: "/m/admin" }); }}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-xl transition hover:bg-white/[0.08]"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5">
                  <Shield className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Administration</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Users, roles, settings</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
