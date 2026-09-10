import { Redirect } from 'expo-router';

/**
 * Entry. A real build branches on the session — an onboarded user goes straight
 * to the tabs and never sees the prep questions again, since most sign-ups will
 * have happened on the web first.
 */
export default function Index() {
    return <Redirect href="/welcome" />;
}
