# Local WASM SSG

This project aims to provide a simple way to build a static site with WebAssembly. The frontend is built with [Astro](https://astro.build) and React, with the 'SSG' part handled by a WebAssembly module built with Rust and [`wasm-pack`](https://rustwasm.github.io/wasm-pack/).

## Getting Started

To get started, clone this repository and run `npm install` to install the dependencies.

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

### Building the WASM module

You need `rust` and `wasm-pack` installed to build the WASM module. You can install `wasm-pack` with `cargo install wasm-pack`.

```sh
cd markdown_to_html
wasm-pack build --target bundler
cd ..
mkdir -p src/wasm
mv markdown_to_html/pkg src/wasm/markdown_to_html
```

## Approach/notes

The app should accept markdown files, Handlebars template files, and css files. There needs to be a separation between content and templates. There should be one css file per site.

### Templates

One tricky thing with the current setup is template dependencies - if a template depends on another template, the dependency needs to be resolved. This could be done by parsing the Handlebars templates and extracting the dependencies - keeping a DAG in state?

Handlebars uses partials - current approach is to just pass all templates and partials to the render function and let Handlebars figure it out

alternatively dependencies could be stored as columns in the db

### SQLite

the files are stored in SQLite.

todo

- instead of file extensions in file name, use type column in db
