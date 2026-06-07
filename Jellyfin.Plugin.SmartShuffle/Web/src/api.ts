import type {
  PluginConfiguration,
  SmartShuffleBucketInfo,
  SmartShuffleBucketsResponse,
  SmartShuffleExcludedResponse,
  SmartShuffleInfoResponse,
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

type MaybePascalPluginConfiguration = Partial<PluginConfiguration> & {
  ExcludeSpecials?: boolean;
  EnableExcludeTag?: boolean;
  PrioritizeLessPlayed?: boolean;
  PenalizeRecentlyPlayed?: boolean;
  RecentlyPlayedNearWindowDays?: number;
  RecentlyPlayedNearWeightMultiplier?: number;
  RecentlyPlayedFarWindowDays?: number;
  RecentlyPlayedFarWeightMultiplier?: number;
};

type MaybePascalInfo = Partial<SmartShuffleInfoResponse> & {
  Name?: string;
  Version?: string;
  Description?: string;
  Id?: string;
};

function normalizePluginConfiguration(response: unknown): PluginConfiguration {
  const typed = response as MaybePascalPluginConfiguration;

  return {
    excludeSpecials: typed.excludeSpecials ?? typed.ExcludeSpecials ?? true,
    enableExcludeTag: typed.enableExcludeTag ?? typed.EnableExcludeTag ?? true,
    prioritizeLessPlayed: typed.prioritizeLessPlayed ?? typed.PrioritizeLessPlayed ?? true,
    penalizeRecentlyPlayed:
      typed.penalizeRecentlyPlayed ?? typed.PenalizeRecentlyPlayed ?? true,
    recentlyPlayedNearWindowDays:
      typed.recentlyPlayedNearWindowDays ?? typed.RecentlyPlayedNearWindowDays ?? 7,
    recentlyPlayedNearWeightMultiplier:
      typed.recentlyPlayedNearWeightMultiplier ??
      typed.RecentlyPlayedNearWeightMultiplier ??
      0.25,
    recentlyPlayedFarWindowDays:
      typed.recentlyPlayedFarWindowDays ?? typed.RecentlyPlayedFarWindowDays ?? 30,
    recentlyPlayedFarWeightMultiplier:
      typed.recentlyPlayedFarWeightMultiplier ??
      typed.RecentlyPlayedFarWeightMultiplier ??
      0.5
  };
}

export function getPluginConfiguration(): Promise<PluginConfiguration> {
  return getJson('SmartShuffle/Configuration', normalizePluginConfiguration);
}

export function savePluginConfiguration(
  configuration: PluginConfiguration
): Promise<void> {
  return postJson('SmartShuffle/Configuration', configuration);
}

function normalizeInfoResponse(response: unknown): SmartShuffleInfoResponse {
  const typed = response as MaybePascalInfo;

  return {
    name: typed.name ?? typed.Name ?? '',
    version: typed.version ?? typed.Version ?? '',
    description: typed.description ?? typed.Description ?? '',
    id: typed.id ?? typed.Id ?? ''
  };
}

export function getPluginInfo(): Promise<SmartShuffleInfoResponse> {
  return getJson('SmartShuffle/Info', normalizeInfoResponse);
}

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

async function getJson<T>(
  path: string,
  normalize: (response: unknown) => T
): Promise<T> {
  const apiClient = getApiClient();

  const result = await apiClient.ajax<unknown>({
    type: 'GET',
    url: apiClient.getUrl(path),
    dataType: 'json'
  });

  return normalize(await unwrapJson<unknown>(result));
}

async function postJson(
  path: string,
  data?: unknown
): Promise<void> {
  const apiClient = getApiClient();

  const request: {
    type: string;
    url: string;
    dataType: string;
    contentType?: string;
    data?: string;
  } = {
    type: 'POST',
    url: apiClient.getUrl(path),
    dataType: 'json'
  };

  if (data !== undefined) {
    request.contentType = 'application/json';
    request.data = JSON.stringify(data);
  }

  await apiClient.ajax(request);
}

function withQuery(
  path: string,
  params: Record<string, string>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, value);
  }

  return path + '?' + searchParams.toString();
}

export function getCurrentUserId(): string {
  return getApiClient().getCurrentUserId();
}

export function getQueues(): Promise<SmartShuffleBucketsResponse> {
  const apiClient = getApiClient();

  return getJson(
    withQuery('SmartShuffle/Buckets', {
      userId: apiClient.getCurrentUserId()
    }),
    normalizeBucketsResponse
  );
}

export function resetQueue(scopeKey: string): Promise<void> {
  const apiClient = getApiClient();

  return postJson(
    withQuery('SmartShuffle/ResetBucket', {
      userId: apiClient.getCurrentUserId(),
      scopeKey
    })
  );
}

export function getExcludedItems(): Promise<SmartShuffleExcludedResponse> {
  return getJson('SmartShuffle/Excluded', normalizeExcludedResponse);
}

export function ping(): Promise<unknown> {
  return getJson('SmartShuffle/Ping', function (response) {
    return response;
  });
}