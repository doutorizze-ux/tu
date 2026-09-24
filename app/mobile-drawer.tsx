"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function PanelNavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Link href={href} aria-current={pathname === href ? "page" : undefined}>
      {children}
    </Link>
  );
}

export function MobileDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const closeDrawer = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("mobileDrawerOpen", open);

    return () => {
      document.body.classList.remove("mobileDrawerOpen");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
      if (event.key === "Tab") {
        const focusable = drawerRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const closeWhenNavigating = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        className={`mobileMenuTrigger${open ? " isOpen" : ""}`}
        type="button"
        aria-label={open ? "Fechar menu de navegação" : "Abrir menu de navegação"}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="mobileMenuGlyph" aria-hidden="true"><i /><i /><i /></span>
      </button>

      {open ? (
        <button
          className="mobileMenuScrim"
          type="button"
          aria-label="Fechar menu"
          onClick={closeDrawer}
        />
      ) : null}

      <div ref={drawerRef} id="mobile-drawer" className={`mobileDrawer${open ? " isOpen" : ""}`} role="dialog" aria-modal={open} aria-label="Menu de navegação" aria-hidden={!open}>
        <div className="mobileDrawerHeader">
          <img src="/brand/tunix-wordmark.png" alt="Tunix" />
          <button ref={closeRef} type="button" onClick={closeDrawer} aria-label="Fechar menu"><span aria-hidden="true">×</span></button>
        </div>
        <div className="mobileDrawerContent" onClick={closeWhenNavigating}>
          {children}
        </div>
      </div>
    </>
  );
}
