module.exports = {
	presets: [['@babel/preset-env', {targets: {chrome: '120', firefox: '136'}}]],
	plugins: [['@babel/plugin-transform-class-properties'], ['@babel/plugin-transform-typescript']],
};
