import { useState, useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import MetricsBanner from '../components/landing/MetricsBanner';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import ArchitectureFlow from '../components/landing/ArchitectureFlow';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';
import AuthModal from '../components/landing/AuthModal';

export default function LandingPage({ currentUser, onLogin, onLogout }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('mailchat_theme');
    if (saved) return saved === 'dark';
    return true;
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('mailchat_theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('mailchat_theme', 'light');
    }
  }, [isDark]);

  const handleOpenAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">

      <Navbar
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenAuthModal={handleOpenAuthModal}
        currentUser={currentUser}
        onLogout={onLogout}
      />

      <main>

        <HeroSection
          onOpenAuthModal={handleOpenAuthModal}
          onScrollToFeatures={scrollToFeatures}
        />

        <MetricsBanner />

        <FeaturesGrid />

        <ArchitectureFlow />

        <CTASection onOpenAuthModal={handleOpenAuthModal} />
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        onAuthSuccess={onLogin}
      />
    </div>
  );
}
