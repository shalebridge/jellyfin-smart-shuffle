using Jellyfin.Plugin.SmartShuffle.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using System;
using System.Collections.Generic;
using System.IO;

namespace Jellyfin.Plugin.SmartShuffle;

public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    private readonly IApplicationPaths _applicationPaths;

    public Plugin(
        IApplicationPaths applicationPaths,
        IXmlSerializer xmlSerializer)
    : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
        _applicationPaths = applicationPaths;
    }

    public static Plugin? Instance { get; private set; }

    public override string Name => "Smart Shuffle";

    public override string Description =>
    "Smart Shuffle for Jellyfin TV episodes, collections, and playlists using persistent per-user shuffle queues.";

    public override Guid Id => Guid.Parse("72757a4c-51a7-4042-b7d5-3ce7a869ee27");

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            EnableInMainMenu = true,
            MenuSection = "server",
            MenuIcon = "shuffle",
            EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.configPage.html",
        };
    }

    public override void OnUninstalling()
    {
        try
        {
            var dataDir = Path.Combine(
                _applicationPaths.DataPath,
                "smartshuffle");

            if (Directory.Exists(dataDir))
            {
                Directory.Delete(dataDir, recursive: true);
            }
        }
        catch
        {
            // Do not block plugin uninstall if cleanup fails.
        }

        base.OnUninstalling();
    }

}