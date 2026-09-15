import { LyricsClient } from '../bar-enhanced@mrvanguardia/dynamic-music-pill/LyricsClient.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

const client = new LyricsClient();
const lyrics = client._parseLRC(
    '[00:01.5]first\n[1:02]second\n[00:03.250][00:04.25]repeat\n[bad]ignored'
);

assert(lyrics.length === 4, 'Every valid LRC timestamp must create a lyric line');
assert(lyrics[0].time === 1500 && lyrics[0].text === 'first',
    'Single-digit fractions must be parsed as decimal seconds');
assert(lyrics[1].time === 3250 && lyrics[1].text === 'repeat',
    'Multiple timestamps must preserve the text');
assert(lyrics[2].time === 4250 && lyrics[2].text === 'repeat',
    'Multiple timestamps must be expanded');
assert(lyrics[3].time === 62000 && lyrics[3].text === 'second',
    'One-digit minutes and whole seconds must be supported');
assert(client._parseLRC(null).length === 0, 'Non-string LRC data must be ignored safely');

client.destroy();
print('Lyrics parser tests passed.');
