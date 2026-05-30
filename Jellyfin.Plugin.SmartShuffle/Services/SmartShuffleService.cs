using Jellyfin.Plugin.SmartShuffle.Store;
using System.Collections.Generic;

namespace Jellyfin.Plugin.SmartShuffle.Services;

public sealed class SmartShuffleService(SmartShuffleStore store)
{
    private readonly SmartShuffleStore _store = store;

    public IReadOnlyList<string> GetQueueOrRefill(
        string userId,
        string scopeKey,
        IReadOnlyList<string> candidateItemIds)
        => _store.GetOrCreateQueue(userId, scopeKey, candidateItemIds);

    public int MarkPlaybackStarted(string userId, string itemId)
        => _store.MarkPlayedFromPlaybackStart(userId, itemId);

    public void Reset(string userId, string scopeKey)
        => _store.Reset(userId, scopeKey);

    public SmartShuffleStatus GetStatus(string userId, string scopeKey)
        => _store.GetStatus(userId, scopeKey);

    public IReadOnlyList<SmartShuffleBucketSummary> GetBuckets(string userId)
        => _store.GetBucketSummaries(userId);
}