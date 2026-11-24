interface FooterProps {
  onOpenAdmin: () => void;
  isAdminView: boolean;
}

export function Footer({ onOpenAdmin, isAdminView }: FooterProps) {
  return (
    <footer className="bg-[#143628] text-[#FAF8F5] py-14 border-t border-[#143628]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 pb-10 border-b border-[#FAF8F5]/15">
          <div className="max-w-sm">
            <p className="font-editorial text-2xl font-semibold">Vana Ritual</p>
            <p className="text-sm text-[#FAF8F5]/75 mt-2 leading-relaxed">
              Cold-pressed organic wellness shots dispatched weekly across Lahore, Islamabad,
              Rawalpindi, and Karachi—paired with daily habit architecture and seasonal retreats.
            </p>
          </div>

          <div className="flex flex-wrap gap-10 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#C59B27]">Journey</p>
              <ul className="space-y-1.5 text-[#FAF8F5]/80">
                <li>
                  <a href="#inner-circle" className="hover:text-[#FAF8F5]">
                    Join Inner Circle
                  </a>
                </li>
                <li>
                  <a href="#philosophy" className="hover:text-[#FAF8F5]">
                    30-Day Habit Philosophy
                  </a>
                </li>
                <li>
                  <a href="#gatherings" className="hover:text-[#FAF8F5]">
                    Events &amp; Retreats
                  </a>
                </li>
                <li>
                  <a href="#membership" className="hover:text-[#FAF8F5]">
                    Reserve Spot
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#C59B27]">Dispatch &amp; Operations</p>
              <ul className="space-y-1.5 text-[#FAF8F5]/80">
                <li>Monday 06:00–09:00 PKT Cold-Chain</li>
                <li>Lahore · Islamabad · Rawalpindi · Karachi</li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="underline underline-offset-4 hover:text-[#FAF8F5] cursor-pointer"
                  >
                    {isAdminView ? 'Viewing Brand Admin (/admin)' : 'Brand Admin Dashboard (/admin)'}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#FAF8F5]/60">
          <p>© {new Date().getFullYear()} Vana Ritual Organics. All rights reserved.</p>
          <p>Organic cold-pressed formulations crafted in Pakistan.</p>
        </div>
      </div>
    </footer>
  );
}
