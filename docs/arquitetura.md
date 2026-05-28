# Arquitetura

## Objetivo tecnico

Construir uma plataforma SaaS de producao, modular, segura e preparada para crescer por etapas sem precisar reescrever tudo quando entrarem pagamentos, contratos, distribuicao e recomendacoes.

## Stack recomendada

### Aplicacao web

- Next.js com App Router
- TypeScript
- Tailwind CSS
- shadcn/ui ou componentes proprios com Radix UI

### Banco de dados

- PostgreSQL
- Prisma ORM

Para desenvolvimento local, o projeto usa SQLite em `prisma/dev.db`, porque a maquina atual nao possui Docker nem PostgreSQL instalados. A modelagem continua em Prisma para permitir migracao controlada para PostgreSQL em producao.

### Autenticacao

- Auth.js ou Supabase Auth
- login por email e senha
- suporte futuro a login social

### Armazenamento de arquivos

- S3 compativel, como AWS S3, Cloudflare R2 ou Supabase Storage
- audios e capas fora do banco
- banco armazena apenas metadados e URLs assinadas

### Hospedagem

- Vercel para frontend e API inicial
- banco gerenciado em Neon, Supabase ou Railway
- storage em Cloudflare R2 ou AWS S3

### Pagamentos futuros

- Stripe, se o foco for cartao e recorrencia
- Mercado Pago ou Asaas para adequacao ao Brasil

## Modulos do sistema

### Identidade

Usuarios, papeis, permissoes e perfis publicos/privados.

### Catalogo de composicoes

Cadastro, metadados, letra, audio guia, status, tags e historico.

### Descoberta

Busca, filtros, listagens, favoritos e recomendacoes futuras.

### Negociacao

Manifestacao de interesse, mensagens, status de contato e trilha de auditoria.

### Direitos e autoria

Declaracao de autoria, versoes, comprovantes, aceite de termos e historico.

### Lancamentos

Modulo futuro para fonograma, ISRC, UPC, capa, data de lancamento, creditos e splits.

O modulo de lancamentos ja possui estrutura inicial para preparar pacotes de distribuicao. O envio real para Spotify, Deezer, Apple Music, YouTube Music, TikTok e outras plataformas deve ocorrer por integracao com agregadora/distribuidora parceira, pois as plataformas digitais normalmente exigem relacao comercial, validacao e contrato para entrega de catalogo.

Arquivos de lancamento ficam representados por `ReleaseAsset`, com tipo (`MASTER` ou `COVER`), chave de storage, nome original, MIME type, tamanho e checksum SHA-256. Em desenvolvimento, os arquivos sao armazenados em `storage/releases`. Em producao, essa camada deve migrar para storage S3/R2/Supabase com controle de acesso e URLs assinadas.

O fluxo operacional atual esta preparado para uma distribuidora/agregadora real:

- `REVIEW`: pacote em revisao interna
- `READY`: pacote aprovado e na fila de envio
- `SUBMITTED`: pacote enviado para distribuidora parceira configurada
- `DELIVERED`: entrega confirmada por webhook/API da parceira

Antes de chegar em `READY`, o pacote passa pelo validador interno de lancamento. Esse validador bloqueia envio quando faltam master, capa, checksum, data, ISRC, UPC, plataformas, creditos ou splits fechando em 100%. Administradores revisam a fila em `/admin/lancamentos`, aprovam pacotes prontos e registram pendencias com historico em `ReleaseReview`.

Pacotes em `DRAFT`, `REVIEW` ou `REJECTED` podem ser corrigidos pelo cliente em `/lancamentos/[id]/editar`. A correcao atualiza metadados, plataformas, creditos, splits e substitui master/capa quando novos arquivos sao enviados. Pacotes `READY`, `SUBMITTED` e `DELIVERED` ficam travados para preservar a integridade da entrega operacional.

Eventos importantes geram notificacoes internas persistidas em `Notification`. A operacao recebe alertas quando um pacote entra ou retorna para revisao; o cliente recebe notificacoes quando o pacote e aprovado ou recebe pendencia. A central fica em `/notificacoes`, com contador de nao lidas no menu.

O detalhe do lancamento consolida uma linha do tempo operacional a partir de `AuditLog`, `ReleaseReview`, `ReleaseAsset` e `DistributionDelivery`. Isso permite rastrear criacao, uploads, correcoes, aprovacoes, bloqueios de envio, chamadas ao provider e retornos por webhook.

O dossie operacional em `/lancamentos/[id]/relatorio` consolida metadados, arquivos, checksums, creditos, splits, plataformas, validacao, tentativas de envio e timeline. A pagina possui estilo de impressao para salvar como PDF pelo navegador.

