import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, ArrowUpRight } from "lucide-react";
import welcomeBg from "@/assets/welcome-sunset.jpg";
import { WelcomeScreen, WELCOME_SEEN_KEY } from "@/components/auth/welcome-screen";
import { Celebration } from "@/components/auth/celebration";

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

type Mode = "signin" | "signup" | "forgot" | null;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function AuthDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[100] transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-3 sm:inset-0 sm:items-center sm:p-6">
        <div
          className={`flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/80 text-white shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-out ${
            open
              ? "translate-y-0 sm:scale-100 sm:opacity-100"
              : "translate-y-full sm:translate-y-6 sm:scale-95 sm:opacity-0"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Handle */}
          <div className="mx-auto mt-4 h-1 w-12 shrink-0 rounded-full bg-white/10" />

          <div className="flex items-start justify-between px-8 pt-6">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-white">{title}</h2>
              <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-6"
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(null);
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
  const [showWelcome, setShowWelcome] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  const celebratingRef = useRef(false);
  const hasSessionRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      // First launch only: returning users go straight to sign in.
      if (window.localStorage.getItem(WELCOME_SEEN_KEY) !== "1") {
        setShowWelcome(true);
        setRevealed(false);
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
        setMode(null);
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

      <div
        className="relative flex min-h-screen w-full max-w-[430px] flex-col p-8"
        style={{
          transform: revealed ? "translate3d(0,0,0)" : "translate3d(0, 24px, 0)",
          opacity: revealed ? 1 : 0,
          transition: "transform 620ms cubic-bezier(0.22,1,0.36,1), opacity 520ms ease",
        }}
      >
        <div className="mt-14">
          <h1 className="select-none font-display text-7xl font-extrabold leading-[0.85] tracking-tighter text-white opacity-90">
            WEL
            <br />
            COME.
          </h1>
          <p className="mt-8 max-w-[180px] text-[11px] font-medium uppercase leading-relaxed tracking-[0.2em] text-slate-400">
            Business automation for the Tanzanian frontier
          </p>
        </div>

        {/* Numbered entries */}
        <div className="mb-6 mt-auto space-y-0">
          <button
            onClick={() => setMode("signup")}
            className="group flex w-full items-center gap-5 border-t border-white/10 py-6 text-left transition hover:border-amber-500/40"
          >
            <span className="font-display text-sm font-bold text-amber-500">01</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-bold tracking-tight text-white transition group-hover:text-amber-400">
                Sign up
              </span>
              <span className="mt-0.5 block text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Create your account
              </span>
            </span>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </button>
          <button
            onClick={() => setMode("signin")}
            className="group flex w-full items-center gap-5 border-y border-white/10 py-6 text-left transition hover:border-amber-500/40"
          >
            <span className="font-display text-sm font-bold text-amber-500">02</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-bold tracking-tight text-white transition group-hover:text-amber-400">
                Sign in
              </span>
              <span className="mt-0.5 block text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Welcome back
              </span>
            </span>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </button>
        </div>

        {/* Bottom meta */}
        <div className="flex items-end justify-between opacity-40">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white">02 / 02</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-white">Built for growth</span>
        </div>
      </div>

      <AuthDrawer
        open={mode !== null}
        onClose={() => setMode(null)}
        title={mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in"}
        subtitle={mode === "signup" ? "Set up your business workspace" : mode === "forgot" ? "Verify with your full name and phone number" : "Welcome back to your workspace"}
      >
        {form}
      </AuthDrawer>

      {showWelcome && (
        <WelcomeScreen
          onComplete={() => {
            window.localStorage.setItem(WELCOME_SEEN_KEY, "1");
            setShowWelcome(false);
            setRevealed(true);
          }}
        />
      )}

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
