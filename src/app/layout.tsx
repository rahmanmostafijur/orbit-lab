import type { Metadata, Viewport } from "next";
import "@fontsource-variable/syne";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import { orbitConfig } from "@/config/orbitlab";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${orbitConfig.name} — ${orbitConfig.tagline}`,
    template: `%s — ${orbitConfig.name}`,
  },
  description: orbitConfig.description,
  applicationName: orbitConfig.name,
  keywords: [...orbitConfig.keywords],
  openGraph: {
    title: `${orbitConfig.name} — ${orbitConfig.tagline}`,
    description: orbitConfig.description,
    type: "website",
    siteName: orbitConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${orbitConfig.name} — ${orbitConfig.tagline}`,
    description: orbitConfig.description,
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#03050b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
