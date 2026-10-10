import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRegistryClient, DEFAULT_API_BASE_URL, RegistryError } from '../src/index.mjs';

const ok = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json' },
});

test('defaults to the public API and preserves token metadata', async () => {
  const requests = [];
  const token = { id: 'vex-native/vex.token/VEX', logo: 'https://example.com/VEX.png' };
  const client = createRegistryClient({
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return ok(token);
    },
  });
  assert.equal(DEFAULT_API_BASE_URL, 'https://api.windcrypto.com/registry/v2');
  assert.deepEqual(await client.getNativeToken('vex.token', 'VEX'), token);
  assert.equal(requests[0].url, DEFAULT_API_BASE_URL + '/tokens/native/vex.token/VEX');
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers.Accept, 'application/json');
});

test('search and cursor values are URL-encoded correctly', async () => {
  const urls = [];
  const client = createRegistryClient({
    fetcher: async url => {
      urls.push(new URL(url));
      return ok({ total: 2, items: [], nextCursor: 'YWJj' });
    },
  });
  const page = await client.listTokens({
    network: 'vex-native', q: 'WIND & VEX', limit: 12, cursor: 'YWJj',
  });
  assert.equal(page.nextCursor, 'YWJj');
  assert.equal(urls[0].pathname, '/registry/v2/tokens');
  assert.equal(urls[0].searchParams.get('network'), 'vex-native');
  assert.equal(urls[0].searchParams.get('q'), 'WIND & VEX');
  assert.equal(urls[0].searchParams.get('limit'), '12');
  assert.equal(urls[0].searchParams.get('cursor'), 'YWJj');
});

test('EVM address normalization and strict identity validation', async () => {
  const requested = [];
  const client = createRegistryClient({
    fetcher: async url => { requested.push(url); return ok({ id: 'evm' }); },
  });
  await client.getEvmToken('0x' + 'A'.repeat(40));
  assert.equal(requested[0], DEFAULT_API_BASE_URL + '/tokens/evm/0x' + 'a'.repeat(40));
  assert.throws(() => client.getNativeToken('../../etc', 'VEX'), TypeError);
  assert.throws(() => client.getNativeToken('vex.token', 'vex'), TypeError);
  assert.throws(() => client.getEvmToken('0xinvalid'), TypeError);
  assert.throws(() => client.listTokens({ network: 'mainnet' }), TypeError);
  assert.throws(() => client.listTokens({ limit: 101 }), TypeError);
  assert.throws(() => client.listTokens({ cursor: 'not safe!' }), TypeError);
  assert.throws(() => client.listTokens({ q: 'x'.repeat(81) }), TypeError);
  assert.throws(() => createRegistryClient({ baseUrl: 'http://example.com/registry/v2' }), TypeError);
  assert.throws(() => createRegistryClient({ baseUrl: 'https://example.com/registry/v2?key=x' }), TypeError);
});

test('missing tokens return null without masking other HTTP errors', async () => {
  const notFound = createRegistryClient({
    fetcher: async () => ok({ error: { code: 'TOKEN_NOT_FOUND', message: 'Not found' } }, 404),
  });
  assert.equal(await notFound.getNativeToken('vex.token', 'VEX'), null);
  assert.equal(await notFound.getEvmToken('0x' + 'a'.repeat(40)), null);
  await assert.rejects(() => notFound.listTokens(), e =>
    e instanceof RegistryError && e.status === 404 && e.code === 'TOKEN_NOT_FOUND');
});

test('structured errors retain API status and code', async () => {
  const client = createRegistryClient({
    fetcher: async () => ok({ error: { code: 'RATE_LIMITED', message: 'Try later' } }, 429),
  });
  await assert.rejects(() => client.getManifest(), error =>
    error instanceof RegistryError && error.status === 429 &&
    error.code === 'RATE_LIMITED' && error.message === 'Try later');
});

test('malformed JSON, network failures and timeouts are not silent', async () => {
  const malformed = createRegistryClient({ fetcher: async () => new Response('not-json') });
  await assert.rejects(() => malformed.getManifest(), e => e instanceof RegistryError && e.code === 'INVALID_RESPONSE');

  const disconnected = createRegistryClient({ fetcher: async () => { throw Error('offline'); } });
  await assert.rejects(() => disconnected.getManifest(), e => e instanceof RegistryError && e.code === 'NETWORK_ERROR');

  const timeout = createRegistryClient({
    timeoutMs: 5,
    fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
    }),
  });
  await assert.rejects(() => timeout.getManifest(), e => e instanceof RegistryError && e.code === 'TIMEOUT');
});

test('caller abort propagates without swallowing the abort reason', async () => {
  const abort = new AbortController();
  const client = createRegistryClient({
    fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }),
  });
  const request = client.listTokens({ signal: abort.signal });
  abort.abort(new DOMException('Cancelled by caller', 'AbortError'));
  await assert.rejects(request, error => error.name === 'AbortError');
});

test('repository has no static catalog, private runtime or obsolete API references', async () => {
  const root = new URL('../', import.meta.url);
  const tree = await readdir(root);
  for (const name of ['dist', 'catalog', 'profiles', 'assets', 'server', 'chain-api', 'media-api']) {
    assert.equal(tree.includes(name), false, name + ' must not be published in this client');
  }
  const files = ['README.md', 'CONTRIBUTING.md', 'docs/API.md', 'docs/CLIENT.md',
    'src/index.mjs', 'src/index.d.ts', 'package.json'];
  for (const path of files) {
    const source = await readFile(new URL('../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\/registry\/v1\b|\/v1\/tokens\b|legacy|migration/i, path);
  }
});
