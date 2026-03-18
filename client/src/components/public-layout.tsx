import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { FyxLogo } from '@/components/fyx-logo';

function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>;
}

function LinkedInIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>;
}

function TwitterIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>;
}

export function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  useEffect(() => {
    const h = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const handleLogoClick = () => {
    if (location === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setLocation('/');
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled || mobileMenuOpen ? 'bg-white/95 backdrop-blur-2xl shadow-sm border-b border-gray-100' : 'bg-white/80 backdrop-blur-sm'}`}>
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 group cursor-pointer" onClick={handleLogoClick} data-testid="link-home-logo">
            <FyxLogo className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-bold text-gray-900">Fyx Cloud</span>
              <span className="text-[14px] font-medium text-[#007aff]">AI-SPM</span>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/features" className="text-gray-900 hover:text-[#007aff] transition-colors font-medium text-[14px]" data-testid="link-nav-features">Features</Link>
            <Link href="/pricing" className="text-gray-900 hover:text-[#007aff] transition-colors font-medium text-[14px]" data-testid="link-nav-pricing">Pricing</Link>
            <Link href="/compare" className="text-gray-900 hover:text-[#007aff] transition-colors font-medium text-[14px]" data-testid="link-nav-compare">Compare</Link>
            <Link href="/trust" className="text-gray-900 hover:text-[#007aff] transition-colors font-medium text-[14px]" data-testid="link-nav-trust">Trust</Link>
            <button onClick={() => setLocation('/login')} className="text-gray-900 hover:text-[#007aff] transition-colors font-medium text-[14px]" data-testid="button-landing-login">Sign In</button>
            <button onClick={() => setLocation('/signup')} className="bg-gray-900 text-white px-6 py-2.5 rounded-full hover:bg-gray-800 transition-all duration-300 font-semibold text-[14px] shadow-lg hover:shadow-xl hover:scale-105" data-testid="button-landing-signup">Get Started</button>
          </div>
          <button className="md:hidden text-gray-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="button-mobile-menu">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
            <Link href="/features" className="block text-gray-900 hover:text-[#007aff] font-medium text-[14px]" onClick={() => setMobileMenuOpen(false)}>Features</Link>
            <Link href="/pricing" className="block text-gray-900 hover:text-[#007aff] font-medium text-[14px]" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/compare" className="block text-gray-900 hover:text-[#007aff] font-medium text-[14px]" onClick={() => setMobileMenuOpen(false)}>Compare</Link>
            <Link href="/trust" className="block text-gray-900 hover:text-[#007aff] font-medium text-[14px]" onClick={() => setMobileMenuOpen(false)}>Trust</Link>
            <button onClick={() => { setMobileMenuOpen(false); setLocation('/login'); }} className="block w-full text-left text-gray-900 hover:text-[#007aff] font-medium text-[14px]" data-testid="link-mobile-login">Sign In</button>
            <button onClick={() => { setMobileMenuOpen(false); setLocation('/signup'); }} className="w-full bg-gray-900 text-white px-6 py-2.5 rounded-full font-semibold text-[14px]" data-testid="button-mobile-signup">Get Started</button>
          </div>
        )}
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 py-16 px-6">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-6" data-testid="link-footer-logo">
              <FyxLogo className="w-7 h-7" />
              <div className="flex items-baseline space-x-1">
                <span className="text-lg font-bold text-gray-900">Fyx Cloud</span>
                <span className="text-[14px] font-medium text-[#007aff]">AI-SPM</span>
              </div>
            </div>
            <p className="text-gray-900 text-[14px] leading-relaxed mb-6">
              AI Security Posture Management. Discover, monitor, and secure AI across your multi-cloud infrastructure.
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-gray-900 hover:text-[#007aff] transition-colors" data-testid="link-footer-twitter"><TwitterIcon className="w-5 h-5" /></a>
              <a href="#" className="text-gray-900 hover:text-[#007aff] transition-colors" data-testid="link-footer-github"><GithubIcon className="w-5 h-5" /></a>
              <a href="#" className="text-gray-900 hover:text-[#007aff] transition-colors" data-testid="link-footer-linkedin"><LinkedInIcon className="w-5 h-5" /></a>
            </div>
          </div>
          {[
            { title: 'Product', links: [
              { href: '/features', label: 'Features', tid: 'link-footer-features' },
              { href: '/pricing', label: 'Pricing', tid: 'link-footer-pricing' },
              { href: '/compare', label: 'Compare', tid: 'link-footer-compare' },
              { href: '/architecture', label: 'Architecture', tid: 'link-footer-architecture' },
            ]},
            { title: 'Company', links: [
              { href: '/trust', label: 'Trust & Security', tid: 'link-footer-trust' },
              { href: '/resources', label: 'Resources', tid: 'link-footer-blog' },
              { href: '/login', label: 'Dashboard', tid: 'link-footer-dashboard' },
            ]},
            { title: 'Legal', links: [
              { href: '/legal/privacy', label: 'Privacy Policy', tid: 'link-footer-privacy' },
              { href: '/legal/terms', label: 'Terms of Service', tid: 'link-footer-terms' },
              { href: '/legal/security', label: 'Security', tid: 'link-footer-security' },
              { href: '/legal/gdpr', label: 'GDPR', tid: 'link-footer-gdpr' },
            ]},
          ].map((col) => (
            <div key={col.title}>
              <h6 className="text-gray-900 font-semibold mb-4 text-[14px] uppercase tracking-wider">{col.title}</h6>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.tid}>
                    <Link href={link.href} className="text-gray-900 hover:text-[#007aff] transition-colors text-[14px]" data-testid={link.tid}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-900 text-[14px]">&copy; {new Date().getFullYear()} Fyx Cloud AI. All rights reserved.</p>
          <p className="text-gray-900 text-[14px]">AI Security Posture Management Platform</p>
        </div>
      </div>
    </footer>
  );
}
