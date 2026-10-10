# Registry API

**Base URL:** `https://api.windcrypto.com/registry/v2`

The public API serves current token metadata from Vexanium's on-chain registry. No API key is required for reads.

## Endpoints

| Method | Path | Response |
| --- | --- | --- |
| GET | `/manifest` | Catalog version, token count, and network information |
| GET | `/tokens` | Paginated token directory |
| GET | `/tokens/native/:contract/:symbol` | One Vexanium Native token |
| GET | `/tokens/evm/:address` | One VEX EVM token |

### List and search

```sh
curl 'https://api.windcrypto.com/registry/v2/tokens?network=vex-native&q=WIND&limit=10'
```

Optional parameters:

| Parameter | Value |
| --- | --- |
| `network` | `vex-native` or `vex-evm` |
| `q` | Case-insensitive search; maximum 80 characters |
| `limit` | Integer from 1 to 100; default 25 |
| `cursor` | Opaque `nextCursor` value from the previous page |

The response contains `items`, `total`, `catalogVersion`, and `nextCursor`. A null `nextCursor` means there are no more pages. If a cursor becomes invalid after the catalog changes, restart from the first page.

### Native token

```sh
curl 'https://api.windcrypto.com/registry/v2/tokens/native/token.wind/WIND'
```

The contract is a Vexanium account name; the symbol is uppercase.

### EVM token

```sh
curl 'https://api.windcrypto.com/registry/v2/tokens/evm/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
```

The address identifies a token on VEX EVM (chain ID 6736). The special address shown above represents the native EVM asset.

### Manifest

```sh
curl 'https://api.windcrypto.com/registry/v2/manifest'
```

Use the manifest to track changes to the catalog and the supported networks.

## Token fields

An individual token response includes the full `id`, `network`, `chainId`, `symbol`, `name`, `description`, `logo`, `categories`, `tags`, `links`, `tier`, `tierLabel`, `status`, and `verification`. Token-specific fields include `contract` for Native or `address` for EVM. Some optional values may be null.

Use `logo` directly as the token artwork URL. The API does not host balances, prices, transfers, or market history.

## Responses and caching

- Successful requests return JSON.
- The API provides an `ETag` header and short-lived cache headers. HTTP clients can use `If-None-Match` to reduce repeat traffic.
- A missing token returns `404`.
- Invalid input returns `400`.
- Rate limiting returns `429`.
- Temporary upstream unavailability returns `503`; retry later rather than treating the directory as empty.

Errors include an `error` object with a machine-readable `code` and a readable `message`.

## Usage

The [JavaScript client](../src/index.mjs) provides input validation, pagination requests, abort support, and readable HTTP errors. If using a different language, ordinary HTTPS GET requests are sufficient.

Submit or edit token details through [WIND Assets](https://assets.windcrypto.com/).
