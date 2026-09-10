import { useEffect, useState } from 'react';

import { getToken, peekToken, subscribeToSession } from './session';

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

/**
 * Whether there is a token, as a rendering concern.
 *
 * 'loading' is a real state and not a formality: the token lives in the
 * keychain, so the first read is async. Collapsing it into 'signedOut' would
 * bounce every returning user through the welcome screen for a frame before
 * throwing them back — the classic auth flash.
 */
export function useSession(): SessionStatus {
    const [status, setStatus] = useState<SessionStatus>(() => {
        const known = peekToken();
        if (known === undefined) return 'loading';
        return known ? 'signedIn' : 'signedOut';
    });

    useEffect(() => {
        let active = true;

        const sync = () => {
            void getToken().then((token) => {
                if (active) setStatus(token ? 'signedIn' : 'signedOut');
            });
        };

        const unsubscribe = subscribeToSession(sync);
        sync();

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    return status;
}
