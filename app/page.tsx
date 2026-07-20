import Link from "next/link";
import { MarketingHeader, SongMeta } from "./components";
import { compositions, filters } from "./data";

const distributionSteps = [
  {
    number: "01",
    title: "Prepare seu lançamento",
    text: "Envie áudio, capa, créditos, compositores e todos os metadados em um único fluxo guiado.",
  },
  {
    number: "02",
    title: "Revise com segurança",
    text: "A Tunix organiza pendências, splits, códigos e direitos antes de o pacote seguir para distribuição.",
  },
  {
    number: "03",
    title: "Alcance o seu público",
    text: "Distribua para centenas de plataformas e acompanhe cada etapa do lançamento pelo painel.",
  },
];

const advantages = [
  {
    tag: "Distribuição",
    title: "Um lançamento, centenas de destinos.",
    text: "Spotify, Apple Music, Deezer, Amazon Music, TikTok, YouTube Music e muitas outras plataformas em um só envio.",
  },
  {
    tag: "Controle",
    title: "Você sabe exatamente o que está acontecendo.",
    text: "Acompanhe revisão, pendências, entregas e status sem depender de planilhas ou conversas espalhadas.",
  },
  {
    tag: "Direitos",
    title: "Créditos e splits organizados desde o início.",
    text: "Registre participantes, percentuais e informações essenciais para uma operação musical profissional.",
  },
];

const platformNames = [
  "Spotify",
  "Apple Music",
  "Deezer",
  "YouTube Music",
  "Amazon Music",
  "TikTok",
  "Instagram",
  "Tidal",
];

