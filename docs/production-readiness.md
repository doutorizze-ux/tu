# Production Readiness

Este documento separa o que ja existe do que ainda deve ser fechado antes de vender para clientes reais.

## Status atual

O sistema pode ir para um ambiente de staging no Coolify para testes internos. Para operacao comercial, ainda exige
revisao juridica, banco de producao, storage profissional, monitoramento e homologacao da distribuidora.

## 1. Banco de dados

- Staging atual: SQLite local para desenvolvimento.
- Producao recomendada: PostgreSQL gerenciado.
- Obrigatorio antes de cliente real: migracoes Prisma versionadas, backup automatico, restore testado e rotina de retencao.

## 2. Arquivos

- Desenvolvimento: `storage/audio` e `storage/releases`.
- Staging/producao: S3 compativel configurado por `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` e `S3_FORCE_PATH_STYLE`.
- O sistema ja valida MIME type, tamanho, nome sanitizado, checksum e assinatura basica de audio/imagem.
- Obrigatorio antes de cliente real: URL assinada, antivirus/scan assíncrono, backup e politica de retencao.

## 3. Seguranca

- Ja existe cookie httpOnly, hash de senha, controle por papel, rate limit basico por email e auditoria de acoes criticas.
- Obrigatorio antes de cliente real: reset de senha, verificacao de email, rate limit persistente em Redis, MFA para admin e revisao de headers.

## 4. Contratos e LGPD

- Ja existe registro tecnico de aceite de Termos e Privacidade em `UserAgreement`.
- Ja existe declaracao de titularidade/autorizacao em `ReleaseDeclaration`.
- Obrigatorio antes de cliente real: advogado revisar os textos finais, DPA/LGPD, politica de privacidade final e contratos assinaveis.

## 5. Direitos autorais

- Lancamentos exigem declaracao de titularidade e autorizacao de distribuicao.
- Solicitacoes de disputa/takedown ficam em `ReleaseRequest`.
- Obrigatorio antes de cliente real: fluxo de comprovantes anexados, prazo de resposta e politica formal de disputa.

## 6. Distribuicao real

- Ja existe provider HTTP configuravel, webhook, auditoria e reenvio controlado.
- Obrigatorio antes de cliente real: contrato com agregadora, homologacao do payload, catalog IDs reais e matriz de erros oficiais.

## 7. Takedown e alteracoes

- Cliente ja pode abrir pedido de takedown, alteracao de metadata, capa, disputa ou outro caso.
- Admin ja pode acompanhar e atualizar status.
- Obrigatorio antes de cliente real: integracao real para enviar essas solicitacoes a parceira e SLA operacional.

## 8. Financeiro

- Ja existe importacao CSV, conciliacao, exportacao e portal do cliente.
- Ja existe carteira de creditos com checkout Asaas, webhook idempotente, extrato e debito por acao.
- Obrigatorio antes de cliente real: calendario de pagamento, taxas, impostos, comprovantes, notas/recibos e politica de saque.

## 9. Suporte

- Ja existe abertura de chamado e fila admin.
- Obrigatorio antes de cliente real: respostas internas, anexos, comentarios, SLA e notificacoes por email.

## 10. Observabilidade

- Ja existe `/api/health` para healthcheck e `/admin/auditoria` para consulta operacional de eventos.
- Obrigatorio antes de cliente real: logs estruturados, alertas, tracking de erro, metricas, uptime monitor e trilha de auditoria exportavel.
