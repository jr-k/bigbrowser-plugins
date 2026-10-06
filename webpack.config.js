/**
 * Builds every plugin found under plugins/<id>/src/index.ts into plugins/<id>/dist/index.js.
 *
 * The "bigbrowser" package (SDK) is NOT bundled: the extension injects the core runtime before each
 * plugin bundle and exposes it as the `BigBrowser` global.
 */
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const PLUGINS_DIR = path.resolve(__dirname, 'plugins');

const entries = {};

fs.readdirSync(PLUGINS_DIR, {withFileTypes: true})
	.filter((entry) => entry.isDirectory())
	.forEach((entry) => {
		const manifestPath = path.join(PLUGINS_DIR, entry.name, 'plugin.json');
		const entryPath = path.join(PLUGINS_DIR, entry.name, 'src/index.ts');

		if (fs.existsSync(manifestPath) && fs.existsSync(entryPath)) {
			entries[entry.name] = entryPath;
		}
	});

if (Object.keys(entries).length === 0) {
	throw new Error('No plugin found: expected plugins/<id>/plugin.json + plugins/<id>/src/index.ts');
}

module.exports = (env, argv) => {
	const production = argv.mode !== 'development';

	return {
		mode: production ? 'production' : 'development',
		devtool: production ? false : 'inline-source-map',
		entry: entries,
		output: {
			path: PLUGINS_DIR,
			filename: (pathData) => `${pathData.chunk.name}/dist/index.js`,
			clean: false,
		},
		externals: {
			bigbrowser: 'BigBrowser',
		},
		externalsType: 'var',
		optimization: {
			splitChunks: false,
			runtimeChunk: false,
			minimizer: [new TerserPlugin({extractComments: false})],
		},
		module: {
			rules: [
				{
					test: /\.(m|j|t)s$/,
					exclude: /node_modules/,
					use: {loader: 'babel-loader'},
				},
			],
		},
		resolve: {
			extensions: ['.ts', '.js', '.json'],
		},
		plugins: [
			new webpack.DefinePlugin({
				__BUILD_DATE__: JSON.stringify(new Date().toISOString()),
			}),
			new webpack.BannerPlugin({
				banner: (data) => {
					const manifest = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, data.chunk.name, 'plugin.json'), 'utf8'));

					return `Big Browser plugin "${manifest.id}" v${manifest.version} — built from https://github.com/jr-k/bigbrowser-plugins`;
				},
			}),
		],
		performance: {hints: false},
	};
};
