import Link from "next/link";
import { loginUser } from "../actions";
import { Brand } from "../components";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="authShell">
      <section className="authPanel">
        <div className="authTopline">
          <Brand />
          <Link className="authBackLink" href="/">← Voltar para a home</Link>
        </div>
        <div>
          <p className="eyebrow">Acesso</p>
          <h1>Entrar na Tunix</h1>
          <p>Use sua conta para gerenciar composicoes, interesses e catalogo.</p>
        </div>
        <form className="authForm" action={loginUser}>
          {params.erro ? (
            <p className="formError">
              {params.erro === "limite"
                ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
                : "Email ou senha invalidos. Confira os dados e tente novamente."}
            </p>
          ) : null}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="primaryButton" type="submit">Entrar</button>
        </form>
        <p className="authHint">
          Ainda nao tem conta? <Link href="/criar-conta">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}
