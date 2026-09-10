import { Redirect } from 'expo-router';

import { useSession } from '@/api/useSession';

/**
 * Entry.
 *
 * Branches on the session, so a returning user goes straight to the tabs and
 * never sees the prep questions again — most sign-ups happen on the web first.
 * Renders nothing while the keychain read is in flight rather than redirecting
 * to /welcome and back, which is visible as a flash.
 */
export default function Index() {
    const status = useSession();

    if (status === 'loading') return null;
    return <Redirect href={status === 'signedIn' ? '/(tabs)' : '/welcome'} />;
}
