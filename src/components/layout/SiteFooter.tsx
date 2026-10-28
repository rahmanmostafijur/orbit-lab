import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { OrbitMark } from "@/components/ui/OrbitMark";
import { orbitConfig } from "@/config/orbitlab";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__marquee" aria-hidden="true">
          <span>{orbitConfig.name}</span>
          <span className="site-footer__marquee-dot" />
          <span>Architecture playground</span>
          <span className="site-footer__marquee-dot" />
          <span>Design systems in orbit</span>
        </div>

        <div className="site-footer__main">
          <div className="site-footer__identity">
            <OrbitMark showInitials initials="OL" />
            <p>
              {orbitConfig.name} is a browser-based playground for designing
              software architecture: editable diagrams, animated request flows,
              and an interactive 3D view — all without an account.
            </p>
          </div>

          <nav className="site-footer__nav" aria-label="Footer navigation">
            <p className="micro-label">Navigate</p>
            <ul>
              {orbitConfig.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-footer__connect">
            <p className="micro-label">Good to know</p>
            <ul>
              <li>No account required</li>
              <li>Autosaves in your browser</li>
              <li>Export JSON, SVG, and PNG</li>
              <li>Keyboard accessible</li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>
            © {year} {orbitConfig.name}.
          </p>
          <p className="site-footer__tech">Next.js / Three.js / R3F</p>
          <a className="site-footer__top" href="#main-content">
            Back to top
            <ArrowUp size={14} strokeWidth={1.7} aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
