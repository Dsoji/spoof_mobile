import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { createResource, createResourceFamily, useResource } from './resource';
import { getMe } from './me';
import { listKitchens } from './workspaces';
import { listChannels } from './channels';
import { findPost, listPosts, type Post, type PostStatus } from './posts';
import { getCalendar } from './calendar';
import { getActivity } from './activity';
import { groupPosts, listComments, listCommentedPosts, listConversations, listMessages, type PostGroup } from './inbox';

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
/** The Chat tab's two lists. Kitchen-scoped: switching kitchens is switching inboxes. */
export const conversationsResource = createResource(listConversations, { scope: 'workspace' });
export const commentedPostsResource = createResource(listCommentedPosts, { scope: 'workspace' });

/** Keyed `${accountId}|${conversationId}` — a conversation id is only unique within its account. */
export const messagesFamily = createResourceFamily((key) => {
    const [accountId, conversationId] = key.split('|');
    return listMessages(conversationId, accountId);
}, { scope: 'workspace' });

/** Keyed `${accountId}|${postId}`: one platform post's comments. */
export const commentsFamily = createResourceFamily((key) => {
    const [accountId, postId] = key.split('|');
    return listComments(postId, accountId);
}, { scope: 'workspace' });

/** A page of the posts list, and whether another one might follow. */
export type PostPage = { posts: Post[]; page: number; more: boolean };

export type PostFilter = PostStatus | 'all';

const POSTS_PAGE = 20;

async function postsPage(filter: PostFilter, page: number): Promise<PostPage> {
    const posts = await listPosts({ status: filter === 'all' ? undefined : filter, page, pageSize: POSTS_PAGE });
    return { posts, page, more: posts.length === POSTS_PAGE };
}

/** The posts screen, one list per status filter. Starts at page 1; `loadMorePosts` appends. */
export const postsFamily = createResourceFamily((filter) => postsPage(filter as PostFilter, 1), { scope: 'workspace' });

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
export const useConversations = () => useResource(conversationsResource);
export const useCommentedPosts = () => useResource(commentedPostsResource);
export const useMessages = (accountId: string, conversationId: string) => useResource(messagesFamily.get(`${accountId}|${conversationId}`));

/** A post group from the loaded Comments list, for the post screen opened from it. */
export function findPostGroup(key: string): PostGroup | undefined {
    const data = commentedPostsResource.getState().data;
    if (!data || data.locked) return undefined;
    return groupPosts(data.items).find((g) => g.key === key);
}
export const usePosts = (filter: PostFilter) => useResource(postsFamily.get(filter));
export const useCalendar = (from: string, to: string) => useResource(calendarFamily.get(`${from}_${to}`));

/**
 * The next page of one filter's list, appended to what is on screen.
 *
 * A post that moved between pages since the first load — something published
 * in the meantime shifts everything down one — would otherwise appear twice.
 */
export async function loadMorePosts(filter: PostFilter): Promise<void> {
    const resource = postsFamily.get(filter);
    const current = resource.getState().data;
    if (!current?.more) return;

    const next = await postsPage(filter, current.page + 1);
    resource.mutate((data) => {
        if (!data) return data;
        const seen = new Set(data.posts.map((p) => p.id));
        return { posts: [...data.posts, ...next.posts.filter((p) => !seen.has(p.id))], page: next.page, more: next.more };
    });
}

/**
 * Posts looked up one at a time, for a screen opened on a post no list holds —
 * a calendar row, or a deep link. Only fetched when `cachedPost` comes up empty.
 */
const postByIdFamily = createResourceFamily((id) => findPost(id), { scope: 'workspace' });

/** A post from whichever loaded list already holds it — Home's, any filter's, or a lookup's. */
export function cachedPost(id: string): Post | undefined {
    const recent = recentPostsResource.getState().data?.find((p) => p.id === id);
    if (recent) return recent;
    for (const r of postsFamily.members()) {
        const hit = r.getState().data?.posts.find((p) => p.id === id);
        if (hit) return hit;
    }
    return postByIdFamily.get(id).getState().data ?? undefined;
}

/**
 * One post, kept current: an edit made anywhere shows up here without a refetch.
 *
 * `status` is the lookup's, and only matters when no list had the post —
 * 'ready' with no post means it is gone.
 */
export function usePost(id: string) {
    const lookup = postByIdFamily.get(id);

    const subscribe = useCallback(
        (listener: () => void) => {
            const offs = [recentPostsResource, ...postsFamily.members(), lookup].map((r) => r.subscribe(listener));
            return () => offs.forEach((off) => off());
        },
        [lookup],
    );
    const snapshot = useCallback(() => cachedPost(id), [id]);
    const post = useSyncExternalStore(subscribe, snapshot);
    const state = useSyncExternalStore(lookup.subscribe, lookup.getState);

    useEffect(() => {
        if (!cachedPost(id) && lookup.getState().status === 'idle') void lookup.refresh();
    }, [id, lookup]);

    return { post, status: post ? 'ready' : state.status, error: state.error, refresh: lookup.refresh };
}

/**
 * Apply an edit or a delete to every list holding that post, immediately.
 *
 * Then refetch, because an edit can move a post between lists — a reschedule
 * reorders the scheduled list, and the calendar needs the new day.
 */
export function replaceCachedPost(id: string, next: Post | null) {
    const swap = (posts: Post[]) =>
        next ? posts.map((p) => (p.id === id ? next : p)) : posts.filter((p) => p.id !== id);

    recentPostsResource.mutate((data) => (data ? swap(data) : data));
    for (const r of postsFamily.members()) {
        r.mutate((data) => (data ? { ...data, posts: swap(data.posts) } : data));
    }
    for (const r of postByIdFamily.members()) {
        r.mutate((data) => (data?.id === id ? next : data));
    }
    refreshAfterPublish();
}

/** After a publish, everything that shows posts or counts them is stale. */
export function refreshAfterPublish() {
    void recentPostsResource.refresh();
    postsFamily.refreshLoaded();
    void activityResource.refresh();
    calendarFamily.refreshLoaded();
}
