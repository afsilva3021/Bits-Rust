// @ts-nocheck
(function exposeBrowserControlMode(root) {
    const INTERACTIVE_HOSTS = [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'google.com',
        'www.google.com',
        'discord.com',
        'www.discord.com'
    ];

    function getHostname(value) {
        try {
            return new URL(String(value || '')).hostname.toLowerCase();
        } catch {
            return '';
        }
    }

    function isInteractiveControllerPage(url) {
        const hostname = getHostname(url);
        return INTERACTIVE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
    }

    function resolveBrowserOpenMode(url, requestedMode = 'internal') {
        if (isInteractiveControllerPage(url)) {
            return 'launcher';
        }

        return requestedMode || 'internal';
    }

    const api = {
        getHostname,
        isInteractiveControllerPage,
        resolveBrowserOpenMode
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    root.BrowserControlMode = api;
})(typeof window !== 'undefined' ? window : globalThis);
