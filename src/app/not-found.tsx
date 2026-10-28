import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "This orbit is empty. Head back to the OrbitLab launchpad or open the diagram playground.",
};

export default function NotFound() {
  return (
    <div className="site">
      <SiteHeader />
      <main id="main-content">
        <section className="section not-found">
          <div className="shell not-found__card">
            <p className="micro-label">Signal lost · 404</p>
            <h1 className="not-found__title">This orbit is empty.</h1>
            <p className="not-found__lede">
              The route you followed doesn&apos;t map to anything in this sector.
              Head back to the launchpad, or open the playground and keep
              designing your architecture.
            </p>
            <div className="not-found__actions">
              <Link className="button button--primary" href="/">
                Back to launchpad
              </Link>
              <Link className="button button--ghost" href="/playground">
                Open the playground
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
