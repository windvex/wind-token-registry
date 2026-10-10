export type TokenNetwork = 'vex-native' | 'vex-evm';

export type TokenVerification = { status: 'verified' | 'unverified' | string };

export interface TokenMetadata {
  id: string;
  network: TokenNetwork;
  chainId: string | number;
  contract?: string;
  address?: string;
  symbol: string | null;
  decimals?: number;
  name: string;
  description: string | null;
  logo: string | null;
  categories: string[];
  tags: string[];
  links: Partial<Record<'website' | 'telegram' | 'x' | 'discord' | 'github', string>>;
  tier: number;
  tierLabel: string;
  status: string;
  verification: TokenVerification;
  metadataURI: string | null;
  metadataHash: string | null;
  createdAt: string | number | null;
  updatedAt: string | number | null;
  provenance?: {
    publishers: string[];
    publicationType: string;
  };
}

export interface RegistryManifest {
  schemaVersion: number;
  version: string;
  source: 'onchain';
  total: number;
  networks: Record<string, {
    chainId: string | number;
    contract: string;
    head: number;
  }>;
}

export interface TokenPage {
  schemaVersion: number;
  catalogVersion: string;
  source: 'onchain';
  total: number;
  items: TokenMetadata[];
  nextCursor: string | null;
}

export interface RegistryRequestOptions {
  signal?: AbortSignal;
}

export interface ListTokensOptions extends RegistryRequestOptions {
  network?: TokenNetwork;
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface RegistryClientOptions {
  /** Defaults to the public WIND Registry API. */
  baseUrl?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export declare class RegistryError extends Error {
  readonly status: number | null;
  readonly code: string;
  constructor(message: string, options?: { status?: number | null; code?: string });
}

export declare const DEFAULT_API_BASE_URL: string;

export interface RegistryClient {
  getManifest(options?: RegistryRequestOptions): Promise<RegistryManifest>;
  listTokens(options?: ListTokensOptions): Promise<TokenPage>;
  getNativeToken(contract: string, symbol: string, options?: RegistryRequestOptions): Promise<TokenMetadata | null>;
  getEvmToken(address: string, options?: RegistryRequestOptions): Promise<TokenMetadata | null>;
}

export declare function createRegistryClient(options?: RegistryClientOptions): RegistryClient;
