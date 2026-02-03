'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export default function NetBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    // Skip animation if on dashboard (canvas won't be rendered)
    if (pathname?.startsWith('/dashboard')) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    
    // Configuration
    const particleCount = 60; // Number of dots
    const connectionDistance = 150; // Max distance to draw line
    const particleSpeed = 0.5; // Base speed

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * particleSpeed,
          vy: (Math.random() - 0.5) * particleSpeed,
          size: Math.random() * 2 + 1,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Determine colors based on theme (fallback to light theme colors if theme is undefined initially)
      const isDark = theme === 'dark';
      const particleColor = isDark ? 'rgba(252, 107, 186, 0.6)' : 'rgba(252, 107, 186, 0.5)'; // Pinkish
      const lineColor = isDark ? 'rgba(252, 107, 186, 0.15)' : 'rgba(252, 107, 186, 0.2)';

      // Update and Draw Particles
      particles.forEach((p, index) => {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = particleColor;
        ctx.fill();

        // Connect Lines
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);

          if (dist < connectionDistance) {
            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1 - dist / connectionDistance; // Thinner as distance increases
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, pathname]);

  // Do not render on protected/dashboard pages
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  // Fixed position background
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
