import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield, ArrowRight, Check, Lock, Eye, ShieldCheck,
  Menu, X, KeyRound, Server, Users, Fingerprint,
  Database, Cloud, AlertTriangle, BookOpen, Globe, FileCheck,
  MonitorSmartphone, Scale, Zap, Brain, Bot, Radio
} from 'lucide-react';
import { FyxLogo } from '@/components/fyx-logo';
import { PublicNavbar, PublicFooter } from '@/components/public-layout';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, isVisible } = useInView(0.1);
  return (
    <div ref={ref} className={className} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms` }}>
      {children}
    </div>
  );
}

const platformSecurity = [
  { icon: Cloud, title: 'Cloud-Native Architecture', desc: 'Fyx integrates via secure APIs and does not require agents or intrusive access.' },
  { icon: KeyRound, title: 'Least Privilege Access', desc: 'All integrations use read-only roles with scoped permissions.' },
  { icon: Lock, title: 'Encryption', desc: 'Data in transit: TLS 1.2+. Data at rest: AES-256 encryption. Optional customer-managed keys (CMEK).' },
];

const dataProtection = [
  { icon: Brain, title: 'No Data Training', desc: 'Fyx never uses your data to train AI models.' },
  { icon: Database, title: 'Data Isolation', desc: 'Each customer environment is logically isolated.' },
  { icon: Eye, title: 'Sensitive Data Handling', desc: 'PII/PHI detection is performed securely without exposing raw data.' },
];

const identityAccess = [
  { icon: Users, label: 'Role-based access control (RBAC)' },
  { icon: Globe, label: 'SSO integration (SAML / OAuth)' },
  { icon: Fingerprint, label: 'Multi-factor authentication (MFA)' },
  { icon: Shield, label: 'Session-based authentication' },
];

const compliance = [
  { label: 'EU AI Act (2026 readiness)', status: 'Ready' },
  { label: 'NIST AI Risk Management Framework', status: 'Aligned' },
  { label: 'ISO 42001 (AI Management Systems)', status: 'Aligned' },
  { label: 'SOC 2', status: 'In Progress' },
  { label: 'GDPR & UK Data Protection Act', status: 'Compliant' },
];

const aiControls = [
  { icon: Shield, title: 'AI Guardrails Monitoring', desc: 'Ensures safety filters are active across models.' },
  { icon: AlertTriangle, title: 'Prompt Security', desc: 'Detects and prevents prompt injection attacks.' },
  { icon: Brain, title: 'Model Governance', desc: 'Tracks model lineage, versions, and usage.' },
  { icon: Database, title: 'Data Lineage', desc: 'Ensures full traceability of training and RAG data.' },
];

const responsible = [
  'Transparent AI governance',
  'Ethical AI usage',
  'Human-in-the-loop enforcement for high-risk systems',
  'Bias and fairness monitoring support',
];

const incident = [
  'Continuous monitoring of platform activity',
  'Real-time alerting for suspicious behavior',
  'Defined incident response processes',
  'Customer notification procedures',
];

export default function TrustPage() {
  const [, setLocation] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white font-['Rubik']">
      <PublicNavbar />

      <section className="pt-28 pb-16 bg-white">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-5 py-2.5 mb-7">
                <div className="w-2 h-2 rounded-full bg-[#007aff] animate-pulse" />
                <span className="text-[#007aff] text-[14px] font-medium" data-testid="badge-trust">Trust & Security</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6" data-testid="text-trust-heading">
                Built for Trust. Designed for <span className="bg-gradient-to-r from-[#007aff] via-[#00a8ff] to-[#6366f1] bg-clip-text text-transparent">AI Security.</span>
              </h1>
              <p className="text-gray-900 text-lg leading-relaxed mb-4">
                Enterprise-grade security and compliance for the AI era.
              </p>
              <p className="text-gray-900 text-[14px] leading-relaxed max-w-2xl mx-auto">
                Fyx Cloud AI is built with the same principles it enforces: strong identity controls, secure data handling, and continuous monitoring. We help you secure your AI — and we hold ourselves to the highest security standards.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Platform <span className="text-[#007aff]">Security</span></h2>
              <p className="text-gray-900 text-base max-w-xl mx-auto">Security is foundational to everything we build.</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {platformSecurity.map((s, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="bg-white border border-gray-100 rounded-2xl p-7 h-full hover:shadow-lg hover:border-gray-200 transition-all duration-300" data-testid={`card-security-${i}`}>
                  <div className="w-12 h-12 rounded-xl bg-[#007aff]/10 flex items-center justify-center mb-5">
                    <s.icon className="w-6 h-6 text-[#007aff]" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-900 text-[14px] leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start max-w-5xl mx-auto">
            <div>
              <FadeIn>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Data <span className="text-[#007aff]">Protection</span></h2>
                <p className="text-gray-900 text-[14px] leading-relaxed mb-8">Your data is your most valuable asset. Here's how we protect it.</p>
              </FadeIn>
              <div className="space-y-5">
                {dataProtection.map((d, i) => (
                  <FadeIn key={i} delay={i * 80}>
                    <div className="flex items-start space-x-4 bg-gray-50 border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-all" data-testid={`card-data-${i}`}>
                      <div className="w-10 h-10 rounded-xl bg-[#007aff]/10 flex items-center justify-center shrink-0">
                        <d.icon className="w-5 h-5 text-[#007aff]" />
                      </div>
                      <div>
                        <h4 className="text-gray-900 font-bold text-[15px] mb-1">{d.title}</h4>
                        <p className="text-gray-900 text-[14px] leading-relaxed">{d.desc}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
            <div>
              <FadeIn>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Identity & <span className="text-[#007aff]">Access Control</span></h2>
                <p className="text-gray-900 text-[14px] leading-relaxed mb-8">Enterprise-ready access management for your team.</p>
              </FadeIn>
              <div className="space-y-4">
                {identityAccess.map((ia, i) => (
                  <FadeIn key={i} delay={i * 80}>
                    <div className="flex items-center space-x-4 bg-gray-50 border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-all" data-testid={`card-identity-${i}`}>
                      <div className="w-10 h-10 rounded-lg bg-[#007aff]/10 flex items-center justify-center shrink-0">
                        <ia.icon className="w-5 h-5 text-[#007aff]" />
                      </div>
                      <span className="text-gray-900 text-[14px] font-medium">{ia.label}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Compliance & <span className="text-[#007aff]">Certifications</span></h2>
              <p className="text-gray-900 text-base max-w-xl mx-auto">Fyx supports and aligns with major AI governance frameworks.</p>
            </div>
          </FadeIn>
          <div className="max-w-2xl mx-auto space-y-3">
            {compliance.map((c, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-6 py-4 hover:shadow-md hover:border-gray-200 transition-all" data-testid={`compliance-${i}`}>
                  <div className="flex items-center space-x-3">
                    <FileCheck className="w-5 h-5 text-[#007aff]" />
                    <span className="text-gray-900 font-medium text-[14px]">{c.label}</span>
                  </div>
                  <span className={`text-[13px] font-semibold px-3 py-1 rounded-full ${c.status === 'In Progress' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{c.status}</span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">AI-Specific <span className="text-[#007aff]">Security Controls</span></h2>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {aiControls.map((c, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-6 h-full hover:shadow-lg hover:border-gray-200 transition-all duration-300" data-testid={`card-ai-control-${i}`}>
                  <div className="w-11 h-11 rounded-xl bg-[#007aff]/10 flex items-center justify-center mb-4">
                    <c.icon className="w-5 h-5 text-[#007aff]" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-[15px] mb-2">{c.title}</h3>
                  <p className="text-gray-900 text-[14px] leading-relaxed">{c.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <FadeIn>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Responsible AI <span className="text-[#007aff]">Commitment</span></h2>
              </FadeIn>
              <div className="space-y-3">
                {responsible.map((r, i) => (
                  <FadeIn key={i} delay={i * 60}>
                    <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-5 py-4">
                      <Check className="w-5 h-5 text-[#007aff] shrink-0 mt-0.5" />
                      <span className="text-gray-900 text-[14px] font-medium">{r}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
            <div>
              <FadeIn>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Incident <span className="text-[#007aff]">Response</span></h2>
              </FadeIn>
              <div className="space-y-3">
                {incident.map((r, i) => (
                  <FadeIn key={i} delay={i * 60}>
                    <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-5 py-4">
                      <ShieldCheck className="w-5 h-5 text-[#007aff] shrink-0 mt-0.5" />
                      <span className="text-gray-900 text-[14px] font-medium">{r}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">Security You Can Trust. Visibility You Can Act On.</h2>
            <p className="text-gray-900 text-lg mb-10 max-w-xl mx-auto">
              Built with the same security principles we enforce for our customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setLocation('/signup')} className="group bg-[#007aff] text-white px-8 py-4 rounded-full font-bold text-base shadow-xl shadow-[#007aff]/20 hover:shadow-[#007aff]/40 hover:scale-105 transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-trust-cta">
                <span>Learn More About Our Security</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
