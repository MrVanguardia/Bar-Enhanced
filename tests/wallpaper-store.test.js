import {wallpaperMediaFromUrl} from '../bar-enhanced@mrvanguardia/wallpaper-store-prefs.js';

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
print('Wallpaper store media classification tests passed.');
