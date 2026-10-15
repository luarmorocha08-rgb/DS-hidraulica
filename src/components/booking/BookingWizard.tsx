"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Copy, Factory, Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { AddressFields, AttachmentsField, ConsentField, CustomerFields, FormSection, VehicleFields } from "@/components/forms/fields";
import { DIAGNOSIS_STORAGE_KEY } from "@/components/home/Diagnosis";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormAlert, TextArea } from "@/components/ui/Field";
import { createAppointmentAction, type AppointmentCreated } from "@/lib/actions/public";
import type { FieldErrors } from "@/lib/validation";
import { whatsappLink } from "@/lib/whatsapp";
import { SlotPicker } from "./Calendar";

export interface BookingTypeOption {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  allowWorkshop: boolean;
  allowOnsite: boolean;
}

const STEPS = ["Serviço", "Modalidade", "Data e horário", "Seus dados", "Confirmação"];

export function BookingWizard({
  types,
  service,
  today,
  whatsappNumber,
  initialModality,
  initialTypeId,
  initialSlot,
}: {
  types: BookingTypeOption[];
  service: { id: string; name: string } | null;
  today: string;
  whatsappNumber: string;
  initialModality?: "workshop" | "onsite";
  /** Vindos do calendário da página inicial. */
  initialTypeId?: string;
  initialSlot?: { date: string; time: string };
}) {
  const preType = types.find((t) => t.id === initialTypeId) ?? null;
  const preModality = preType && preType.allowWorkshop !== preType.allowOnsite ? (preType.allowWorkshop ? "workshop" : "onsite") : (initialModality ?? null);
  const [step, setStep] = useState(preType ? (preModality ? 2 : 1) : 0);
  const [typeId, setTypeId] = useState<string | null>(preType?.id ?? null);
  const [modality, setModality] = useState<"workshop" | "onsite" | null>(preModality);
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(preType ? (initialSlot ?? null) : null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errors, setErrors] = useState<FieldErrors | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AppointmentCreated | null>(null);
  const [pending, start] = useTransition();
  const [problem, setProblem] = useState("");
  const top = useRef<HTMLDivElement>(null);

  const type = types.find((t) => t.id === typeId) ?? null;

  useEffect(() => {
    try {
      const fromDiag = sessionStorage.getItem(DIAGNOSIS_STORAGE_KEY);
      if (fromDiag) setProblem(fromDiag);
    } catch {
      /* indisponível */
    }
  }, []);

  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const go = (n: number) => {
    setMessage(null);
    setStep(n);
  };

  const chooseType = (t: BookingTypeOption) => {
    setTypeId(t.id);
    setSlot(null);
    // modalidade única: avança direto
    if (t.allowWorkshop !== t.allowOnsite) {
      setModality(t.allowWorkshop ? "workshop" : "onsite");
      go(2);
    } else {
      if (modality && !(modality === "workshop" ? t.allowWorkshop : t.allowOnsite)) setModality(null);
      go(1);
    }
  };

  const submit = (form: HTMLFormElement) => {
    if (!type || !modality || !slot) return;
    const fd = new FormData(form);
    fd.set("bookingTypeId", type.id);
    fd.set("modality", modality);
    fd.set("date", slot.date);
    fd.set("time", slot.time);
    if (service) fd.set("serviceId", service.id);
    start(async () => {
      const res = await createAppointmentAction(fd);
      if (res.ok) {
        setResult(res);
        setErrors(undefined);
        try {
          sessionStorage.removeItem(DIAGNOSIS_STORAGE_KEY);
        } catch {}
        go(4);
      } else {
        setErrors(res.errors);
        setMessage(res.message);
        if (res.code === "slot_taken") {
          setSlot(null);
          setRefreshKey((k) => k + 1);
          go(2);
          setMessage(res.message);
        }
      }
    });
  };

  return (
    <div ref={top} className="scroll-mt-28">
      {/* progresso */}
      <ol className="mb-8 grid grid-cols-5 gap-1.5" aria-label="Etapas do agendamento">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}>
            <div className={clsx("h-1 rounded-full transition-colors duration-500", i <= step ? "bg-orange" : "bg-white/10")} />
            <p className={clsx("mt-2 hidden font-tech text-xs uppercase tracking-wider sm:block", i === step ? "text-paper" : "text-silver-dim")}>
              {String(i + 1).padStart(2, "0")} · {s}
            </p>
          </li>
        ))}
      </ol>
      <p className="mb-6 font-tech text-sm uppercase tracking-widest text-orange sm:hidden">
        Etapa {step + 1} de 5 · {STEPS[step]}
      </p>

      {message && step !== 4 && (
        <div className="mb-6">
          <FormAlert>{message}</FormAlert>
        </div>
      )}

      {service && step < 4 && (
        <p className="mb-6 text-sm text-silver">
          Serviço de interesse: <strong className="text-paper">{service.name}</strong>
        </p>
      )}

      {/* 1 — serviço */}
      {step === 0 && (
        <div>
          <h2 className="font-display text-2xl md:text-3xl">Qual atendimento você precisa?</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => chooseType(t)}
                className={clsx(
                  "panel group flex items-start justify-between gap-4 p-5 text-left transition-colors hover:border-orange/60",
                  typeId === t.id && "!border-orange",
                )}
              >
                <span>
                  <span className="block font-heading text-xl font-bold">{t.name}</span>
                  {t.description && <span className="mt-1 block text-sm text-silver">{t.description}</span>}
                  <span className="mt-3 flex items-center gap-1.5 font-tech text-sm uppercase tracking-wider text-silver-dim">
                    <Clock className="size-3.5" aria-hidden /> Reserva de {t.durationMinutes >= 60 ? `${t.durationMinutes / 60}h` : `${t.durationMinutes} min`}
                  </span>
                </span>
                <ArrowRight className="mt-1 size-5 shrink-0 text-silver-dim transition-transform group-hover:translate-x-1 group-hover:text-orange" aria-hidden />
              </button>
            ))}
          </div>
          {types.length === 0 && <FormAlert tone="warning">A agenda online ainda não foi configurada. Fale conosco pelo WhatsApp.</FormAlert>}
        </div>
      )}

      {/* 2 — modalidade */}
      {step === 1 && type && (
        <div>
          <h2 className="font-display text-2xl md:text-3xl">Onde será o atendimento?</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(
              [
                { v: "workshop", icon: Factory, title: "Atendimento na oficina", text: "Você agenda um horário para levar o veículo.", allowed: type.allowWorkshop },
                { v: "onsite", icon: MapPin, title: "Visita ao local", text: "A equipe vai até o veículo. Sujeito à área atendida e à confirmação; pode haver custo de deslocamento.", allowed: type.allowOnsite },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                disabled={!o.allowed}
                onClick={() => {
                  setModality(o.v);
                  go(2);
                }}
                className={clsx("panel p-6 text-left transition-colors hover:border-orange/60 disabled:cursor-not-allowed disabled:opacity-40", modality === o.v && "!border-orange")}
              >
                <o.icon className="size-8 text-orange" aria-hidden />
                <span className="mt-4 block font-heading text-xl font-bold">{o.title}</span>
                <span className="mt-1 block text-sm text-silver">{o.text}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-6" onClick={() => go(0)}>
            <ArrowLeft className="size-4" /> Voltar
          </Button>
        </div>
      )}

      {/* 3 — data e horário */}
      {step === 2 && type && (
        <div>
          <h2 className="font-display text-2xl md:text-3xl">Escolha a data e o horário</h2>
          <p className="mt-2 text-silver">Mostramos apenas horários realmente disponíveis na agenda.</p>
          <div className="mt-6">
            <SlotPicker bookingTypeId={type.id} value={slot} onChange={setSlot} today={today} refreshKey={refreshKey} />
          </div>
          <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => go(type.allowWorkshop !== type.allowOnsite ? 0 : 1)}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <Button disabled={!slot} onClick={() => go(3)}>
              Continuar <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 4 — dados */}
      {step === 3 && type && slot && modality && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="space-y-5"
        >
          <div className="panel flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
            <span className="font-heading text-lg font-bold">{type.name}</span>
            <span className="flex items-center gap-1.5 text-silver"><CalendarDays className="size-4 text-orange" /> {slot.date.split("-").reverse().join("/")}</span>
            <span className="flex items-center gap-1.5 text-silver"><Clock className="size-4 text-orange" /> {slot.time}</span>
            <span className="text-silver">{modality === "workshop" ? "Na oficina" : "No local"}</span>
            <button type="button" className="ml-auto text-orange hover:underline" onClick={() => go(2)}>Alterar</button>
          </div>
          <FormSection title="Seus dados">
            <CustomerFields errors={errors} />
          </FormSection>
          <FormSection title="Veículo">
            <VehicleFields errors={errors} />
          </FormSection>
          {modality === "onsite" && (
            <FormSection title="Endereço do atendimento" description="Onde o veículo estará.">
              <AddressFields errors={errors} />
            </FormSection>
          )}
          <FormSection title="O que está acontecendo?">
            <TextArea
              name="problemDescription"
              label="Descrição do problema"
              className="sm:col-span-2"
              placeholder="Ex.: direção pesada ao manobrar, vazamento perto da caixa…"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              error={errors?.problemDescription}
              maxLength={2000}
            />
            <TextArea name="customerNotes" label="Observações adicionais" optional rows={2} className="sm:col-span-2" error={errors?.customerNotes} maxLength={1000} />
            <AttachmentsField error={errors?.files} />
            <ConsentField error={errors?.consent} />
          </FormSection>
          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => go(2)}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
              {pending ? "Enviando…" : "Confirmar agendamento"}
            </Button>
          </div>
        </form>
      )}

      {/* 5 — confirmação */}
      {step === 4 && result && <Confirmation result={result} whatsappNumber={whatsappNumber} />}
    </div>
  );
}

