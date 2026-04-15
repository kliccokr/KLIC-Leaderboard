"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LangToggle } from "@/components/common/LangToggle";
import type { ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lang = pathname.startsWith("/en") ? "en" : "ko";
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: `/${lang}`, label: "리더보드" },
    { href: `/${lang}/mydashboard`, label: "내 대시보드" },
  ];

  const rightLinks = [
    { href: `/${lang}/docs`, label: "안내" },
  ];

  return (
    <>
      <nav className="border-b border-border bg-card">
        <div className="container max-w-5xl mx-auto flex items-center gap-4 px-4 h-12">
          <Link href={`/${lang}`} className="font-bold text-foreground text-sm">
            KLIC
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm hover:text-foreground transition-colors min-h-[44px] flex items-center ${
                  pathname === link.href ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex ml-auto items-center gap-3">
            {rightLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm hover:text-foreground transition-colors min-h-[44px] flex items-center ${
                  pathname.startsWith(link.href) ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <LangToggle />
            <ThemeToggle />
            <Link
              href={`/${lang}/settings`}
              className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                pathname.startsWith(`/${lang}/settings`) ? "text-foreground" : "text-muted-foreground"
              }`}
              title="설정"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 0 1-1.73V20a2 2 0 0 0 2-2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 0-1 1.73V4a2 2 0 0 0-2 2z"/><circle cx="12" cy="12" r="3"/></svg>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: `/${lang}` })}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="로그아웃"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </div>

          {/* Mobile: hamburger + quick toggles */}
          <div className="flex md:hidden ml-auto items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="메뉴"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="container max-w-5xl mx-auto px-4 py-2 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-sm transition-colors ${
                    pathname === link.href
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {rightLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-sm transition-colors ${
                    pathname.startsWith(link.href)
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-2 border-t border-border pt-2 mt-2">
                <Link
                  href={`/${lang}/settings`}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-md text-sm transition-colors ${
                    pathname.startsWith(`/${lang}/settings`) ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 0 1-1.73V20a2 2 0 0 0 2-2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 0-1 1.73V4a2 2 0 0 0-2 2z"/><circle cx="12" cy="12" r="3"/></svg>
                  설정
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: `/${lang}` })}
                  className="flex items-center gap-2 px-3 py-3 rounded-md text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      {children}
    </>
  );
}
