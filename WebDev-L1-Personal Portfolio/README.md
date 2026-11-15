# Portfolio

Each page section has its own HTML file in `sections/`. Edit a section there, then rebuild `index.html`:

```sh
node build.mjs
```

The first split has already been completed from the existing page. `index.html` is generated from `sections/` and `src/template.html`; edit those source files rather than editing the generated page. The navigation links are in `src/template.html`.

Shared styles and interactions live in `styles.css` and `app.js`. Profile and gallery images live in `images/`.
