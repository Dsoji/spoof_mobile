import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { PillButton, Screen } from '@/components/ui';
import { PREP_GUTTER } from '@/components/Prep';
import { Icon } from '@/components/Icon';
import { Failed, Loading } from '@/components/ListState';
import { toast } from '@/components/Toast';
import { useChannels, meResource } from '@/api/resources';
import { connectLink, planLabel, platformColor, platformMark, PLATFORMS } from '@/api/channels';
import { color, font, radius, text, tone, HIT } from '@/theme';

/** Where the OAuth flow returns to. The studio only accepts the app's own scheme. */
const RETURN_URL = 'spoofkitchen://channels';

/**
 * Connect a channel — reached from compose when there is nothing to post to.
 *
 * Not an onboarding step: connecting needs a paid plan, so it waits until the
 * user wants to post rather than standing between them and the app. It still
 * lives under /onboarding because that is where compose links to. The plan cap
 * is stated here rather than discovered at the moment of failure.
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
                <PillButton
                    label="Done"
                    arrow={false}
                    onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
                />
            }
        >
            <View style={{ paddingHorizontal: PREP_GUTTER }}>
                <Pressable
                    onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={{ width: HIT, height: HIT, borderRadius: HIT / 2, backgroundColor: tone.sand, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Icon name="chevronLeft" size={18} tint={color.ink} weight={2.6} />
                </Pressable>
                <View style={{ paddingTop: 22, gap: 10 }}>
                    <Text style={[text.display, { fontSize: 36, lineHeight: 41 }]}>Plate it somewhere</Text>
                    <Text style={[text.bodyLg, { fontSize: 15, lineHeight: 22 }]}>
                        Connect a channel and you can post straight from your pocket.
                    </Text>
                </View>
                {data ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                        <View style={{ height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: color.ink, justifyContent: 'center' }}>
                            <Text style={[text.badge, { fontSize: 11.5, color: color.white }]}>{`${planLabel(data.plan)} plan`}</Text>
                        </View>
                        <Text style={[text.meta, { fontFamily: font.bold, fontSize: 12.5, color: left === 0 ? color.danger : color.muted }]}>
                            {left === 0 ? 'No slots left — upgrade to connect more' : `${left} ${left === 1 ? 'slot' : 'slots'} left`}
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={{ paddingHorizontal: PREP_GUTTER, paddingTop: 20, gap: 10 }}>
                {channels.status === 'loading' ? <Loading label="Fetching your channels…" /> : null}
                {channels.status === 'error' && !data ? <Failed message={channels.error} onRetry={channels.refresh} /> : null}

                {data
                    ? PLATFORMS.map((p) => {
                          const account = data.channels.find((c) => c.platform === p.key);
                          const connected = Boolean(account);
                          const broken = account ? !account.active : false;
                          // No slot for a new one: say so here, rather than let the
                          // studio refuse it after a trip through the browser.
                          const full = !connected && left === 0;
                          const brand = platformColor(p.key) ?? color.ink;
                          return (
                              <View
                                  key={p.key}
                                  style={{
                                      minHeight: 68,
                                      paddingLeft: 12,
                                      paddingRight: 10,
                                      paddingVertical: 10,
                                      borderRadius: 22,
                                      backgroundColor: color.surface,
                                      borderWidth: 1.5,
                                      borderColor: broken ? color.dangerBorder : connected ? brand : color.hairline,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 12,
                                      opacity: full ? 0.6 : 1,
                                  }}
                              >
                                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: brand, alignItems: 'center', justifyContent: 'center' }}>
                                      <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.white }}>{platformMark(p.key)}</Text>
                                  </View>
                                  <View style={{ flex: 1, gap: 2 }}>
                                      <Text style={{ fontFamily: font.extrabold, fontSize: 15, color: color.ink }}>{p.label}</Text>
                                      <Text
                                          numberOfLines={1}
                                          style={{
                                              fontFamily: font.bold,
                                              fontSize: 12.5,
                                              color: broken ? color.danger : connected ? color.success : color.muted,
                                          }}
                                      >
                                          {broken
                                              ? 'Needs reconnecting'
                                              : connected
                                                ? account?.handle
                                                    ? `@${account.handle.replace(/^@/, '')}`
                                                    : (account?.name ?? 'Connected')
                                                : full
                                                  ? 'Upgrade to add'
                                                  : 'Not connected'}
                                      </Text>
                                  </View>
                                  {connected && !broken ? (
                                      <View style={{ height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: color.successBg, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                          <Text style={[text.badge, { fontSize: 12, color: color.success }]}>Connected</Text>
                                      </View>
                                  ) : (
                                      <Pressable
                                          onPress={() => (full ? router.push('/billing') : void onConnect(p.key))}
                                          disabled={connecting !== null}
                                          accessibilityRole="button"
                                          accessibilityLabel={`${full ? 'Upgrade' : broken ? 'Reconnect' : 'Connect'} ${p.label}`}
                                          style={({ pressed }) => ({
                                              height: HIT,
                                              paddingHorizontal: 16,
                                              borderRadius: radius.pill,
                                              backgroundColor: broken ? color.danger : color.ink,
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              opacity: connecting && connecting !== p.key ? 0.5 : 1,
                                              transform: [{ scale: pressed ? 0.95 : 1 }],
                                          })}
                                      >
                                          <Text style={{ fontFamily: font.extrabold, fontSize: 13.5, color: color.white }}>
                                              {connecting === p.key ? 'Opening…' : full ? 'Upgrade' : broken ? 'Reconnect' : 'Connect'}
                                          </Text>
                                      </Pressable>
                                  )}
                              </View>
                          );
                      })
                    : null}
            </View>
        </Screen>
    );
}
