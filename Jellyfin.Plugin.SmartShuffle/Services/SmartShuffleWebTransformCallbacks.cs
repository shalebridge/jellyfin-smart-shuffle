using Jellyfin.Plugin.SmartShuffle.Helpers;
using Jellyfin.Plugin.SmartShuffle.Model;

namespace Jellyfin.Plugin.SmartShuffle.Services;

public static class SmartShuffleWebTransformCallbacks
{
    public static string IndexHtml(PatchRequestPayload payload)
    {
        var contents = payload.Contents ?? string.Empty;

        if (string.IsNullOrEmpty(contents))
        {
            return contents;
        }

        var injectionBlock = SmartShuffleJavaScriptHelper.BuildInjectionBlock();
        if (contents.Contains("</body>"))
        {
            return contents.Replace("</body>", $"{injectionBlock}</body>");
        }

        return contents;
    }

    public static string MainBundle(PatchRequestPayload payload)
    {
        var contents = payload.Contents ?? string.Empty;

        if (string.IsNullOrEmpty(contents))
        {
            return contents;
        }

        const string marker = "window.PlaybackManager=this.playbackManager";

        if (contents.Contains(marker))
        {
            return contents;
        }

        const string searchText = "this.playbackManager=e,";
        const string replacementText =
            "this.playbackManager=e,window.PlaybackManager=this.playbackManager,";

        if (!contents.Contains(searchText))
        {
            return contents;
        }

        return contents.Replace(searchText, replacementText);
    }
}