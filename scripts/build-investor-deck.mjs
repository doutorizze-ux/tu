import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const root = process.cwd();
const downloads = "C:\\Users\\mauricio\\Downloads";

const assets = {
  wordmark: path.join(root, "public", "brand", "tunix-wordmark.png"),
  home: path.join(downloads, "ChatGPT Image 28 de mai. de 2026, 07_11_19.png"),
  choose: path.join(downloads, "ChatGPT Image 26 de mai. de 2026, 15_21_53.png"),
  compose: path.join(downloads, "ChatGPT Image 26 de mai. de 2026, 15_07_20.png"),
  interests: path.join(downloads, "ChatGPT Image 26 de mai. de 2026, 21_23_32.png"),
  catalog: path.join(downloads, "ChatGPT Image 26 de mai. de 2026, 21_24_53.png"),
};

const output = path.join(root, "Tunix_Pitch_Deck.pdf");

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing asset: ${filePath}`);
  }
}

for (const assetPath of Object.values(assets)) {
  ensureFile(assetPath);
}

function pngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function wrapText(doc, text, width) {
  return doc.heightOfString(text, { width, lineGap: 2 });
}

function addSectionHeader(doc, label, title, subtitle) {
  doc.fillColor("#8a6b3b").font("Arial-Bold").fontSize(10).text(label.toUpperCase(), 72, doc.y, {
    letterSpacing: 1.2,
  });
  doc.moveDown(0.35);
  doc.fillColor("#111111").font("Arial-Bold").fontSize(28).text(title, {
    width: 460,
    lineGap: 2,
  });
  if (subtitle) {
    doc.moveDown(0.35);
    doc.fillColor("#5e5a53").font("Arial").fontSize(11.5).text(subtitle, {
      width: 500,
      lineGap: 4,
    });
  }
}

function drawPill(doc, x, y, text, fill = "#edf1ea", stroke = "#d4d4c9", color = "#0f6b5f") {
  const paddingX = 12;
  const paddingY = 6;
  doc.font("Arial-Bold").fontSize(9);
  const width = doc.widthOfString(text) + paddingX * 2;
  const height = 24;
  doc.save();
  doc.roundedRect(x, y, width, height, 12).fillAndStroke(fill, stroke);
  doc.fillColor(color).text(text, x + paddingX, y + paddingY - 1, {
    width: width - paddingX * 2,
    align: "center",
  });
  doc.restore();
  return width;
}

function drawCard(doc, x, y, w, h, title, body) {
  doc.save();
  doc.roundedRect(x, y, w, h, 10).fillAndStroke("#fffdf8", "#ded6ca");
  doc.fillColor("#111111").font("Arial-Bold").fontSize(13).text(title, x + 16, y + 14, {
    width: w - 32,
  });
  doc.fillColor("#59534d").font("Arial").fontSize(10.5).text(body, x + 16, y + 36, {
    width: w - 32,
    lineGap: 4,
  });
  doc.restore();
}

function redactSidebarEmail(doc, x, y, w, h) {
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fill("#f8f3e7");
  doc.restore();
}

function addScreenshotPage(doc, section, title, description, imagePath, caption, redactionRect) {
  const { width: imgW, height: imgH } = pngSize(imagePath);
  const pageW = 612;
  const pageH = 792;
  const margin = 42;
  const imgX = margin;
  const imgWOnPage = 528;
  const imgHOnPage = imgWOnPage * (imgH / imgW);

  doc.addPage({ size: "LETTER", margin: 0 });
  doc.rect(0, 0, pageW, pageH).fill("#f7f1e4");

  addSectionHeader(doc, section, title, description);

  const imgY = 132;
  doc.save();
  doc.roundedRect(imgX, imgY, imgWOnPage, imgHOnPage, 12).clip();
  doc.image(imagePath, imgX, imgY, { width: imgWOnPage });
  doc.restore();

  if (redactionRect) {
    const scale = imgWOnPage / imgW;
    redactSidebarEmail(
      doc,
      imgX + redactionRect.x * scale,
      imgY + redactionRect.y * scale,
      redactionRect.w * scale,
      redactionRect.h * scale,
    );
  }

  doc.save();
  doc.roundedRect(imgX, imgY, imgWOnPage, imgHOnPage, 12).lineWidth(1).stroke("#d8ccbb");
  doc.restore();

  doc.fillColor("#6d655b").font("Arial").fontSize(9.5).text(caption, imgX, imgY + imgHOnPage + 10, {
    width: imgWOnPage,
  });
}

function addCover(doc) {
  doc.addPage({ size: "LETTER", margin: 0 });
  doc.rect(0, 0, 612, 792).fill("#f7f1e4");
  doc.save();
  doc.circle(520, 130, 180).fill("#f3dca7");
  doc.circle(475, 180, 120).fill("#d7edd5");
  doc.circle(530, 660, 150).fill("#efe1cc");
  doc.restore();

  doc.image(assets.wordmark, 66, 56, { width: 150 });
  doc.fillColor("#8a6b3b").font("Arial-Bold").fontSize(10).text("MATERIAL CONFIDENCIAL PARA CAPTAÇÃO", 66, 120);

  doc.fillColor("#111111").font("Arial-Bold").fontSize(28).text("Tunix", 66, 154);
  doc.fontSize(34).text("Pitch Deck", 66, 188);
  doc.fontSize(15).fillColor("#5d574f").text(
    "A plataforma musical brasileira para transformar repertorio, interesse e distribuicao em operacao profissional.",
    66,
    250,
    { width: 470, lineGap: 6 },
  );

  drawPill(doc, 66, 336, "Composicao e catalogo");
  drawPill(doc, 238, 336, "Creditos operacionais");
  drawPill(doc, 408, 336, "Distribuicao musical");

  doc.fillColor("#111111").font("Arial-Bold").fontSize(13).text("O que a Tunix entrega", 66, 392);
  doc.font("Arial").fontSize(11.5).fillColor("#5d574f").text(
    "Um ambiente unico para cadastrar obras, descobrir repertorio, registrar interesses, vender creditos, operar lancamentos e preparar a ponte para distribuicao.",
    66,
    414,
    { width: 470, lineGap: 5 },
  );

  drawCard(doc, 66, 498, 150, 116, "Produto real", "MVP funcional, em producao, com fluxos de login, catalogo, composicoes, interesses e carteira.");
  drawCard(doc, 232, 498, 150, 116, "Monetizacao", "Venda de creditos para acoes da plataforma, sem depender de plano mensal para o usuario final.");
  drawCard(doc, 398, 498, 150, 116, "Escala", "Base pronta para parceiros, selos, distribuidores e futuros servicos premium.");

  doc.fillColor("#8a6b3b").font("Arial-Bold").fontSize(9).text("TUNIX.COM.BR", 66, 720);
}

function addThesisPage(doc) {
  doc.addPage({ size: "LETTER", margin: 0 });
  doc.rect(0, 0, 612, 792).fill("#f7f1e4");
  addSectionHeader(
    doc,
    "Tese",
    "Problema, solucao e oportunidade",
    "A industria musical ainda depende de planilhas, mensagens soltas e processos pouco visiveis para conectar obra, interesse e distribuicao.",
  );

  drawCard(
    doc,
    42,
    208,
    158,
    205,
    "Problema",
    "Repertorio bom fica invisivel. Compositores nao tem uma vitrine operacional, artistas nao encontram com rapidez e a operacao vira improviso.",
  );
  drawCard(
    doc,
    223,
    208,
    158,
    205,
    "Solucao",
    "A Tunix organiza composicoes, interesses, creditos e lancamentos em um unico fluxo com contexto comercial e metadados profissionais.",
  );
  drawCard(
    doc,
    404,
    208,
    166,
    205,
    "Porque agora",
    "O mercado quer velocidade, rastreabilidade e apresentacao profissional. A Tunix entra exatamente nessa lacuna entre criacao e negocio.",
  );

  doc.fillColor("#111111").font("Arial-Bold").fontSize(14).text("Principios do produto", 42, 450);
  const bullets = [
    "Interface corporativa, mas simples de operar.",
    "Fluxo sem distração entre composição, interesse e catálogo.",
    "Camada de creditos para monetizacao direta da operação.",
    "Base tecnica preparada para distribuicao e parcerias.",
  ];
  let y = 478;
  for (const bullet of bullets) {
    doc.circle(48, y + 5, 2.5).fill("#0f6b5f");
    doc.fillColor("#5d574f").font("Arial").fontSize(11.5).text(bullet, 58, y, { width: 500 });
    y += 30;
  }

  doc.fillColor("#111111").font("Arial-Bold").fontSize(14).text("Resumo executivo", 42, 616);
  doc.font("Arial").fontSize(11.5).fillColor("#5d574f").text(
    "Tunix e uma infraestrutura musical desenhada para quem precisa operar repertorio com seriedade: do cadastro ate a distribuicao, passando por descoberta, interesse, pagamento e auditoria.",
    42,
    640,
    { width: 520, lineGap: 5 },
  );
}

function addProductPage(doc) {
  addScreenshotPage(
    doc,
    "Produto",
    "Interface central e fluxo de trabalho",
    "A home mostra o ambiente operacional da Tunix, com atalhos claros para compositor, repertorio, creditos e distribuicao.",
    assets.home,
    "Tela de entrada operacional da Tunix com cards, status e indicadores. O bloco de conta foi ocultado para privacidade.",
    { x: 8, y: 610, w: 260, h: 120 },
  );

  addScreenshotPage(
    doc,
    "Cadastro",
    "Composicao estruturada",
    "A tela de nova obra coleta metadados musicais, declaracao de autoria e informacoes necessarias para catalogacao profissional.",
    assets.compose,
    "Formulario de composicao com metadados, letra e declaracao de autoria.",
    { x: 8, y: 610, w: 260, h: 120 },
  );
}

function addDiscoveryPage(doc) {
  addScreenshotPage(
    doc,
    "Descoberta",
    "Catalogo de repertorio",
    "O catalogo deixa claro o estado da obra, os filtros e o caminho para favoritacao ou interesse comercial.",
    assets.catalog,
    "Catalogo de repertorio com cards, filtros e acoes de interesse.",
    { x: 8, y: 610, w: 260, h: 120 },
  );

  addScreenshotPage(
    doc,
    "Engajamento",
    "Interesses recebidos",
    "A area de oportunidades concentra os retornos de artistas e produtores, reduzindo friccao no contato inicial.",
    assets.interests,
    "Pagina de interesses recebidos, preparada para virar fluxo de negocio.",
    { x: 8, y: 610, w: 260, h: 120 },
  );
}

function addChoosePage(doc) {
  addScreenshotPage(
    doc,
    "Operacao",
    "Entrada por perfil e roteamento de tarefa",
    "A tela inicial separa os caminhos de compositor, repertorio e operacao, criando uma experiencia mais clara para cada tipo de usuario.",
    assets.choose,
    "Central Tunix com cards por contexto e indicadores de operacao.",
    { x: 8, y: 610, w: 260, h: 120 },
  );
}

function addBusinessPage(doc) {
  doc.addPage({ size: "LETTER", margin: 0 });
  doc.rect(0, 0, 612, 792).fill("#f7f1e4");
  addSectionHeader(
    doc,
    "Modelo",
    "Como a Tunix ganha dinheiro",
    "O modelo privilegia monetizacao por uso, o que combina com o comportamento de empresas criativas e operações variaveis.",
  );

  drawCard(doc, 42, 220, 160, 170, "Creditos", "A principal receita atual vem da compra de creditos para acoes operacionais da plataforma.");
  drawCard(doc, 226, 220, 160, 170, "Parcerias", "Selos, produtores e distribuidores podem entrar como parceiros operacionais e comerciais.");
  drawCard(doc, 410, 220, 160, 170, "Servico premium", "A camada futura pode incluir recursos avançados de curadoria, analytics e gestao de catalogo.");

  doc.fillColor("#111111").font("Arial-Bold").fontSize(14).text("O que isso evita", 42, 430);
  const items = [
    "Dependencia de planos engessados para o usuario final.",
    "Frustacao de checkout e experiencia externa fora da marca.",
    "Discurso de plataforma sem produto operacional real.",
  ];
  let y = 458;
  for (const item of items) {
    doc.circle(48, y + 5, 2.5).fill("#c28b2c");
    doc.fillColor("#5d574f").font("Arial").fontSize(11.5).text(item, 58, y, { width: 500 });
    y += 28;
  }

  doc.fillColor("#111111").font("Arial-Bold").fontSize(14).text("Posicionamento", 42, 560);
  doc.font("Arial").fontSize(11.5).fillColor("#5d574f").text(
    "A Tunix se posiciona como infraestrutura musical. O usuario sente a marca; a operacao acontece dentro do sistema; e a distribuicao vira uma extensao natural do fluxo.",
    42,
    585,
    { width: 520, lineGap: 5 },
  );
}

function addRoadmapPage(doc) {
  doc.addPage({ size: "LETTER", margin: 0 });
  doc.rect(0, 0, 612, 792).fill("#f7f1e4");
  addSectionHeader(
    doc,
    "Roteiro",
    "Proxima fase do produto",
    "A base atual ja permite evoluir para um ecossistema mais completo, sem perder a experiencia de uso simples.",
  );

  const stages = [
    ["Agora", "Aprimorar a captação de leads, refinar a narrativa comercial e finalizar a integracao oficial com Too Lost."],
    ["Curto prazo", "Concluir os fluxos de distribuicao, auditoria operacional e relatórios para parceiros."],
    ["Médio prazo", "Adicionar servicos premium, analytics e automatizacoes de relacionamento."],
    ["Longo prazo", "Escalar para um hub musical mais amplo, com mais parceiros, selos e camadas de inteligencia."],
  ];
  let y = 220;
  for (const [label, text] of stages) {
    doc.roundedRect(42, y, 528, 96, 10).fillAndStroke("#fffdf8", "#ded6ca");
    doc.fillColor("#0f6b5f").font("Arial-Bold").fontSize(10).text(label.toUpperCase(), 58, y + 14);
    doc.fillColor("#111111").font("Arial").fontSize(11.5).text(text, 58, y + 34, { width: 480, lineGap: 4 });
    y += 112;
  }
}

function addClosingPage(doc) {
  doc.addPage({ size: "LETTER", margin: 0 });
  doc.rect(0, 0, 612, 792).fill("#f7f1e4");
  doc.image(assets.wordmark, 66, 56, { width: 150 });
  doc.fillColor("#111111").font("Arial-Bold").fontSize(28).text("Tunix", 66, 170);
  doc.fontSize(24).text("Uma base musical para crescer com seriedade.", 66, 206, { width: 460, lineGap: 3 });
  doc.font("Arial").fontSize(12).fillColor("#5d574f").text(
    "Este material foi montado com base nas telas reais do sistema e na tese operacional da plataforma. Podemos adaptar a versao final para investidores, parceiros ou pitch comercial.",
    66,
    280,
    { width: 470, lineGap: 5 },
  );

  drawCard(doc, 66, 390, 470, 120, "Contato", "Use esta pagina para inserir o contato oficial da empresa e a proposta especifica para o investidor ou parceiro.");
  doc.fillColor("#8a6b3b").font("Arial-Bold").fontSize(9).text("TUNIX", 66, 730);
}

function registerFonts(doc) {
  const fonts = {
    regular: "C:\\Windows\\Fonts\\arial.ttf",
    bold: "C:\\Windows\\Fonts\\arialbd.ttf",
    italic: "C:\\Windows\\Fonts\\ariali.ttf",
    boldItalic: "C:\\Windows\\Fonts\\arialbi.ttf",
  };

  for (const fontPath of Object.values(fonts)) {
    ensureFile(fontPath);
  }

  doc.registerFont("Arial", fonts.regular);
  doc.registerFont("Arial-Bold", fonts.bold);
  doc.registerFont("Arial-Italic", fonts.italic);
  doc.registerFont("Arial-BoldItalic", fonts.boldItalic);
}

async function main() {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: 0,
    bufferPages: true,
    info: {
      Title: "Tunix Pitch Deck",
      Author: "Codex",
      Subject: "Tunix startup pitch deck",
      Keywords: "Tunix, pitch deck, music platform, investor",
      Creator: "Codex",
    },
  });

  registerFonts(doc);

  const stream = fs.createWriteStream(output);
  doc.pipe(stream);

  addCover(doc);
  addThesisPage(doc);
  addChoosePage(doc);
  addProductPage(doc);
  addDiscoveryPage(doc);
  addBusinessPage(doc);
  addRoadmapPage(doc);
  addClosingPage(doc);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  console.log(`PDF created: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
