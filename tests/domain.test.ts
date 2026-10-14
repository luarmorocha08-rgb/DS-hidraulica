import { describe, expect, it } from "vitest";
import { checkCoverage, haversineKm } from "@/lib/coverage";
import { runPreliminaryDiagnosis } from "@/lib/diagnosis";
import { summarizeHours } from "@/lib/hours";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { generateProtocol, normalizeProtocol, protocolKind } from "@/lib/protocol";
import { appointmentSchema, quoteSchema, visitSchema } from "@/lib/validation";
import { whatsappLink } from "@/lib/whatsapp";
import { band, explodeAmount, STAGE } from "@/components/three/timeline";

describe("telefone", () => {
  it("normaliza celulares e fixos brasileiros", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("5511987654321");
    expect(normalizePhone("+55 21 3333-4444")).toBe("552133334444");
    expect(normalizePhone("011 98765 4321")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("(11) 88765-4321")).toBeNull(); // celular sem 9 inicial
  });
  it("formata para exibição", () => {
    expect(formatPhone("5511987654321")).toBe("(11) 98765-4321");
  });
});

describe("protocolo", () => {
  it("gera e identifica o tipo", () => {
    const p = generateProtocol("visit");
    expect(p).toMatch(/^DS-VT-[0-9A-Z]{6}$/);
    expect(protocolKind(p)).toBe("visit");
    expect(protocolKind("DS-XX-123456")).toBeNull();
  });
  it("tolera digitação com minúsculas e letras ambíguas", () => {
    expect(normalizeProtocol(" ds-ag-abcO1l ")).toBe("DS-AG-ABC011");
  });
});

describe("área de atendimento", () => {
  const base = { cities: [], centerLat: null, centerLng: null, radiusKm: null };
  it("sem configuração → depende de avaliação", () => {
    expect(checkCoverage(base, { city: "Campinas" })).toBe("unknown");
  });
  it("compara cidades sem acento e caixa", () => {
    expect(checkCoverage({ ...base, cities: ["São Paulo"] }, { city: "sao paulo" })).toBe("inside");
    expect(checkCoverage({ ...base, cities: ["São Paulo"] }, { city: "Santos" })).toBe("outside");
  });
  it("usa o raio quando há coordenadas", () => {
    const cfg = { ...base, centerLat: -23.55, centerLng: -46.63, radiusKm: 30 };
    expect(checkCoverage(cfg, { latitude: -23.6, longitude: -46.7 })).toBe("inside");
    expect(checkCoverage(cfg, { latitude: -22.9, longitude: -47.06 })).toBe("outside"); // Campinas
    expect(haversineKm(-23.55, -46.63, -22.9, -47.06)).toBeGreaterThan(80);
  });
});

describe("diagnóstico preliminar", () => {
  it("nunca afirma diagnóstico definitivo e lista possibilidades", () => {
    const r = runPreliminaryDiagnosis({ symptoms: ["pesada", "ruido"], severe: [] });
    expect(r.severe).toBe(false);
    expect(r.message).toMatch(/avaliação técnica/);
    expect(r.possibilities.length).toBeGreaterThan(2);
  });
  it("sintoma grave recomenda não continuar dirigindo", () => {
    const r = runPreliminaryDiagnosis({ symptoms: [], severe: ["perda_controle"] });
    expect(r.severe).toBe(true);
    expect(r.safety).toMatch(/não continue dirigindo/i);
  });
});

describe("horários de funcionamento", () => {
  it("agrupa dias consecutivos iguais", () => {
    const wk = { isOpen: true, openTime: "08:00", closeTime: "18:00", breakStart: "12:00", breakEnd: "13:00" };
    const lines = summarizeHours({ 1: wk, 2: wk, 3: wk, 4: wk, 5: wk, 6: { isOpen: true, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null } });
    expect(lines).toEqual(["Seg–Sex: 8h–12h e 13h–18h", "Sáb: 8h–12h"]);
  });
});

describe("validação de formulários", () => {
  const ok = {
    bookingTypeId: "0b2d6a7e-6a1e-4b8f-9c2a-1d2e3f4a5b6c",
    modality: "workshop",
    date: "2026-11-03",
    time: "09:00",
    problemDescription: "Direção pesada no pátio.",
    name: "Maria Souza",
    phone: "(11) 98765-4321",
    vehicleType: "onibus",
    vehicleBrand: "Marcopolo",
    vehicleModel: "Torino",
    consent: "on",
  };
  it("aceita agendamento válido e normaliza telefone", () => {
    const r = appointmentSchema.safeParse(ok);
    expect(r.success && r.data.phone).toBe("5511987654321");
  });
  it("exige consentimento", () => {
    expect(appointmentSchema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
  });
  it("exige endereço para atendimento no local", () => {
    const r = appointmentSchema.safeParse({ ...ok, modality: "onsite" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toContain("street");
  });
  it("visita exige endereço e aceita coordenadas vazias", () => {
    const v = visitSchema.safeParse({ ...ok, street: "Rod. Anhanguera", number: "km 100", district: "Distrito Industrial", city: "Campinas", state: "sp", latitude: "", longitude: "" });
    expect(v.success && v.data.state).toBe("SP");
  });
  it("orçamento rejeita ano impossível", () => {
    expect(quoteSchema.safeParse({ ...ok, serviceType: "Bomba", vehicleYear: "1800" }).success).toBe(false);
  });
});

describe("WhatsApp", () => {
  it("não gera link sem número configurado", () => {
    expect(whatsappLink("", "oi")).toBeNull();
    expect(whatsappLink("5511987654321", "olá mundo")).toBe("https://wa.me/5511987654321?text=ol%C3%A1%20mundo");
  });
});

describe("roteiro da intro 3D", () => {
  it("desmonta e remonta na ordem do scroll", () => {
    expect(explodeAmount(0.2)).toBe(0);
    expect(explodeAmount(STAGE.explodeFull + 0.01)).toBe(1);
    expect(explodeAmount(0.99)).toBe(0);
    expect(band(0.5, 0.4, 0.6)).toBe(1);
    expect(band(0.9, 0.4, 0.6)).toBe(0);
  });
});
