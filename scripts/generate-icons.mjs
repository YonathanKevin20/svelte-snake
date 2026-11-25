// Generates the app icons and the favicon from one tiny pixel-art snake, so they are
// reproducible and need no image tools. Run with `pnpm icons`; the output is committed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const INK = [0x43, 0x52, 0x3d];
const LIGHT = [0xc7, 0xf0, 0xd8];
const GHOST = [0xb6, 0xdf, 0xc7];

// X = snake, F = food (drawn as a diamond), . = empty. The head (top right) is about to eat.
const ART = [
	'.XXXXXXXX.F.',
	'.X..........',
	'.X..........',
	'.XXXXXXXXX..',
	'.........X..',
	'.........X..',
	'.XXXXXXXXX..'
];
const ART_W = ART[0].length;
const ART_H = ART.length;

/** Colour of one pixel, given its cell and the position inside that cell (0..1). */
function colourAt(cell, u, v) {
	const inset = 0.12;
	if (u < inset || u >= 1 - inset || v < inset || v >= 1 - inset) return LIGHT;
	if (cell === 'X') return INK;
	if (cell === 'F') return Math.abs(u - 0.5) + Math.abs(v - 0.5) <= 0.5 - inset / 2 ? INK : GHOST;
	return GHOST;
}

/** Renders the art on a `grid` x `grid` board, centred, as RGBA bytes. */
function render(size, grid) {
	const offsetX = Math.floor((grid - ART_W) / 2);
	const offsetY = Math.floor((grid - ART_H) / 2);
	const rgba = Buffer.alloc(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const gx = (x * grid) / size;
			const gy = (y * grid) / size;
			const cx = Math.floor(gx);
			const cy = Math.floor(gy);
			const artX = cx - offsetX;
			const artY = cy - offsetY;
			const inArt = artX >= 0 && artX < ART_W && artY >= 0 && artY < ART_H;
			const cell = inArt ? ART[artY][artX] : '.';
			const [r, g, b] = colourAt(cell, gx - cx, gy - cy);
			rgba.set([r, g, b, 255], (y * size + x) * 4);
		}
	}
	return rgba;
}

function chunk(type, data) {
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const out = Buffer.alloc(body.length + 8);
	out.writeUInt32BE(data.length, 0);
	body.copy(out, 4);
	out.writeUInt32BE(crc32(body), body.length + 4);
	return out;
}

function png(size, rgba) {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(size, 0);
	header.writeUInt32BE(size, 4);
	header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace
	const stride = size * 4;
	const raw = Buffer.alloc((stride + 1) * size);
	for (let y = 0; y < size; y++) rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

function faviconSvg() {
	const grid = 16;
	const offsetX = Math.floor((grid - ART_W) / 2);
	const offsetY = Math.floor((grid - ART_H) / 2);
	const hex = (c) => `#${c.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
	const rects = [];
	ART.forEach((row, y) =>
		[...row].forEach((cell, x) => {
			if (cell === 'X')
				rects.push(`<rect x="${x + offsetX}" y="${y + offsetY}" width="1" height="1"/>`);
		})
	);
	const food = ART.flatMap((row, y) =>
		[...row].flatMap((cell, x) => (cell === 'F' ? [[x, y]] : []))
	);
	const diamonds = food.map(
		([x, y]) => `<path d="M${x + offsetX + 0.5} ${y + offsetY}l.5.5-.5.5-.5-.5z"/>`
	);
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" shape-rendering="crispEdges">`,
		'<title>svelte-snake</title>',
		`<rect width="${grid}" height="${grid}" fill="${hex(LIGHT)}"/>`,
		`<g fill="${hex(INK)}">${rects.join('')}${diamonds.join('')}</g>`,
		'</svg>',
		''
	].join('');
}

mkdirSync('static', { recursive: true });
const outputs = [
	// "any" icons use a 16-cell board; the art fills most of it.
	['static/icon-192.png', 192, 16],
	['static/icon-512.png', 512, 16],
	['static/apple-touch-icon.png', 180, 16],
	// Maskable icons are cropped by the OS, so the art stays inside the central safe zone.
	['static/icon-maskable-512.png', 512, 20]
];
for (const [file, size, grid] of outputs) {
	writeFileSync(file, png(size, render(size, grid)));
	console.log(`wrote ${file}`);
}
writeFileSync('src/lib/assets/favicon.svg', faviconSvg());
console.log('wrote src/lib/assets/favicon.svg');
