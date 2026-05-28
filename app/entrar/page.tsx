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
        <Brand />
        <div>
          <p className="eyebrow">Acesso</p>
          <h1>Entrar na Tunix</h1>
          <p>Use sua conta para gerenciar composições, interesses e catálogo.</p>
        </div>
        <form className="authForm" action={loginUser}>
          {params.erro ? (
            <p className="formError">
              {params.erro === "limite"
                ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
                : "Email ou senha inválidos. Confira os dados e tente novamente."}
            </p>
          ) : null}
          <label>
            Email
            <input name="email" type="email" defaultValue="luan@tunix.local" />
          </label>
          <label>
            Senha
            <input name="password" type="password" defaultValue="demo123456" />
          </label>
          <button className="primaryButton" type="submit">Entrar</button>
        </form>
        <p className="authHint">
          Ainda não tem conta? <Link href="/criar-conta">Criar conta</Link>
        </p>
        <div className="demoAccounts">
          <strong>Contas para testar os painéis</strong>
          <span>Compositor: luan@tunix.local</span>
          <span>Artista: duo@tunix.local</span>
          <span>Admin: admin@tunix.local</span>
          <small>Senha de todas: demo123456</small>
        </div>
      </section>
    </main>
  );
}
