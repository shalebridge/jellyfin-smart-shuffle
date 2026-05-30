using MediaBrowser.Common.Configuration;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace Jellyfin.Plugin.SmartShuffle.Services;

public sealed class SmartShuffleStartupService(
    ILogger<SmartShuffleStartupService> logger,
    IApplicationPaths applicationPaths) : IScheduledTask
{
    private readonly ILogger<SmartShuffleStartupService> _logger = logger;
    private readonly IApplicationPaths _applicationPaths = applicationPaths;

    private const string IndexHtmlTransformId =
        "b3f6b9d9-4a1e-4b3c-9d4e-5d8b3e5d9a11";

    private const string MainBundleTransformId =
        "3f94c5f1-7e5b-44c4-8f0d-f5c10a442a61";

    private const string SmartShuffleBlockPattern =
        @"<!-- BEGIN Smart Shuffle Plugin -->[\s\S]*?<!-- END Smart Shuffle Plugin -->\s*";

    private static readonly Regex SmartShuffleBlockRegex = new(
        SmartShuffleBlockPattern,
        RegexOptions.Multiline | RegexOptions.Compiled);

    public string Name => "SmartShuffle Startup";

    public string Key => "Jellyfin.Plugin.SmartShuffle.Startup";

    public string Description => "Registers SmartShuffle file transformations.";

    public string Category => "Startup Services";

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        _logger.LogInformation("SmartShuffle Startup. Registering file transformations.");

        CleanupOldSmartShuffleBlocks();
        RegisterFileTransformations();

        return Task.CompletedTask;
    }

    private void CleanupOldSmartShuffleBlocks()
    {
        try
        {
            var indexPath = Path.Combine(_applicationPaths.WebPath, "index.html");

            if (!File.Exists(indexPath))
            {
                _logger.LogWarning(
                    "SmartShuffle could not find physical index.html at {Path}.",
                    indexPath);

                return;
            }

            var contents = File.ReadAllText(indexPath);
            var cleaned = SmartShuffleBlockRegex.Replace(contents, string.Empty);

            if (string.Equals(contents, cleaned, StringComparison.Ordinal))
            {
                _logger.LogInformation("No stale SmartShuffle block found in physical index.html.");
                return;
            }

            File.WriteAllText(indexPath, cleaned);

            _logger.LogInformation("Removed stale SmartShuffle block from physical index.html.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clean stale SmartShuffle block from physical index.html.");
        }
    }

    private void RegisterFileTransformations()
    {
        Assembly? fileTransformationAssembly =
            AssemblyLoadContext.All
                .SelectMany(context => context.Assemblies)
                .FirstOrDefault(assembly =>
                    assembly.FullName?.Contains(".FileTransformation") ?? false);

        if (fileTransformationAssembly is null)
        {
            _logger.LogWarning("File Transformation plugin not found. SmartShuffle Web UI injection disabled.");
            return;
        }

        Type? pluginInterfaceType =
            fileTransformationAssembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");

        if (pluginInterfaceType is null)
        {
            _logger.LogWarning("Could not find PluginInterface in FileTransformation assembly. SmartShuffle Web UI injection disabled.");
            return;
        }

        MethodInfo? registerMethod = pluginInterfaceType.GetMethod("RegisterTransformation");

        if (registerMethod is null)
        {
            _logger.LogWarning("File Transformation RegisterTransformation method not found. SmartShuffle Web UI injection disabled.");
            return;
        }

        var indexPayload = CreatePayload(
            IndexHtmlTransformId,
            "index.html",
            nameof(SmartShuffleWebTransformCallbacks.IndexHtml));

        var mainBundlePayload = CreatePayload(
            MainBundleTransformId,
            "main.jellyfin.bundle.js",
            nameof(SmartShuffleWebTransformCallbacks.MainBundle));

        registerMethod.Invoke(null, [indexPayload]);
        _logger.LogInformation("SmartShuffle index.html transformation registered.");

        registerMethod.Invoke(null, [mainBundlePayload]);
        _logger.LogInformation("SmartShuffle main bundle transformation registered.");
    }

    private JObject CreatePayload(
        string id,
        string fileNamePattern,
        string callbackMethod)
    {
        JObject payload = new()
        {
            { "id", id },
            { "fileNamePattern", fileNamePattern },
            { "callbackAssembly", GetType().Assembly.FullName },
            { "callbackClass", typeof(SmartShuffleWebTransformCallbacks).FullName },
            { "callbackMethod", callbackMethod }
        };

        return payload;
    }

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        yield return new TaskTriggerInfo
        {
            Type = TaskTriggerInfoType.StartupTrigger
        };
    }
}