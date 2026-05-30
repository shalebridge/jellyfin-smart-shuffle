using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.SmartShuffle.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    public bool ExcludeWatchedEpisodes { get; set; } = false;
    public bool ExcludeSpecials { get; set; } = true;
    public bool RefillOnlyWhenEmpty { get; set; } = true;
}