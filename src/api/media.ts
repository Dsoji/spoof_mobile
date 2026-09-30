import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { API_BASE } from './config';
import { ApiError, NetworkError } from './client';
import { getToken } from './session';

/**
 * Pick a photo or video, and upload it.
 *
 * `POST /api/v1/media?name=&type=&size=` takes the **raw file as the body** —
 * not multipart, not base64 — and answers `{ url }`. That url is what a post
 * carries in `media[]`.
 *
 * This is the one call that does not go through `request()` in client.ts. That
 * helper serialises a JSON body, which would mean reading the whole file into
 * JavaScript first: a 200 MB video is a crash on a real phone, not a slow
 * upload. `FileSystem.uploadAsync` streams the file from disk natively, so
 * memory stays flat whatever the size.
 *
 * The `/legacy` import is deliberate: SDK 54 moved the module to a File/Directory
 * API that has no streaming upload, and the classic functions live there now.
 */

/** Mirrors ALLOWED_MIME_TYPES in the studio's validations/schemas.ts. */
const ALLOWED = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo',
] as const;

/** MAX_FILE_SIZE in the same file. Checked here so a doomed 600 MB upload never starts. */
const MAX_BYTES = 500 * 1024 * 1024;

export type MediaItem = {
    url: string;
    type: 'image' | 'video' | 'gif';
    /** The local URI, for showing a thumbnail without re-downloading what was just sent. */
    localUri: string;
};

export type PickedMedia = {
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
    kind: 'image' | 'video';
};

export type PickResult =
    | { ok: true; asset: PickedMedia }
    /** The user closed the picker, or denied the library. Nothing to report. */
    | { ok: false; cancelled: true }
    | { ok: false; cancelled?: false; message: string };

/**
 * Open the photo library.
 *
 * Permission is requested rather than assumed: on iOS the first call shows the
 * system sheet, and a denial has to be told apart from a cancel — the first
 * needs an explanation, the second needs silence.
 */
export async function pickMedia(): Promise<PickResult> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        return permission.canAskAgain
            ? { ok: false, cancelled: true }
            : {
                  ok: false,
                  message: 'Spoof Kitchen needs access to your photos. You can turn it on in Settings.',
              };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        // One at a time: a post's media list is ordered and each item needs its
        // own upload, so multi-select would mean a queue and a progress model
        // this screen does not have.
        allowsMultipleSelection: false,
        // Re-encoding a video to "compress" it costs minutes and quality; the
        // studio accepts up to 500 MB, so the original goes as-is.
        quality: 1,
    });

    if (result.canceled || !result.assets?.length) return { ok: false, cancelled: true };

    const asset = result.assets[0];
    const kind: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
    const mimeType = asset.mimeType ?? fallbackMime(asset.uri, kind);

    if (!(ALLOWED as readonly string[]).includes(mimeType)) {
        return { ok: false, message: `${mimeType} files are not supported here.` };
    }
    if (asset.fileSize && asset.fileSize > MAX_BYTES) {
        return { ok: false, message: `That file is ${mb(asset.fileSize)} MB. The limit is 500 MB.` };
    }

    return {
        ok: true,
        asset: {
            uri: asset.uri,
            name: asset.fileName ?? `upload.${extensionFor(mimeType)}`,
            mimeType,
            size: asset.fileSize,
            kind,
        },
    };
}

/**
 * Send a picked file to the studio.
 *
 * Throws like `request()` does, with the same two error types, so a screen can
 * handle an upload failure exactly as it handles any other call.
 */
export async function uploadMedia(asset: PickedMedia): Promise<MediaItem> {
    const token = await getToken();
    if (!token) throw new ApiError('Not signed in.', 401);

    const query = new URLSearchParams({
        name: asset.name,
        type: asset.mimeType,
        ...(asset.size ? { size: String(asset.size) } : {}),
    });
    const url = `${API_BASE}/media?${query.toString()}`;

    let response: FileSystem.FileSystemUploadResult;
    try {
        response = await FileSystem.uploadAsync(url, asset.uri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': asset.mimeType },
        });
    } catch (e) {
        throw new NetworkError(e, url);
    }

    if (response.status < 200 || response.status >= 300) {
        throw new ApiError(errorFrom(response.body, response.status), response.status);
    }

    let uploaded: { url?: string };
    try {
        uploaded = JSON.parse(response.body) as { url?: string };
    } catch {
        throw new ApiError('The studio returned an unexpected response.', 500);
    }
    if (!uploaded.url) throw new ApiError('The upload finished but no file was returned.', 500);

    return {
        url: uploaded.url,
        // A GIF is its own media type to the studio, not an image.
        type: asset.mimeType === 'image/gif' ? 'gif' : asset.kind,
        localUri: asset.uri,
    };
}

/** The studio's `{ error }` when there is one, a status otherwise. */
function errorFrom(body: string, status: number): string {
    try {
        const parsed = JSON.parse(body) as { error?: string };
        if (parsed.error) return parsed.error;
    } catch {
        // An HTML body means a proxy or a redirect answered, not a route.
    }
    return status === 413
        ? 'That file is too large to upload.'
        : `Could not upload that file (${status}).`;
}

/** iOS sometimes reports no mimeType for a library asset; guess from the extension. */
function fallbackMime(uri: string, kind: 'image' | 'video'): string {
    const ext = uri.split('.').pop()?.toLowerCase() ?? '';
    const byExtension: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        heic: 'image/jpeg', // the picker converts HEIC on the way out
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        webm: 'video/webm',
    };
    return byExtension[ext] ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg');
}

function extensionFor(mimeType: string): string {
    return mimeType === 'video/quicktime' ? 'mov' : (mimeType.split('/')[1] ?? 'bin');
}

function mb(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(0);
}
