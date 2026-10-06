# Big Browser Plugins

Public plugin collection for [Big Browser](https://github.com/jr-k/bigbrowser-extension), consumed by the index server and browser extensions through GitHub.

A plugin targets one or more websites and groups small, independently configurable features called **tweaks**. Users subscribe to a plugin, then choose exactly which tweaks should run.

## Structure

```text
plugins/
└── [plugin-id]/
    ├── plugin.json
    ├── src/
    │   ├── index.ts
    │   └── tweaks/
    │       └── [TweakName].ts
    └── dist/
        └── index.js
```

- **Plugin ID**: directory name and manifest `id`, using lowercase letters, digits, `_` or `-`.
- **Manifest**: metadata, website match patterns and available tweaks.
- **Entry point**: maps each manifest tweak ID to its TypeScript implementation.
- **Bundle**: generated file served to extensions by the index server. Files under `dist/` are committed.

## `plugin.json`

```json
{
  "id": "example",
  "name": "Example",
  "description": "Useful changes for example.com.",
  "version": "1.0.0",
  "author": "Your name",
  "homepage": "https://github.com/your-name/your-plugin",
  "iconUrl": "https://example.com/favicon.svg",
  "matches": ["https://example.com/*"],
  "tweaks": [
    {
      "id": "clean_dashboard",
      "name": "Clean dashboard",
      "description": "Removes distractions from the dashboard.",
      "default": true,
      "routes": [
        {
          "protocol": "https",
          "host": "example.com",
          "pattern": "https://example.com/dashboard{/path*}"
        }
      ]
    }
  ]
}
```

`id`, `name`, `version`, `iconUrl`, `matches` and at least one tweak are required.

- `iconUrl` must be an absolute HTTP or HTTPS URL.
- `matches` uses [WebExtension match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns).
- A tweak `id` must be unique inside its plugin and must also be registered in `src/index.ts`.
- `default` controls whether the tweak is enabled when a user first subscribes.
- `routes[].pattern` is an RFC 6570 URI template. `protocol` and `host` are optional regular expressions checked before the template.

## Plugin entry point

Register every tweak declared in the manifest:

```ts
import {definePlugin} from 'bigbrowser';

import CleanDashboard from './tweaks/CleanDashboard';

export default definePlugin({
  id: 'example',
  tweaks: {
    clean_dashboard: CleanDashboard,
  },
});
```

The plugin ID and tweak keys must match `plugin.json`.

## Writing a tweak

Each tweak extends `Tweak` and implements `run`:

```ts
import {Tweak, TweakRequest} from 'bigbrowser';

class CleanDashboard extends Tweak {
  run = (request: TweakRequest): void => {
    const section = request.params.section;

    document.querySelector(`[data-section="${section}"]`)?.remove();
  };
}

export default CleanDashboard;
```

`TweakRequest` exposes the matched route and current context:

- `pluginId`, `tweakId` and `routeName`
- `params` extracted from the URI template
- `query`, `hash`, `uri` and `uriTemplate`
- the current plugin and tweak manifests

Tweaks can also use `this.waitFor(...)` to wait for asynchronous page content and `this.checkFor(...)` to track elements mounted by dynamic interfaces.

## Local development

```bash
npm ci

# Validate manifests and tweak registrations
npm run validate

# Check TypeScript
npm run typecheck

# Build every plugin
npm run build

# Rebuild on changes
npm run dev
```

Webpack discovers every `plugins/*/src/index.ts` entry point and writes its bundle to `plugins/<id>/dist/index.js`. The Big Browser SDK stays external because the extension injects the runtime before loading a plugin.

## Publishing

Pushes to `main` are validated, type-checked and built by GitHub Actions. When bundles change, the workflow commits the generated `dist/` files back to the repository. The index server then reads the manifests and bundles from GitHub for distribution to extensions.

## Pull request checklist

- [ ] Plugin directory and `id` match.
- [ ] Plugin and tweak IDs use lowercase letters, digits, `_` or `-`.
- [ ] `iconUrl` is a stable HTTP(S) URL.
- [ ] Website permissions in `matches` are limited to what the plugin needs.
- [ ] Every manifest tweak is registered in `src/index.ts`.
- [ ] No credentials, tokens or private data are committed.
- [ ] `npm run validate`, `npm run typecheck` and `npm run build` pass.
