# Integracao de Distribuicao

Este documento descreve o contrato tecnico da Tunix para envio de lancamentos a uma distribuidora/agregadora oficial.

## Configuracao

As credenciais podem ser configuradas no painel admin em `/admin/integracoes`.

Campos:

- `provider`: nome oficial do provider/distribuidora
- `environment`: `SANDBOX` ou `PRODUCTION`
- `endpoint`: URL de envio de lancamentos
- `testEndpoint`: URL opcional para teste de conexao
- `apiKey`: chave oficial para autenticacao
- `webhookSecret`: segredo compartilhado para retorno de status

As credenciais sao armazenadas criptografadas no banco usando `SECRETS_ENCRYPTION_KEY`.

## Envio

Metodo:

```http
POST {endpoint}
Authorization: Bearer {apiKey}
Content-Type: application/json
```

Payload:

```json
{
  "externalReleaseId": "release_id",
  "title": "Nome do single",
  "artistName": "Artista",
  "labelName": "Selo",
  "genre": "Sertanejo",
  "language": "pt-BR",
  "releaseType": "SINGLE",
  "releaseDate": "2026-10-01T12:00:00.000Z",
  "identifiers": {
    "isrc": "BRABC2600001",
    "upc": "7890000000001"
  },
  "files": {
    "master": {
      "type": "MASTER",
      "fileName": "master.wav",
      "mimeType": "audio/wav",
      "sizeBytes": 12345678,
      "checksum": "sha256..."
    },
    "cover": {
      "type": "COVER",
      "fileName": "cover.jpg",
      "mimeType": "image/jpeg",
      "sizeBytes": 123456,
      "checksum": "sha256..."
    }
  },
  "platforms": ["SPOTIFY", "DEEZER", "APPLE_MUSIC"],
  "contributors": [
    {
      "name": "Artista",
      "role": "Artista principal",
      "royaltyShare": 100
    }
  ]
}
```

## Webhook de retorno

Endpoint:

```http
POST /api/distribution/webhook
x-distribution-secret: {webhookSecret}
Content-Type: application/json
```

Payload:

```json
{
  "releaseId": "release_id",
  "providerReference": "provider_release_id",
  "status": "DELIVERED",
  "platforms": [
    { "platform": "SPOTIFY", "status": "DELIVERED" },
    { "platform": "DEEZER", "status": "SENT" }
  ]
}
```

Status de lancamento aceitos:

- `SUBMITTED`
- `DELIVERED`
- `REJECTED`

Status por plataforma aceitos:

- `QUEUED`
- `SENT`
- `DELIVERED`
- `ERROR`

## Comportamento seguro

Sem credenciais oficiais configuradas, a plataforma nao marca o envio como bem-sucedido. Ela registra uma tentativa com status `CONFIG_REQUIRED`.
