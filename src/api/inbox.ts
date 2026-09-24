import { ApiError, request } from './client';

/**
 * The community inbox — DMs and comments across the kitchen's connected
 * accounts. Backed by the studio's /api/v1/inbox/* routes
 * (src/lib/services/inbox.ts there).
 *
 * The inbox is a Pro feature and the studio answers 402 below Pro. A resource
 * keeps only an error's message, not its status, so the list fetchers turn that
 * one refusal into data — `{ locked }` — and the Chat tab can show "see Pro"
 * rather than "something went wrong".
 */

export type Conversation = {
    id: string;
    accountId: string;
    platform: string;
    participantName: string;
    participantPicture: string | null;
    lastMessage: string;
    updatedAt: string | null;
    unreadCount: number;
    url: string | null;
};

export type Message = {
    id: string;
    text: string;
    direction: 'incoming' | 'outgoing';
    senderName: string | null;
    createdAt: string | null;
    attachments: { type: string; url: string; previewUrl: string | null }[];
};

/** One PLATFORM post with comments. The same post on three platforms is three of these. */
export type CommentedPost = {
    id: string;
    accountId: string;
    platform: string;
    accountUsername: string | null;
    text: string;
    picture: string | null;
    permalink: string | null;
    createdAt: string | null;
    commentCount: number;
    likeCount: number;
};

export type Comment = {
    id: string;
    text: string;
    createdAt: string | null;
    authorName: string;
    authorPicture: string | null;
    isOwner: boolean;
    platform: string;
    parentId: string | null;
    replyCount: number;
    likeCount: number;
    canReply: boolean;
    canLike: boolean;
    canHide: boolean;
    isHidden: boolean;
    isLiked: boolean;
    cid: string | null;
    likeUri: string | null;
    url: string | null;
    replies: Comment[];
};

/** A list, or the plan's refusal to show one. `failedAccounts` names platforms that could not be reached this time. */
export type InboxList<T> = { locked: false; items: T[]; failedAccounts: string[] } | { locked: true; message: string };

async function listOrLocked<T>(load: () => Promise<{ items: T[]; failedAccounts: string[] }>): Promise<InboxList<T>> {
    try {
        return { locked: false, ...(await load()) };
    } catch (e) {
        if (e instanceof ApiError && e.status === 402) return { locked: true, message: e.message };
        throw e;
    }
}

export const listConversations = () =>
    listOrLocked(async () => {
        const res = await request<{ conversations: Conversation[]; failedAccounts: string[] }>('/inbox/conversations');
        return { items: res.conversations, failedAccounts: res.failedAccounts ?? [] };
    });

export const listCommentedPosts = () =>
    listOrLocked(async () => {
        const res = await request<{ posts: CommentedPost[]; failedAccounts: string[] }>('/inbox/posts');
        return { items: res.posts, failedAccounts: res.failedAccounts ?? [] };
    });

export async function listMessages(conversationId: string, accountId: string): Promise<Message[]> {
    const { messages } = await request<{ messages: Message[] }>(
        `/inbox/conversations/${encodeURIComponent(conversationId)}/messages?accountId=${encodeURIComponent(accountId)}`,
    );
    return messages;
}

export async function sendMessage(conversationId: string, accountId: string, message: string): Promise<void> {
    await request(`/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        body: { accountId, message },
    });
}

export async function listComments(postId: string, accountId: string): Promise<Comment[]> {
    const { comments } = await request<{ comments: Comment[] }>(
        `/inbox/posts/${encodeURIComponent(postId)}/comments?accountId=${encodeURIComponent(accountId)}`,
    );
    return comments;
}

/** A public reply to `commentId` — or, with none, the kitchen's own comment on the post. */
export async function reply(postId: string, accountId: string, message: string, commentId?: string): Promise<void> {
    await request(`/inbox/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        body: { accountId, message, ...(commentId ? { commentId } : {}) },
    });
}

/** A DM to the comment's author. Instagram and Facebook only, once per comment, within 7 days. */
export async function privateReply(postId: string, commentId: string, accountId: string, message: string): Promise<void> {
    await request(`/inbox/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/private-reply`, {
        method: 'POST',
        body: { accountId, message },
    });
}

export async function setLiked(postId: string, comment: Comment, accountId: string, liked: boolean): Promise<void> {
    await request(`/inbox/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(comment.id)}/like`, {
        method: liked ? 'POST' : 'DELETE',
        body: { accountId, ...(comment.cid ? { cid: comment.cid } : {}), ...(comment.likeUri ? { likeUri: comment.likeUri } : {}) },
    });
}

export async function setHidden(postId: string, commentId: string, accountId: string, hidden: boolean): Promise<void> {
    await request(`/inbox/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/hide`, {
        method: hidden ? 'POST' : 'DELETE',
        body: { accountId },
    });
}

/** Platforms that allow a private reply to a comment. */
export const PRIVATE_REPLY_PLATFORMS = ['instagram', 'facebook'];

/**
 * The same post, as published to several platforms, is several platform posts
 * with nothing linking them. Group by identical text so a post sent to three
 * platforms reads as one post with three tabs; a text-less post (a photo with
 * no caption) stays on its own, since there is nothing to match it on.
 */
export type PostGroup = { key: string; text: string; picture: string | null; createdAt: string | null; entries: CommentedPost[] };

export function groupPosts(posts: CommentedPost[]): PostGroup[] {
    const groups = new Map<string, PostGroup>();
    for (const p of posts) {
        const text = p.text.trim();
        const key = text ? `t:${text}` : `p:${p.platform}:${p.id}`;
        const g = groups.get(key);
        if (g) {
            g.entries.push(p);
            g.picture ??= p.picture;
            if ((p.createdAt ?? '') > (g.createdAt ?? '')) g.createdAt = p.createdAt;
        } else {
            groups.set(key, { key, text, picture: p.picture, createdAt: p.createdAt, entries: [p] });
        }
    }
    return [...groups.values()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}
