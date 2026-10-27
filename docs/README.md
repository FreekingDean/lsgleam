# lsgleam docs

Guides for building and running a show. The screenshots use the example show `shows/seasons.json`.

1. [Getting started](getting-started.md): run the UI, connect TouchDesigner, find your way around.
2. [Layout](layout.md): floors, rooms, fixtures, DMX, pixels and cables.
3. [Show and scenes](show-and-scenes.md): scenes, choosing between them, and patching them to fixtures.
4. [Blocks](blocks.md): every block in the palette, in a line or two.
5. [Recipes](recipes.md): worked examples.
6. [Outputs](outputs.md): schedule, plot, MVR export to Unreal and the visualiser.

![The show tab](images/show-tab.png)

## Screenshots

`web/scripts/screenshots.mjs` regenerates every image in `docs/images` from the example show. It starts its own Vite server on port 5399, never connects to TouchDesigner, and drives Google Chrome through Playwright:

```sh
cd web && npm install && npm run shots
```
