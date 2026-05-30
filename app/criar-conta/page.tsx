import Link from "next/link";
import { registerUser } from "../actions";
import { Brand } from "../components";

export default async function RegisterPage({
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
          <p className="eyebrow">Nova conta</p>
          <h1>Criar conta profissional</h1>
          <p>Comece como compositor, artista, produtor ou empresário musical.</p>
        </div>
        <form className="authForm" action={registerUser}>
          {params.erro ? (
            <p className="formError">
              {params.erro === "email"
                ? "Já existe uma conta com este email."
                : params.erro === "limite"
                  ? "Muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente."
                  : "Preencha nome, email, senha com pelo menos 8 caracteres e aceite os termos."}
            </p>
          ) : null}
          <label>
            Nome
            <input name="name" placeholder="Seu nome ou nome artístico" />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="voce@email.com" />
          </label>
          <label>
            Senha
            <input name="password" type="password" placeholder="Mínimo 8 caracteres" />
          </label>
          <label>
            Perfil principal
            <select name="role" defaultValue="COMPOSER">
              <option value="COMPOSER">Compositor</option>
              <option value="ARTIST">Artista</option>
              <option value="PRODUCER">Produtor</option>
              <option value="MANAGER">Empresário</option>
            </select>
          </label>
          <div className="checkList legalChecks">
            <label>
              <input name="acceptTerms" type="checkbox" />
              <span>
                Li e aceito os <Link href="/legal/termos">Termos de Uso</Link> e a <Link href="/legal/privacidade">Política de Privacidade</Link>.
              </span>
            </label>
          </div>
          <button className="primaryButton" type="submit">Criar conta</button>
        </form>
        <p className="authHint">
          Já tem conta? <Link href="/entrar">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
