"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, CalendarDays, Check, MapPin, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { buttonClass } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { runPreliminaryDiagnosis, SEVERE_FLAGS, SYMPTOMS, type SevereFlagId, type SymptomId } from "@/lib/diagnosis";
import { whatsappLink, WHATSAPP_MESSAGES } from "@/lib/whatsapp";

const STORAGE_KEY = "ds-diagnostico";

export function Diagnosis({ whatsappNumber }: { whatsappNumber: string }) {
  const [symptoms, setSymptoms] = useState<SymptomId[]>([]);
  const [severe, setSevere] = useState<SevereFlagId[]>([]);
  const [vehicle, setVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(
    () => runPreliminaryDiagnosis({ symptoms, severe, vehicle: vehicle.trim(), notes: notes.trim() }),
    [symptoms, severe, vehicle, notes],
  );

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const handoff = () => {
    // leva o resumo para o formulário de agendamento/visita (somente neste navegador)
    try {
      sessionStorage.setItem(STORAGE_KEY, result.summary);
    } catch {
      /* armazenamento indisponível: o cliente descreve no formulário */
    }
  };

  const wa = whatsappLink(whatsappNumber, `${WHATSAPP_MESSAGES.specialist}\n\n${result.summary}`);
  const canSubmit = symptoms.length > 0 || severe.length > 0;

  return (
    <section id="diagnostico" aria-labelledby="diag-titulo" className="relative py-16 md:py-32 overflow-hidden">
      <span aria-hidden className="watermark top-6 right-[-3vw]">DIAGNÓSTICO</span>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(244_119_18/0.08),transparent_60%)]" />
      <div className="container-ds relative">
        <SectionHeading
          eyebrow="Diagnóstico preliminar"
          title={<span id="diag-titulo">O que está acontecendo com sua direção?</span>}
          description="Selecione os sintomas e receba orientações gerais. A ferramenta ajuda a descrever o problema — o diagnóstico definitivo é sempre feito por um mecânico."
        />

        <form
          className="panel mt-12 grid gap-0 overflow-hidden lg:grid-cols-[1.15fr_0.85fr]"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
            document.getElementById("diag-resultado")?.focus();
          }}
        >
          <div className="p-6 md:p-8">
            <fieldset>
              <legend className="font-heading text-xl font-bold">1. Sintomas</legend>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {SYMPTOMS.map((s) => {
                  const on = symptoms.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={clsx(
                        "flex cursor-pointer items-start gap-3 rounded-[10px] border p-3.5 transition-colors",
                        on ? "border-orange bg-orange/10" : "border-white/10 bg-white/[0.02] hover:border-white/25",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() => setSymptoms((l) => toggle(l, s.id))}
                      />
                      <span
                        aria-hidden
                        className={clsx(
                          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border",
                          on ? "border-orange bg-orange text-ink" : "border-white/25",
                        )}
                      >
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span>
                        <span className="block font-heading text-[1.05rem] font-bold leading-tight">{s.label}</span>
                        <span className="mt-0.5 block text-xs text-silver-dim">{s.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-8">
              <legend className="font-heading text-xl font-bold">2. Algum destes aconteceu?</legend>
              <div className="mt-4 space-y-2">
                {SEVERE_FLAGS.map((f) => (
                  <label key={f.id} className="flex cursor-pointer items-start gap-3 text-sm text-silver">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 shrink-0 accent-[#e5484d]"
                      checked={severe.includes(f.id)}
                      onChange={() => setSevere((l) => toggle(l, f.id))}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="diag-veiculo" className="mb-1.5 block font-heading font-bold text-silver">
                  3. Veículo (marca e modelo)
                </label>
                <input id="diag-veiculo" className="field" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Ex.: Mercedes-Benz Atego 2426" maxLength={120} />
              </div>
              <div>
                <label htmlFor="diag-obs" className="mb-1.5 block font-heading font-bold text-silver">
                  Observações <span className="font-sans text-xs font-normal text-silver-dim">(opcional)</span>
                </label>
                <input id="diag-obs" className="field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quando acontece, há quanto tempo…" maxLength={600} />
              </div>
            </div>

            <button type="submit" disabled={!canSubmit} className={buttonClass("primary", "md", "mt-8 w-full sm:w-auto")}>
              <Stethoscope className="size-4" aria-hidden /> Ver orientações
            </button>
          </div>

          <div
            id="diag-resultado"
            tabIndex={-1}
            aria-live="polite"
            className={clsx(
              "border-t border-white/[0.06] p-6 outline-none md:p-8 lg:border-l lg:border-t-0",
              result.severe ? "bg-danger/[0.07]" : "bg-ink-2/60",
            )}
          >
            {!submitted || !canSubmit ? (
              <div className="flex h-full flex-col justify-center text-silver">
                <Stethoscope className="mb-4 size-10 text-orange/70" aria-hidden />
                <p className="font-heading text-xl font-bold text-paper">Orientações gerais</p>
                <p className="mt-2 text-sm">Selecione um ou mais sintomas e clique em “Ver orientações”.</p>
              </div>
            ) : (
              <div>
                {result.safety && (
                  <div role="alert" className="mb-6 flex gap-3 rounded-[10px] border border-danger/50 bg-danger/15 p-4 text-sm text-[#ffc2c4]">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <p>
                      <strong className="block font-heading text-base">Não continue dirigindo.</strong>
                      {result.safety}
                    </p>
                  </div>
                )}
                <p className="font-heading text-2xl font-bold">{result.headline}</p>
                <p className="mt-3 text-sm leading-relaxed text-silver">{result.message}</p>
                {result.possibilities.length > 0 && (
                  <>
                    <p className="mt-6 font-tech text-sm uppercase tracking-widest text-orange">Pontos que costumam ser verificados</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {result.possibilities.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" /> {p}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <div className="mt-8 grid gap-2.5">
                  <Link href="/agendamento?origem=diagnostico" onClick={handoff} className={buttonClass("primary", "md")}>
                    <CalendarDays className="size-4" aria-hidden /> Agendar avaliação
                  </Link>
                  <Link href="/visita?origem=diagnostico" onClick={handoff} className={buttonClass("secondary", "md")}>
                    <MapPin className="size-4" aria-hidden /> Solicitar visita
                  </Link>
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "md")}>
                      <WhatsAppIcon className="size-4" /> Conversar com especialista
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

export const DIAGNOSIS_STORAGE_KEY = STORAGE_KEY;
