import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield, ArrowRight, Search, Bug, Fingerprint, Scale, Server,
  Lock, Eye, FileSearch, Zap, ScanLine,
  Layers, GitBranch, Box, CheckCircle, Terminal, ChevronRight,
  Network, Database, Cloud, AlertTriangle, BarChart3, Settings,
  Brain, Cpu, ChevronDown, Check
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

const features = [
  {
    icon: Search, title: 'AI Model Discovery',
    description: 'Automatically discover and catalog all AI models across your cloud infrastructure.',
    details: ['Auto-scan cloud environments for ML models', 'Support for 50+ model formats', 'Track model lineage and versioning', 'Identify shadow AI and unmanaged models'],
    gradient: 'from-[#007aff] to-[#00a8ff]',
  },
  {
    icon: Shield, title: 'Security Posture Assessment',
    description: 'Continuously evaluate security posture with automated vulnerability scanning and risk scoring.',
    details: ['OWASP ML Top 10 vulnerability checks', 'Model serialization attack detection', 'Adversarial robustness testing', 'Supply chain risk analysis'],
    gradient: 'from-[#A6E247] to-[#7bc62d]',
  },
  {
    icon: Bug, title: 'Vulnerability Detection',
    description: 'Identify vulnerabilities in model files, training pipelines, and inference endpoints.',
    details: ['Pickle deserialization exploit detection', 'Model backdoor and trojan scanning', 'Data poisoning indicators', 'Prompt injection assessment'],
    gradient: 'from-[#f97316] to-[#ef4444]',
  },
  {
    icon: Eye, title: 'Data Security & Privacy',
    description: 'Monitor and protect sensitive data flowing through AI systems.',
    details: ['PII detection in training datasets', 'Data lineage tracking', 'Sensitive data classification', 'Data residency compliance'],
    gradient: 'from-[#8b5cf6] to-[#7c3aed]',
  },
  {
    icon: Scale, title: 'Compliance & Governance',
    description: 'Meet regulatory requirements with built-in compliance frameworks.',
    details: ['EU AI Act readiness assessment', 'NIST AI RMF alignment', 'SOC 2 AI control mapping', 'ISO 42001 compliance tracking'],
    gradient: 'from-[#007aff] to-[#6366f1]',
  },
  {
    icon: Network, title: 'Security Graph Visualization',
    description: 'Visualize relationships between AI models, data sources, and resources.',
    details: ['Interactive topology map', 'Attack path analysis', 'Blast radius simulation', 'Relationship-based risk scoring'],
    gradient: 'from-[#06b6d4] to-[#0891b2]',
  },
  {
    icon: AlertTriangle, title: 'Threat Detection & Response',
    description: 'Real-time monitoring for anomalous behavior and potential attacks.',
    details: ['Model inference anomaly detection', 'Automated alert routing', 'Incident response playbooks', 'SIEM/SOAR integration'],
    gradient: 'from-[#f59e0b] to-[#d97706]',
  },
  {
    icon: GitBranch, title: 'CI/CD Pipeline Security',
    description: 'Integrate AI security checks directly into your ML pipelines.',
    details: ['Pre-deployment security gates', 'GitHub Actions & GitLab CI', 'Model registry scanning', 'Automated policy enforcement'],
    gradient: 'from-[#A6E247] to-[#22c55e]',
  },
  {
    icon: Lock, title: 'Access Control & RBAC',
    description: 'Granular role-based access control for managing AI model access.',
    details: ['Org and project-level permissions', 'Multi-tenant support', 'API key management', 'Full audit trail'],
    gradient: 'from-[#ec4899] to-[#be185d]',
  },
  {
    icon: BarChart3, title: 'Reporting & Analytics',
    description: 'Generate comprehensive security reports with remediation guidance.',
    details: ['PDF and CSV export', 'Customizable templates', 'Trend analysis dashboards', 'Risk score benchmarking'],
    gradient: 'from-[#14b8a6] to-[#0d9488]',
  },
  {
    icon: Cloud, title: 'Multi-Cloud Support',
    description: 'Monitor AI assets across AWS, Azure, GCP, and on-premise from a single pane.',
    details: ['Cloud-native connectors', 'Kubernetes cluster scanning', 'On-premise registry support', 'Hybrid deployment monitoring'],
    gradient: 'from-[#007aff] to-[#00a8ff]',
  },
  {
    icon: Settings, title: 'Policy Engine',
    description: 'Define and enforce security policies with customizable rules and automation.',
    details: ['Custom policy creation', 'Policy-as-code support', 'Automated remediation', 'Webhook alerting'],
    gradient: 'from-[#6366f1] to-[#8b5cf6]',
  },
];

