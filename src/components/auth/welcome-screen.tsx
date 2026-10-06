import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import welcomeBg from "@/assets/welcome-sunset.jpg";
import bizzLogo from "@/assets/bizz-logo.png";

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
      if (track) setSpan(Math.max(0, track.clientWidth - 56 - 8));
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
    const handle = 56;
    const span = Math.max(1, rect.width - handle - 8);
    return Math.min(1, Math.max(0, (clientX - rect.left - handle / 2 - 4) / span));
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
      {/* Slate gradient overlay */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/20"
      />

      {/* Brand header */}
      <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-14">
        <img src={bizzLogo} alt="Bizz Automators" className="h-9 w-auto opacity-95" />
        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.34em] text-white/40">
          Bizz Automators
        </p>
      </div>

      {/* Content */}
      <div className="relative flex h-full w-full items-end justify-center">
        <div
          className="flex w-full max-w-[430px] flex-col px-7"
          style={{
            paddingBottom: "calc(2.25rem + env(safe-area-inset-bottom))",
            transform: `translate3d(0, ${-progress * 10}px, 0)`,
            transition: dragging ? "none" : "transform 520ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <h1 className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-[-0.02em] text-white">
            Simplify your
            <br />
            business.
          </h1>
          <p className="mt-4 max-w-[19rem] text-sm leading-relaxed text-slate-400">
            Manage your business, customers and operations from one professional platform.
          </p>

          {/* Swipe track */}
          <div
            ref={trackRef}
            className="relative mt-10 h-16 w-full rounded-full border border-white/10 bg-slate-900/70 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
            style={{ touchAction: "none" }}
          >
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, rgba(245,158,11,0.08), rgba(245,158,11,0.24))",
                transition: dragging ? "none" : "width 420ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
            <span
              className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-medium tracking-wide text-white/60"
              style={{ opacity: 1 - progress * 0.9 }}
            >
              Slide to continue
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
              className="absolute grid h-14 w-14 cursor-grab place-items-center rounded-full bg-amber-500 text-slate-950 active:cursor-grabbing"
              style={{
                left: 4,
                top: 4,
                transform: `translate3d(${progress * span}px, 0, 0)`,
                boxShadow: `0 8px 26px -8px rgba(245,158,11,${0.4 + progress * 0.45})`,
                transition: dragging ? "none" : "transform 420ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms ease",
              }}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-white/25">
            Built for growing businesses
          </p>
        </div>
      </div>
    </div>
  );
}
