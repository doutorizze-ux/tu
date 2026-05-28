# Integração Asaas para créditos

A Tunix vende créditos via Asaas e credita automaticamente a carteira do cliente quando o pagamento é confirmado por webhook.

## Variáveis de ambiente

- `ASAAS_ENVIRONMENT`: `sandbox` ou `production`.
- `ASAAS_API_KEY`: chave da conta Asaas.
- `ASAAS_WEBHOOK_TOKEN`: token secreto configurado no painel Asaas.
- `APP_URL` ou `NEXT_PUBLIC_APP_URL`: URL pública da aplicação.

## Fluxo

1. Cliente acessa `/creditos` e escolhe um pacote.
2. O sistema cria/reutiliza o cliente Asaas.
3. O sistema cria a cobrança com `billingType: "UNDEFINED"`, permitindo Pix ou cartão no checkout Asaas.
4. Cliente paga no checkout hospedado pelo Asaas.
5. Asaas chama `/api/payments/asaas/webhook`.
6. A carteira recebe os créditos uma única vez, com idempotência por evento.
7. Ações comerciais debitam créditos no extrato.

## Custos atuais

Os custos são controlados no admin em `/admin/creditos`.

- Cadastrar composição: varia por categoria.
- Preparar lançamento para revisão: 10 créditos por padrão.
- Enviar interesse em composição: gratuito.

## Eventos tratados

- `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`: marcam pedido como pago e creditam saldo.
- `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE`: estornam os créditos quando a ordem estava paga.

Não coletamos dados de cartão na Tunix. O checkout fica no Asaas para reduzir risco operacional e escopo de segurança.
