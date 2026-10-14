"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { DIAGNOSIS_STORAGE_KEY } from "@/components/home/Diagnosis";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormAlert, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { createQuoteAction, createVisitAction, type VisitCreated } from "@/lib/actions/public";
import { URGENCY, VISIT_PERIODS } from "@/lib/labels";
import type { FieldErrors } from "@/lib/validation";
import { WHATSAPP_MESSAGES, whatsappLink } from "@/lib/whatsapp";
import { AddressFields, AttachmentsField, ConsentField, CustomerFields, FormSection, VehicleFields } from "./fields";

function useDiagnosisText() {
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(DIAGNOSIS_STORAGE_KEY);
      if (v) setText(v);
    } catch {}
  }, []);
  return [text, setText] as const;
}

function ProtocolBox({ protocol }: { protocol: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <span className="font-tech text-sm uppercase tracking-widest text-silver-dim">Protocolo</span>
      <span className="font-tech text-3xl font-semibold tracking-wider">{protocol}</span>
      <button type="button" onClick={() => navigator.clipboard?.writeText(protocol).then(() => setCopied(true))} className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs hover:border-orange">
        <Copy className="size-3.5" /> {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function Success({ title, protocol, statusLabel, children, waMessage, whatsappNumber }: { title: string; protocol: string; statusLabel: string; children?: React.ReactNode; waMessage: string; whatsappNumber: string }) {
  const wa = whatsappLink(whatsappNumber, `${waMessage}\nProtocolo: ${protocol}`);
  return (
    <div className="panel overflow-hidden" role="status">
      <div className="bg-info/[0.06] p-6 md:p-10">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-7" />
        </span>
        <h2 className="mt-5 font-display text-2xl md:text-4xl">{title}</h2>
        <div className="mt-3"><Badge tone="info">{statusLabel}</Badge></div>
        <ProtocolBox protocol={protocol} />
        <div className="mt-5 max-w-2xl space-y-2 text-silver">{children}</div>
      </div>
      <div className="flex flex-col gap-3 p-6 sm:flex-row">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md", "!bg-[#25d366] !text-ink")}>
            <WhatsAppIcon className="size-5" /> Continuar pelo WhatsApp
          </a>
        )}
        <Link href={`/acompanhar?protocolo=${protocol}`} className={buttonClass("secondary", "md")}>Acompanhar solicitação</Link>
        <Link href="/" className={buttonClass("ghost", "md")}>Voltar ao início</Link>
      </div>
    </div>
  );
}

export function VisitForm({ whatsappNumber, today }: { whatsappNumber: string; today: string }) {
  const [errors, setErrors] = useState<FieldErrors | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<VisitCreated | null>(null);
  const [pending, start] = useTransition();
  const [problem, setProblem] = useDiagnosisText();

  if (result) {
    return (
      <Success title="Solicitação de visita enviada!" protocol={result.protocol} statusLabel={result.statusLabel} whatsappNumber={whatsappNumber} waMessage={WHATSAPP_MESSAGES.visit}>
        <p>{result.coverageMessage}</p>
        <p>{result.visitFeeNote || "A visita pode ter custo de deslocamento, informado pela equipe antes da confirmação."}</p>
        <p className="text-sm text-silver-dim">A visita só está garantida após a confirmação da equipe.</p>
      </Success>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await createVisitAction(fd);
          if (res.ok) {
            setResult(res);
            try { sessionStorage.removeItem(DIAGNOSIS_STORAGE_KEY); } catch {}
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            setErrors(res.errors);
            setMessage(res.message);
          }
        });
      }}
    >
      {message && <FormAlert>{message}</FormAlert>}
      <FormSection title="1. Seus dados"><CustomerFields errors={errors} /></FormSection>
      <FormSection title="2. Endereço do atendimento" description="Onde o veículo está. Use o CEP ou sua localização para agilizar."><AddressFields errors={errors} /></FormSection>
      <FormSection title="3. Veículo"><VehicleFields errors={errors} /></FormSection>
      <FormSection title="4. Problema e preferência de data">
        <TextArea name="problemDescription" label="Problema apresentado" className="sm:col-span-2" value={problem} onChange={(e) => setProblem(e.target.value)} error={errors?.problemDescription} maxLength={2000} placeholder="Descreva o que está acontecendo com a direção." />
        <TextField name="preferredDate" label="Data preferida" type="date" min={today} optional error={errors?.preferredDate} />
        <SelectField name="preferredPeriod" label="Horário preferido" options={VISIT_PERIODS} defaultValue="qualquer" error={errors?.preferredPeriod} />
        <AttachmentsField error={errors?.files} />
        <ConsentField error={errors?.consent} />
      </FormSection>
      <p className="text-sm text-silver-dim">A visita depende da disponibilidade da equipe e da área atendida, e pode ter custo de deslocamento. Você recebe a confirmação pelo protocolo.</p>
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        {pending ? "Enviando…" : "Solicitar visita ao local"}
      </Button>
    </form>
  );
}

export function QuoteForm({ whatsappNumber, services, defaultService }: { whatsappNumber: string; services: string[]; defaultService?: string }) {
  const [errors, setErrors] = useState<FieldErrors | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ protocol: string; statusLabel: string } | null>(null);
  const [pending, start] = useTransition();
  const [problem, setProblem] = useDiagnosisText();

  if (result) {
    return (
      <Success title="Pedido de orçamento enviado!" protocol={result.protocol} statusLabel={result.statusLabel} whatsappNumber={whatsappNumber} waMessage={WHATSAPP_MESSAGES.quote}>
        <p>A equipe vai analisar as informações e responder com o orçamento ou com perguntas adicionais.</p>
        <p className="text-sm text-silver-dim">Os valores dependem da avaliação do componente — não enviamos preços automáticos.</p>
      </Success>
    );
  }

  const options = [...services.map((s) => ({ value: s, label: s })), { value: "Outro / não sei", label: "Outro / não sei" }];
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await createQuoteAction(fd);
          if (res.ok) {
            setResult(res);
            try { sessionStorage.removeItem(DIAGNOSIS_STORAGE_KEY); } catch {}
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            setErrors(res.errors);
            setMessage(res.message);
          }
        });
      }}
    >
      {message && <FormAlert>{message}</FormAlert>}
      <FormSection title="1. Seus dados"><CustomerFields errors={errors} /></FormSection>
      <FormSection title="2. Veículo"><VehicleFields errors={errors} /></FormSection>
      <FormSection title="3. Serviço">
        <SelectField name="serviceType" label="Tipo de serviço" options={options} defaultValue={defaultService ?? ""} placeholder="Selecione" error={errors?.serviceType} className="sm:col-span-2" />
        <TextArea name="problemDescription" label="Descrição do problema" className="sm:col-span-2" value={problem} onChange={(e) => setProblem(e.target.value)} error={errors?.problemDescription} maxLength={2000} />
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 font-heading text-[0.95rem] font-bold tracking-wide text-silver">Urgência</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {URGENCY.map((u) => (
              <label key={u.value} className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-white/10 p-3 text-sm has-[:checked]:border-orange has-[:checked]:bg-orange/10">
                <input type="radio" name="urgency" value={u.value} defaultChecked={u.value === "normal"} className={clsx("size-4 accent-[#f47712]")} />
                {u.label}
              </label>
            ))}
          </div>
        </fieldset>
        <AttachmentsField label="Fotos do componente" error={errors?.files} />
        <ConsentField error={errors?.consent} />
      </FormSection>
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        {pending ? "Enviando…" : "Solicitar orçamento"}
      </Button>
    </form>
  );
}
