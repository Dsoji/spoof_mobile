import { createResource, createResourceFamily, useResource } from './resource';
import { getMe } from './me';
import { listKitchens } from './workspaces';
import { listChannels } from './channels';
import { listPosts } from './posts';
import { getCalendar } from './calendar';
import { getActivity } from './activity';

/**
 * The app's shared data, one resource each.
 *
 * Scope is the question "does switching kitchens change this?" — me, channels,
 * posts and the calendar belong to a kitchen; the kitchen list and the activity
 * graph belong to the person.
 */

export const meResource = createResource(getMe, { scope: 'workspace' });
export const kitchensResource = createResource(listKitchens, { scope: 'user' });
export const channelsResource = createResource(listChannels, { scope: 'workspace' });
export const recentPostsResource = createResource(() => listPosts({ pageSize: 10 }), { scope: 'workspace' });
export const activityResource = createResource(getActivity, { scope: 'user' });

/** Keyed `${from}_${to}`, one per month viewed. */
export const calendarFamily = createResourceFamily((key) => {
    const [from, to] = key.split('_');
    return getCalendar(from, to);
}, { scope: 'workspace' });

export const useMe = () => useResource(meResource);
export const useKitchens = () => useResource(kitchensResource);
export const useChannels = () => useResource(channelsResource);
export const useRecentPosts = () => useResource(recentPostsResource);
export const useActivity = () => useResource(activityResource);
export const useCalendar = (from: string, to: string) => useResource(calendarFamily.get(`${from}_${to}`));

/** After a publish, everything that shows posts or counts them is stale. */
export function refreshAfterPublish() {
    void recentPostsResource.refresh();
    void activityResource.refresh();
    calendarFamily.refreshLoaded();
}
