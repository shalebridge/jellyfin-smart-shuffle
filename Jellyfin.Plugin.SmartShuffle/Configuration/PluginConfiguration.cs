using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.SmartShuffle.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    public bool ExcludeSpecials { get; set; } = true;

    public bool EnableExcludeTag { get; set; } = true;

    public bool PrioritizeLessPlayed { get; set; } = true;

    public bool PenalizeRecentlyPlayed { get; set; } = true;

    public int RecentlyPlayedNearWindowDays { get; set; } = 7;

    public double RecentlyPlayedNearWeightMultiplier { get; set; } = 0.25;

    public int RecentlyPlayedFarWindowDays { get; set; } = 30;

    public double RecentlyPlayedFarWeightMultiplier { get; set; } = 0.5;
}