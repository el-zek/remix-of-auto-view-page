import { useRouter } from "@tanstack/react-router";
import bizzLogo from "@/assets/bizz-logo.png";

/**
 * Loading state for route transitions.
 * - App boot / hard refresh / first entry: branded logo splash.
 * - In-app navigation once content is already mounted: quiet skeleton, no logo.
 */
export function RoutePending() {
  const router = useRouter();
  const booted = router.state.matches.some(
    (match) => match.status === "success" && match.routeId !== "__root__",
  );
  if (booted) return <InnerSkeleton />;

  return (
    <div
      className="grid min-h-[70vh] w-full place-items-center bg-background md:min-h-screen"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-7">
        <img
          src={bizzLogo}
          alt="Bizz Automators"
          className="h-16 w-auto animate-pulse select-none md:h-20"
          draggable={false}
        />
        <div className="h-[3px] w-36 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 rounded-full bg-amber-500/90 splash-loader-bar" />
        </div>
      </div>
    </div>
  );
}

function InnerSkeleton() {
  return (
    <div className="mx-auto max-w-md animate-pulse space-y-4 md:max-w-6xl" aria-busy="true">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 rounded-lg bg-white/10" />
          <div className="h-3 w-28 rounded-lg bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-white/8 bg-white/[0.04]" />
        ))}
      </div>
      <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 rounded-xl bg-white/[0.05]" />
        ))}
      </div>
    </div>
  );
}
