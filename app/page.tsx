import Link from "next/link";
import { MarketingHeader, SongMeta } from "./components";
import { compositions, filters } from "./data";

const metrics = [
  { label: "Obras no catalogo", value: "128" },
  { label: "Interesses qualificados", value: "43" },
  { label: "Lancamentos em preparo", value: "19" },
];

const operatingStack = [
  {
    label: "Catalogo",
    title: "Repertorio organizado para decisao comercial.",
    text: "Composicoes com audio, metadados, filtros profissionais e historico de interesse em um fluxo unico.",
  },
  {
    label: "Creditos",
    title: "Uso por saldo, sem plano mensal.",
    text: "O cliente compra creditos e usa em acoes da plataforma, como cadastrar composicoes e preparar lancamentos.",
  },
  {
    label: "Distribuicao",
    title: "Pacotes prontos para sair do painel.",
    text: "Master, capa, ISRC, UPC, splits, plataformas e revisao operacional antes do envio.",
  },
];

const creditPacks = [
  {
    name: "Inicial",
    amount: "20 creditos",
    price: "R$ 49,90",
    note: "Para validar repertorio e iniciar os primeiros cadastros.",
  },
  {
    name: "Profissional",
    amount: "80 creditos",
    price: "R$ 169,90",
    note: "Para artistas, compositores e selos com operacao constante.",
  },
  {
    name: "Gravadora",
    amount: "220 creditos",
    price: "R$ 399,90",
    note: "Para catalogos maiores e equipes que trabalham em volume.",
  },
];

export default function Home() {
  return (
    <main className="shell">
      <MarketingHeader />

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Infraestrutura musical brasileira</p>
          <h1>A plataforma para transformar repertorio em operacao.</h1>
          <p>
            A Tunix organiza composicoes, interesses, creditos e lancamentos em
            um ambiente de trabalho serio para compositores, artistas, selos e produtores.
          </p>
          <div className="heroActions">
            <Link className="primaryButton linkButton" href="/composicoes/nova">
              Cadastrar composicao
            </Link>
            <Link className="secondaryButton linkButton" href="/catalogo">
              Buscar repertorio
            </Link>
          </div>
          <div className="trustStrip" aria-label="Modulos principais">
            <span>Catalogo auditavel</span>
            <span>Compra de creditos</span>
            <span>Distribuicao musical</span>
          </div>
        </div>

        <section className="studioPanel" aria-label="Painel demonstrativo">
          <div className="panelHeader">
            <span>Centro operacional</span>
            <strong>Ativo</strong>
          </div>
          <div className="dealBoard" aria-hidden="true">
            <div>
              <span>Saldo em creditos</span>
              <strong>220</strong>
            </div>
            <div>
              <span>Fila de revisao</span>
              <strong>12</strong>
            </div>
            <div>
              <span>Pacotes enviados</span>
              <strong>7</strong>
            </div>
          </div>
          <div className="soundWave compactWave" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, index) => (
              <span key={index} style={{ height: `${24 + ((index * 17) % 58)}px` }} />
            ))}
          </div>
          <div className="panelGrid">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="businessSection" id="operacao">
        <div className="sectionTitle">
          <p className="eyebrow">Produto de verdade</p>
          <h2>Uma base corporativa para operar catalogo, saldo e distribuicao.</h2>
        </div>
        <div className="businessGrid">
          {operatingStack.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="catalogo">
        <div className="sectionTitle">
          <p className="eyebrow">Catalogo profissional</p>
          <h2>Composicoes filtradas por decisao musical, nao por sorte.</h2>
        </div>

        <div className="filters" aria-label="Filtros de busca">
          {filters.map((filter) => (
            <button key={filter}>{filter}</button>
          ))}
        </div>

        <div className="compositionGrid">
          {compositions.map((song) => (
            <article className="songCard" key={song.title}>
              <div className="songStatus">{song.status}</div>
              <h3>{song.title}</h3>
              <p>por {song.author}</p>
              <SongMeta genre={song.genre} mood={song.mood} voice={song.voice} bpm={song.bpm} />
              <button>Manifestar interesse</button>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow" id="fluxo">
        <div>
          <p className="eyebrow">Fluxo operacional</p>
          <h2>Da obra cadastrada ao pacote pronto para lancamento.</h2>
        </div>
        <ol>
          <li>
            <strong>Compositor cadastra</strong>
            <span>Letra, audio guia, genero, tema, clima, BPM, voz e autores.</span>
          </li>
          <li>
            <strong>Credito movimenta</strong>
            <span>Cada acao relevante consome saldo definido pelo admin, sem assinatura mensal.</span>
          </li>
          <li>
            <strong>Operacao valida</strong>
            <span>A plataforma registra historico, revisao, pendencias e status antes do envio.</span>
          </li>
        </ol>
      </section>

      <section className="plans" id="creditos">
        <div className="sectionTitle">
          <p className="eyebrow">Compra de creditos</p>
          <h2>Pacotes flexiveis para usar conforme a operacao cresce.</h2>
        </div>
        <div className="planGrid">
          {creditPacks.map((pack) => (
            <article key={pack.name}>
              <span>{pack.amount}</span>
              <h3>{pack.name}</h3>
              <p>{pack.note}</p>
              <strong>{pack.price}</strong>
              <Link className="secondaryButton linkButton" href="/creditos">
                Comprar creditos
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
