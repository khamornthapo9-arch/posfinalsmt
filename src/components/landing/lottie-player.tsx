import { useEffect, useRef } from "react";

export function LottiePlayer({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let anim: { destroy: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const [{ default: lottie }, data] = await Promise.all([
        import("lottie-web/build/player/lottie_light"),
        fetch(src).then((r) => r.json()),
      ]);
      if (cancelled || !ref.current) return;
      anim = lottie.loadAnimation({ container: ref.current, renderer: "svg", loop: true, autoplay: true, animationData: data });
    })();
    return () => { cancelled = true; anim?.destroy(); };
  }, [src]);
  return <div ref={ref} className={className} aria-hidden />;
}
