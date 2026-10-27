# OrbitLab

Design systems. Visualize connections. Understand how software works.

OrbitLab is a browser-based architecture and system-design playground. Build interactive diagrams of software architecture: add components, connect them, trace animated request flows between them, and switch to an immersive 3D universe view — all without an account or a backend.

- Live in the browser: no sign-up, no server, diagrams autosave as you work
- Interactive editor: drag components, arrow-key nudging, dedicated connect mode
- Eight component archetypes: client, gateway, service, FastAPI, database, cache, queue, external
- Request flow tracer: pick two components and watch the shortest route animate
- 4 starter templates: three-tier web app, REST API architecture, authentication flow, microservices
- 3D universe view with orbit controls, built with React Three Fiber; fail-secure fallbacks
- Export and share: JSON round-trips, SVG and PNG exports, shareable URL-encoded links

## Stack

- Next.js 16 (App Router, static export)
- React 19 and TypeScript
- Three.js, React Three Fiber and Drei for the 3D universe view
- Tailwind CSS 4 (Turbopack integration) with a custom CSS design system
- Lucide icons
- Locally hosted Syne, Manrope and JetBrains Mono fonts

## Quick start

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Commands

```bash
npm run dev          # local development
npm run lint         # ESLint
npm run typecheck    # TypeScript without emitting files
npm run build        # static production build to ./out
npm run start        # serve the exported ./out folder
npm run preview      # alias for serving ./out
```

## Using the playground

Open `/playground` and start from a template. The editor has three modes, switched from the toolbar:

| Mode | What it does |
| --- | --- |
| **Edit** | Select components, drag them to arrange, nudge with arrow keys (hold Shift for bigger steps) |
| **Connect** | Click one component, then another, to create a labeled connection |
| **Trace** | Pick source and target from the flow panel and highlight the shortest animated route |

The inspector panel edits labels, component types and notes; the Delete button removes the selection (removing a component also removes its connections).

### Persistence and portability

- Workspace autosaves to browser `localStorage` about a second after each change
- **Save locally** forces a save; **Reset to template** reverts to the active starter template; **New empty workspace** clears the canvas
- **Export JSON / Import JSON** round-trip the exact diagram state; schemas are validated on import
- **Export SVG / Export PNG** render a standalone share image of the current diagram
- **Share link** copies a URL containing the encoded diagram; anyone opening it gets your workspace without any server involved

The 3D view is optional and fail-secure: when WebGL is unavailable, `prefers-reduced-motion` is active, or the scene errors, the editor falls back to the 2D canvas and says so.

## Project structure

```text
src/
  app/                    App shell, landing page, playground route, metadata, global styles
  components/
    layout/               Header and footer
    orbitlab/             Editor: graph stage, inspector, flow tracer, sidebar, 3D view
    three/                Landing universe canvas with WebGL / reduced-motion fallback
    ui/                   Shared orbit mark
  config/                 OrbitLab site configuration
  hooks/                  Reduced-motion preference hook
  lib/
    orbitlab/             Data model: types, templates, normalization, persistence, exports
    webgl.ts              WebGL support detection
public/
  og.svg                  Social share image
```

## Deployment

The project uses `output: "export"` and writes a fully static site to `out/`. For GitHub Pages or any subpath deployment, set `basePath` and `assetPrefix` in `next.config.ts`, then rebuild.

## Accessibility

- Skip link, semantic landmarks, keyboard-operable nodes and edge selection
- Focus-visible outlines, descriptive labels on all interactive diagram elements
- 3D and decorative motion respect `prefers-reduced-motion`
- Status messages use `aria-live` regions

## License

MIT. See [LICENSE](LICENSE).
