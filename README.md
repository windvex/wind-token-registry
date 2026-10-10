# WIND Token Registry

A public token metadata directory for **Vexanium Native** and **VEX EVM**.

Find token names, logos, descriptions, project links, and registration details through one consistent API. Records reflect metadata published to the Vexanium token registry.

**[Browse and update tokens](https://assets.windcrypto.com/)** · **[Public API](https://api.windcrypto.com/registry/v2/manifest)** · **[API reference](docs/API.md)**

## Quick start

Search for tokens:

```sh
curl 'https://api.windcrypto.com/registry/v2/tokens?network=vex-native&limit=25'
```

Look up an individual token:

```sh
curl 'https://api.windcrypto.com/registry/v2/tokens/native/vex.token/VEX'
```

The API covers both Vexanium Native and VEX EVM. See the [API reference](docs/API.md) for pagination, search, and EVM addresses.

## JavaScript client

You can use the API with any HTTP client. This repository also provides a small dependency-free JavaScript client with TypeScript declarations.

Install directly from GitHub:

```sh
npm install github:windvex/wind-token-registry
```

```js
import { createRegistryClient } from '@windcrypto/token-registry';

const registry = createRegistryClient();

const vex = await registry.getNativeToken('vex.token', 'VEX');
console.log(vex?.name, vex?.logo);

const page = await registry.listTokens({ network: 'vex-native', q: 'WIND', limit: 10 });
console.log(page.items);
```

Works with modern browsers, Node.js, and React Native environments that support `fetch`. Pass a custom `fetcher` or `AbortSignal` when needed. See the [client examples](docs/CLIENT.md).

## Token identity

| Network | Identifier | Example |
| --- | --- | --- |
| Vexanium Native | Contract and symbol | `vex-native/vex.token/VEX` |
| VEX EVM (6736) | Token contract address | `vex-evm/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` |

Token symbols alone are not unique. Always use the full identifier when storing references.

## Register or update a token

Open [WIND Assets](https://assets.windcrypto.com/) with Wisp Wallet to register or update your token metadata. New token entries do not require a pull request. GitHub is for improvements to this client and its documentation.

## Data and verification

A token's appearance in the registry is not a security audit, endorsement, or exchange listing. Verification describes registry identity status only. Balances, prices, trading activity, and market data are outside this API.

## Contributing

See [Contributing](CONTRIBUTING.md) for bugs and pull requests, and [Security](SECURITY.md) for private disclosures.

Licensed under [MIT](LICENSE).
