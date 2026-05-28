import Link from "next/link";
import { MarketingHeader } from "../../components";
import { LEGAL_VERSIONS } from "../../lib/legal";

export default function PrivacyPage() {
  return (
    <main className="shell">
      <MarketingHeader />
      <section className="legalPage">
        <p className="eyebrow">Documento operacional</p>
        <h1>Política de Privacidade</h1>
        <p>Versão técnica: {LEGAL_VERSIONS.privacyPolicy}</p>
        <div className="legalText">
          <p>
            Esta política descreve a base técnica de tratamento de dados na Tunix. A versão final deve ser
            revisada por advogado e responsável LGPD antes da abertura comercial.
          </p>
          <h2>Dados tratados</h2>
          <p>Conta, perfil, composições, interesses, lançamentos, arquivos, logs, notificações, chamados e eventos de auditoria.</p>
          <h2>Finalidade</h2>
          <p>Operar marketplace de composições, distribuição musical, suporte, segurança, financeiro e comunicações operacionais.</p>
          <h2>Segurança</h2>
          <p>Credenciais sensíveis devem ser protegidas, e acessos administrativos devem permanecer auditados.</p>
        </div>
        <Link className="secondaryButton linkButton" href="/entrar">Voltar</Link>
      </section>
    </main>
  );
}
