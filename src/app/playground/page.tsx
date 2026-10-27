import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { OrbitEditor } from "@/components/orbitlab/OrbitEditor";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Build architecture diagrams interactively: add components, connect them, trace request paths, and share your workspace.",
};

export default function PlaygroundPage() {
  return (
    <div className="site app-site">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main
        id="main-content"
        className="app-main"
        aria-label="OrbitLab diagram playground"
      >
        <h1 className="visually-hidden">
          Architecture playground — build, connect, and trace diagrams
        </h1>
        <OrbitEditor />
      </main>
      <SiteFooter />
    </div>
  );
}
