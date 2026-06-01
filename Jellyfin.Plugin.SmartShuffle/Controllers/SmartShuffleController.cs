using Jellyfin.Data.Enums;
using Jellyfin.Plugin.SmartShuffle.Services;
using Jellyfin.Plugin.SmartShuffle.Store;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mime;

namespace Jellyfin.Plugin.SmartShuffle.Controllers;

[Authorize]
[ApiController]
[Produces(MediaTypeNames.Application.Json)]
public sealed class SmartShuffleController(
    SmartShuffleService service,
    ILibraryManager libraryManager,
    IUserManager userManager,
    IUserDataManager userDataManager) : ControllerBase
{
    private readonly SmartShuffleService _service = service;
    private readonly ILibraryManager _libraryManager = libraryManager;
    private readonly IUserManager _userManager = userManager;
    private readonly IUserDataManager _userDataManager = userDataManager;

    [HttpGet("SmartShuffle/Ping")]
    public ActionResult Ping()
    {
        return Ok(new
        {
            name = "Smart Shuffle",
            ok = true
        });
    }

    [HttpGet("SmartShuffle/Info")]
    public ActionResult<SmartShuffleInfoResponse> Info()
    {
        var plugin = Plugin.Instance;

        return new SmartShuffleInfoResponse
        {
            Name = plugin?.Name ?? "Smart Shuffle",
            Version = plugin?.Version?.ToString() ?? GetType().Assembly.GetName().Version?.ToString() ?? string.Empty,
            Description = plugin?.Description ?? string.Empty,
            Id = plugin?.Id.ToString("D") ?? string.Empty
        };
    }

    [HttpPost("SmartShuffle/Queue")]
    public ActionResult<SmartShuffleQueueResponse> Queue(
        [FromQuery] Guid userId,
        [FromQuery] Guid? scopeId,
        [FromQuery] string? seriesName,
        [FromQuery] string scopeType = "series")
    {
        var resolvedScopeId = ResolveScopeId(scopeId, seriesName);

        if (resolvedScopeId is null)
        {
            return BadRequest("Provide either scopeId or seriesName.");
        }

        if (!IsSupportedSmartShuffleScope(resolvedScopeId.Value, scopeType))
        {
            return BadRequest($"Smart Shuffle does not support scope type '{scopeType}' for item {resolvedScopeId.Value:N}.");
        }

        var scopeKey = $"{scopeType}:{resolvedScopeId.Value:N}";

        var candidateItems = GetCandidateItems(resolvedScopeId.Value, scopeType);

        if (candidateItems.Count == 0)
        {
            return NotFound($"No playable items found for {scopeType} {resolvedScopeId.Value:N}.");
        }

        var candidateIds = CreateWeightedCandidateOrder(userId, candidateItems);

        var queueIds = _service.GetQueueOrRefill(
            userId.ToString("N"),
            scopeKey,
            candidateIds);

        var items = queueIds
            .Select(GetItemInfo)
            .Where(i => i is not null)
            .Cast<SmartShuffleItemInfo>()
            .ToList();

        return new SmartShuffleQueueResponse
        {
            ScopeKey = scopeKey,
            ItemIds = [.. queueIds],
            Items = items,
            Count = queueIds.Count
        };
    }

    [HttpGet("SmartShuffle/Excluded")]
    public ActionResult<SmartShuffleExcludedResponse> Excluded()
    {
        var items = _libraryManager
            .GetItemList(new InternalItemsQuery
            {
                IncludeItemTypes = [
                    BaseItemKind.Episode, 
                    BaseItemKind.Movie, 
                    BaseItemKind.Video,
                ],
                Recursive = true
            })
            .Where(HasSmartShuffleExcludeTag)
            .Select(GetItemInfo)
            .Where(item => item is not null)
            .Cast<SmartShuffleItemInfo>()
            .OrderBy(item => item.ItemType)
            .ThenBy(item => item.DisplayTitle)
            .ToList();

        return new SmartShuffleExcludedResponse
        {
            Count = items.Count,
            Items = items
        };
    }

    [HttpPost("SmartShuffle/Reset")]
    public ActionResult Reset(
        [FromQuery] Guid userId,
        [FromQuery] Guid? scopeId,
        [FromQuery] string? seriesName,
        [FromQuery] string scopeType = "series")
    {
        var resolvedScopeId = ResolveScopeId(scopeId, seriesName);

        if (resolvedScopeId is null)
        {
            return BadRequest("Provide either scopeId or seriesName.");
        }

        if (!IsSupportedSmartShuffleScope(resolvedScopeId.Value, scopeType))
        {
            return BadRequest($"Smart Shuffle does not support scope type '{scopeType}' for item {resolvedScopeId.Value:N}.");
        }

        var scopeKey = $"{scopeType}:{resolvedScopeId.Value:N}";

        _service.Reset(userId.ToString("N"), scopeKey);

        return Ok(new
        {
            reset = true,
            scopeKey
        });
    }

    [HttpGet("SmartShuffle/Status")]
    public ActionResult<SmartShuffleStatusResponse> Status(
        [FromQuery] Guid userId,
        [FromQuery] Guid? scopeId,
        [FromQuery] string? seriesName,
        [FromQuery] string scopeType = "series")
    {
        var resolvedScopeId = ResolveScopeId(scopeId, seriesName);

        if (resolvedScopeId is null)
        {
            return BadRequest("Provide either scopeId or seriesName.");
        }

        if (!IsSupportedSmartShuffleScope(resolvedScopeId.Value, scopeType))
        {
            return BadRequest($"Smart Shuffle does not support scope type '{scopeType}' for item {resolvedScopeId.Value:N}.");
        }

        var scopeKey = $"{scopeType}:{resolvedScopeId.Value:N}";

        var status = _service.GetStatus(userId.ToString("N"), scopeKey);

        return new SmartShuffleStatusResponse
        {
            ScopeKey = scopeKey,
            Total = status.Total,
            Played = status.Played,
            Queued = status.Queued,
            Remaining = status.Remaining
        };
    }

    [HttpGet("SmartShuffle/Buckets")]
    public ActionResult<SmartShuffleBucketsResponse> Buckets(
        [FromQuery] Guid userId)
    {
        var buckets = _service
            .GetBuckets(userId.ToString("N"))
            .Select(EnrichBucketSummary)
            .ToList();

        return new SmartShuffleBucketsResponse
        {
            Count = buckets.Count,
            Buckets = buckets
        };
    }

    [HttpPost("SmartShuffle/ResetBucket")]
    public ActionResult ResetBucket(
        [FromQuery] Guid userId,
        [FromQuery] string scopeKey)
    {
        if (string.IsNullOrWhiteSpace(scopeKey))
        {
            return BadRequest("scopeKey is required.");
        }

        _service.Reset(userId.ToString("N"), scopeKey);

        return Ok(new
        {
            reset = true,
            scopeKey
        });
    }

    private SmartShuffleBucketInfo EnrichBucketSummary(SmartShuffleBucketSummary summary)
    {
        var (ScopeType, ScopeId) = ParseScopeKey(summary.ScopeKey);

        var displayName = summary.ScopeKey;

        if (ScopeId is not null)
        {
            var item = _libraryManager.GetItemById(ScopeId.Value);

            if (item is not null)
            {
                displayName = item.Name ?? summary.ScopeKey;
            }
        }

        return new SmartShuffleBucketInfo
        {
            ScopeKey = summary.ScopeKey,
            ScopeType = ScopeType,
            ScopeId = ScopeId?.ToString("N") ?? string.Empty,
            DisplayName = displayName,
            Total = summary.Total,
            Played = summary.Played,
            Queued = summary.Queued,
            Remaining = summary.Remaining,
            CreatedAt = summary.CreatedAt,
            UpdatedAt = summary.UpdatedAt
        };
    }

    private static (string ScopeType, Guid? ScopeId) ParseScopeKey(string scopeKey)
    {
        var separatorIndex = scopeKey.IndexOf(':');

        if (separatorIndex < 0)
        {
            return (string.Empty, null);
        }

        var scopeType = scopeKey[..separatorIndex];
        var idText = scopeKey[(separatorIndex + 1)..];

        if (Guid.TryParse(idText, out var scopeId))
        {
            return (scopeType, scopeId);
        }

        return (scopeType, null);
    }

    private Guid? ResolveScopeId(Guid? scopeId, string? seriesName)
    {
        if (scopeId is not null)
        {
            return scopeId;
        }

        if (!string.IsNullOrWhiteSpace(seriesName))
        {
            return FindSeriesIdByName(seriesName);
        }

        return null;
    }

    private List<BaseItem> GetCandidateItems(
        Guid scopeId,
        string scopeType)
    {
        var item = _libraryManager.GetItemById(scopeId);

        if (item is null)
        {
            return [];
        }

        IEnumerable<BaseItem> candidates = [];

        if (scopeType.Equals("series", StringComparison.OrdinalIgnoreCase)
            && item is Series series)
        {
            candidates = series.GetRecursiveChildren()
                .Where(IsSmartShufflePlayable);
        }
        else if (scopeType.Equals("season", StringComparison.OrdinalIgnoreCase)
                 && item is Season season)
        {
            candidates = season.GetRecursiveChildren()
                .Where(IsSmartShufflePlayable);
        }
        else if (scopeType.Equals("collection", StringComparison.OrdinalIgnoreCase)
                 && item is Folder collectionFolder)
        {
            candidates = collectionFolder.GetRecursiveChildren()
                .Where(IsSmartShufflePlayable);
        }
        else if (scopeType.Equals("playlist", StringComparison.OrdinalIgnoreCase)
                 && item is Folder playlistFolder)
        {
            candidates = playlistFolder.GetRecursiveChildren()
                .Where(IsSmartShufflePlayable);
        }

        return [.. candidates
            .GroupBy(i => i.Id)
            .Select(g => g.First())];
    }

    private List<string> CreateWeightedCandidateOrder(
        Guid userId,
        IReadOnlyList<BaseItem> candidateItems)
    {
        var user = _userManager.GetUserById(userId);

        if (user is null)
        {
            return [.. WeightedShuffle(
                    [.. candidateItems.Select(item => new WeightedSmartShuffleItem
                    {
                        ItemId = item.Id.ToString("N"),
                        PlayCount = 0,
                        LastPlayedDate = null,
                        Weight = 1.0
                    })])
                .Select(i => i.ItemId)];
        }

        var weighted = candidateItems
            .Select(item =>
            {
                var data = _userDataManager.GetUserData(user, item);

                var playCount = data?.PlayCount ?? 0;
                var lastPlayedDate = data?.LastPlayedDate;

                return new WeightedSmartShuffleItem
                {
                    ItemId = item.Id.ToString("N"),
                    PlayCount = playCount,
                    LastPlayedDate = lastPlayedDate,
                    Weight = CalculateSmartShuffleWeight(playCount, lastPlayedDate)
                };
            })
            .ToList();

        return [.. WeightedShuffle(weighted).Select(i => i.ItemId)];
    }

    private static double CalculateSmartShuffleWeight(
        int playCount,
        DateTime? lastPlayedDate)
    {
        // Strongly favor items with lower Jellyfin play counts.
        var weight = 1.0 / Math.Pow(playCount + 1, 2);

        // Slightly penalize recently played items.
        if (lastPlayedDate.HasValue)
        {
            var daysSincePlayed = (DateTime.UtcNow - lastPlayedDate.Value.ToUniversalTime()).TotalDays;

            if (daysSincePlayed < 7)
            {
                weight *= 0.25;
            }
            else if (daysSincePlayed < 30)
            {
                weight *= 0.5;
            }
        }

        return Math.Max(weight, 0.001);
    }

    private static List<WeightedSmartShuffleItem> WeightedShuffle(
        IReadOnlyList<WeightedSmartShuffleItem> source)
    {
        var remaining = source
            .Where(i => !string.IsNullOrWhiteSpace(i.ItemId))
            .ToList();

        var result = new List<WeightedSmartShuffleItem>();

        while (remaining.Count > 0)
        {
            var totalWeight = remaining.Sum(i => i.Weight);

            if (totalWeight <= 0)
            {
                result.AddRange(remaining);
                break;
            }

            var roll = Random.Shared.NextDouble() * totalWeight;
            var running = 0.0;

            for (var i = 0; i < remaining.Count; i++)
            {
                running += remaining[i].Weight;

                if (roll <= running)
                {
                    result.Add(remaining[i]);
                    remaining.RemoveAt(i);
                    break;
                }
            }
        }

        return result;
    }

    private const string ExcludeTag = "SmartShuffleExclude";
    private static bool IsSmartShufflePlayable(BaseItem item)
    {
        if (HasSmartShuffleExcludeTag(item))
        {
            return false;
        }

        var typeName = item.GetType().Name;

        return item is Episode
            || typeName.Equals("Movie", StringComparison.OrdinalIgnoreCase);
    }

    private static bool HasSmartShuffleExcludeTag(BaseItem item)
    {
        return item.Tags?.Any(tag =>
            string.Equals(tag, ExcludeTag, StringComparison.OrdinalIgnoreCase)) == true;
    }

    private bool IsSupportedSmartShuffleScope(Guid scopeId, string scopeType)
    {
        var item = _libraryManager.GetItemById(scopeId);

        if (item is null)
        {
            return false;
        }

        if (scopeType.Equals("series", StringComparison.OrdinalIgnoreCase))
        {
            return item is Series;
        }

        if (scopeType.Equals("season", StringComparison.OrdinalIgnoreCase))
        {
            return item is Season;
        }

        if (scopeType.Equals("collection", StringComparison.OrdinalIgnoreCase))
        {
            return item.GetType().Name.Equals("BoxSet", StringComparison.OrdinalIgnoreCase)
                && item is Folder;
        }

        if (scopeType.Equals("playlist", StringComparison.OrdinalIgnoreCase))
        {
            return item.GetType().Name.Equals("Playlist", StringComparison.OrdinalIgnoreCase)
                && item is Folder;
        }

        return false;
    }

    private static SmartShuffleItemInfo? GetItemInfo(BaseItem item)
    {
        var typeName = item.GetType().Name;

        if (item is Episode episode)
        {
            return new SmartShuffleItemInfo
            {
                ItemId = episode.Id.ToString("N"),
                ItemName = episode.Name ?? string.Empty,
                ItemType = "Episode",
                SeriesName = episode.SeriesName ?? string.Empty,
                EpisodeTitle = episode.Name ?? string.Empty,
                SeasonNumber = episode.ParentIndexNumber,
                EpisodeNumber = episode.IndexNumber,
                DisplayTitle =
                    $"{episode.SeriesName} - " +
                    $"S{episode.ParentIndexNumber:00}E{episode.IndexNumber:00} - " +
                    $"{episode.Name}"
            };
        }

        return new SmartShuffleItemInfo
        {
            ItemId = item.Id.ToString("N"),
            ItemName = item.Name ?? string.Empty,
            ItemType = typeName,
            DisplayTitle = item.Name ?? item.Id.ToString("N")
        };
    }

    private SmartShuffleItemInfo? GetItemInfo(string itemId)
    {
        if (!Guid.TryParse(itemId, out var id))
        {
            return null;
        }

        var item = _libraryManager.GetItemById(id);

        if (item is null)
        {
            return null;
        }

        return GetItemInfo(item);
    }

    private Guid? FindSeriesIdByName(string seriesName)
    {
        var items = _libraryManager.GetItemList(new InternalItemsQuery
        {
            IncludeItemTypes = [BaseItemKind.Series],
            Recursive = true,
            Name = seriesName
        });

        var series = items
            .OfType<Series>()
            .FirstOrDefault(s =>
                string.Equals(s.Name, seriesName, StringComparison.OrdinalIgnoreCase));

        return series?.Id;
    }

    private sealed class WeightedSmartShuffleItem
    {
        public string ItemId { get; set; } = string.Empty;

        public int PlayCount { get; set; }

        public DateTime? LastPlayedDate { get; set; }

        public double Weight { get; set; }
    }
}

