export interface SmartShuffleBucketInfo {
  scopeKey: string;
  scopeType: string;
  scopeId: string;
  displayName: string;
  total: number;
  played: number;
  queued: number;
  remaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface SmartShuffleBucketsResponse {
  count: number;
  buckets: SmartShuffleBucketInfo[];
}

export interface SmartShuffleItemInfo {
  itemId: string;
  itemName: string;
  itemType: string;
  seriesName: string;
  episodeTitle: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  displayTitle: string;
}

export interface SmartShuffleExcludedResponse {
  count: number;
  items: SmartShuffleItemInfo[];
}

export interface SmartShuffleInfoResponse {
  name: string;
  version: string;
  description: string;
  id: string;
}

export interface JellyfinApiClient {
  getCurrentUserId(): string;
  getUrl(path: string): string;
  ajax<T>(request: {
    type: string;
    url: string;
    dataType?: string;
  }): Promise<T>;
}

export interface Tab {
  id: string;
  label: string;
  render(container: HTMLElement): void | Promise<void>;
}

declare global {
  interface Window {
    ApiClient?: JellyfinApiClient;
    PlaybackManager?: unknown;
  }
}