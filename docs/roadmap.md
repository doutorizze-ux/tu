# Roadmap

## Etapa 1 - Fundacao do produto

Status: concluida inicialmente

- definir problema
- definir publico
- definir proposta de valor
- definir papeis de usuario
- definir primeira versao de producao
- mapear riscos legais e comerciais

## Etapa 2 - Arquitetura de producao

Status: em andamento

- escolher stack
- definir modulos
- desenhar entidades principais
- definir seguranca de arquivos
- preparar estrutura para pagamentos e distribuicao futura

## Etapa 3 - Design funcional

Objetivo: desenhar as telas e fluxos antes de implementar.

Entregas:

- mapa de navegacao
- wireframes textuais
- fluxo do compositor
- fluxo do artista/produtor
- fluxo do administrador
- estados vazios, erros e permissoes

## Etapa 4 - Base tecnica

Objetivo: criar o projeto real.

Entregas:

- app Next.js
- TypeScript
- banco PostgreSQL
- Prisma
- autenticacao
- layout base
- ambiente local e variaveis

## Etapa 5 - Catalogo de composicoes

Entregas:

- criar composicao
- editar composicao
- enviar letra
- enviar audio guia
- definir status
- listar biblioteca do compositor
- registrar historico

## Etapa 6 - Busca e descoberta

Entregas:

- vitrine de composicoes
- busca por texto
- filtros por genero, tema, clima, voz e BPM
- pagina de detalhes
- favoritos

## Etapa 7 - Interesse e negociacao

Entregas:

- artista manifesta interesse
- compositor recebe notificacao
- status de negociacao
- historico de contato
- painel de interessados

## Etapa 8 - Administracao e monetizacao inicial

Entregas:

- painel admin
- moderacao
- limites por plano
- assinatura
- metricas basicas

## Etapa 9 - Lancamentos e distribuicao

Status: iniciada

Entregas implementadas:

- cadastro de fonograma
- capa
- ISRC e UPC
- creditos
- splits
- data de lancamento
- upload real de master final
- upload real de capa
- checksum SHA-256 dos arquivos
- status por plataforma
- envio para revisao
- validador profissional de pacote
- fila administrativa de revisao operacional
- aprovacao/reprovacao de lancamento com historico
- tela de correcao e reenvio de pacotes reprovados
- notificacoes internas para cliente e operacao
- linha do tempo operacional do lancamento
- dossie operacional imprimivel do lancamento
- exportacao tecnica JSON do pacote de lancamento
- envio assistido para provider com pre-visualizacao de payload
- gestao pos-envio com status por plataforma e reenvio controlado
- financeiro base com royalties, splits e fechamentos
- exportacao financeira CSV/JSON
- importacao financeira CSV com calculo automatico de repasses
- conciliacao financeira por plataforma, periodo e moeda para bloquear duplicidades
- portal financeiro do cliente com royalties, splits, demonstrativos e exportacao
- aceite de termos, politica de privacidade e declaracao de titularidade por lancamento
- solicitacoes pos-lancamento com takedown, alteracoes, disputas e fila admin
- suporte operacional com chamados auditados
- healthcheck tecnico em `/api/health`
- camada HTTP para envio a distribuidora parceira
- registro de tentativa de entrega
- webhook de retorno da distribuidora
- confirmacao de entrega por status externo

Entregas futuras:

- integracao com distribuidora parceira
- contrato/API real com agregadora/distribuidora
- retorno real de status por plataforma via webhook/API
- relatorio avancado de royalties
- gestao de takedown e alteracoes pos-lancamento
