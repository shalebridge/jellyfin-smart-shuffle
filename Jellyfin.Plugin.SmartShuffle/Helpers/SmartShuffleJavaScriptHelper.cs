using System;

namespace Jellyfin.Plugin.SmartShuffle.Helpers;

public static class SmartShuffleJavaScriptHelper
{
    public static readonly string StartComment = "<!-- BEGIN Smart Shuffle Plugin -->";
    public static readonly string EndComment = "<!-- END Smart Shuffle Plugin -->";

    public static string BuildInjectionBlock()
    {
        var timestamp = DateTime.UtcNow.Ticks;

        var publicScriptTag =
            $"<script defer src=\"../SmartShuffle/public.js?v={timestamp}\"></script>";

        var privateScriptLoader = @"
        <script>
            (function() {
                'use strict';
                const fetchPrivateScripts = () => {
                    if (window.ApiClient && typeof window.ApiClient.getCurrentUserId === 'function' && window.ApiClient.getCurrentUserId() && window.ApiClient.serverInfo) {
                        clearInterval(authInterval);

                        ApiClient.fetch({
                            url: ApiClient.getUrl('SmartShuffle/private.js?v=" + timestamp + @"'),
                            type: 'GET',
                            dataType: 'text'
                        }).then(scriptText => {
                            if (scriptText && scriptText.trim().length > 0) {
                                const scriptElement = document.createElement('script');
                                scriptElement.textContent = scriptText;
                                document.head.appendChild(scriptElement);
                                console.log('Smart Shuffle: Private script loaded successfully.');
                            }
                        }).catch(err => {
                            console.error('Smart Shuffle: Failed to load private script.', err);
                        });
                    }
                };

                const authInterval = setInterval(fetchPrivateScripts, 300);
            })();
        </script>";

        var injectionBlock = $@"{StartComment}
        <!-- Injected using file-transformation -->
        {publicScriptTag}
        {privateScriptLoader}
        {EndComment}";

        return injectionBlock;
    }
}