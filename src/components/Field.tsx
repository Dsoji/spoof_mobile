import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { color, font, radius, text } from '@/theme';

/**
 * A labelled text input.
 *
 * 56pt tall to match Button, so a field stacked above a CTA reads as one
 * column rather than two sizes — and comfortably past the 44pt touch floor.
 */
export function Field({
    label,
    error,
    ...props
}: TextInputProps & { label: string; error?: string | null }) {
    return (
        <View style={{ gap: 7 }}>
            <Text style={text.eyebrow}>{label}</Text>
            <TextInput
                placeholderTextColor={color.inactiveFg}
                {...props}
                style={{
                    height: 56,
                    borderRadius: radius.cta,
                    paddingHorizontal: 16,
                    backgroundColor: color.field,
                    borderWidth: 1.5,
                    // The border is the error indicator as well as the message,
                    // so the field is still marked for anyone who cannot easily
                    // read the small red text beneath it.
                    borderColor: error ? color.dangerBorder : color.fieldBorder,
                    fontFamily: font.semibold,
                    fontSize: 16,
                    color: color.ink,
                }}
            />
            {error ? (
                <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: color.danger }}>
                    {error}
                </Text>
            ) : null}
        </View>
    );
}
