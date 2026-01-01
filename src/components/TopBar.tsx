'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { FiHome, FiBox, FiGrid, FiLogOut } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import styles from './TopBar.module.css';

export default function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: FiHome },
    { name: 'Categories', href: '/dashboard/categories', icon: FiGrid },
    { name: 'Products', href: '/dashboard/products', icon: FiBox },
  ];

  return (
    <header className={`${styles.topBar} glass`}>
      {/* Left: Brand */}
      <div className={styles.brand}>
        <div style={{
             width: '40px',
             height: '40px',
             borderRadius: '50%',
             overflow: 'hidden',
             border: '2px solid rgba(255,255,255,0.5)',
        }}>
            <Image src="/logo.jpg" alt="Logo" width={40} height={40} style={{ objectFit: 'cover' }} />
        </div>
        <h1 className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 700 }}>NailCart</h1>
      </div>

      {/* Center: Navigation */}
      <nav className={styles.nav}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.link} ${isActive ? styles.active : ''}`}
            >
              <Icon size={18} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: User & Actions */}
      <div className={styles.actions}>
        <span className={styles.user}>{session?.user?.name || 'User'}</span>
        <ThemeToggle />
        <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: '/admin/login' })}>
          <FiLogOut size={18} />
        </button>
      </div>
    </header>
  );
}
