"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const HeroCanvas = dynamic(() => import("@/components/three/HeroCanvas"), { ssr: false });

declare global {
  interface Window {
    __heroSetProgress?: (p: number) => void;
    __heroReady?: boolean;
  }
}

export function RenderStage() {
  const progress = useRef(0);
  useEffect(() => {
    window.__heroSetProgress = (p) => {
      progress.current = p;
    };
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#08080a" }}>
      <HeroCanvas progress={progress} quality="high" active capture onReady={() => (window.__heroReady = true)} />
    </div>
  );
}
