import { notFound } from "next/navigation";
import { RenderStage } from "./RenderStage";

export const metadata = { robots: { index: false, follow: false } };

/** Palco de captura usado por `npm run hero:render`. Desativado em produção. */
export default function RenderHeroPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_HERO_RENDER !== "1") notFound();
  return <RenderStage />;
}
