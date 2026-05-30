import type {
  SmartShuffleBucketInfo,
  SmartShuffleBucketsResponse,
  SmartShuffleExcludedResponse,
  SmartShuffleItemInfo
} from './types';

type MaybePascalBucket = Partial<SmartShuffleBucketInfo> & {
  ScopeKey?: string;
  ScopeType?: string;
  ScopeId?: string;
  DisplayName?: string;
  Total?: number;
  Played?: number;
  Queued?: number;
  Remaining?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
};

type MaybePascalItem = Partial<SmartShuffleItemInfo> & {
  ItemId?: string;
  ItemName?: string;
  ItemType?: string;
  SeriesName?: string;
  EpisodeTitle?: string;
  SeasonNumber?: number | null;
  EpisodeNumber?: number | null;
  DisplayTitle?: string;
};

function normalizeBucket(bucket: MaybePascalBucket): SmartShuffleBucketInfo {
  return {
    scopeKey: bucket.scopeKey ?? bucket.ScopeKey ?? '',
    scopeType: bucket.scopeType ?? bucket.ScopeType ?? '',
    scopeId: bucket.scopeId ?? bucket.ScopeId ?? '',
    displayName: bucket.displayName ?? bucket.DisplayName ?? '',
    total: bucket.total ?? bucket.Total ?? 0,
    played: bucket.played ?? bucket.Played ?? 0,
    queued: bucket.queued ?? bucket.Queued ?? 0,
    remaining: bucket.remaining ?? bucket.Remaining ?? 0,
    createdAt: bucket.createdAt ?? bucket.CreatedAt ?? '',
    updatedAt: bucket.updatedAt ?? bucket.UpdatedAt ?? ''
  };
}

function normalizeItem(item: MaybePascalItem): SmartShuffleItemInfo {
  return {
    itemId: item.itemId ?? item.ItemId ?? '',
    itemName: item.itemName ?? item.ItemName ?? '',
    itemType: item.itemType ?? item.ItemType ?? '',
    seriesName: item.seriesName ?? item.SeriesName ?? '',
    episodeTitle: item.episodeTitle ?? item.EpisodeTitle ?? '',
    seasonNumber: item.seasonNumber ?? item.SeasonNumber ?? null,
    episodeNumber: item.episodeNumber ?? item.EpisodeNumber ?? null,
    displayTitle: item.displayTitle ?? item.DisplayTitle ?? ''
  };
}

function normalizeBucketsResponse(response: unknown): SmartShuffleBucketsResponse {
  const typed = response as {
    count?: number;
    Count?: number;
    buckets?: MaybePascalBucket[];
    Buckets?: MaybePascalBucket[];
  };

  const buckets = typed.buckets ?? typed.Buckets ?? [];

  return {
    count: typed.count ?? typed.Count ?? buckets.length,
    buckets: buckets.map(normalizeBucket)
  };
}

function normalizeExcludedResponse(response: unknown): SmartShuffleExcludedResponse {
  const typed = response as {
    count?: number;
    Count?: number;
    items?: MaybePascalItem[];
    Items?: MaybePascalItem[];
  };

  const items = typed.items ?? typed.Items ?? [];

  return {
    count: typed.count ?? typed.Count ?? items.length,
    items: items.map(normalizeItem)
  };
}

function getApiClient() {
  if (!window.ApiClient) {
    throw new Error('ApiClient is not available.');
  }

  return window.ApiClient;
}

async function unwrapJson<T>(value: unknown): Promise<T> {
  if (value && typeof value === 'object' && 'json' in value) {
    const json = (value as { json?: unknown }).json;

    if (typeof json === 'function') {
      return await (json as () => Promise<T>)();
    }
  }

  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }

  return value as T;
}

export function getCurrentUserId(): string {
  return getApiClient().getCurrentUserId();
}

export async function getQueues(): Promise<SmartShuffleBucketsResponse> {
  const apiClient = getApiClient();
  const params = new URLSearchParams();

  params.set('userId', apiClient.getCurrentUserId());

  const result = await apiClient.ajax<unknown>({
    type: 'GET',
    url: apiClient.getUrl('SmartShuffle/Buckets?' + params.toString()),
    dataType: 'json'
  });

  return normalizeBucketsResponse(await unwrapJson<unknown>(result));
}

export async function resetQueue(scopeKey: string): Promise<void> {
  const apiClient = getApiClient();
  const params = new URLSearchParams();

  params.set('userId', apiClient.getCurrentUserId());
  params.set('scopeKey', scopeKey);

  await apiClient.ajax({
    type: 'POST',
    url: apiClient.getUrl('SmartShuffle/ResetBucket?' + params.toString()),
    dataType: 'json'
  });
}

export async function getExcludedItems(): Promise<SmartShuffleExcludedResponse> {
  const apiClient = getApiClient();

  const result = await apiClient.ajax<unknown>({
    type: 'GET',
    url: apiClient.getUrl('SmartShuffle/Excluded'),
    dataType: 'json'
  });

  return normalizeExcludedResponse(await unwrapJson<unknown>(result));
}

export async function ping(): Promise<unknown> {
  const apiClient = getApiClient();

  const result = await apiClient.ajax<unknown>({
    type: 'GET',
    url: apiClient.getUrl('SmartShuffle/Ping'),
    dataType: 'json'
  });

  return unwrapJson<unknown>(result);
}