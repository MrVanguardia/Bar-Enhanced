import {wallpaperMediaFromUrl, normalizeDownloadUrl} from '../bar-enhanced@mrvanguardia/wallpaper-store-prefs.js';

const cases = [
    ['https://files.pling.com/download/photo.jpg', 'image', '.jpg'],
    ['https://files.pling.com/download/photo.jpeg?token=abc', 'image', '.jpeg'],
    ['https://4kwallpapers.com/images/wallpapers/photo.png', 'image', '.png'],
    ['https://files.pling.com/download/loop.mp4', 'video', '.mp4'],
    ['https://files.pling.com/download/loop.webm', 'video', '.webm'],
];
for (const [url, type, extension] of cases) {
    const actual = wallpaperMediaFromUrl(url);
    if (actual?.type !== type || actual?.extension !== extension)
        throw new Error(`Wrong media classification for ${url}: ${JSON.stringify(actual)}`);
}
for (const url of ['https://files.pling.com/download/theme.zip',
    'https://files.pling.com/download/wallpaper.heic',
    'https://4kwallpapers.com/wallpaper.html',
    'http://files.pling.com/download/photo.jpg']) {
    if (wallpaperMediaFromUrl(url) !== null)
        throw new Error(`Unsupported download was accepted: ${url}`);
}

// Pling download links end with the raw file name. curl rejects spaces
// (exit 3), so the last segment must be percent-encoded exactly once.
const base = 'https://files06.pling.com/api/files/download/j/a.b.c/';
for (const [input, expected] of [
    [`${base}Black White 4K.jpg`, `${base}Black%20White%204K.jpg`],
    [`${base}Mountain%20Lake.jpg`, `${base}Mountain%20Lake.jpg`],
    [`${base}montaña (1).png`, `${base}monta%C3%B1a%20(1).png`],
    [`${base}100% real.png`, `${base}100%25%20real.png`],
    [`${base}photo.jpeg?token=a b`, `${base}photo.jpeg?token=a b`],
]) {
    const actual = normalizeDownloadUrl(input);
    if (actual !== expected)
        throw new Error(`Wrong download URL encoding: ${input} -> ${actual}`);
}
if (wallpaperMediaFromUrl(normalizeDownloadUrl(`${base}Black White 4K.jpg`))?.extension !== '.jpg')
    throw new Error('Encoded download links must keep their media type');
print('Wallpaper store media classification tests passed.');
