# Carlos Panato

Personal website at [cpanato.dev](https://cpanato.dev), based on the MIT-licensed [Start Bootstrap Resume](https://startbootstrap.com/theme/resume) theme.

## Local development

Use Node.js 24 LTS (shared by `.nvmrc` and GitHub Actions):

```sh
nvm install
nvm use
npm ci
npm start
```

Open `http://localhost:3000`. Changes to templates, styles, scripts and assets rebuild the site and reload the browser. Set `PORT=3001 npm start` to use a different port.

## Editing and validation

- `src/pug/index.pug`: page content, navigation and metadata.
- `src/scss/`: Bootstrap overrides and theme styles.
- `src/js/scripts.js`: navigation behavior.
- `src/assets/`: profile image, favicon and other static files.
- `src/data/credentials.json`: selected public Credly badges, verification links and expiry dates. Reviewed on October 14, 2026; review dates and badge status before updating the selection.
- `CNAME` and `keybase.txt`: domain and ownership files copied into the published site.

```sh
npm test       # Build and check links, assets and deployment files
npm run build # Generate dist/ for publication
```

Edit the source files and regenerate the tracked `dist/` files before committing. Bootstrap CSS and JavaScript come from the same pinned npm package. Sass compilation uses the modern API; Bootstrap 5 and the theme still use Sass imports, so their import/global-function deprecation warnings are suppressed until a module migration is possible.

Pull requests run CI with `npm ci` and `npm test`. The zizmor workflow audits GitHub Actions with the pedantic persona on pull requests and pushes to `main`. Pushes to `main` also build, validate and deploy `dist/` through GitHub Pages. Dependabot checks npm packages and GitHub Actions weekly.