function Confirmation({ result, whatsappNumber }: { result: AppointmentCreated; whatsappNumber: string }) {
  const [copied, setCopied] = useState(false);
  const wa = whatsappLink(
    whatsappNumber,
    `Olá! Fiz um agendamento pelo site da DS Hidráulica.\nProtocolo: ${result.protocol}\nServiço: ${result.serviceName}\nData: ${result.dateText}, ${result.timeText}\nModalidade: ${result.modality}`,
  );
  const pending = result.status === "pending";
  return (
    <div className="panel overflow-hidden" role="status">
      <div className={clsx("p-6 md:p-10", pending ? "bg-warning/[0.06]" : "bg-success/[0.07]")}>
        <span className={clsx("inline-flex size-14 items-center justify-center rounded-full", pending ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
          {pending ? <Clock className="size-7" /> : <Check className="size-7" />}
        </span>
        <h2 className="mt-5 font-display text-2xl md:text-4xl">{pending ? "Solicitação recebida!" : "Agendamento confirmado!"}</h2>
        <p className="mt-2 max-w-2xl text-silver">{result.statusMessage}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="font-tech text-sm uppercase tracking-widest text-silver-dim">Protocolo</span>
          <span className="font-tech text-3xl font-semibold tracking-wider text-paper">{result.protocol}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(result.protocol).then(() => setCopied(true));
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs hover:border-orange"
          >
            <Copy className="size-3.5" /> {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      <dl className="grid gap-px bg-white/[0.06] sm:grid-cols-2">
        {[
          ["Nome", result.name],
          ["Serviço", result.serviceName],
          ["Data", result.dateText],
          ["Horário", result.timeText],
          ["Modalidade", result.modality],
        ].map(([k, v]) => (
          <div key={k} className="bg-ink-2 p-5">
            <dt className="font-tech text-xs uppercase tracking-widest text-silver-dim">{k}</dt>
            <dd className="mt-1 font-heading text-lg font-bold first-letter:uppercase">{v}</dd>
          </div>
        ))}
        <div className="bg-ink-2 p-5">
          <dt className="font-tech text-xs uppercase tracking-widest text-silver-dim">Situação</dt>
          <dd className="mt-1.5">
            <Badge tone={pending ? "warning" : "success"}>{result.statusLabel}</Badge>
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-3 p-6 sm:flex-row">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md", "!bg-[#25d366] !text-ink")}>
            <WhatsAppIcon className="size-5" /> Enviar pelo WhatsApp
          </a>
        )}
        <Link href={`/acompanhar?protocolo=${result.protocol}`} className={buttonClass("secondary", "md")}>
          Acompanhar solicitação
        </Link>
        <Link href="/" className={buttonClass("ghost", "md")}>Voltar ao início</Link>
      </div>
      <p className="px-6 pb-6 text-xs text-silver-dim">Guarde o protocolo: com ele e o seu telefone você pode reagendar ou cancelar pela página Acompanhar.</p>
    </div>
  );
}
