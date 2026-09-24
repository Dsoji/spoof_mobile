import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Badge, Button, Card, Gutter, IconButton, Screen } from '@/components/ui';
import { Empty, Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { isPast, WhenPicker } from '@/components/WhenPicker';
import { replaceCachedPost, usePost } from '@/api/resources';
import { deletePost, updatePost, postWhenLabel, type Post, type PostTarget } from '@/api/posts';
import { platformLabel } from '@/api/channels';
import { relativeLabel, reminderDetail } from '@/api/format';
import { color, font, radius, text, HIT } from '@/theme';

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    published: 'Published',
    failed: 'Failed',
};

/**
 * One post: what it says, where it went, and — for a draft or a scheduled
 * post — changing it.
 *
 * Published posts are read-only. Zernio refuses edits and deletes on them, and
 * a button that always fails is worse than none.
 */
export default function PostDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { post, status, error, refresh } = usePost(id);
    const [deleting, setDeleting] = useState(false);

    if (!post) {
        return (
            <Screen>
                <Gutter>
                    <IconButton name="chevronLeft" onPress={() => router.back()} />
                </Gutter>
                <Gutter style={{ paddingTop: 40 }}>
                    {status === 'loading' || status === 'idle' ? <Loading label="Fetching that post…" /> : null}
                    {status === 'error' ? <Failed message={error} onRetry={refresh} /> : null}
                    {status === 'ready' ? (
                        <Empty icon="send" title="Post not found" body="It may have been deleted." />
                    ) : null}
                </Gutter>
            </Screen>
        );
    }

    const editable = post.status === 'draft' || post.status === 'scheduled';

    const onDelete = () => {
        if (deleting) return;
        Alert.alert(
            post.status === 'scheduled' ? 'Cancel this post?' : 'Delete this post?',
            post.status === 'scheduled' ? 'It won’t go out, and this cannot be undone.' : 'This cannot be undone.',
            [
                { text: 'Keep it', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await deletePost(post.id);
                            router.back();
                            // After leaving, so this screen does not flash "not found".
                            replaceCachedPost(post.id, null);
                            toast('Deleted.', 'success');
                        } catch (e) {
                            setDeleting(false);
                            toast(e instanceof Error ? e.message : 'Could not delete that post.');
                        }
                    },
                },
            ],
        );
    };

    const footer =
        post.status === 'draft' ? (
            <Button
                label="Edit draft"
                icon="file"
                onPress={() =>
                    router.push({ pathname: '/compose', params: { text: post.text, postId: post.id, postStatus: 'draft' } })
                }
            />
        ) : post.status === 'scheduled' ? (
            <Button
                label="Edit text"
                variant="secondary"
                onPress={() =>
                    router.push({ pathname: '/compose', params: { text: post.text, postId: post.id, postStatus: 'scheduled' } })
                }
            />
        ) : post.status === 'failed' ? (
            // A failed post cannot be retried in place — Zernio has no resend —
            // so trying again is a new post with the same words.
            <Button label="Post it again" icon="repeat" onPress={() => router.push({ pathname: '/compose', params: { text: post.text } })} />
        ) : undefined;

    return (
        <Screen scroll footer={footer}>
            <Gutter style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <IconButton name="chevronLeft" onPress={() => router.back()} />
                {post.status !== 'published' ? (
                    <IconButton
                        name="trash"
                        tint={deleting ? color.inactiveFg : color.danger}
                        onPress={deleting ? undefined : onDelete}
                    />
                ) : null}
            </Gutter>

            <Gutter style={{ paddingTop: 26, gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Badge
                        tone={post.status === 'published' ? 'success' : post.status === 'scheduled' ? 'brand' : 'neutral'}
                    >
                        {STATUS_LABEL[post.status] ?? post.status}
                    </Badge>
                    <Text style={[text.meta, { fontFamily: font.semibold }]}>{bylineOf(post)}</Text>
                </View>
                <Text style={{ fontFamily: font.medium, fontSize: 19, lineHeight: 28, color: color.ink }}>
                    {post.text || 'Untitled post'}
                </Text>
            </Gutter>

            {post.status === 'scheduled' ? <Reschedule post={post} /> : null}

            <Gutter style={{ paddingTop: 26, gap: 9 }}>
                <Text style={text.eyebrow}>{post.status === 'published' ? 'Went to' : 'Going to'}</Text>
                {post.platforms.map((t, i) => (
                    <TargetRow key={`${t.platform}-${i}`} target={t} />
                ))}
            </Gutter>

            {editable ? null : (
                <Gutter style={{ paddingTop: 16 }}>
                    <Text style={[text.meta, { fontFamily: font.medium }]}>
                        {post.status === 'published'
                            ? 'Published posts can’t be edited from here.'
                            : 'Failed posts can’t be edited — post it again instead.'}
                    </Text>
                </Gutter>
            )}
        </Screen>
    );
}

function bylineOf(post: Post): string {
    if (post.status === 'published') return relativeLabel(post.publishedAt ?? post.createdAt ?? '');
    if (post.status === 'draft') return post.createdAt ? `Saved ${relativeLabel(post.createdAt).toLowerCase()}` : '';
    return postWhenLabel(post) === STATUS_LABEL[post.status] ? '' : postWhenLabel(post);
}

/** When a scheduled post goes out, and changing it. */
function Reschedule({ post }: { post: Post }) {
    const current = post.scheduledFor ? new Date(post.scheduledFor) : new Date();
    const [open, setOpen] = useState(false);
    const [when, setWhen] = useState(current);
    const [saving, setSaving] = useState(false);

    const onSave = async () => {
        if (saving) return;
        if (isPast(when)) {
            toast('That time has already passed. Pick a time in the future.');
            return;
        }
        setSaving(true);
        try {
            const updated = await updatePost(post.id, { scheduledFor: when.toISOString() });
            replaceCachedPost(post.id, updated ?? { ...post, scheduledFor: when.toISOString() });
            setOpen(false);
            toast('Rescheduled.', 'success');
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not reschedule.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Gutter style={{ paddingTop: 24 }}>
            <Card padded={0}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 15, gap: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                        <View
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                backgroundColor: color.brandTint,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Icon name="clock" size={19} tint={color.brand} weight={2.1} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={text.label}>{reminderDetail(post.scheduledFor) ?? 'No time set'}</Text>
                            <Text style={[text.meta, { fontFamily: font.medium }]}>Your queue posts it for you</Text>
                        </View>
                        <Pressable
                            onPress={() => {
                                setWhen(current);
                                setOpen(!open);
                            }}
                            style={{ minHeight: HIT, justifyContent: 'center', paddingHorizontal: 4 }}
                        >
                            <Text style={[text.link, { fontSize: 13 }]}>{open ? 'Cancel' : 'Change'}</Text>
                        </Pressable>
                    </View>
                    {open ? (
                        <>
                            <WhenPicker value={when} onChange={setWhen} />
                            <Button label="Save new time" height={48} loading={saving} onPress={onSave} />
                        </>
                    ) : null}
                </View>
            </Card>
        </Gutter>
    );
}

/** One platform the post targets: its own status, its link once live, and why it failed if it did. */
function TargetRow({ target }: { target: PostTarget }) {
    const failed = target.status === 'failed' || Boolean(target.error);
    const live = Boolean(target.url);

    return (
        <Pressable disabled={!live} onPress={() => target.url && void Linking.openURL(target.url)}>
            <Card padded={0} style={failed ? { borderColor: color.dangerBorder } : undefined}>
                <View style={{ minHeight: 58, paddingHorizontal: 15, paddingVertical: 13, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                        <View
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: radius.pill,
                                backgroundColor: failed ? color.dangerBg : color.field,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Text style={{ fontFamily: font.extrabold, fontSize: 12, color: failed ? color.danger : color.subtle }}>
                                {platformLabel(target.platform).charAt(0)}
                            </Text>
                        </View>
                        <Text style={[text.label, { flex: 1 }]}>{platformLabel(target.platform)}</Text>
                        {target.status ? (
                            <Text
                                style={{
                                    fontFamily: font.bold,
                                    fontSize: 12,
                                    color: failed ? color.danger : color.muted,
                                }}
                            >
                                {target.status.charAt(0).toUpperCase() + target.status.slice(1)}
                            </Text>
                        ) : null}
                        {live ? <Icon name="external" size={15} tint={color.inactiveFg} weight={2.2} /> : null}
                    </View>
                    {target.error ? (
                        <Text style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: color.danger }}>
                            {target.error}
                        </Text>
                    ) : null}
                </View>
            </Card>
        </Pressable>
    );
}
