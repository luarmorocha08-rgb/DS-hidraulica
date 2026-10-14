"use client";

import Link from "next/link";
import { LocateFixed, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { Checkbox, SelectField, TextField } from "@/components/ui/Field";
import { VEHICLE_TYPES } from "@/lib/labels";
import type { FieldErrors } from "@/lib/validation";

export type Errors = FieldErrors | undefined;

export function FormSection({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="panel p-5 md:p-7">
      <legend className="sr-only">{title}</legend>
      <h2 aria-hidden className="font-heading text-xl font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-silver-dim">{description}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function CustomerFields({ errors, emailOptional = true }: { errors: Errors; emailOptional?: boolean }) {
  return (
    <>
      <TextField name="name" label="Nome completo" autoComplete="name" error={errors?.name} className="sm:col-span-2" maxLength={120} />
      <TextField
        name="phone"
        label="Telefone / WhatsApp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(11) 99999-8888"
        error={errors?.phone}
      />
      <TextField name="email" label="E-mail" type="email" autoComplete="email" optional={emailOptional} error={errors?.email} />
    </>
  );
}

export function VehicleFields({ errors, yearOptional = true }: { errors: Errors; yearOptional?: boolean }) {
  return (
    <>
      <SelectField name="vehicleType" label="Tipo de veículo" options={VEHICLE_TYPES} placeholder="Selecione" error={errors?.vehicleType} />
      <TextField name="vehicleBrand" label="Marca" placeholder="Ex.: Volvo, Scania, Mercedes-Benz" error={errors?.vehicleBrand} maxLength={60} />
      <TextField name="vehicleModel" label="Modelo" placeholder="Ex.: FH 540, Atego 2426" error={errors?.vehicleModel} maxLength={80} />
      <TextField
        name="vehicleYear"
        label="Ano"
        inputMode="numeric"
        optional={yearOptional}
        hint="Se souber."
        placeholder="Ex.: 2019"
        maxLength={4}
        error={errors?.vehicleYear}
      />
    </>
  );
}

export function AddressFields({ errors }: { errors: Errors }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");
  const [cepState, setCepState] = useState<"idle" | "loading" | "error">("idle");
  const formRef = useRef<HTMLDivElement>(null);

  const locate = () => {
    if (!("geolocation" in navigator)) return setGeoState("error");
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("idle");
      },
      () => setGeoState("error"),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  // Preenchimento por CEP (ViaCEP, serviço público e gratuito)
  const lookupCep = async (raw: string) => {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepState("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error();
      const root = formRef.current;
      const set = (name: string, value: string) => {
        const el = root?.querySelector<HTMLInputElement>(`[name="${name}"]`);
        if (el && !el.value && value) el.value = value;
      };
      set("street", data.logradouro);
      set("district", data.bairro);
      set("city", data.localidade);
      set("state", data.uf);
      setCepState("idle");
    } catch {
      setCepState("error");
    }
  };

  const mapUrl = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.006},${coords.lat - 0.004},${coords.lng + 0.006},${coords.lat + 0.004}&layer=mapnik&marker=${coords.lat},${coords.lng}`
    : null;

  return (
    <div ref={formRef} className="contents">
      <TextField
        name="postalCode"
        label="CEP"
        inputMode="numeric"
        optional
        placeholder="00000-000"
        maxLength={9}
        onBlur={(e) => lookupCep(e.currentTarget.value)}
        hint={cepState === "loading" ? "Buscando endereço…" : cepState === "error" ? "CEP não encontrado — preencha manualmente." : "Preenche rua, bairro e cidade automaticamente."}
        error={errors?.postalCode}
      />
      <div className="flex items-end">
        <button
          type="button"
          onClick={locate}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-white/15 px-4 text-sm font-semibold text-silver transition-colors hover:border-orange hover:text-paper"
        >
          <LocateFixed className="size-4" aria-hidden />
          {geoState === "loading" ? "Obtendo localização…" : coords ? "Localização marcada ✓" : "Usar minha localização"}
        </button>
      </div>
      {geoState === "error" && (
        <p className="text-sm text-warning sm:col-span-2">Não foi possível obter a localização. Preencha o endereço normalmente.</p>
      )}
      <TextField name="street" label="Rua / avenida / rodovia" autoComplete="address-line1" className="sm:col-span-2" error={errors?.street} maxLength={160} />
      <TextField name="number" label="Número / km" error={errors?.number} maxLength={20} />
      <TextField name="complement" label="Complemento" optional error={errors?.complement} maxLength={80} />
      <TextField name="district" label="Bairro" error={errors?.district} maxLength={80} />
      <div className="grid grid-cols-[1fr_88px] gap-3">
        <TextField name="city" label="Cidade" autoComplete="address-level2" error={errors?.city} maxLength={80} />
        <TextField name="state" label="UF" autoComplete="address-level1" maxLength={2} placeholder="SP" error={errors?.state} />
      </div>
      <TextField name="reference" label="Ponto de referência" optional className="sm:col-span-2" error={errors?.reference} maxLength={200} />
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
      {mapUrl && (
        <div className="overflow-hidden rounded-[10px] border border-white/10 sm:col-span-2">
          <iframe title="Localização marcada no mapa" src={mapUrl} className="h-56 w-full" loading="lazy" />
        </div>
      )}
    </div>
  );
}

export function AttachmentsField({ error, label = "Fotos ou vídeos" }: { error?: string; label?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const sync = (list: File[]) => {
    setFiles(list);
    const dt = new DataTransfer();
    list.forEach((f) => dt.items.add(f));
    if (input.current) input.current.files = dt.files;
  };

  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 font-heading text-[0.95rem] font-bold tracking-wide text-silver">
        {label} <span className="font-sans text-xs font-normal text-silver-dim">(opcional · até 6 arquivos)</span>
      </p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-white/20 bg-white/[0.02] px-4 py-6 text-center text-sm text-silver transition-colors hover:border-orange/70">
        <Paperclip className="size-5 text-orange" aria-hidden />
        <span>Toque para anexar fotos do componente, do vazamento ou do veículo</span>
        <span className="text-xs text-silver-dim">JPG, PNG, WEBP, HEIC, MP4 ou MOV</span>
        <input
          ref={input}
          type="file"
          name="files"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime"
          className="sr-only"
          onChange={(e) => sync([...files, ...Array.from(e.currentTarget.files ?? [])].slice(0, 6))}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2 text-sm">
              <span className="truncate">{f.name}</span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-silver-dim">
                {(f.size / 1024 / 1024).toFixed(1)} MB
                <button type="button" aria-label={`Remover ${f.name}`} onClick={() => sync(files.filter((_, j) => j !== i))} className="text-silver hover:text-danger">
                  <X className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-1.5 text-sm text-[#ff8f92]">{error}</p>}
    </div>
  );
}

export function ConsentField({ error }: { error?: string }) {
  return (
    <Checkbox name="consent" error={error} className="sm:col-span-2" required>
      Autorizo o uso dos meus dados para contato sobre esta solicitação, conforme a{" "}
      <Link href="/privacidade" target="_blank" className="text-orange underline">
        política de privacidade
      </Link>
      .
    </Checkbox>
  );
}
