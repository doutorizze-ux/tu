# Musica Ponte

Plataforma brasileira para conectar compositores, artistas, produtores e empresarios em torno de composicoes ineditas, negociacoes musicais e preparacao de lancamentos digitais.

## Visao

Ser a ponte profissional entre quem cria musicas e quem procura repertorio para gravar.

## Proposta central

Compositores cadastram, organizam e apresentam suas composicoes com dados profissionais. Artistas e produtores encontram musicas por genero, tema, clima, voz, BPM e intencao comercial. A plataforma registra interesses, historico e prepara o caminho para negociacao, direitos e distribuicao digital.

## Primeira versao de producao

A primeira versao deve ser enxuta, mas real:

- cadastro e login de usuarios
- perfis de compositor, artista, produtor e administrador
- cadastro de composicoes com letra, audio guia e metadados
- biblioteca privada do compositor
- vitrine pesquisavel para artistas e produtores
- favoritos e manifestacao de interesse
- historico basico da obra
- declaracao de autoria no envio
- painel administrativo inicial
- carteira de creditos com checkout Asaas e conciliacao por webhook

## Ambiente local

Instale dependencias e inicialize o banco local:

```bash
npm install
npm run db:init
npm run dev
```

O desenvolvimento local usa SQLite em `prisma/dev.db`. O alvo de producao permanece PostgreSQL, conforme descrito na arquitetura.

Audios guia enviados em desenvolvimento ficam em `storage/audio` e sao servidos por rota protegida. Em producao, essa camada deve migrar para S3/R2/Supabase Storage com URLs assinadas.

Conta demo:

- email: `luan@musicaponte.local`
- senha: `demo123456`

Pagamentos com creditos usam Asaas. Configure `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_ENVIRONMENT` e `APP_URL`.
No painel do Asaas, aponte o webhook de pagamentos para `/api/payments/asaas/webhook`.

## Evolucao planejada

- contratos digitais
- assinaturas e planos pagos
- splits e divisao de royalties
- registro autoral assistido
- distribuicao para plataformas digitais por integracao/parceria
- curadoria musical
- recomendacao inteligente de composicoes

## Documentos principais

- [Produto](docs/produto.md)
- [Arquitetura](docs/arquitetura.md)
- [Roadmap](docs/roadmap.md)
- [Regras de Negocio](docs/regras-de-negocio.md)
- [Telas e Fluxos](docs/telas-e-fluxos.md)
- [Backlog Inicial](docs/backlog-inicial.md)
- [Integracao de Distribuicao](docs/distribution-integration.md)
- [Production Readiness](docs/production-readiness.md)
