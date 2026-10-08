'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import NotificationBell from '@/components/NotificationBell';

// links: [{ href, label, exact? }]
export default function Shell({ links, children }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();

  return (
    <div className="shell">
      <header className="topbar">
        <Link href={links[0].href} className="brand">
          SNS <span>OneConnect</span>
        </Link>
        <div className="topbar-right">
          <NotificationBell />
          <span className="user-name">{profile.full_name}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
            Log out
          </button>
        </div>
      </header>

      <nav className="nav" aria-label="Main">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={active ? 'nav-link active' : 'nav-link'}
              aria-current={active ? 'page' : undefined}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <main className="content">{children}</main>
    </div>
  );
}
