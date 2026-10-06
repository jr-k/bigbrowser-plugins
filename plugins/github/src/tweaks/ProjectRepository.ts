import {Tweak, TweakRequest} from 'bigbrowser';

const VISIBLE_FIELDS = ['Title', 'Repository', 'Labels', 'Reviewers', 'Assignees'];

class ProjectRepository extends Tweak {
	run = (request: TweakRequest): void => {
		const visibleFields = request.query['visibleFields'] ?? '';

		if (visibleFields.includes('Repository')) {
			return;
		}

		const url = new URL(document.location.href);
		url.searchParams.set('visibleFields', JSON.stringify(VISIBLE_FIELDS));
		document.location.href = url.toString();
	};
}

export default ProjectRepository;
