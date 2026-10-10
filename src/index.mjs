/**
 * Read token metadata from the WIND Registry API.
 * Token records come from the Vexanium TokenDB contracts.
 */
export const DEFAULT_API_BASE_URL = 'https://api.windcrypto.com/registry/v2';

const NETWORKS = new Set(['vex-native', 'vex-evm']);
const NATIVE_CONTRACT = /^[a-z1-5.]{1,12}$/;
const NATIVE_SYMBOL = /^[A-Z]{1,7}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export class RegistryError extends Error {
  constructor(message, { status = null, code = 'REGISTRY_ERROR' } = {}) {
    super(message);
    this.name = 'RegistryError';
    this.status = status;
    this.code = code;
  }
}

function requireString(value, pattern, label) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value;
}

function validateBaseUrl(value) {
  let url;
  try { url = new URL(value); }
  catch { throw new TypeError('baseUrl must be a valid absolute URL.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash) {
    throw new TypeError('baseUrl must be an HTTPS URL (HTTP is allowed for localhost).');
  }
  return url.href.replace(/\/+$/, '');
}

function validateListOptions({ network, q, limit, cursor }) {
  if (network !== undefined && !NETWORKS.has(network)) {
    throw new TypeError('Unsupported network.');
  }
  if (q !== undefined && (typeof q !== 'string' || q.length > 80)) {
    throw new TypeError('q must be a string up to 80 characters.');
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    throw new TypeError('limit must be an integer between 1 and 100.');
  }
  if (cursor !== undefined && (typeof cursor !== 'string' ||
      !/^[A-Za-z0-9_-]{1,512}$/.test(cursor))) {
    throw new TypeError('Invalid cursor.');
  }
}

/** Create a read-only registry client for browsers, Node.js and React Native. */
export function createRegistryClient({
  baseUrl = DEFAULT_API_BASE_URL,
  fetcher = globalThis.fetch,
  timeoutMs = 15000,
} = {}) {
  const base = validateBaseUrl(baseUrl);
  if (typeof fetcher !== 'function') throw new TypeError('fetcher must be a function.');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) {
    throw new TypeError('timeoutMs must be an integer from 1 to 120000.');
  }

  async function get(path, { query, signal, nullable = false } = {}) {
    const url = new URL(base + '/' + path);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const relayAbort = () => controller.abort(signal.reason);
    if (signal?.aborted) relayAbort();
    else signal?.addEventListener('abort', relayAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response;
      try {
        response = await fetcher(url.toString(), {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        if (controller.signal.aborted) {
          throw new RegistryError('Registry request timed out.', { code: 'TIMEOUT' });
        }
        throw new RegistryError('Cannot reach the registry API.', { code: 'NETWORK_ERROR' });
      }
      if (nullable && response.status === 404) return null;
      let body;
      try { body = await response.json(); }
      catch {
        throw new RegistryError('Registry returned invalid JSON.', {
          status: response.status, code: 'INVALID_RESPONSE',
        });
      }
      if (!response.ok) {
        throw new RegistryError(body?.error?.message || `Registry HTTP ${response.status}.`, {
          status: response.status, code: body?.error?.code || 'HTTP_ERROR',
        });
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new RegistryError('Registry returned an invalid response.', {
          status: response.status, code: 'INVALID_RESPONSE',
        });
      }
      return body;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', relayAbort);
    }
  }

  return Object.freeze({
    getManifest: ({ signal } = {}) => get('manifest', { signal }),

    listTokens: ({ network, q, limit, cursor, signal } = {}) => {
      validateListOptions({ network, q, limit, cursor });
      return get('tokens', { query: { network, q, limit, cursor }, signal });
    },

    getNativeToken: (contract, symbol, { signal } = {}) => {
      requireString(contract, NATIVE_CONTRACT, 'native token contract');
      requireString(symbol, NATIVE_SYMBOL, 'native token symbol');
      return get(`tokens/native/${contract}/${symbol}`, { signal, nullable: true });
    },

    getEvmToken: (address, { signal } = {}) => {
      requireString(address, EVM_ADDRESS, 'EVM token address');
      return get(`tokens/evm/${address.toLowerCase()}`, { signal, nullable: true });
    },
  });
}
