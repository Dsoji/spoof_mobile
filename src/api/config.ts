import Constants from 'expo-constants';

/**
 * Where the studio lives.
 *
 * A phone is not the machine running the dev server, so `localhost` resolves to
 * the phone itself and every request fails with a connection refused that reads
 * like a server bug. On a simulator localhost does work, which is exactly what
 * makes this worth being explicit about — it breaks the moment anyone opens the
 * app on real hardware.
 *
 * Order of preference:
 *   1. EXPO_PUBLIC_API_URL, when set — the only option in a release build.
 *   2. The host Metro itself is being served from, in development. That is the
 *      dev machine's LAN address, which is reachable from both a simulator and
 *      a phone on the same network.
 *   3. localhost, as a last resort for the simulator.
 */
function devHost(): string | null {
    // e.g. "192.168.1.20:8081" — the address Metro told the client to connect to.
    const hostUri = Constants.expoConfig?.hostUri ?? null;
    if (!hostUri) return null;
    return hostUri.split(':')[0];
}

export const API_URL: string = (() => {
    const configured = process.env.EXPO_PUBLIC_API_URL;
    if (configured) return configured.replace(/\/$/, '');

    if (__DEV__) {
        const host = devHost();
        if (host) return `http://${host}:3000`;
    }
    return 'http://localhost:3000';
})();

export const API_BASE = `${API_URL}/api/v1`;
