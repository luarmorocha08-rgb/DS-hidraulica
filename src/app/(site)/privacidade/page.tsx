import type { Metadata } from "next";
import { PageHeader } from "@/components/site/PageHeader";
import { getSiteSettings } from "@/lib/content";

export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/privacidade" } };

export default async function PrivacyPage() {
  const s = await getSiteSettings();
  const controller = s.legalName ? `${s.legalName}${s.cnpj ? `, CNPJ ${s.cnpj}` : ""}` : s.companyName;
  const contact = s.email || "os canais de contato informados neste site";
  return (
    <>
      <PageHeader eyebrow="LGPD" title="Política de privacidade" description="Como a DS Hidráulica trata os dados pessoais enviados pelo site, conforme a Lei nº 13.709/2018 (LGPD)." />
      <div className="container-ds max-w-3xl space-y-8 py-12 leading-relaxed text-paper/90 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <section><h2>1. Quem trata os dados</h2><p>O controlador dos dados é {controller}. Para qualquer assunto sobre privacidade, fale conosco por {contact}.</p></section>
        <section>
          <h2>2. Quais dados coletamos</h2>
          <ul>
            <li>Identificação e contato: nome, telefone/WhatsApp e e-mail (opcional).</li>
            <li>Veículo: tipo, marca, modelo e ano.</li>
            <li>Atendimento: descrição do problema, data e horário escolhidos, endereço e localização (somente para visitas ao local), fotos e vídeos que você decidir enviar.</li>
            <li>Dados técnicos de segurança: endereço IP usado para limitar abusos (não usamos para identificar você).</li>
          </ul>
        </section>
        <section>
          <h2>3. Para que usamos</h2>
          <ul>
            <li>Agendar, confirmar, reagendar e realizar o atendimento solicitado;</li>
            <li>Preparar orçamentos e entrar em contato sobre a sua solicitação;</li>
            <li>Enviar avisos e lembretes do atendimento por e-mail ou WhatsApp;</li>
            <li>Manter o histórico de serviços do seu veículo e cumprir obrigações legais.</li>
          </ul>
          <p className="mt-3">Base legal: execução de procedimentos preliminares e do contrato a pedido do titular, consentimento (marcado no formulário) e cumprimento de obrigação legal.</p>
        </section>
        <section><h2>4. Compartilhamento</h2><p>Não vendemos dados. Eles podem ser processados por fornecedores necessários ao funcionamento do site (hospedagem, banco de dados, envio de e-mail e WhatsApp Business), sempre para as finalidades acima.</p></section>
        <section><h2>5. Armazenamento e segurança</h2><p>Os dados ficam em servidores com acesso restrito à equipe autorizada, protegidos por senha e registro de acessos. Fotos e vídeos enviados não ficam públicos. Mantemos as informações pelo tempo necessário ao atendimento e às obrigações legais.</p></section>
        <section>
          <h2>6. Seus direitos</h2>
          <p>Você pode solicitar confirmação de tratamento, acesso, correção, anonimização ou exclusão dos seus dados, além de revogar o consentimento, pelo contato indicado no item 1. A exclusão é feita pela equipe no painel administrativo.</p>
        </section>
        <section><h2>7. Cookies</h2><p>O site público não usa cookies de rastreamento. O painel administrativo usa um cookie de sessão estritamente necessário para a equipe. Se ferramentas de estatística forem ativadas no futuro, esta política será atualizada.</p></section>
        <p className="text-sm text-silver-dim">Este texto é um modelo e deve ser revisado pela DS Hidráulica e, se possível, por um profissional jurídico antes da publicação.</p>
      </div>
    </>
  );
}
