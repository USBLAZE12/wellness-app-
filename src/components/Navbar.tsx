import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { LaunchMode } from '../types/wellness';

interface NavbarProps {
  launchMode: LaunchMode;
  onPrimaryAction: () => void;
  onNavigateHome: () => void;
  onOpenAdmin: () => void;
  isAdminView: boolean;
}

export function Navbar({
  launchMode,
  onPrimaryAction,
  onNavigateHome,
  onOpenAdmin,
  isAdminView,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const ctaLabel =
    launchMode === 'pre_launch' ? 'Reserve My Spot — Rs. 100' : 'Start Weekly Ritual';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#143628]/10">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text wordmark */}
        <a
          href="/"
          onClick={(e) => {
            if (isAdminView) {
              e.preventDefault();
              onNavigateHome();
            } else {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="font-editorial text-2xl font-semibold tracking-tight text-[#143628] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#143628]"
        >
          Vana Ritual
        </a>

        {/* Zone 2: 5 concise single-line nav links */}
        {!isAdminView ? (
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#143628]/75"
          >
            <a
              href="#inner-circle"
              className="hover:text-[#143628] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Inner Circle
            </a>
            <a
              href="#philosophy"
              className="hover:text-[#143628] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Philosophy
            </a>
            <a
              href="#gatherings"
              className="hover:text-[#143628] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Events &amp; Retreats
            </a>
            <a
              href="#membership"
              className="hover:text-[#143628] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Reserve Spot
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                onOpenAdmin();
              }}
              className="hover:text-[#143628] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Admin
            </a>
          </nav>
        ) : (
          <div className="hidden md:flex items-center gap-6 text-sm text-[#143628]/70">
            <span className="whitespace-nowrap shrink-0">Brand Operations Dashboard</span>
          </div>
        )}

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {isAdminView ? (
            <button
              type="button"
              onClick={onNavigateHome}
              className="px-4 py-2 text-xs font-medium text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Storefront
            </button>
          ) : (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold tracking-wide text-[#FAF8F5] bg-[#143628] rounded-md hover:bg-[#1e4a38] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#143628]"
            >
              {ctaLabel}
            </button>
          )}

          {!isAdminView && (
            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 text-[#143628] rounded-md hover:bg-[#143628]/5 cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {mobileOpen && !isAdminView && (
        <div className="md:hidden border-t border-[#143628]/10 bg-[#FAF8F5] px-6 py-4 space-y-3">
          <nav className="flex flex-col gap-3 text-sm font-medium text-[#143628]">
            <a href="#inner-circle" onClick={() => setMobileOpen(false)} className="py-1.5">
              Inner Circle
            </a>
            <a href="#philosophy" onClick={() => setMobileOpen(false)} className="py-1.5">
              Philosophy
            </a>
            <a href="#gatherings" onClick={() => setMobileOpen(false)} className="py-1.5">
              Events &amp; Retreats
            </a>
            <a href="#membership" onClick={() => setMobileOpen(false)} className="py-1.5">
              Reserve Spot
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                setMobileOpen(false);
                onOpenAdmin();
              }}
              className="py-1.5"
            >
              Admin Login
            </a>
          </nav>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onPrimaryAction();
            }}
            className="w-full px-4 py-3 text-xs font-semibold text-[#FAF8F5] bg-[#143628] rounded-md cursor-pointer"
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </header>
  );
}
