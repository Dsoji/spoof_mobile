import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Badge, Button, Card, Gutter, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { useChannels, meResource } from '@/api/resources';
import { connectLink, planLabel, PLATFORMS } from '@/api/channels';
import { color, font, radius, space, text, HIT } from '@/theme';

/** Where the OAuth flow returns to. The studio only accepts the app's own scheme. */
const RETURN_URL = 'spoofkitchen://channels';

/**
 * The hand-off out of onboarding, and the place to connect a channel later.
 *
 * Without one connected channel the app cannot post, which is the whole point
 * of it. The plan cap is stated here rather than discovered at the moment of
 * failure.
 */
export default function Channels() {
    const channels = useChannels();
    const [connecting, setConnecting] = useState<string | null>(null);

    const data = channels.data;
    const left = data ? Math.max(0, data.cap - data.used) : null;

    const onConnect = async (platform: string) => {
        if (connecting) return;
        setConnecting(platform);
        try {
            const url = await connectLink(platform, RETURN_URL);
            // An auth session rather than a plain browser tab: it closes itself
            // when the flow redirects to RETURN_URL, and it shares no cookies
            // with Safari, so an OAuth consent here cannot be mistaken for an
            // already-signed-in browser.
            await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
        } catch (e) {
            toast(e instanceof Error ? e.message : 'Could not start connecting.');
        } finally {
            setConnecting(null);
            // Refetch however the browser closed. If the platform's flow cannot
            // redirect to a custom scheme the user dismisses the sheet by hand,
            // and the connection may still have gone through.
            void channels.refresh();
            void meResource.refresh();
        }
    };

    return (
        <Screen
            scroll
            footer={
                <>
                    <Button label="Into the kitchen →" onPress={() => router.replace('/(tabs)')} />
                    <Pressable
                        onPress={() => router.replace('/(tabs)')}
                        style={{ minHeight: HIT, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Text style={[text.meta, { fontFamily: font.bold, fontSize: 14 }]}>Skip for now</Text>
                    </Pressable>
                </>
            }
        >
            <Gutter style={{ paddingHorizontal: space.xxl, gap: 12 }}>
                <Text style={text.display}>Plate it somewhere</Text>
                <Text style={[text.bodyLg, { fontSize: 15.5, lineHeight: 23 }]}>
                    Connect at least one channel and you can post straight from your pocket.
                </Text>
                {data ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 }}>
                        <Badge>{`${planLabel(data.plan)} plan`}</Badge>
                        <Text style={[text.meta, { fontFamily: font.semibold }]}>
                            {left === 0
                                ? 'No slots left — upgrade to connect more'
                                : `${left} ${left === 1 ? 'slot' : 'slots'} left`}
                        </Text>
                    </View>
                ) : null}
            </Gutter>

            <Gutter style={{ paddingHorizontal: space.xxl, paddingTop: 24, gap: 9 }}>
                {channels.status === 'loading' ? <Loading label="Fetching your channels…" /> : null}
                {channels.status === 'error' && !data ? <Failed message={channels.error} onRetry={channels.refresh} /> : null}

                {data
                    ? PLATFORMS.map((p) => {
                          const account = data.channels.find((c) => c.platform === p.key);
                          const connected = Boolean(account);
                          const broken = account ? !account.active : false;
                          return (
                              <Card key={p.key} padded={0}>
                                  <View
                                      style={{
                                          minHeight: 68,
                                          paddingHorizontal: 14,
                                          paddingVertical: 12,
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          gap: 13,
                                      }}
                                  >
                                      <View
                                          style={{
                                              width: 42,
                                              height: 42,
                                              borderRadius: radius.field,
                                              backgroundColor: connected ? color.brandTint : color.field,
                                              borderWidth: 1,
                                              borderColor: color.hairline,
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                          }}
                                      >
                                          {/* Placeholder monogram — swap for each platform's official mark. */}
                                          <Text
                                              style={{
                                                  fontFamily: font.extrabold,
                                                  fontSize: 14,
                                                  color: connected ? color.brand : color.subtle,
                                              }}
                                          >
                                              {p.label.charAt(0)}
                                          </Text>
                                      </View>
                                      <View style={{ flex: 1, gap: 3 }}>
                                          <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>{p.label}</Text>
                                          <Text
                                              numberOfLines={1}
                                              style={{
                                                  fontFamily: font.semibold,
                                                  fontSize: 12,
                                                  color: broken ? color.danger : connected ? color.success : color.subtle,
                                              }}
                                          >
                                              {broken
                                                  ? 'Needs reconnecting'
                                                  : connected
                                                    ? account?.handle
                                                        ? `@${account.handle.replace(/^@/, '')}`
                                                        : (account?.name ?? 'Connected')
                                                    : 'Not connected'}
                                          </Text>
                                      </View>
                                      {connected && !broken ? (
                                          <View
                                              style={{
                                                  width: 26,
                                                  height: 26,
                                                  borderRadius: 13,
                                                  backgroundColor: color.successBg,
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                              }}
                                          >
                                              <Icon name="check" size={14} tint={color.success} weight={3} />
                                          </View>
                                      ) : (
                                          <Pressable
                                              onPress={() => void onConnect(p.key)}
                                              disabled={connecting !== null}
                                              style={{
                                                  height: HIT,
                                                  paddingHorizontal: 18,
                                                  borderRadius: radius.pill,
                                                  backgroundColor: color.ink,
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  opacity: connecting && connecting !== p.key ? 0.5 : 1,
                                              }}
                                          >
                                              <Text style={{ fontFamily: font.extrabold, fontSize: 13.5, color: color.cream }}>
                                                  {connecting === p.key ? 'Opening…' : broken ? 'Reconnect' : 'Connect'}
                                              </Text>
                                          </Pressable>
                                      )}
                                  </View>
                              </Card>
                          );
                      })
                    : null}
            </Gutter>
        </Screen>
    );
}
