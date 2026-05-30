using Jellyfin.Plugin.SmartShuffle.Services;
using Jellyfin.Plugin.SmartShuffle.Store;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.SmartShuffle;

public class SmartShufflePluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(
        IServiceCollection serviceCollection,
        IServerApplicationHost applicationHost)
    {
        serviceCollection.AddSingleton<SmartShuffleStore>();
        serviceCollection.AddSingleton<SmartShuffleService>();
        serviceCollection.AddSingleton<IScheduledTask, SmartShuffleStartupService>();

        serviceCollection.AddHostedService<SmartShufflePlaybackTrackingService>();
    }
}