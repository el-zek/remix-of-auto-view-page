import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronsRight } from "lucide-react";
import welcomeBg from "@/assets/welcome-sunset.jpg";

export const WELCOME_SEEN_KEY = "bizz.welcome.seen";

/**
 * First-launch welcome layer. Sits above the auth screen as a physical card:
 * swiping the handle past ~85% pushes the card forward and reveals the
 * authentication layer behind it. Only transforms/opacity are animated.
 */
export function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [span, setSpan] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const update = () => {
      const track = trackRef.current;
      if (track) setSpan(Math.max(0, track.clientWidth - 80 - 24));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const finish = useCallback(() => {
    if (done) return;
    setDone(true);
    setProgress(1);
    window.setTimeout(onComplete, 520);
  }, [done, onComplete]);

  const measure = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const handle = 80;
    const span = Math.max(1, rect.width - handle - 24);
    return Math.min(1, Math.max(0, (clientX - rect.left - handle / 2 - 12) / span));
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setProgress(measure(e.clientX));
    const up = (e: PointerEvent) => {
      setDragging(false);
      const p = measure(e.clientX);
      if (p >= 0.85) finish();
      else setProgress(0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, finish]);

  const lift = done ? 1 : progress * 0.35;

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden bg-slate-950"
      style={{
        transform: `translate3d(0, ${done ? "-8%" : "0"}, 0) scale(${1 + lift * 0.06})`,
        opacity: done ? 0 : 1,
        transition: dragging ? "none" : "transform 520ms cubic-bezier(0.22,1,0.36,1), opacity 460ms ease",
        willChange: "transform, opacity",
      }}
    >
      {/* Photograph — desaturated, cinematic */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-40 grayscale"
        style={{
          backgroundImage: `url(${welcomeBg})`,
          transform: `translate3d(0, ${-progress * 14}px, 0) scale(${1.04 + progress * 0.03})`,
          transition: dragging ? "none" : "transform 520ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950"
      />
      {/* Amber flare */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[100px]"
      />

      {/* Vertical brand rail — right edge */}
      <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col items-center gap-6">
        <div className="h-24 w-px bg-amber-500/20" />
        <div className="flex rotate-90 items-center gap-4 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.5em] text-amber-500">
          <span className="block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Bizz Automators
        </div>
        <div className="h-24 w-px bg-amber-500/20" />
      </div>

      {/* Content */}
      <div className="relative flex h-full w-full flex-col p-8">
        <div
          className="mt-14"
          style={{
            transform: `translate3d(0, ${-progress * 10}px, 0)`,
            transition: dragging ? "none" : "transform 520ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <h1 className="select-none font-display text-7xl font-extrabold leading-[0.85] tracking-tighter text-white opacity-90">
            SIMP
            <br />
            LIFY.
          </h1>
          <p className="mt-8 max-w-[180px] text-[11px] font-medium uppercase leading-relaxed tracking-[0.2em] text-slate-400">
            Business automation for the Tanzanian frontier
          </p>
        </div>

        {/* Kinetic slide action */}
        <div className="mb-6 mt-auto">
          <div
            ref={trackRef}
            className="relative flex h-24 w-full items-center overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-3 backdrop-blur-2xl"
            style={{ touchAction: "none" }}
          >
            {/* Progress fill */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-3xl bg-amber-500/10"
              style={{
                width: `${progress * 100}%`,
                transition: dragging ? "none" : "width 420ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
            <span
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40"
              style={{ opacity: 1 - progress * 1.2 }}
            >
              Continue
            </span>
            <button
              type="button"
              aria-label="Slide to continue"
              onPointerDown={(e) => {
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                setDragging(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") finish();
              }}
              className="absolute grid h-[72px] w-20 cursor-grab place-items-center rounded-2xl bg-amber-500 text-slate-950 active:cursor-grabbing"
              style={{
                left: 12,
                top: 12,
                transform: `translate3d(${progress * span}px, 0, 0)`,
                boxShadow: `0 0 30px rgba(245,158,11,${0.25 + progress * 0.35})`,
                transition: dragging ? "none" : "transform 420ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms ease",
              }}
            >
              <ChevronsRight className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Bottom meta */}
        <div className="flex items-end justify-between opacity-40">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white">01 / 02</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-white">Built for growth</span>
        </div>
      </div>
    </div>
  );
}
