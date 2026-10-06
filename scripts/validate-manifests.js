#!/usr/bin/env node
/**
 * Validates every plugins/<id>/plugin.json (same rules as the index server) and checks that
 * the tweak ids declared in the manifest are the ones registered in src/index.ts.
 */
const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.resolve(__dirname, '../plugins');
const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MATCH_PATTERN = /^(<all_urls>|(\*|https?|wss?|ftp|file):\/\/(\*|\*\.[^/*]+|[^/*]+)?\/.*)$/;

let failures = 0;

const fail = (plugin, message) => {
	failures++;
	console.error(`✖ ${plugin}: ${message}`);
};

const isHttpUrl = (value) => {
	try {
		return ['http:', 'https:'].includes(new URL(value).protocol);
	} catch {
		return false;
	}
};

fs.readdirSync(PLUGINS_DIR, {withFileTypes: true})
	.filter((entry) => entry.isDirectory())
	.forEach((entry) => {
		const dir = entry.name;
		const manifestPath = path.join(PLUGINS_DIR, dir, 'plugin.json');
		const indexPath = path.join(PLUGINS_DIR, dir, 'src/index.ts');

		if (!fs.existsSync(manifestPath)) {
			return fail(dir, 'missing plugin.json');
		}

		let manifest;

		try {
			manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
		} catch (error) {
			return fail(dir, `plugin.json is not valid JSON (${error.message})`);
		}

		if (manifest.id !== dir) fail(dir, `"id" (${manifest.id}) must equal the directory name`);
		if (!SLUG.test(String(manifest.id))) fail(dir, '"id" must be a slug');
		if (!manifest.name) fail(dir, '"name" is required');
		if (!manifest.version) fail(dir, '"version" is required');
		if (typeof manifest.iconUrl !== 'string' || !isHttpUrl(manifest.iconUrl)) fail(dir, '"iconUrl" must be an absolute HTTP(S) URL');
		if (!Array.isArray(manifest.matches) || manifest.matches.length === 0) fail(dir, '"matches" must be a non-empty array');
		else manifest.matches.forEach((m, i) => !MATCH_PATTERN.test(m) && fail(dir, `"matches[${i}]" (${m}) is not a valid match pattern`));

		if (!Array.isArray(manifest.tweaks) || manifest.tweaks.length === 0) {
			return fail(dir, '"tweaks" must be a non-empty array');
		}

		const ids = new Set();

		manifest.tweaks.forEach((tweak, i) => {
			if (!SLUG.test(String(tweak.id))) fail(dir, `tweaks[${i}].id must be a slug`);
			if (ids.has(tweak.id)) fail(dir, `tweaks[${i}].id "${tweak.id}" is duplicated`);
			ids.add(tweak.id);
			if (!tweak.name) fail(dir, `tweaks[${i}].name is required`);
			if (tweak.routes !== undefined && !Array.isArray(tweak.routes)) fail(dir, `tweaks[${i}].routes must be an array`);
			(tweak.routes || []).forEach((route, r) => !route.pattern && fail(dir, `tweaks[${i}].routes[${r}].pattern is required`));
		});

		if (!fs.existsSync(indexPath)) {
			return fail(dir, 'missing src/index.ts');
		}

		// Cheap cross-check: every manifest tweak id should appear as a key in src/index.ts
		const source = fs.readFileSync(indexPath, 'utf8');

		ids.forEach((id) => {
			if (!new RegExp(`(^|[\\s,{])['"]?${id}['"]?\\s*:`, 'm').test(source)) {
				fail(dir, `tweak "${id}" is declared in plugin.json but not registered in src/index.ts`);
			}
		});

		if (failures === 0) {
			console.log(`✔ ${dir} (${ids.size} tweak(s))`);
		}
	});

if (failures > 0) {
	console.error(`\n${failures} problem(s) found`);
	process.exit(1);
}
