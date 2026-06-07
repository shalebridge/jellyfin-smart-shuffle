using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Jellyfin.Plugin.SmartShuffle.Services;

public sealed class SmartShufflePlaybackTrackingService(
    ISessionManager sessionManager,
    SmartShuffleService smartShuffleService,
    ILogger<SmartShufflePlaybackTrackingService> logger) : IHostedService
{
    private readonly ISessionManager _sessionManager = sessionManager;
    private readonly SmartShuffleService _smartShuffleService = smartShuffleService;
    private readonly ILogger<SmartShufflePlaybackTrackingService> _logger = logger;

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _sessionManager.PlaybackStart += OnPlaybackStart;
        _logger.LogInformation("SmartShuffle playback tracking started.");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _sessionManager.PlaybackStart -= OnPlaybackStart;
        _logger.LogInformation("SmartShuffle playback tracking stopped.");
        return Task.CompletedTask;
    }

    private void OnPlaybackStart(object? sender, PlaybackProgressEventArgs e)
    {
        try
        {
            var itemId = e.Item?.Id.ToString("N");
            if (string.IsNullOrWhiteSpace(itemId))
            {
                return;
            }

            var userId = e.Session?.UserId.ToString("N");
            if (string.IsNullOrWhiteSpace(userId))
            {
                return;
            }

            var rows = _smartShuffleService.MarkPlaybackStarted(userId, itemId);
            if (rows > 0)
            {
                _logger.LogDebug(
                    "SmartShuffle marked item {ItemId} as played for user {UserId}. Rows updated: {Rows}",
                    itemId,
                    userId,
                    rows);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SmartShuffle failed while handling PlaybackStart.");
        }
    }
}