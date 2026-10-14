import { AdminPage, Card, Field, Flash, inputCls } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { saveSiteSettingsAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/content";

export const metadata = { title: "Dados da empresa" };

export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  await requireAdmin("admin");
  const sp = await searchParams;
  const s = await getSiteSettings();
  return (
    <AdminPage title="Dados da empresa e textos do site" description="Campos vazios não aparecem no site — nada é inventado.">
      <Flash msg={sp.msg} error={sp.error} />
      <form action={saveSiteSettingsAction} className="grid gap-6 xl:grid-cols-2">
        <Card title="Contato">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp (com DDI e DDD, só números)" className="sm:col-span-2"><input name="whatsappNumber" defaultValue={s.whatsappNumber} placeholder="5511999998888" className={inputCls} /></Field>
            <Field label="Telefone"><input name="phone" defaultValue={s.phone} placeholder="551133334444" className={inputCls} /></Field>
            <Field label="E-mail"><input name="email" type="email" defaultValue={s.email} className={inputCls} /></Field>
            <Field label="Instagram"><input name="instagramUrl" defaultValue={s.instagramUrl} className={inputCls} /></Field>
            <Field label="Facebook"><input name="facebookUrl" defaultValue={s.facebookUrl} className={inputCls} /></Field>
            <Field label="YouTube"><input name="youtubeUrl" defaultValue={s.youtubeUrl} className={inputCls} /></Field>
            <Field label="Horário (texto livre; vazio = usar horários da agenda)" className="sm:col-span-2"><input name="hoursText" defaultValue={s.hoursText} className={inputCls} /></Field>
          </div>
        </Card>
        <Card title="Empresa e endereço">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nome" className="sm:col-span-2"><input name="companyName" defaultValue={s.companyName} className={inputCls} /></Field>
            <Field label="Anos de experiência"><input type="number" name="yearsOfExperience" defaultValue={s.yearsOfExperience} min={0} className={inputCls} /></Field>
            <Field label="Razão social" className="sm:col-span-2"><input name="legalName" defaultValue={s.legalName} className={inputCls} /></Field>
            <Field label="CNPJ"><input name="cnpj" defaultValue={s.cnpj} className={inputCls} /></Field>
            <Field label="Rua" className="sm:col-span-2"><input name="street" defaultValue={s.address.street} className={inputCls} /></Field>
            <Field label="Número"><input name="number" defaultValue={s.address.number} className={inputCls} /></Field>
            <Field label="Complemento"><input name="complement" defaultValue={s.address.complement} className={inputCls} /></Field>
            <Field label="Bairro"><input name="district" defaultValue={s.address.district} className={inputCls} /></Field>
            <Field label="CEP"><input name="postalCode" defaultValue={s.address.postalCode} className={inputCls} /></Field>
            <Field label="Cidade" className="sm:col-span-2"><input name="city" defaultValue={s.address.city} className={inputCls} /></Field>
            <Field label="UF"><input name="state" maxLength={2} defaultValue={s.address.state} className={inputCls} /></Field>
            <Field label="Link do Google Maps" className="sm:col-span-3"><input name="mapsUrl" defaultValue={s.address.mapsUrl} className={inputCls} /></Field>
            <Field label="Latitude"><input name="latitude" defaultValue={s.address.latitude ?? ""} className={inputCls} /></Field>
            <Field label="Longitude"><input name="longitude" defaultValue={s.address.longitude ?? ""} className={inputCls} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="addressConfirmed" defaultChecked={s.address.confirmed} className="accent-[#f47712]" /> Exibir endereço no site</label>
          </div>
        </Card>
        <Card title="Área de atendimento no local">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Cidades atendidas (uma por linha)" className="sm:col-span-3"><textarea name="coverageCities" rows={4} defaultValue={s.coverage.cities.join("\n")} className={inputCls} /></Field>
            <Field label="Centro — latitude"><input name="centerLat" defaultValue={s.coverage.centerLat ?? ""} className={inputCls} /></Field>
            <Field label="Centro — longitude"><input name="centerLng" defaultValue={s.coverage.centerLng ?? ""} className={inputCls} /></Field>
            <Field label="Raio (km)"><input name="radiusKm" defaultValue={s.coverage.radiusKm ?? ""} className={inputCls} /></Field>
            <Field label="Texto exibido no site" className="sm:col-span-3"><input name="coverageDescription" defaultValue={s.coverage.description} className={inputCls} /></Field>
            <Field label="Custo de deslocamento (texto; vazio = a combinar)" className="sm:col-span-3"><input name="visitFeeNote" defaultValue={s.visitFeeNote} className={inputCls} /></Field>
          </div>
          <p className="mt-3 text-xs text-silver-dim">Com raio configurado e localização enviada pelo cliente, a verificação usa a distância; senão, compara a cidade. Sem configuração, toda visita fica “a avaliar”.</p>
        </Card>
        <Card title="Textos principais e SEO">
          <div className="grid gap-4">
            <Field label="Título do topo"><input name="heroTitle" defaultValue={s.hero.title} className={inputCls} /></Field>
            <Field label="Subtítulo do topo"><textarea name="heroSubtitle" rows={2} defaultValue={s.hero.subtitle} className={inputCls} /></Field>
            <Field label="Título — Sobre"><input name="aboutTitle" defaultValue={s.about.title} className={inputCls} /></Field>
            <Field label="Texto — Sobre"><textarea name="aboutText" rows={4} defaultValue={s.about.text} className={inputCls} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cidade (SEO local)"><input name="seoCity" defaultValue={s.seo.city} className={inputCls} /></Field>
              <Field label="Região (SEO local)"><input name="seoRegion" defaultValue={s.seo.region} className={inputCls} /></Field>
            </div>
            <Field label="Descrição para buscadores"><textarea name="seoDescription" rows={3} defaultValue={s.seo.description} className={inputCls} /></Field>
          </div>
        </Card>
        <Card title="Fotos da oficina e da equipe (seção Sobre)" className="xl:col-span-2">
          {s.about.photos.length > 0 && (
            <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {s.about.photos.map((p) => (
                <li key={p.url} className="overflow-hidden rounded-md border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.alt} className="aspect-[4/3] w-full object-cover" />
                  <label className="flex items-center gap-2 p-2 text-xs"><input type="checkbox" name="removePhoto" value={p.url} /> Remover</label>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Adicionar foto"><input type="file" name="aboutPhoto" accept="image/jpeg,image/png,image/webp" className="text-sm" /></Field>
            <Field label="Descrição da foto (texto alternativo)"><input name="aboutPhotoAlt" className={inputCls} /></Field>
          </div>
        </Card>
        <div className="xl:col-span-2"><SubmitButton>Salvar tudo</SubmitButton></div>
      </form>
    </AdminPage>
  );
}
