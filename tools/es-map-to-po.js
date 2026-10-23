#!/usr/bin/env node
// Export existing Spanish UI fallback strings as a gettext catalogue.
// Only single-quoted string-literal pairs in ES_MAP are accepted; no module is
// imported or executed, so GJS preferences and their side effects stay inert.
import {readFileSync, writeFileSync} from 'node:fs';
import vm from 'node:vm';

const [outputPath, ...inputPaths] = process.argv.slice(2);
if (!outputPath || inputPaths.length === 0)
    throw new Error('Usage: es-map-to-po.js OUTPUT.po SOURCE.js ...');

const translations = new Map();
const entryPattern = /('(?:\\.|[^'\\])*')\s*:\s*('(?:\\.|[^'\\])*')\s*(?:,|$)/g;

for (const inputPath of inputPaths) {
    const source = readFileSync(inputPath, 'utf8');
    const match = source.match(/^const ES_MAP = \{([\s\S]*?)^\};/m);
    if (!match)
        throw new Error(`ES_MAP not found in ${inputPath}`);

    const body = match[1];
    let cursor = 0;
    for (const entry of body.matchAll(entryPattern)) {
        const gap = body.slice(cursor, entry.index)
            .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
        if (/[^\s,]/.test(gap))
            throw new Error(`Unsupported ES_MAP entry in ${inputPath}`);

        const key = vm.runInNewContext(entry[1]);
        const value = vm.runInNewContext(entry[2]);
        if (typeof key !== 'string' || typeof value !== 'string' || !key || !value)
            throw new Error(`Invalid ES_MAP translation in ${inputPath}`);
        if (!translations.has(key))
            translations.set(key, value);
        cursor = entry.index + entry[0].length;
    }
    const tail = body.slice(cursor).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    if (/[^\s,]/.test(tail))
        throw new Error(`Unsupported ES_MAP tail in ${inputPath}`);
}

const lines = [
    'msgid ""',
    'msgstr ""',
    '"Project-Id-Version: bar-enhanced\\n"',
    '"PO-Revision-Date: 2026-10-11 00:00+0000\\n"',
    '"Last-Translator: Bar Enhanced contributors\\n"',
    '"Language-Team: Spanish\\n"',
    '"MIME-Version: 1.0\\n"',
    '"Content-Type: text/plain; charset=UTF-8\\n"',
    '"Content-Transfer-Encoding: 8bit\\n"',
    '"Language: es\\n"',
    '"Plural-Forms: nplurals=2; plural=(n != 1);\\n"',
    '',
];
for (const [key, value] of [...translations].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`msgid ${JSON.stringify(key)}`);
    lines.push(`msgstr ${JSON.stringify(value)}`);
    lines.push('');
}
writeFileSync(outputPath, lines.join('\n'), 'utf8');
process.stdout.write(`Exported ${translations.size} existing Spanish fallback strings.\n`);
