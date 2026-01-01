import TopBar from '@/components/TopBar';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <TopBar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
