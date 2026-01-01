import Link from 'next/link';
import Image from 'next/image';
import { FiArrowRight, FiMapPin, FiPhone, FiInstagram } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Navbar with blur */}
      {/* Floating Controls */}
      <div style={{
        position: 'absolute',
        top: '1.5rem',
        right: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        zIndex: 50
      }}>
        <ThemeToggle />
         {/*<Link href="/login" style={{ fontWeight: 600, opacity: 0.8 }}>Log In</Link>
        <Link href="/signup" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}>Sign Up</Link> */}
      </div>

      {/* Hero Section */}
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
            <div style={{
                position: 'absolute',
                inset: '-20px',
                background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
                borderRadius: '50%',
                opacity: 0.3,
                filter: 'blur(20px)',
                zIndex: -1,
                animation: 'pulse-glow 4s ease-in-out infinite'
            }}></div>
            <Image 
                src="/logo.jpg" 
                alt="NailCart Brand" 
                width={160} 
                height={160} 
                style={{ 
                    borderRadius: '50%', 
                    border: '4px solid rgba(255,255,255,0.2)'
                }}
                className="glass" 
            />
        </div>

        <h1 className="gradient-text" style={{
          fontSize: 'clamp(4rem, 8vw, 6rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '1.5rem',
          letterSpacing: '-0.03em'
        }}>
          NailCart
        </h1>
        <p style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--foreground)',
          marginBottom: '1rem',
          maxWidth: '800px'
        }}>
          Your partner in Nail Excellence
        </p>
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--foreground)',
          opacity: 0.8,
          marginBottom: '3rem',
          fontWeight: 500
        }}>
          Pan India shipping ✈️
        </p>

        {/* <Link href="/signup" className="btn-primary" style={{
          fontSize: '1.25rem',
          padding: '1rem 2.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          Get Started Now <FiArrowRight />
        </Link> */}
      </div>

      {/* Footer / Store Details Section */}
      <footer style={{ 
          background: 'var(--background)', 
          padding: '4rem 2rem 2rem 2rem',
          color: 'var(--foreground)'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--foreground)' }}>Our Store</h3>
                
                <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
                    Find the store location on - <a href="https://maps.google.com/?q=Shraddha+Chowk,+Plot+No.+14,+Opp.+SS+Collection,+Chakradhar+Nagar,+Jawahar+Nagar,+Ayodhya+Nagar,+Nagpur,+Maharashtra+440024" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--foreground)' }}>Google Maps Location</a>
                </p>

                <p style={{ lineHeight: 1.6, opacity: 0.8, marginBottom: '1rem', maxWidth: '400px' }}>
                    Shraddha Chowk, Plot No. 14, Opp. SS Collection,<br/>
                    Chakradhar Nagar, Jawahar Nagar, Ayodhya Nagar,<br/>
                    Nagpur, Maharashtra 440024
                </p>

                <p style={{ fontWeight: 600, opacity: 0.9 }}>
                    <a href="tel:+918600220632" style={{ textDecoration: 'underline', color: 'inherit' }}>+91 8600220632</a>
                </p>
            </div>

            <div style={{ 
                borderTop: '1px solid var(--border)', 
                paddingTop: '2rem', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--foreground)', transition: 'opacity 0.2s', opacity: 0.8 }}>
                        <FiInstagram size={20} />
                    </a>
                    <a href="https://wa.me/918600220632?text=Hello,%20I'm%20interested%20in%20your%20nail%20products" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--foreground)', transition: 'opacity 0.2s', opacity: 0.8 }}>
                        <FaWhatsapp size={20} />
                    </a>
                </div>
                
                <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>
                    Made with ❤️ by <a href="https://sohamsahare.vercel.app" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', fontWeight: 600, color: 'var(--foreground)' }}>sohamsahare</a>
                </p>
            </div>
        </div>
      </footer>
    </main>
  );
}
