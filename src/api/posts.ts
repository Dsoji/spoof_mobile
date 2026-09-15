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

export async function listPosts(options: { status?: string; page?: number; pageSize?: number } = {}): Promise<Post[]> {
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
    platforms: string[];
    status: 'published' | 'scheduled' | 'draft';
    scheduledAt?: string;
};

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
