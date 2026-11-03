# Polylog

A phone-first web app for learning German from zero to B1, with pronunciation practice. It runs as a static site on GitHub Pages and installs on an iPhone as a home-screen app.

See [system_design.md](system_design.md) for the full design and roadmap.

## Run locally

Requires Node 22.12+ (see `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:5173, also reachable from your phone on the same Wi-Fi
npm test           # unit tests + course content validation
npm run build      # type-check and build to dist/
npm run preview    # serve the production build (service worker included)
```

Note: iPhone Safari only allows microphone access over HTTPS, so test shadowing recordings on the deployed site rather than the LAN dev server.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this folder to its `main` branch.
2. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` runs the tests, builds the app and deploys it.
4. On your iPhone, open the site in Safari, tap **Share → Add to Home Screen**.

## Adding content

Course content lives in `content/courses/<courseId>/`. Each unit is one JSON file listed in `course.json`. `npm test` validates every course, catching things like duplicate ids, wrong answer indexes, or vocab that no lesson introduces.

## Adding a language

1. Create a language pack in `src/languages/<code>/index.ts` (see `de` for an example) and register it in `src/languages/registry.ts`.
2. Add a course folder `content/courses/<target>-<base>/`.

The lesson player, grading, spaced repetition and storage need no changes.
