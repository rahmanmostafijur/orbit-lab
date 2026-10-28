export const orbitConfig = {
  name: "OrbitLab",
  tagline: "Design systems. Visualize connections. Understand how software works.",
  description:
    "A browser-based architecture and system-design playground with editable diagrams, animated request flows, reusable starter templates, JSON sharing, and an optional WebGL universe view.",
  keywords: [
    "architecture playground",
    "system design",
    "software architecture",
    "diagram editor",
    "react three fiber",
    "request flow",
    "microservices",
    "web application",
  ],
  repositoryUrl: "https://github.com/orbitlab/orbitlab",
  links: [
    { label: "Overview", href: "/#overview" },
    { label: "Features", href: "/#features" },
    { label: "Flows", href: "/#flows" },
    { label: "Open Playground", href: "/playground", cta: true },
  ] as readonly {
    label: string;
    href: string;
    cta?: boolean;
  }[],
} as const;
