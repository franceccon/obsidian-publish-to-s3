# Obsidian Publish to S3

## Development

Install the dependencies and build the plugin:

```sh
pnpm install
pnpm build
```

Obsidian loads community plugins from `<vault>/.obsidian/plugins`. For local development, create a
plugin directory and link the generated bundle and manifest into it:

```sh
VAULT="/path/to/your/vault"
PLUGIN_DIR="$VAULT/.obsidian/plugins/publish-to-s3"

mkdir -p "$PLUGIN_DIR"
ln -sf "$(pwd)/main.js" "$PLUGIN_DIR/main.js"
ln -sf "$(pwd)/manifest.json" "$PLUGIN_DIR/manifest.json"
```

On systems where symbolic links are unavailable, copy `main.js` and `manifest.json` into the plugin
directory instead.

In Obsidian, open **Settings → Community plugins**, disable Restricted mode if necessary, and enable
**Publish to S3**. Add a test secret under **Settings → Keychain**, then configure the plugin under
**Settings → Publish to S3**. Run **Publish to S3: Publish** from the command palette and inspect the
configured test bucket for the uploaded files and `index.json`.

For development, run the watcher:

```sh
pnpm dev
```

After a rebuild, disable and re-enable the plugin, restart Obsidian, or use the community Hot Reload
plugin to load the new bundle. Before submitting changes, run the static checks:

```sh
pnpm lint
pnpm format:check
pnpm build
```