const modelFormats = ['ONNX', 'SafeTensors', 'PyTorch (.pt)', 'TensorFlow (.pb)', 'Keras (.h5)', 'Pickle (.pkl)', 'GGUF', 'GGML', 'CoreML', 'TFLite', 'OpenVINO', 'JAX'];

export default function FeaturesPage() {
  const [, setLocation] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white font-['Rubik']">
      <PublicNavbar />

      <section className="pt-28 pb-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <FadeIn>
            <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-5 py-2.5 mb-7">
              <Layers className="w-4 h-4 text-[#007aff]" />
              <span className="text-gray-900 text-[14px] font-medium" data-testid="badge-features">Platform Capabilities</span>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6" data-testid="text-features-heading">
              Everything you need to
              <br />
              <span className="text-[#007aff]">secure AI</span>
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-lg md:text-xl text-gray-900 max-w-2xl mx-auto mb-10 leading-relaxed" data-testid="text-features-subtitle">
              Comprehensive security posture management for your AI and machine learning infrastructure, from model discovery to compliance reporting.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => setLocation('/signup')} className="group bg-gray-900 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:bg-gray-800 hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center space-x-3" data-testid="button-features-hero-signup">
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link href="/pricing" className="group border border-gray-200 text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 inline-flex items-center space-x-3" data-testid="button-features-hero-pricing">
                <span>View Pricing</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-24 bg-[#f8fafc]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <FadeIn>
              <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-4 py-1.5 mb-6">
                <Cpu className="w-3.5 h-3.5 text-[#007aff]" />
                <span className="text-[#007aff] text-[14px] font-semibold uppercase tracking-wider">12 Core Modules</span>
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
                Full-Spectrum <span className="text-[#007aff]">AI Security</span>
              </h2>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="text-gray-900 text-lg max-w-2xl mx-auto">
                Every module works together to give you complete visibility and control over your AI security posture.
              </p>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <FadeIn key={idx} delay={idx * 60}>
                <div className="bg-white border border-gray-200 rounded-2xl p-7 h-full flex flex-col hover:shadow-lg hover:border-gray-300 transition-all duration-300 group" data-testid={`card-feature-${idx}`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg mb-3" data-testid={`text-feature-title-${idx}`}>{feature.title}</h3>
                  <p className="text-gray-900 text-[14px] leading-relaxed mb-5">{feature.description}</p>
                  <ul className="space-y-2.5 mt-auto">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14px]">
                        <div className="w-4 h-4 rounded-full bg-[#007aff]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-[#007aff]" />
                        </div>
                        <span className="text-gray-900">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 text-center">
          <FadeIn>
            <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-4 py-1.5 mb-6">
              <Brain className="w-3.5 h-3.5 text-[#007aff]" />
              <span className="text-[#007aff] text-[14px] font-semibold uppercase tracking-wider">Model Support</span>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6" data-testid="text-supported-heading">
              Supported <span className="text-[#007aff]">Model Formats</span>
            </h2>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-gray-900 text-lg mb-16 max-w-2xl mx-auto">
              Fyx Cloud AI supports scanning and securing models across all major frameworks and formats.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
              {modelFormats.map((format, i) => (
                <div key={i} className="bg-[#f8fafc] border border-gray-200 rounded-xl p-4 text-center font-mono text-[14px] text-gray-900 hover:border-[#007aff]/30 hover:shadow-md hover:bg-white transition-all duration-300" data-testid={`badge-format-${i}`}>
                  {format}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-24 bg-[#f8fafc]">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight" data-testid="text-cta-heading">
              Ready to secure
              <br />
              <span className="text-[#007aff]">your AI?</span>
            </h2>
          </FadeIn>
          <FadeIn delay={100}>
            <p className="text-gray-900 text-lg mb-10 max-w-xl mx-auto">
              Start discovering and protecting your AI models in minutes. No credit card required.
            </p>
          </FadeIn>
          <FadeIn delay={200}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setLocation('/signup')} className="group bg-gray-900 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-gray-800 hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-features-cta-signup">
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link href="/pricing" className="group border border-gray-200 text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:border-gray-300 hover:bg-white transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-features-cta-pricing">
                <span>View Pricing</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
