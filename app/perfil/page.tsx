import { AppShell, PageHeader } from "../components";
import { updateProfile } from "../actions";
import { requireUser } from "../lib/auth";
import { prisma } from "../lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string; alerta?: string }>;
}) {
  try {
    const user = await requireUser();
    const query = await searchParams;

    // Load user role and profile details
    const roles = await prisma.userRole.findMany({ where: { userId: user.id } });
    const isComposer = roles.some((role) => role.role === "COMPOSER");

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    return (
      <AppShell>
        <PageHeader
          eyebrow="Configurações"
          title="Meu Perfil"
          description="Gerencie seus dados pessoais, informações profissionais e informações fiscais."
        />

        <form className="compositionForm" action={updateProfile} style={{ maxWidth: "800px" }}>
          {query.alerta === "registro_pendente" ? (
            <p className="formError" style={{ background: "var(--danger-bg, #fff1f2)", border: "1px solid #fecdd3", color: "#e11d48", padding: "16px", borderRadius: "12px", marginBottom: "20px", fontWeight: "bold" }}>
              ⚠️ Perfil incompleto: Para poder registrar novas composições, você precisa preencher o seu Perfil com seu Nome Completo, CPF válido e Nome da Mãe.
            </p>
          ) : null}

          {query.erro ? (
            <p className="formError">
              {query.erro === "cpf_invalido"
                ? "O CPF digitado não é válido. Verifique os dígitos e tente novamente."
                : query.erro === "dados_compositor"
                  ? "Como Compositor, você precisa preencher Nome Completo, CPF e Nome da Mãe."
                  : "Por favor, preencha todos os campos obrigatórios."}
            </p>
          ) : null}

          {query.sucesso === "salvo" ? (
            <p className="formSuccess">Dados atualizados com sucesso!</p>
          ) : null}

          <section className="formSection">
            <h2>Informações de Acesso</h2>
            <div className="formGrid">
              <label>
                Nome de Exibição (Artístico)
                <input
                  name="displayName"
                  defaultValue={profile?.displayName ?? user.name}
                  required
                  placeholder="Ex: Carlos do Sertanejo"
                />
              </label>
              <label>
                E-mail de Cadastro (Não editável)
                <input
                  type="email"
                  defaultValue={user.email}
                  disabled
                  style={{ background: "#f5f5f5", cursor: "not-allowed", color: "#888" }}
                />
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Dados Pessoais & Fiscais {isComposer && <span style={{ color: "#d4af37", fontSize: "0.8rem", marginLeft: "10px" }}>(Obrigatórios para Compositor)</span>}</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "15px" }}>
              Estas informações são de segurança e serão utilizadas para a emissão de certidões judiciais de anterioridade de suas obras.
            </p>
            <div className="formGrid">
              <label>
                Nome Completo
                <input
                  name="fullName"
                  defaultValue={profile?.fullName ?? ""}
                  required={isComposer}
                  placeholder="Nome de nascimento completo"
                />
              </label>
              <label>
                CPF (Apenas números)
                <input
                  name="cpf"
                  defaultValue={profile?.cpf ?? ""}
                  required={isComposer}
                  placeholder="Ex: 000.000.000-00"
                />
              </label>
              <label style={{ gridColumn: "span 2" }}>
                Nome Completo da Mãe
                <input
                  name="motherName"
                  defaultValue={profile?.motherName ?? ""}
                  required={isComposer}
                  placeholder="Nome completo da sua mãe"
                />
              </label>
            </div>
          </section>

          <section className="formSection">
            <h2>Localização & Biografia</h2>
            <div className="formGrid">
              <label>
                Cidade
                <input
                  name="city"
                  defaultValue={profile?.city ?? ""}
                  placeholder="Ex: Goiânia"
                />
              </label>
              <label>
                Estado
                <input
                  name="state"
                  defaultValue={profile?.state ?? ""}
                  placeholder="Ex: GO"
                  maxLength={2}
                />
              </label>
              <label style={{ gridColumn: "span 2" }}>
                Website / Link Profissional
                <input
                  name="website"
                  type="url"
                  defaultValue={profile?.website ?? ""}
                  placeholder="https://seusite.com.br ou link do Instagram"
                />
              </label>
            </div>
            <label style={{ marginTop: "15px", display: "block" }}>
              Biografia / Apresentação
              <textarea
                name="bio"
                rows={4}
                defaultValue={profile?.bio ?? ""}
                placeholder="Conte um pouco sobre sua carreira, principais composições e parcerias..."
              />
            </label>
          </section>

          <div className="formActions">
            <Link className="secondaryButton linkButton" href="/painel" style={{ textDecoration: "none", textAlign: "center" }}>
              Voltar ao Painel
            </Link>
            <button className="primaryButton" type="submit">Salvar Alterações</button>
          </div>
        </form>
      </AppShell>
    );
  } catch (error: any) {
    if (
      error.digest?.startsWith("NEXT_REDIRECT") ||
      error.digest?.startsWith("NEXT_NOT_FOUND") ||
      error.message === "NEXT_REDIRECT" ||
      error.message === "NEXT_NOT_FOUND"
    ) {
      throw error;
    }
    console.error("PROFILE PAGE CRASH:", error);
    return (
      <AppShell>
        <div style={{ padding: "40px", maxWidth: "800px", margin: "40px auto", fontFamily: "sans-serif", background: "#fff0f0", border: "1px solid #ffc0c0", borderRadius: "12px", color: "#c00000", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "1.3rem" }}>Erro ao carregar perfil</h2>
          <p style={{ color: "#555", fontSize: "0.9rem" }}>Por favor, envie este print ao suporte técnico com o erro abaixo:</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#ffffff", padding: "15px", borderRadius: "8px", border: "1px solid #e0e0e0", fontSize: "0.85rem", color: "#333", overflowX: "auto" }}>
            {error.stack || error.message || String(error)}
          </pre>
          <Link href="/painel" style={{ display: "inline-block", marginTop: "20px", color: "#0f6b5f", fontWeight: "bold", textDecoration: "underline" }}>
            Voltar para o Painel
          </Link>
        </div>
      </AppShell>
    );
  }
}