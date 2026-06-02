(function () {
    'use strict';

    const BUTTON_ID = 'smartShuffleOwnButton';
    const STYLE_ID = 'smartShuffleStyles';

    function isDetailsPage() {
        const hash = (window.location.hash || '').toLowerCase();
    
        return hash.includes('details') && hash.includes('id=');
    }
    
    function isBlockedPage() {
        const hash = (window.location.hash || '').toLowerCase();
    
        return hash.includes('livetv')
            || hash.includes('guide')
            || hash.includes('videoosd')
            || hash.includes('livetvchannels')
            || hash.includes('recordings');
    }

    function ensureStyles() {
        if (document.querySelector('#' + STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .smartShuffleButton {
                margin-left: 0.5em;
                border-radius: 1000px;
                font-weight: 600;
                letter-spacing: 0.02em;
            }
        `;

        document.head.appendChild(style);
    }

    function getItemIdFromHash() {
        const hash = window.location.hash || '';
        const q = hash.indexOf('?');

        if (q === -1) {
            return null;
        }

        const params = new URLSearchParams(hash.substring(q + 1));
        return params.get('id');
    }

    function getButtonContainer() {
        return document.querySelector('.page:not(.hide) .mainDetailButtons')
            || document.querySelector('.page:not(.hide) .detailPagePrimaryContainer')
            || document.querySelector('.page:not(.hide) .itemDetailPage')
            || document.querySelector('.mainDetailButtons')
            || document.querySelector('.detailPagePrimaryContainer')
            || document.querySelector('.itemDetailPage');
    }

    function getResponseValue(response, camelName, pascalName) {
        if (!response) {
            return undefined;
        }
    
        return response[camelName] !== undefined && response[camelName] !== null
            ? response[camelName]
            : response[pascalName];
    }

    function removeButton() {
        var buttons = document.querySelectorAll('#' + BUTTON_ID);
    
        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
    
            if (button && button.parentNode) {
                button.parentNode.removeChild(button);
            }
        }
    }

    async function getSmartShuffleScope(apiClient) {
        const currentItemId = getItemIdFromHash();

        if (!currentItemId) {
            return null;
        }

        const userId = apiClient.getCurrentUserId();
        const item = await apiClient.getItem(userId, currentItemId);

        if (!item || !item.Type) {
            return null;
        }

        if (item.Type === 'Series') {
            return { scopeId: item.Id, scopeType: 'series', title: item.Name || item.Id };
        }

        if (item.Type === 'Season') {
            return { scopeId: item.Id, scopeType: 'season', title: item.Name || item.Id };
        }

        if (item.Type === 'Episode' && item.SeriesId) {
            return {
                scopeId: item.SeriesId,
                scopeType: 'series',
                title: item.SeriesName || item.Name || item.SeriesId
            };
        }

        if (item.Type === 'Playlist') {
            return { scopeId: item.Id, scopeType: 'playlist', title: item.Name || item.Id };
        }

        if (item.Type === 'BoxSet') {
            return { scopeId: item.Id, scopeType: 'collection', title: item.Name || item.Id };
        }

        return null;
    }

    async function smartShuffle() {
        if (!isDetailsPage() || isBlockedPage()) {
            return;
        }

        const apiClient = window.ApiClient;
        const playbackManager = window.PlaybackManager;

        if (!apiClient) {
            alert('Smart Shuffle: ApiClient not found.');
            return;
        }

        if (!playbackManager || typeof playbackManager.play !== 'function') {
            alert('Smart Shuffle: PlaybackManager not available yet.');
            return;
        }

        try {
            const userId = apiClient.getCurrentUserId();
            const scope = await getSmartShuffleScope(apiClient);

            if (!scope || !scope.scopeId) {
                alert('Smart Shuffle is only available for series, seasons, episodes, collections, and playlists.');
                return;
            }

            const params = new URLSearchParams();
            params.set('userId', userId);
            params.set('scopeId', scope.scopeId);
            params.set('scopeType', scope.scopeType);

            const url = apiClient.getUrl('SmartShuffle/Queue?' + params.toString());

            const response = await apiClient.ajax({
                type: 'POST',
                url: url,
                dataType: 'json'
            });

            const itemIds = getResponseValue(response, 'itemIds', 'ItemIds');

            if (!itemIds || !itemIds.length) {
                alert('Smart Shuffle: No playable items returned.');
                return;
            }

            await playbackManager.play({
                ids: itemIds,
                serverId: apiClient.serverId ? apiClient.serverId() : undefined,
                startPositionTicks: 0,
                isMuted: false,
                isPaused: false,
                autoplay: true
            });
        } catch (err) {
            console.error('Smart Shuffle failed:', err);
            alert('Smart Shuffle failed. Check browser console / Jellyfin logs.');
        }
    }

    async function addButton() {
        if (!isDetailsPage() || isBlockedPage()) {
            removeButton();
            return;
        }

        const apiClient = window.ApiClient;

        if (!apiClient) {
            return;
        }

        const container = getButtonContainer();

        if (!container) {
            return;
        }

        let scope = null;

        try {
            scope = await getSmartShuffleScope(apiClient);
        } catch (err) {
            console.warn('Smart Shuffle could not inspect current item:', err);
            removeButton();
            return;
        }

        if (!scope) {
            removeButton();
            return;
        }

        if (document.querySelector('#' + BUTTON_ID)) {
            return;
        }

        ensureStyles();

        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        button.className = 'emby-button raised button-submit smartShuffleButton';
        button.textContent = 'Smart Shuffle';   // 🔀
        button.title = 'Smart Shuffle ' + scope.title;
        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            smartShuffle();
        });

        container.appendChild(button);
    }

    function routeChanged() {
        removeButton();
        schedule();
    }

    window.addEventListener('hashchange', routeChanged);
    window.addEventListener('popstate', routeChanged);
    window.addEventListener('pageshow', routeChanged);
    document.addEventListener('visibilitychange', routeChanged);

    let scheduleTimer = null;

    function schedule() {
        if (scheduleTimer) {
            clearTimeout(scheduleTimer);
        }
    
        scheduleTimer = setTimeout(function () {
            scheduleTimer = null;
    
            addButton();
            setTimeout(addButton, 750);
            setTimeout(addButton, 1500);
            setTimeout(addButton, 3000);
        }, 250);
    }
    
    const observer = new MutationObserver(function () {
        if (!isDetailsPage() || isBlockedPage()) {
            removeButton();
            return;
        }
    
        if (document.querySelector('#' + BUTTON_ID)) {
            return;
        }
    
        schedule();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    schedule();
})();