import { request } from './client';
import { relativeLabel, reminderLabel } from './format';

export type PostTarget = {
    platform: string;
    status: string | null;
    url: string | null;
    publishedAt: string | null;
    error: string | null;
};

export type Post = {
    id: string;
    status: string;
    text: string;
    scheduledFor: string | null;
    publishedAt: string | null;
    createdAt: string | null;
    platforms: PostTarget[];
    media: { type: string; url: string }[];
};

export type PostStatus = 'scheduled' | 'published' | 'draft' | 'failed';

export async function listPosts(options: { status?: PostStatus; page?: number; pageSize?: number } = {}): Promise<Post[]> {
    const query = new URLSearchParams();
    if (options.status) query.set('status', options.status);
    if (options.page) query.set('page', String(options.page));
    if (options.pageSize) query.set('pageSize', String(options.pageSize));
    const qs = query.toString();
    const { posts } = await request<{ posts: Post[] }>(`/posts${qs ? `?${qs}` : ''}`);
    return posts;
}

export type PublishInput = {
    text: string;
    /**
     * Channel ids (Zernio account ids), not platform names. A kitchen can hold
     * two Instagram accounts, so "instagram" does not say which one — the
     * studio refuses the request if any id is not connected.
     */
    accountIds: string[];
    status: 'published' | 'scheduled' | 'draft';
    scheduledAt?: string;
    /**
     * Per-platform overrides, keyed by platform — not account, so two
     * Instagram accounts share one Instagram caption. A platform without a
     * `caption` here gets `text`.
     */
    platformSettings?: Record<string, { caption?: string }>;
    /**
     * Uploaded media, in the order it should appear. Each `url` comes back from
     * POST /api/v1/media — the studio stores a reference, so a file has to be
     * uploaded before the post that carries it is created.
     */
    media?: { url: string; type: 'image' | 'video' | 'gif' }[];
};

/** Custom captions as the studio wants them, or nothing when every platform uses the main text. */
export function captionSettings(captions: Record<string, string>): PublishInput['platformSettings'] {
    const entries = Object.entries(captions).filter(([, c]) => c.trim().length > 0);
    return entries.length ? Object.fromEntries(entries.map(([p, c]) => [p, { caption: c.trim() }])) : undefined;
}

/**
 * A fresh idempotency key for one publish ATTEMPT.
 *
 * Not a security token — it only has to be unique per user — so Math.random is
 * enough and the app avoids a crypto dependency for it.
 */
export function newIdempotencyKey(): string {
    const chunk = () => Math.random().toString(36).slice(2, 10);
    return `m-${Date.now().toString(36)}-${chunk()}${chunk()}`;
}

/**
 * Publish, schedule or save a draft — one call, three statuses.
 *
 * The caller owns the key, because only the caller knows whether a second call
 * is a retry of the same attempt (reuse it) or a new decision (mint another).
 */
export async function publishPost(input: PublishInput, idempotencyKey: string): Promise<Post> {
    const { post } = await request<{ post: Post }>('/posts', {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': idempotencyKey },
    });
    return post;
}

/**
 * Edit a draft or a scheduled post — its text, its time, or both.
 *
 * No idempotency key: setting the same text twice is the same result, unlike
 * creating. A published post is refused with a 422 whose message says why.
 */
export async function updatePost(id: string, patch: { text?: string; scheduledFor?: string }): Promise<Post | null> {
    const { post } = await request<{ post: Post | null }>(`/posts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
    });
    return post;
}

export async function deletePost(id: string): Promise<void> {
    await request<{ success: true }>(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * One post by id, when no list on screen already holds it.
 *
 * The studio has no `GET /posts/:id`, so this pages through the kitchen's posts
 * until it turns up. It is the fallback for a calendar row or a deep link — a
 * tap from the posts list never gets here.
 */
export async function findPost(id: string, maxPages = 5): Promise<Post | null> {
    for (let page = 1; page <= maxPages; page++) {
        const posts = await listPosts({ page, pageSize: 100 });
        const hit = posts.find((p) => p.id === id);
        if (hit) return hit;
        if (posts.length < 100) return null;
    }
    return null;
}

/** When a post goes, or went, out — the one line a list row has room for. */
export function postWhenLabel(post: Post): string {
    if (post.status === 'scheduled' && post.scheduledFor) return reminderLabel(post.scheduledFor) ?? 'Scheduled';
    if (post.status === 'published') return relativeLabel(post.publishedAt ?? post.createdAt ?? '') || 'Published';
    if (post.status === 'draft') return 'Draft';
    if (post.status === 'failed') return 'Failed';
    return post.status;
}

/** Newest activity first: when it goes out if scheduled, else when it went out, else when it was made. */
export function postSortKey(post: Post): string {
    return post.scheduledFor ?? post.publishedAt ?? post.createdAt ?? '';
}