A exportacao tecnica fica em `/api/releases/[id]/export`, exige usuario autenticado e permite acesso ao dono do lancamento ou administradores. O JSON usa schema `tunix.release-package.v1` e inclui tambem o `distributionPayload`, preparado para integracoes externas.

O envio assistido em `/admin/lancamentos/[id]/envio` permite ao administrador conferir o payload final antes de disparar o POST para o provider ativo. O disparo exige confirmacao explicita, registra `DistributionDelivery`, atualiza status do pacote/plataformas e grava auditoria.

O acompanhamento pos-envio em `/admin/lancamentos/[id]/status` mostra status por plataforma, ultimas tentativas do provider, historico operacional e permite atualizacao manual auditada de plataforma ou reenvio controlado com motivo obrigatorio.

O financeiro base em `/admin/lancamentos/[id]/financeiro` permite registrar fechamentos de receita por periodo/plataforma em `RoyaltyStatement`. Os repasses sao calculados automaticamente em `RoyaltyParticipant` usando os splits declarados no lancamento. Fechamentos podem ser criados manualmente, importados por CSV da distribuidora, exportados em CSV/JSON e marcados como pagos. A importacao valida colunas, datas, valores, plataformas do lancamento e registra auditoria de sucesso ou rejeicao. A conciliacao bloqueia duplicidade pela chave `releaseId + platform + periodStart + periodEnd + currency`, com validacao em codigo e indice unico no banco.

O portal financeiro do cliente fica em `/lancamentos/[id]/financeiro` e mostra totais, pendencias, splits, demonstrativos por plataforma e resumo por participante apenas para o dono do lancamento. A exportacao financeira fica em `/api/releases/[id]/royalties`, permite administrador ou dono do lancamento e suporta `?format=json` ou `?format=csv`. O JSON usa schema `tunix.royalty-export.v1`; o CSV e pensado para planilhas e contabilidade.

O compliance operacional registra aceite de termos e politica de privacidade em `UserAgreement`. Lancamentos passam a exigir declaracoes de titularidade/autorizacao em `ReleaseDeclaration` antes de entrar na fila. O cliente pode abrir solicitacoes pos-lancamento em `/lancamentos/[id]/solicitacoes`, incluindo takedown, alteracao de metadata, troca de capa e disputa de direitos; a operacao acompanha em `/admin/solicitacoes`.

Chamados gerais ficam em `/suporte` e sao persistidos em `SupportTicket`. O endpoint `/api/health` responde status de aplicacao e banco para healthcheck de infraestrutura.

A auditoria administrativa fica em `/admin/auditoria`, exibindo eventos recentes de `AuditLog`, incluindo falhas de login, criacao de pacote, declaracoes, integracoes, financeiro e solicitacoes operacionais.

Cada plataforma tambem possui status proprio: `PENDING`, `QUEUED`, `SENT`, `DELIVERED` ou `ERROR`.

A integracao usa variaveis:

- `DISTRIBUTION_PROVIDER_NAME`
- `DISTRIBUTION_PROVIDER_ENDPOINT`
- `DISTRIBUTION_PROVIDER_API_KEY`
- `DISTRIBUTION_WEBHOOK_SECRET`

Sem essas variaveis, o sistema nao marca entrega como bem-sucedida. Ele registra uma tentativa de entrega com status `CONFIG_REQUIRED`.

### Administracao

Moderacao, usuarios, obras denunciadas, planos, curadoria e metricas.

## Principais entidades

- User
- Profile
- Composition
- CompositionVersion
- AudioAsset
- Lyric
- Tag
- Favorite
- Interest
- Negotiation
- AuditLog
- Plan
- Subscription
- Release
- ReleaseContributor
- RoyaltySplit

## Schema inicial implementado

O projeto ja possui um schema Prisma inicial em `prisma/schema.prisma` com:

- usuarios e papeis
- perfis
- composicoes
- versoes de composicao
- audio guia
- tags
- favoritos
- interesses
- logs de auditoria

## Cuidados de seguranca

- URLs assinadas para arquivos privados
- validacao de tipo e tamanho de arquivo
- antivirus ou verificacao futura de upload
- controle de acesso por papel
- logs de acoes importantes
- rate limit em login, busca e manifestacao de interesse
- termos claros sobre autoria e uso indevido

## Decisoes importantes

1. Audio guia deve ser privado por padrao, com acesso controlado.
2. A plataforma nao deve prometer registro oficial de obra na primeira fase.
3. Cada composicao deve ter historico imutavel de envio e alteracoes relevantes.
4. Artistas nao devem conseguir baixar audio sem permissao explicita.
5. Distribuicao digital deve entrar por parceria ou integracao depois da base de catalogo estar funcionando.
