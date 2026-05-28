import Link from "next/link";
import { MarketingHeader, SongMeta } from "./components";
import { compositions, filters } from "./data";

const metrics = [
  { label: "Composicoes cadastradas", value: "128" },
  { label: "Interesses enviados", value: "43" },
  { label: "Artistas buscando repertorio", value: "19" },
];

export default function Home() {
  return (
    <main className="shell">
      <MarketingHeader />

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Startup musical brasileira</p>
          <h1>O lugar onde musicas ineditas encontram artistas prontos para gravar.</h1>
          <p>
            Organize composicoes, proteja o historico da obra, encontre repertorios
            com filtros profissionais e prepare o caminho para negociacao e lancamento.
          </p>
          <div className="heroActions">
            <Link className="primaryButton linkButton" href="/composicoes/nova">
              Cadastrar composicao
            </Link>
            <Link className="secondaryButton linkButton" href="/catalogo">
              Buscar repertorio
            </Link>
          </div>
        </div>

        <section className="studioPanel" aria-label="Painel demonstrativo">
          <div className="panelHeader">
            <span>Radar de oportunidades</span>
            <strong>R$ 38.400</strong>
          </div>
          <div className="soundWave" aria-hidden="true">
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
          <p className="eyebrow">Fluxo inicial</p>
          <h2>Da obra guardada ao interesse de gravacao.</h2>
        </div>
        <ol>
          <li>
            <strong>Compositor cadastra</strong>
            <span>Letra, audio guia, genero, tema, clima, BPM, voz e autores.</span>
          </li>
          <li>
            <strong>Artista encontra</strong>
            <span>Busca repertorio com filtros e salva as melhores opcoes.</span>
          </li>
          <li>
            <strong>Interesse registrado</strong>
            <span>A plataforma guarda historico, mensagem e status da negociacao.</span>
          </li>
        </ol>
      </section>

      <section className="plans" id="planos">
        <div className="sectionTitle">
          <p className="eyebrow">Monetizacao</p>
          <h2>Planos pensados para validar receita desde cedo.</h2>
        </div>
        <div className="planGrid">
          <article>
            <h3>Compositor Start</h3>
            <p>Para publicar as primeiras obras e medir interesse.</p>
            <strong>Gratis</strong>
          </article>
          <article>
            <h3>Compositor Pro</h3>
            <p>Catalogo maior, destaques e estatisticas.</p>
            <strong>R$ 39/mes</strong>
          </article>
          <article>
            <h3>Produtor</h3>
            <p>Busca avancada, listas e interesses ilimitados.</p>
            <strong>R$ 59/mes</strong>
          </article>
        </div>
      </section>
    </main>
  );
}
