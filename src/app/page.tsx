import Link from "next/link";
import { ArrowUpRight, Boxes, MousePointerClick, Layers, Share2, Box, Zap, ImageDown } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Universe } from "@/components/three/Universe";
import { HeroPreview } from "@/components/orbitlab/HeroPreview";
import { orbitConfig } from "@/config/orbitlab";
import { workspaceTemplates } from "@/lib/orbitlab/templates";
import { componentKinds } from "@/lib/orbitlab/kinds";

export default function LandingPage() {
  return (
    <div className="site">
      <SiteHeader />
      <main id="main-content">
        <section className="hero" id="home">
          <Universe />
          <div className="shell hero__layout">
            <div className="hero__copy">
              <p className="micro-label">Architecture and system-design playground</p>
              <h1>
                <span className="hero__title-line">Design systems.</span>
                <span className="hero__title-line">
                  <em>Visualize connections.</em>
                  <sup className="hero__spark" aria-hidden="true">
                    ●●
                  </sup>
                </span>
                <span className="hero__title-line">Understand how software works.</span>
              </h1>
              <p className="hero__lede">
                Sketch a system, connect it, and watch a request travel through it.
                Built for students, interview prep and engineers. Free, runs in your
                browser, nothing is uploaded.
              </p>
              <div className="hero__actions">
                <Link
                  className="button button--primary button--lg"
                  href={orbitConfig.links.at(-1)!.href}
                >
                  Open playground
                  <ArrowUpRight size={18} strokeWidth={1.7} aria-hidden="true" />
                </Link>
                <Link className="hero__ghost-link" href={orbitConfig.links[0]!.href}>
                  See what it does
                  <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="section" id="overview">
          <div className="shell">
            <p className="micro-label">What it does</p>
            <div className="section__grid">
              <article className="card">
                <Boxes size={26} strokeWidth={1.4} aria-hidden="true" />
                <h2>Build anything</h2>
                <p>
                  Eight component archetypes — clients, gateways, services, FastAPI
                  apps, databases, caches, queues, and external systems.
                </p>
              </article>
              <article className="card">
                <MousePointerClick size={26} strokeWidth={1.4} aria-hidden="true" />
                <h2>Arrange and connect</h2>
                <p>
                  Drag, nudge with arrow keys, and draw connections between
                  components with a dedicated link mode.
                </p>
              </article>
              <article className="card">
                <Layers size={26} strokeWidth={1.4} aria-hidden="true" />
                <h2>Trace request paths</h2>
                <p>
                  Pick any two components and watch an animated request flow light
                  up the shortest route between them.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="shell">
            <p className="micro-label">Features</p>
            <div className="section__grid">
              <article className="card">
                <Share2 size={26} strokeWidth={1.4} aria-hidden="true" />
                <h2>Share anywhere</h2>
                <p>
                  Export JSON, SVG, and PNG or copy a share link that encodes the
                  diagram in the URL itself.
                </p>
              </article>
              <article className="card">
                <Box size={26} strokeWidth={1.4} aria-hidden="true" />
                <h2>3D universe view</h2>
                <p>
                  Rotate your architecture in an optional WebGL universe built with
                  React Three Fiber. Falls back gracefully to 2D if your device cannot run it.
                </p>
              </article>
              <article className="card">
                <Zap size={26} strokeWidth={1.4} aria-hidden="true" />
                <h2>Autosaves locally</h2>
                <p>
                  Your workspace is stored in the browser. No sign-up, no server,
                  no data leaving your device.
                </p>
              </article>
              <article className="card">
                <ImageDown size={26} strokeWidth={1.4} aria-hidden="true" />
                <h2>Import and export</h2>
                <p>
                  Round-trip your diagrams through JSON — iterate over time, share
                  with teammates, and keep everything versionable.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="flows">
          <div className="shell">
            <p className="micro-label">How it works</p>
            <ol className="section__grid">
              <li className="card">
                <h2>1. Pick a template</h2>
                <p>Start from a working system, or an empty canvas.</p>
              </li>
              <li className="card">
                <h2>2. Connect and trace</h2>
                <p>Link components, then trace a request from any source to any destination.</p>
              </li>
              <li className="card">
                <h2>3. Export and share</h2>
                <p>Download JSON, SVG, or PNG, or copy a link that holds the whole diagram.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section" id="palette">
          <div className="shell">
            <p className="micro-label">Component palette</p>
            <p className="section__intro">
              Model the systems you actually run. Each component kind is color-coded
              and described in the palette.
            </p>
            <div className="kind-grid">
              {Object.entries(componentKinds).map(([id, kind]) => (
                <div key={id} className="kind-cell" style={{ ["--node-color" as string]: kind.color }}>
                  <span className="kind-cell__swatch" />
                  <div>
                    <strong>{kind.label}</strong>
                    <p>{kind.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="templates">
          <div className="shell">
            <p className="micro-label">Starter templates</p>
            <p className="section__intro">
              Every playground starts with a working system you can rename, rewire,
              remix, or clear.
            </p>
            <div className="section__grid">
              {workspaceTemplates.map((template) => (
                <Link
                  key={template.id}
                  href={`/playground?template=${template.id}`}
                  className="card card--link"
                >
                  <h2>{template.name}</h2>
                  <p>{template.summary}</p>
                  <p className="card__meta">
                    {template.nodes.length} components
                    <span className="site-footer__marquee-dot" />
                    {template.edges.length} connections
                  </p>
                  <span className="card__action">
                    Try this template
                    <ArrowUpRight size={14} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="faq">
          <div className="shell">
            <p className="micro-label">FAQ</p>
            <div className="faq">
              <details>
                <summary>Where is my data stored?</summary>
                <p>
                  Only in your browser&apos;s local storage, on this device. Nothing is
                  uploaded: there is no server and no account. Export JSON to keep a
                  backup or move a diagram to another device.
                </p>
              </details>
              <details>
                <summary>What does a share link contain?</summary>
                <p>
                  The whole diagram, encoded in the part of the URL after the #. Browsers
                  never send that part to a server, so the diagram only travels with the
                  link itself. Anyone with the link can see it.
                </p>
              </details>
              <details>
                <summary>Is it free? Do I need an account?</summary>
                <p>Free, with no account and no sign-up. Open the playground and start.</p>
              </details>
              <details>
                <summary>Does it work on my phone or an older laptop?</summary>
                <p>
                  Yes. The 2D editor works everywhere, with touch pan and pinch zoom. The
                  3D view needs WebGL and falls back gracefully to 2D when it is missing.
                </p>
              </details>
              <details>
                <summary>Is it open source?</summary>
                <p>
                  Yes, under the MIT license.{" "}
                  <a href={orbitConfig.repositoryUrl}>Read the code on GitHub</a>.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="shell cta__layout">
            <h2>
              Stop describing. Start orbiting.
            </h2>
            <p>
              Load a template, trace a request, and export the diagram in seconds —
              for free, with no account.
            </p>
            <Link className="button button--primary button--lg" href={orbitConfig.links.at(-1)!.href}>
              Open playground
              <ArrowUpRight size={18} strokeWidth={1.7} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
