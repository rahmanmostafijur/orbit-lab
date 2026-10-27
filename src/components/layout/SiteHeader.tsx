"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { OrbitMark } from "@/components/ui/OrbitMark";
import { orbitConfig } from "@/config/orbitlab";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const menuToggle = menuToggleRef.current;

    document.body.classList.add("nav-open");
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }

      if (event.key !== "Tab" || !menuPanelRef.current) return;

      const focusable = Array.from(
        menuPanelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("nav-open");
      window.removeEventListener("keydown", onKeyDown);
      menuToggle?.focus();
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="site-header__inner shell">
          <Link
            className="brand"
            href="/"
            aria-label={`${orbitConfig.name}, home`}
          >
            <OrbitMark />
            <span className="brand__wordmark">
              <span>{orbitConfig.name}</span>
            </span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            <ul>
              {orbitConfig.links.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            <Link className="header-contact" href={orbitConfig.links.at(-1)!.href}>
              Open Playground
              <ArrowUpRight size={14} strokeWidth={1.7} aria-hidden="true" />
            </Link>
            <button
              ref={menuToggleRef}
              className="menu-toggle"
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label="Open navigation menu"
            >
              <Menu size={20} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div
          className="mobile-menu"
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <button
            className="mobile-menu__backdrop"
            type="button"
            onClick={closeMenu}
            aria-label="Close navigation menu"
            tabIndex={-1}
          />
          <div className="mobile-menu__panel" ref={menuPanelRef}>
            <div className="mobile-menu__top">
              <OrbitMark />
              <button
                ref={closeButtonRef}
                className="mobile-menu__close"
                type="button"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                <X size={22} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile navigation">
              <ul className="mobile-menu__links">
                {orbitConfig.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} onClick={closeMenu}>
                      {item.label}
                      <ArrowUpRight
                        size={18}
                        strokeWidth={1.3}
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mobile-menu__footer">
              <Link
                className="button button--primary"
                href={orbitConfig.links.at(-1)!.href}
                onClick={closeMenu}
              >
                Open the playground
                <ArrowUpRight size={16} strokeWidth={1.7} aria-hidden="true" />
              </Link>
              <p className="micro-label">
                {orbitConfig.name} / {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
