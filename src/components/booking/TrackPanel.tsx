"use client";

import { CalendarClock, Loader2, Search, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormAlert, TextField } from "@/components/ui/Field";
import { cancelByCustomerAction, rescheduleByCustomerAction, trackRequestAction, type TrackResult } from "@/lib/actions/public";
import type { Tone } from "@/lib/labels";
import type { FieldErrors } from "@/lib/validation";
import { SlotPicker } from "./Calendar";

export function TrackPanel({ initialProtocol, today }: { initialProtocol: string; today: string }) {
  const [creds, setCreds] = useState<{ protocol: string; phone: string } | null>(null);
  const [data, setData] = useState<TrackResult | null>(null);
  const [errors, setErrors] = useState<FieldErrors | undefined>();
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const [mode, setMode] = useState<"view" | "cancel" | "reschedule">("view");
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string } & Partial<TrackResult> & { errors?: FieldErrors; code?: string }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok && res.request && res.history) {
        setData({ request: res.request, history: res.history });
        setErrors(undefined);
        setMode("view");
        setSlot(null);
        setMessage(success ? { tone: "success", text: success } : null);
      } else {
        setErrors(res.errors);
        setMessage({ tone: "danger", text: res.message ?? "Erro." });
        if (res.code === "slot_taken") {
          setSlot(null);
          setRefreshKey((k) => k + 1);
        }
      }
    });

  const withCreds = (extra: Record<string, string> = {}) => {
    const fd = new FormData();
    fd.set("protocol", creds!.protocol);
    fd.set("phone", creds!.phone);
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    return fd;
  };

  return (
    <div className="space-y-6">
      <form
        noValidate
        className="panel grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end md:p-7"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setCreds({ protocol: String(fd.get("protocol")), phone: String(fd.get("phone")) });
          run(() => trackRequestAction(fd));
        }}
      >
        <TextField name="protocol" label="Protocolo" defaultValue={initialProtocol} placeholder="DS-AG-XXXXXX" autoCapitalize="characters" error={errors?.protocol} />
        <TextField name="phone" label="Telefone usado no pedido" type="tel" inputMode="tel" placeholder="(11) 99999-8888" error={errors?.phone} />
        <Button type="submit" disabled={pending} className="min-h-12">
          {pending && mode === "view" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Consultar
        </Button>
      </form>

      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="panel p-5 md:p-7" aria-labelledby="req-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-tech text-sm uppercase tracking-widest text-silver-dim">{data.request.protocol}</p>
                <h2 id="req-title" className="mt-1 font-heading text-2xl font-bold">{data.request.title}</h2>
              </div>
              <Badge tone={data.request.tone as Tone}>{data.request.statusLabel}</Badge>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {data.request.details.map(([k, v]) => (
                <div key={k} className={k === "Situação" || k === "Endereço" || k === "Resposta da equipe" ? "sm:col-span-2" : ""}>
                  <dt className="font-tech text-xs uppercase tracking-widest text-silver-dim">{k}</dt>
                  <dd className="mt-0.5 first-letter:uppercase">{v}</dd>
                </div>
              ))}
            </dl>

            {data.request.changeBlockedReason && <p className="mt-6 text-sm text-warning">{data.request.changeBlockedReason}</p>}

            {data.request.canChange && mode === "view" && (
              <div className="mt-8 flex flex-wrap gap-3">
                {data.request.kind === "appointment" && (
                  <Button variant="secondary" onClick={() => setMode("reschedule")}>
                    <CalendarClock className="size-4" /> Reagendar
                  </Button>
                )}
                <Button variant="danger" onClick={() => setMode("cancel")}>
                  <XCircle className="size-4" /> Cancelar
                </Button>
              </div>
            )}

            {mode === "cancel" && (
              <form
                className="mt-8 space-y-4 rounded-[12px] border border-danger/30 bg-danger/[0.05] p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
                  run(() => cancelByCustomerAction(withCreds({ reason })), "Solicitação cancelada.");
                }}
              >
                <p className="font-heading text-lg font-bold">Cancelar esta solicitação?</p>
                <TextField name="reason" label="Motivo" optional maxLength={300} />
                <div className="flex gap-3">
                  <Button type="submit" variant="danger" disabled={pending}>Confirmar cancelamento</Button>
                  <Button type="button" variant="ghost" onClick={() => setMode("view")}>Voltar</Button>
                </div>
              </form>
            )}

            {mode === "reschedule" && data.request.bookingTypeId && (
              <div className="mt-8 space-y-4">
                <p className="font-heading text-lg font-bold">Escolha o novo horário</p>
                <SlotPicker bookingTypeId={data.request.bookingTypeId} value={slot} onChange={setSlot} today={today} refreshKey={refreshKey} />
                <p className="text-sm text-silver-dim">O novo horário volta a aguardar a confirmação da equipe.</p>
                <div className="flex gap-3">
                  <Button disabled={!slot || pending} onClick={() => slot && run(() => rescheduleByCustomerAction(withCreds(slot)), "Reagendamento enviado — aguardando confirmação.")}>
                    {pending && <Loader2 className="size-4 animate-spin" />} Confirmar novo horário
                  </Button>
                  <Button variant="ghost" onClick={() => setMode("view")}>Voltar</Button>
                </div>
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="panel p-5 md:p-7" aria-labelledby="hist-ev">
              <h2 id="hist-ev" className="font-heading text-xl font-bold">Atualizações</h2>
              <ol className="mt-4 space-y-4 border-l border-orange/40 pl-5">
                {data.request.events.map((e, i) => (
                  <li key={i} className="relative">
                    <span aria-hidden className="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-orange" />
                    <p className="font-semibold">{e.label}</p>
                    <p className="text-xs text-silver-dim">{new Date(e.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                    {e.note && <p className="mt-1 text-sm text-silver">{e.note}</p>}
                  </li>
                ))}
              </ol>
            </section>
            {data.history.length > 1 && (
              <section className="panel p-5 md:p-7" aria-labelledby="hist-all">
                <h2 id="hist-all" className="font-heading text-xl font-bold">Suas solicitações</h2>
                <ul className="mt-4 divide-y divide-white/[0.06] text-sm">
                  {data.history.map((h) => (
                    <li key={h.protocol} className="flex items-center justify-between gap-3 py-2.5">
                      <span>
                        <span className="font-tech tracking-wider">{h.protocol}</span>
                        <span className="ml-2 text-silver-dim">{h.kind}</span>
                      </span>
                      <span className="text-silver">{h.statusLabel}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
