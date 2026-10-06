import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, X } from "lucide-react";
import welcomeBg from "@/assets/welcome-sunset.jpg";
import bizzLogo from "@/assets/bizz-logo.png";
import { Celebration } from "@/components/auth/celebration";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

import { BusinessProfileStep } from "@/components/auth/signup-scope-steps";
import { savePendingScope } from "@/lib/onboarding-scope";
import { EMPTY_CHARACTERISTICS, type BusinessCharacteristics } from "@/lib/business-scope";
import { isValidPhone, normalizePhone, phoneIdentity } from "@/lib/phone-auth";
import { uploadBusinessLogo } from "@/lib/business-logo";
import { resetPasswordWithIdentity } from "@/lib/password-reset.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in · Bizz Automators" },
      { name: "description", content: "Sign in to Bizz Automators to manage sales, customers, inventory and tax compliance in one place." },
      { property: "og:title", content: "Sign in · Bizz Automators" },
      { property: "og:description", content: "Access your Bizz Automators business workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const inputCls =
  "w-full rounded-2xl border border-white/5 bg-slate-950/50 px-5 py-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50";

const labelCls =
  "ml-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500";

type Mode = "choice" | "signin" | "signup" | "forgot";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("choice");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [signupStep, setSignupStep] = useState(1);
  const [characteristics, setCharacteristics] = useState<BusinessCharacteristics>({
    ...EMPTY_CHARACTERISTICS,
    flags: {},
  });
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const celebratingRef = useRef(false);
  const hasSessionRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session && !celebratingRef.current) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && signupStep < 2) {
      if (signupStep === 1 && (!fullName.trim() || !isValidPhone(phone) || password.length < 6)) {
        toast.error("Enter your name, a valid phone number, and a password of at least 6 characters");
        return;
      }
      if (
        signupStep === 2 &&
        (!characteristics.name.trim() ||
          !characteristics.legalForm.trim() ||
          !characteristics.businessType.trim() ||
          !characteristics.sector.trim() ||
          characteristics.employeeCount === null ||
          characteristics.employeeCount < 0)
      ) {
        toast.error("Complete the required business profile fields");
        return;
      }
      setSignupStep((step) => step + 1);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        savePendingScope({ phone: normalizePhone(phone), characteristics, plan: "full" });
        celebratingRef.current = true;
        const { data, error } = await supabase.auth.signUp({
          email: phoneIdentity(phone),
          password,
          options: {
            data: {
              full_name: fullName,
              phone: normalizePhone(phone),
              business_name: characteristics.name,
              business_type: characteristics.businessType,
              legal_form: characteristics.legalForm,
              sector: characteristics.sector,
              employee_count: String(characteristics.employeeCount ?? ""),
              does_import: characteristics.doesImport,
              does_export: characteristics.doesExport,
              tax_registrations: characteristics.taxRegistrations,
            },
          },
        });
        if (error) {
          celebratingRef.current = false;
          throw error;
        }
        const userId = data.user?.id;
        if (userId && logoDataUrl) {
          const logoPath = await uploadBusinessLogo(logoDataUrl);
          const { error: logoError } = await supabase.from("profiles").upsert({ id: userId, logo_path: logoPath }, { onConflict: "id" });
          if (logoError) throw logoError;
        }
        hasSessionRef.current = Boolean(data.session);
        setSignupStep(1);
        setCelebrate(true);
      } else if (mode === "forgot") {
        if (!isValidPhone(phone)) throw new Error("Enter a valid phone number");
        if (password.length < 6) throw new Error("New password must be at least 6 characters");
        const res = await resetPasswordWithIdentity({ data: { phone, fullName, newPassword: password } });
        if (!res.ok) throw new Error(res.message);
        toast.success(res.message);
        setPassword("");
        setMode("signin");
      } else {
        if (!isValidPhone(phone)) throw new Error("Enter a valid phone number");
        const { error } = await supabase.auth.signInWithPassword({
          email: phoneIdentity(phone),
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const primaryBtn =
    "flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/10 transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-60";

  const chooseAuth = (nextMode: "signin" | "signup") => {
    setMode(nextMode);
    setSignupStep(1);
    setPassword("");
  };

  const form = (
    <>
      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <div className="mb-2 flex items-center gap-3">
            {["Account", "Business Profile"].map((label, index) => {
              const active = signupStep === index + 1;
              return (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      active ? "bg-amber-500 text-slate-950" : "border border-white/10 bg-white/5 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                      active ? "text-amber-500" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {mode === "signup" && signupStep === 1 && (
          <>
            <Field label="Full name">
              <input
                className={inputCls}
                required
                placeholder="e.g. Zela Kambona"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="Phone number">
              <input
                className={inputCls}
                type="tel"
                inputMode="tel"
                required
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                className={inputCls}
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </>
        )}
        {mode === "signup" && signupStep === 2 && (
          <BusinessProfileStep
            value={characteristics}
            onChange={(patch) => setCharacteristics((current) => ({ ...current, ...patch }))}
            logoDataUrl={logoDataUrl}
            onLogoChange={setLogoDataUrl}
          />
        )}
        {mode === "signin" && (
          <>
            <Field label="Phone number">
              <input
                className={inputCls}
                type="tel"
                inputMode="tel"
                required
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                className={inputCls}
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </>
        )}
        {mode === "signup" && (
          <div className="flex gap-2 pt-2">
            {signupStep > 1 && (
              <button
                type="button"
                onClick={() => setSignupStep((step) => step - 1)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Back
              </button>
            )}
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {signupStep === 2 ? "Create account" : "Next"}
            </button>
          </div>
        )}
        {mode === "forgot" && (
          <>
            <Field label="Full name (as registered)">
              <input className={inputCls} required placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Phone number">
              <input className={inputCls} type="tel" inputMode="tel" required placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="New password">
              <input className={inputCls} type="password" required minLength={6} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </>
        )}
        {(mode === "signin" || mode === "forgot") && (
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "forgot" ? "Reset password" : "Sign in"}
          </button>
        )}
      </form>

      <div className="mt-6 flex flex-col items-center gap-4">
        {mode === "signin" && (
          <button
            type="button"
            onClick={() => { setPassword(""); setMode("forgot"); }}
            className="text-xs font-semibold text-amber-500/80 transition hover:text-amber-400"
          >
            Forgot password?
          </button>
        )}
        <div className="h-px w-full bg-white/5" />
        <p className="text-xs font-medium text-slate-500">
          {mode === "signin" ? "New here?" : "Already have an account?"}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : mode === "forgot" ? "signin" : "signup");
              setSignupStep(1);
            }}
            className="ml-1 font-bold text-white transition hover:text-amber-500"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* The old welcome scene — now purely a backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-40 grayscale"
        style={{ backgroundImage: `url(${welcomeBg})`, transform: "scale(1.05)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950"
      />
      {/* Amber flare */}
      <div
        aria-hidden
        className="pointer-events-none fixed -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[100px]"
      />

      {/* Vertical brand rail — right edge */}
      <div className="absolute right-6 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-6">
        <div className="h-24 w-px bg-amber-500/20" />
        <div className="flex rotate-90 items-center gap-4 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.5em] text-amber-500">
          <span className="block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Bizz Automators
        </div>
        <div className="h-24 w-px bg-amber-500/20" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[430px] flex-col p-8">
        <div className="mt-10 shrink-0">
          <img
            src={bizzLogo}
            alt="Bizz Automators"
            className="h-auto w-44 object-contain object-left drop-shadow-2xl"
          />
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            Simplify your business
          </p>
        </div>

        <div className="mb-8 mt-auto space-y-3" aria-label="Choose how to continue">
              <Button
                type="button"
                onClick={() => chooseAuth("signup")}
                variant="ghost"
                className="group flex h-auto min-h-24 w-full items-center justify-start rounded-none border-y border-white/15 bg-white/[0.035] px-5 text-left backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
              >
                <span className="mr-5 self-start pt-6 text-[10px] font-bold tracking-[0.22em] text-amber-500">01</span>
                <span className="flex flex-1 items-center justify-between py-5">
                  <span>
                    <span className="block text-2xl font-bold text-white">Sign up</span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Create a business account</span>
                  </span>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 text-amber-500 transition group-hover:border-amber-500/50 group-hover:bg-amber-500 group-hover:text-slate-950">
                    <ArrowUpRight className="h-5 w-5" aria-hidden />
                  </span>
                </span>
              </Button>

              <Button
                type="button"
                onClick={() => chooseAuth("signin")}
                variant="ghost"
                className="group flex h-auto min-h-24 w-full items-center justify-start rounded-none border-b border-white/15 bg-white/[0.035] px-5 text-left backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
              >
                <span className="mr-5 self-start pt-6 text-[10px] font-bold tracking-[0.22em] text-amber-500">02</span>
                <span className="flex flex-1 items-center justify-between py-5">
                  <span>
                    <span className="block text-2xl font-bold text-white">Sign in</span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Continue to your workspace</span>
                  </span>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 text-amber-500 transition group-hover:border-amber-500/50 group-hover:bg-amber-500 group-hover:text-slate-950">
                    <ArrowUpRight className="h-5 w-5" aria-hidden />
                  </span>
                </span>
              </Button>
        </div>

        <div className="flex items-end justify-between pb-2 opacity-40">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white">Built for growth</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-white">Bizz Automators</span>
        </div>
      </div>

      <Drawer
        open={mode !== "choice"}
        onOpenChange={(open) => {
          if (!open) {
            setMode("choice");
            setSignupStep(1);
            setPassword("");
          }
        }}
        shouldScaleBackground={false}
      >
        <DrawerContent className="!bottom-0 !left-1/2 !top-auto max-h-[88dvh] !w-full max-w-[430px] !translate-x-[-50%] !translate-y-0 overflow-y-auto rounded-b-none rounded-t-[2.5rem] border-white/10 bg-slate-950/90 px-6 pb-8 pt-5 text-white shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" aria-hidden />
          <div className="mb-6 flex items-start justify-between gap-5">
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.28em] text-amber-500">Bizz Automators</p>
              <DrawerTitle className="font-display text-3xl font-extrabold text-white">
                {mode === "signup" ? "Create account" : mode === "forgot" ? "Reset access" : "Welcome back"}
              </DrawerTitle>
              <p className="mt-2 text-xs text-slate-400">
                {mode === "signup" ? "Set up your business workspace." : mode === "forgot" ? "Restore access to your workspace." : "Sign in to continue to your workspace."}
              </p>
            </div>
            <DrawerClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="h-11 w-11 shrink-0 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </DrawerClose>
          </div>
          {form}
        </DrawerContent>
      </Drawer>

      {celebrate && (
        <Celebration
          title="Congratulations!"
          message={
            hasSessionRef.current
              ? "Your business account is ready. Let's get started."
              : "Your business account has been created. Sign in to continue."
          }
          actionLabel={hasSessionRef.current ? "Taking you to your dashboard…" : "Taking you to sign in…"}
          onDone={() => {
            celebratingRef.current = false;
            setCelebrate(false);
            if (hasSessionRef.current) {
              navigate({ to: "/dashboard", replace: true });
            } else {
              setPassword("");
              setMode("signin");
            }
          }}
        />
      )}
    </main>
  );

}
