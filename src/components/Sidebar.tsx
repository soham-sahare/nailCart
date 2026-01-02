'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { FiHome, FiBox, FiGrid, FiLogOut, FiShoppingCart, FiBook } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { name: 'Overview', href: '/dashboard', icon: FiHome },
    { name: 'Categories', href: '/dashboard/categories', icon: FiGrid },
    { name: 'Products', href: '/dashboard/products', icon: FiBox },
    { name: 'Sales', href: '/dashboard/sales', icon: FiShoppingCart },
    { name: 'Expenses', href: '/dashboard/expenses', icon: FaRupeeSign },
    { name: 'Ledger', href: '/dashboard/ledger', icon: FiBook },
  ];

  return (
    <div className={`${styles.sidebar} glass`}>
      <div className={styles.header}>
        <div style={{ 
             width: '50px', 
             height: '50px', 
             borderRadius: '50%', 
             overflow: 'hidden', 
             border: '2px solid rgba(255,255,255,0.5)',
             margin: '0 auto 1rem auto'
        }}>
            <Image src="/logo.jpg" alt="Logo" width={50} height={50} style={{ objectFit: 'cover' }} />
        </div>
        <h1 className="gradient-text" style={{ fontSize: '1.25rem', textAlign: 'center' }}>NailCart</h1>
        <p className={styles.user}>{session?.user?.name || 'User'}</p>
      </div>

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
              <Icon size={20} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <ThemeToggle />
        </div>
        <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: '/admin/login' })}>
          <FiLogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
