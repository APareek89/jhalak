"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TenantHeader({
  slug, name, displayClass, headerClass, accentBg, wa, tabs,
}: {
  slug: string; name: string; displayClass: string; headerClass: string;
  accentBg: string; wa: string;
  tabs: { products: boolean; gallery: boolean; contact: boolean };
}) {
  const path = usePathname();
  const base = `/s/${slug}`;
  const items = [
    { href: base, label: "Home", show: true },
    { href: `${base}/products`, label: "Our Products", show: tabs.products },
    { href: `${base}/gallery`, label: "Gallery", show: tabs.gallery },
    { href: `${base}#contact`, label: "Contact", show: tabs.contact },
  ].filter((i) => i.show);

  return (
    <header className={`sticky top-0 z-20 backdrop-blur ${headerClass}`}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
        <Link href={base} className={`${displayClass} text-xl shrink-0`}>{name}</Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {items.map((i) => {
            const active = path === i.href;
            return (
              <Link
                key={i.label}
                href={i.href}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm transition ${
                  active ? "font-semibold underline underline-offset-8" : "opacity-75 hover:opacity-100"
                }`}
              >
                {i.label}
              </Link>
            );
          })}
        </div>
        {wa && (
          <a href={wa} className={`shrink-0 rounded-full ${accentBg} text-white px-4 py-2 text-sm font-medium transition hidden sm:block`}>
            WhatsApp us
          </a>
        )}
      </div>
    </header>
  );
}
