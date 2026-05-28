import Link from "next/link";
import { MarketingHeader } from "../../components";
import { LEGAL_VERSIONS } from "../../lib/legal";

export default function TermsPage() {
  return (
    <main className="shell">
      <MarketingHeader />
      <section className="legalPage">
        <p className="eyebrow">Documento operacional</p>
        <h1>Termos de Uso</h1>
        <p>Versão técnica: {LEGAL_VERSIONS.termsOfUse}</p>
        <div className="legalText">
          <p>
            Este documento registra as regras de uso da plataforma Tunix. A versão final deve ser revisada
            por advogado antes de uso comercial com clientes reais.
          </p>
          <h2>Uso da plataforma</h2>
          <p>Usuários devem fornecer dados verdadeiros, manter credenciais seguras e usar a plataforma apenas para fins legais.</p>
          <h2>Conteúdo e responsabilidade</h2>
          <p>Quem cadastra composições, fonogramas, capas, créditos e metadados declara possuir autorização para isso.</p>
          <h2>Auditoria</h2>
          <p>A plataforma pode registrar aceites, declarações, logs operacionais, solicitações e eventos de segurança.</p>
        </div>
        <Link className="secondaryButton linkButton" href="/entrar">Voltar</Link>
      </section>
    </main>
  );
}
