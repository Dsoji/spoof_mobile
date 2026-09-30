/**
 * Registers the URL scheme Google hands an iOS sign-in back to.
 *
 * Google will not redirect an installed app to its own scheme
 * (`spoofkitchen://`); it insists on the reverse-DNS form of the client ID,
 * `com.googleusercontent.apps.<id>`. iOS only routes a scheme that is declared
 * in Info.plist, and `/ios` is generated, so a hand edit would be gone at the
 * next prebuild — hence a plugin.
 *
 * The scheme is derived from EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID rather than
 * written out, because the two must agree exactly: a mismatch fails at the
 * redirect, after the user has already signed in, which is the most confusing
 * place for it to fail. With no client ID set this is a no-op — Google sign-in
 * is hidden in that build anyway (see src/api/social.ts).
 */
const { withInfoPlist } = require('expo/config-plugins');

/** `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc` */
function reversedClientId(clientId) {
    const [id] = clientId.split('.apps.googleusercontent.com');
    return `com.googleusercontent.apps.${id}`;
}

module.exports = function withGoogleSignInScheme(config) {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!clientId) return config;

    if (!clientId.endsWith('.apps.googleusercontent.com')) {
        // Loud rather than silent: the most likely mistake here is pasting the
        // web client ID, or a secret, and either would fail at the redirect.
        throw new Error(
            'with-google-signin-scheme: EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID does not look like a ' +
                'Google client ID (it should end in .apps.googleusercontent.com). It must be the ' +
                'iOS client, not the web one.',
        );
    }

    return withInfoPlist(config, (config) => {
        const scheme = reversedClientId(clientId);
        const urlTypes = config.modResults.CFBundleURLTypes ?? [];

        const already = urlTypes.some((entry) => (entry.CFBundleURLSchemes ?? []).includes(scheme));
        if (!already) {
            urlTypes.push({ CFBundleURLSchemes: [scheme] });
        }

        config.modResults.CFBundleURLTypes = urlTypes;
        return config;
    });
};