export default function Home() {
  return (
    <main className="shell homeShell">
      <MarketingHeader />

      <section className="hero homeHero">
        <div className="heroCopy">
          <div className="heroBadge">
            <span aria-hidden="true" />
            Distribuição musical com operação brasileira
          </div>
          <h1>
            Sua música pronta para <em>chegar ao mundo.</em>
          </h1>
          <p>
            Distribua seus lançamentos para as principais plataformas digitais,
            organize créditos e acompanhe tudo em um painel simples, seguro e profissional.
          </p>
          <div className="heroActions">
            <Link className="primaryButton linkButton heroPrimary" href="/lancamentos/novo">
              Distribuir minha música
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="secondaryButton linkButton" href="/criar-conta">
              Criar conta
            </Link>
          </div>
          <div className="heroProof" aria-label="Benefícios da Tunix">
            <span>✓ Sem mensalidade obrigatória</span>
            <span>✓ Processo acompanhado</span>
            <span>✓ Catálogo organizado</span>
          </div>
        </div>

        <section className="distributionPreview" aria-label="Prévia do acompanhamento de um lançamento">
          <div className="previewGlow" aria-hidden="true" />
          <div className="releasePreviewCard">
            <header>
              <div className="coverArtwork" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div>
                <small>PRÓXIMO LANÇAMENTO</small>
                <strong>Meu novo single</strong>
                <span>Artista independente</span>
              </div>
              <b>Em revisão</b>
            </header>
            <div className="releaseProgress" aria-label="Progresso do lançamento: 75%">
              <div><span>Progresso do envio</span><strong>75%</strong></div>
              <i><span /></i>
            </div>
            <div className="previewChecklist">
              <div className="done"><span>✓</span><p><strong>Áudio e capa</strong><small>Arquivos recebidos</small></p></div>
              <div className="done"><span>✓</span><p><strong>Créditos e metadados</strong><small>Informações completas</small></p></div>
              <div className="active"><span>3</span><p><strong>Revisão operacional</strong><small>Em análise pela Tunix</small></p></div>
              <div><span>4</span><p><strong>Entrega nas plataformas</strong><small>Próxima etapa</small></p></div>
            </div>
          </div>
          <div className="floatingStat floatingStatTop">
            <span>↗</span><div><strong>400+</strong><small>plataformas disponíveis</small></div>
          </div>
          <div className="floatingStat floatingStatBottom">
            <span>✓</span><div><strong>Pacote completo</strong><small>pronto para distribuição</small></div>
          </div>
        </section>
      </section>

      <section className="platformRibbon" aria-label="Principais plataformas atendidas">
        <p>Leve seu som para onde o seu público está</p>
        <div>
          {platformNames.map((platform) => <strong key={platform}>{platform}</strong>)}
        </div>
      </section>

      <section className="distributionSection" id="distribuicao">
        <div className="homeSectionHeading">
          <div>
            <p className="eyebrow">Do upload ao streaming</p>
            <h2>Distribuir música não precisa ser complicado.</h2>
          </div>
          <p>
            A Tunix transforma um processo cheio de detalhes em etapas claras.
            Você prepara o lançamento; nós ajudamos a manter tudo no caminho certo.
          </p>
        </div>
        <div className="distributionFlow">
          {distributionSteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <div className="flowIcon" aria-hidden="true">{step.number === "01" ? "♫" : step.number === "02" ? "✓" : "↗"}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
        <div className="distributionCallout">
          <div>
            <span className="calloutIcon" aria-hidden="true">◎</span>
            <p><strong>Você mantém o foco na música.</strong><small>A Tunix organiza os detalhes do lançamento.</small></p>
          </div>
          <Link className="primaryButton linkButton" href="/lancamentos/novo">Começar distribuição →</Link>
        </div>
      </section>

      <section className="advantagesSection" id="recursos">
        <div className="homeSectionHeading compactHeading">
          <div>
            <p className="eyebrow">Estrutura para crescer</p>
            <h2>Mais que enviar arquivos. Uma operação musical completa.</h2>
          </div>
        </div>
        <div className="advantageGrid">
          {advantages.map((item, index) => (
            <article key={item.tag} className={index === 0 ? "featuredAdvantage" : ""}>
              <span>{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <div className="advantageDecoration" aria-hidden="true">{index === 0 ? "400+" : index === 1 ? "● ● ●" : "100%"}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="catalogShowcase" id="catalogo">
        <div className="homeSectionHeading">
          <div>
            <p className="eyebrow">Catálogo de oportunidades</p>
            <h2>Encontre a próxima música do seu repertório.</h2>
          </div>
          <p>
            Artistas e produtores também encontram composições organizadas por gênero,
            clima, voz e BPM — prontas para uma decisão musical mais inteligente.
          </p>
        </div>
        <div className="filters homeFilters" aria-label="Filtros de busca">
          {filters.map((filter) => <button key={filter}>{filter}</button>)}
        </div>
        <div className="compositionGrid homeCompositionGrid">
          {compositions.map((song) => (
            <article className="songCard homeSongCard" key={song.title}>
              <div className="songStatus">{song.status}</div>
              <h3>{song.title}</h3>
              <p>por {song.author}</p>
              <SongMeta genre={song.genre} mood={song.mood} voice={song.voice} bpm={song.bpm} />
              <button>Conhecer composição →</button>
            </article>
          ))}
        </div>
        <div className="centeredAction">
          <Link className="secondaryButton linkButton" href="/catalogo">Explorar catálogo completo</Link>
        </div>
      </section>

      <section className="finalCta">
        <div>
          <p className="eyebrow">Seu próximo lançamento começa aqui</p>
          <h2>Chegou a hora de colocar sua música em movimento.</h2>
          <p>Prepare seu lançamento, alcance novas audiências e cuide da sua carreira com uma estrutura profissional.</p>
        </div>
        <div className="finalCtaActions">
          <Link className="primaryButton linkButton" href="/lancamentos/novo">Distribuir minha música →</Link>
          <Link className="ctaTextLink" href="/criar-conta">Criar minha conta</Link>
        </div>
      </section>

      <footer className="homeFooter">
        <strong>Tunix</strong>
        <span>Música, tecnologia e oportunidades no mesmo ritmo.</span>
        <nav>
          <Link href="/legal/termos">Termos</Link>
          <Link href="/legal/privacidade">Privacidade</Link>
          <Link href="/suporte">Suporte</Link>
        </nav>
      </footer>
    </main>
  );
}
