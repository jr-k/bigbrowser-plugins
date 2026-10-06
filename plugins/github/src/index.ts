import {definePlugin} from 'bigbrowser';

import ProjectRepository from './tweaks/ProjectRepository';

// Keys must match the tweak ids declared in plugin.json
export default definePlugin({
	id: 'github',
	tweaks: {
		project_repository: ProjectRepository,
	},
});
