import bizzLogo from "@/assets/bizz-logo.png";

export function RoutePending() {
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
