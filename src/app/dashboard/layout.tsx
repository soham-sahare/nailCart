import Sidebar from '@/components/Sidebar';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