public sealed class SmartShuffleInfoResponse
{
    public string Name { get; set; } = string.Empty;

    public string Version { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Id { get; set; } = string.Empty;
}

public sealed class SmartShuffleExcludedResponse
{
    public int Count { get; set; }

    public List<SmartShuffleItemInfo> Items { get; set; } = [];
}

public sealed class SmartShuffleStatusResponse
{
    public string ScopeKey { get; set; } = string.Empty;

    public int Total { get; set; }

    public int Played { get; set; }

    public int Queued { get; set; }

    public int Remaining { get; set; }
}

public sealed class SmartShuffleQueueResponse
{
    public string ScopeKey { get; set; } = string.Empty;

    public List<string> ItemIds { get; set; } = [];

    public List<SmartShuffleItemInfo> Items { get; set; } = [];

    public int Count { get; set; }
}

public sealed class SmartShuffleItemInfo
{
    public string ItemId { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public string ItemType { get; set; } = string.Empty;

    public string SeriesName { get; set; } = string.Empty;

    public string EpisodeTitle { get; set; } = string.Empty;

    public int? SeasonNumber { get; set; }

    public int? EpisodeNumber { get; set; }

    public string DisplayTitle { get; set; } = string.Empty;
}

public sealed class SmartShuffleResponse
{
    public string ItemId { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    public string ItemType { get; set; } = string.Empty;

    public string SeriesName { get; set; } = string.Empty;

    public string EpisodeTitle { get; set; } = string.Empty;

    public int? SeasonNumber { get; set; }

    public int? EpisodeNumber { get; set; }

    public string DisplayTitle { get; set; } = string.Empty;

    public string DetailsUrl { get; set; } = string.Empty;
}

public sealed class SmartShuffleBucketsResponse
{
    public int Count { get; set; }

    public List<SmartShuffleBucketInfo> Buckets { get; set; } = [];
}

public sealed class SmartShuffleBucketInfo
{
    public string ScopeKey { get; set; } = string.Empty;

    public string ScopeType { get; set; } = string.Empty;

    public string ScopeId { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public int Total { get; set; }

    public int Played { get; set; }

    public int Queued { get; set; }

    public int Remaining { get; set; }

    public string CreatedAt { get; set; } = string.Empty;

    public string UpdatedAt { get; set; } = string.Empty;
}