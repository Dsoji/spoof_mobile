import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { color, font, radius } from '@/theme';

/**
 * A day field and a time field, each opening the native picker.
 *
 * Shared by the publish sheet and rescheduling a post, so "pick a moment" looks
 * and behaves the same wherever the app asks for one.
 */
export function WhenPicker({ value, onChange }: { value: Date; onChange: (next: Date) => void }) {
    const [picker, setPicker] = useState<'date' | 'time' | null>(null);

    const onPicked = (event: DateTimePickerEvent, next?: Date) => {
        // Android shows the picker as a dialog that closes itself; iOS renders
        // it inline and stays put.
        if (Platform.OS === 'android') setPicker(null);
        if (event.type === 'set' && next) onChange(next);
    };

    const dayLabel = value.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const timeLabel = value.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });

    return (
        <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 9 }}>
                <Field label={dayLabel} grow active={picker === 'date'} onPress={() => setPicker(picker === 'date' ? null : 'date')} />
                <Field label={timeLabel} active={picker === 'time'} onPress={() => setPicker(picker === 'time' ? null : 'time')} />
            </View>
            {picker ? (
                <DateTimePicker
                    value={value}
                    mode={picker}
                    display={Platform.OS === 'ios' ? (picker === 'date' ? 'inline' : 'spinner') : 'default'}
                    minimumDate={picker === 'date' ? new Date() : undefined}
                    minuteInterval={5}
                    onChange={onPicked}
                    accentColor={color.brand}
                    themeVariant="light"
                />
            ) : null}
        </View>
    );
}

function Field({ label, grow, active, onPress }: { label: string; grow?: boolean; active?: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={{
                flex: grow ? 1 : undefined,
                width: grow ? undefined : 116,
                height: 48,
                borderRadius: radius.cta,
                backgroundColor: active ? color.brandTint : color.field,
                borderWidth: 1,
                borderColor: active ? color.brand : color.fieldBorder,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: active ? color.brand : color.ink }}>{label}</Text>
        </Pressable>
    );
}

export function isPast(date: Date): boolean {
    return date.getTime() <= Date.now();
}
