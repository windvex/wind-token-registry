# JavaScript client

Install from GitHub:

```sh
npm install github:windvex/wind-token-registry
```

```js
import { createRegistryClient, RegistryError } from '@windcrypto/token-registry';

const registry = createRegistryClient();

// One token, or null if the token is not registered.
const token = await registry.getNativeToken('vex.token', 'VEX');
console.log(token?.logo);

// EVM token by contract address.
const evm = await registry.getEvmToken('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
console.log(evm?.name);

// Search and follow the server-provided cursor.
let cursor;
do {
  const page = await registry.listTokens({ network: 'vex-native', limit: 100, cursor });
  for (const item of page.items) console.log(item.id, item.name);
  cursor = page.nextCursor ?? undefined;
} while (cursor);

// Handle outages and rate limits separately from missing tokens.
try {
  await registry.getManifest();
} catch (error) {
  if (error instanceof RegistryError) {
    console.error(error.code, error.status, error.message);
  } else {
    throw error;
  }
}
```

## Cancellation

```js
const controller = new AbortController();
const request = registry.listTokens({ q: 'WIND', signal: controller.signal });
controller.abort();
// Handle request cancellation using your platform's standard AbortError behavior.
```

## Configuration

```js
const registry = createRegistryClient({
  timeoutMs: 10000,
  // Optional: pass a custom fetch implementation for your runtime.
  fetcher: fetch,
});
```

The client defaults to `https://api.windcrypto.com/registry/v2`. It does not cache registry responses itself; ordinary browser and HTTP caching rules apply. For local development, you may override `baseUrl` with an HTTP localhost address.

Token metadata describes a token, not its current price, balances, liquidity, or security.
