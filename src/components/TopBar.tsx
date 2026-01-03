'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { FiHome, FiBox, FiGrid, FiLogOut, FiShoppingCart, FiMenu, FiX, FiBook, FiUsers, FiSettings } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import ThemeToggle from './ThemeToggle';
import styles from './TopBar.module.css';

export default function TopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  let links = [
    { name: 'Dashboard', href: '/dashboard', icon: FiHome },
    { name: 'Categories', href: '/dashboard/categories', icon: FiGrid },
    { name: 'Products', href: '/dashboard/products', icon: FiBox },
    { name: 'Sales', href: '/dashboard/sales', icon: FiShoppingCart },
    { name: 'Expenses', href: '/dashboard/expenses', icon: FaRupeeSign },
    { name: 'Ledger', href: '/dashboard/ledger', icon: FiBook },
    { name: 'Contacts', href: '/dashboard/contacts', icon: FiUsers },
  ];

  if (role === 'STAFF') {
      links = links.filter(link => ['Categories', 'Products', 'Sales', 'Contacts'].includes(link.name));
  } else if (role === 'OWNER') {
      links.push({ name: 'Manage', href: '/dashboard/manage', icon: FiSettings });
  }

  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
      if (role === 'OWNER') {
          const fetchCount = async () => {
              try {
                  const res = await fetch('/api/approvals?mode=count');
                  const data = await res.json();
                  if (data.success) {
                      setPendingCount(data.count);
                  }
              } catch (err) {
                  console.error('Failed to fetch approval count', err);
              }
          };
          fetchCount();
          const interval = setInterval(fetchCount, 30000); // Poll every 30s
          return () => clearInterval(interval);
      }
  }, [role]);

  return (
    <>
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

        {/* Desktop Nav */}
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
                {link.name === 'Manage' && pendingCount > 0 && (
                    <span style={{ 
                        background: '#ef4444', 
                        color: 'white', 
                        fontSize: '0.65rem', 
                        fontWeight: 'bold', 
                        minWidth: '16px', 
                        height: '16px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginLeft: '5px',
                        padding: '0 4px'
                    }}>
                        {pendingCount}
                    </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className={styles.actions}>
          <span className={styles.user}>{session?.user?.name || 'User'}</span>

          <ThemeToggle />
          <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: '/admin/login' })}>
            <FiLogOut size={18} />
          </button>
        </div>

        {/* Mobile Toggle */}
        <button className={styles.mobileMenuBtn} onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className={styles.mobileNav}>
          <div className={styles.mobileLinks}>
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.mobileLink} ${isActive ? styles.active : ''}`}
                >
                  <Icon size={20} />
                  <span>{link.name}</span>
                  {link.name === 'Manage' && pendingCount > 0 && (
                    <span style={{ 
                        background: '#ef4444', 
                        color: 'white', 
                        fontSize: '0.65rem', 
                        fontWeight: 'bold', 
                        minWidth: '18px', 
                        height: '18px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        marginLeft: 'auto',
                        marginRight: '1rem'
                    }}>
                        {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className={styles.mobileActions}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--surface)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image src="/logo.jpg" alt="U" width={40} height={40} style={{ borderRadius: '50%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{session?.user?.name || 'User'}</span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{role || 'Staff'}</span>
                </div>
             </div>

             
             <div style={{ display: 'flex', gap: '1rem' }}>
                <ThemeToggle />
                <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: '/admin/login' })}>
                    <FiLogOut size={20} />
                </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
