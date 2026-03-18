import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield, ArrowRight, Check, ChevronRight, ChevronDown,
  Menu, X, Zap, Cloud, Brain, Database, Bot, KeyRound,
  Server, HelpCircle, BookOpen, Sparkles, Crown, Building2, Star
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

type Interval = 'monthly' | 'annual';

const plans = [
  {
    name: 'Free',
    slug: 'free',
    icon: Sparkles,
    price: { monthly: 0, annual: 0 },
    maxUnits: 100,
    best: 'Evaluation & small teams',
    cta: 'Start Free Scan',
    ctaStyle: 'outline' as const,
    features: [
      'Up to 100 AI assets',
      'Basic AI-BOM inventory',
      'Shadow AI detection (limited)',
      'Core risk detection (top 20 rules)',
      'Single cloud integration (AWS or Azure or GCP)',
      'Dashboard access',
    ],
    limitations: [
      'No toxic path analysis',
      'No compliance reporting',
      'No automation',
    ],
  },
  {
    name: 'Starter',
    slug: 'starter',
    icon: Star,
    price: { monthly: 99, annual: 996 },
    maxUnits: 500,
    best: 'Scaling AI teams',
    cta: 'Start Free Trial',
    ctaStyle: 'outline' as const,
    features: [
      'Up to 500 AI assets',
      'Full AI-BOM inventory',
      'Shadow AI detection (full)',
      '100+ AI-SPM detection rules',
      'Toxic Path Analysis',
      'Multi-cloud support (AWS + Azure + GCP)',
      'Data supply chain visibility (RAG lineage)',
      'Basic compliance mapping (EU AI Act, NIST)',
      'Email alerts',
      'Weekly posture reports',
    ],
    limitations: [],
  },
  {
    name: 'Professional',
    slug: 'professional',
    icon: Crown,
    price: { monthly: 499, annual: 4992 },
    maxUnits: 5000,
    best: 'Regulated and large-scale environments',
    popular: true,
    cta: 'Book Demo',
    ctaStyle: 'primary' as const,
    features: [
      'Up to 5,000 AI assets',
      'Full AI-SPM coverage across all clouds',
      'Advanced Toxic Path Analysis (graph engine)',
      'Real-time runtime protection',
      'Custom policy engine',
      'Compliance automation (EU AI Act, ISO 42001, SOC2)',
      'Audit-ready reporting',
      'API access',
      'SIEM/SOAR integrations',
      'Role-based access control',
      'Dedicated onboarding support',
    ],
    limitations: [],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    icon: Building2,
    price: { monthly: 1499, annual: 14988 },
    maxUnits: 50000,
    best: 'Highly regulated industries (Finance, Healthcare)',
    cta: 'Contact Sales',
    ctaStyle: 'outline' as const,
    features: [
      'Up to 50,000 AI assets',
      'Everything in Professional',
      'Dedicated AI Security Architect',
      'Custom rule development',
      'Data residency controls',
      'Private deployment options',
      'Continuous compliance monitoring',
      'Unlimited connectors & team members',
      'SLA guarantee',
    ],
    limitations: [],
  },
];

const aiAssets = [
  { icon: Brain, label: 'Models (Bedrock, Vertex, Azure OpenAI)' },
  { icon: Server, label: 'Inference endpoints' },
  { icon: Bot, label: 'AI agents' },
  { icon: Database, label: 'Knowledge bases' },
  { icon: Database, label: 'Vector databases' },
  { icon: Zap, label: 'Training jobs' },
  { icon: KeyRound, label: 'AI-specific IAM identities' },
];

const faqs = [
  { q: 'How is pricing calculated?', a: 'Pricing is based on the number of AI assets discovered and monitored across your cloud environments. You only pay for what you use.' },
  { q: 'What is considered an AI asset?', a: 'Any resource involved in the AI lifecycle, including models, datasets, agents, inference endpoints, knowledge bases, vector databases, and AI-specific IAM identities.' },
  { q: 'Do you support multi-cloud environments?', a: 'Yes. Fyx supports AWS, Azure, and GCP in a unified platform. Multi-cloud support is available on Starter plans and above.' },
  { q: 'Is there a free trial?', a: 'Yes. You can start with a free scan to discover your AI exposure. The Free tier includes up to 100 AI assets with no time limit.' },
  { q: 'Can I change plans at any time?', a: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.' },
  { q: 'Do you require agents to be installed?', a: 'No. Fyx uses agentless, read-only API integrations. Setup takes less than 15 minutes with no infrastructure changes required.' },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>('monthly');
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
                <span className="text-[#007aff] text-[14px] font-medium" data-testid="badge-pricing">Transparent Pricing</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6" data-testid="text-pricing-heading">
                Flexible Pricing for Every Stage of <span className="bg-gradient-to-r from-[#007aff] via-[#00a8ff] to-[#6366f1] bg-clip-text text-transparent">AI Adoption</span>
              </h1>
              <p className="text-gray-900 text-lg leading-relaxed mb-4">
                From early experimentation to enterprise-scale AI governance — Fyx scales with you.
              </p>
              <p className="text-gray-900 text-[14px] leading-relaxed max-w-2xl mx-auto">
                Whether you're just starting your AI journey or managing complex multi-cloud AI environments, Fyx Cloud AI provides transparent, scalable pricing. Start with full visibility, and expand into advanced governance, automation, and compliance as your AI footprint grows.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-8 max-w-3xl mx-auto">
              <div className="flex items-center space-x-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#007aff]/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#007aff]" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold text-lg">Pricing Based on AI Asset Coverage</h3>
                  <p className="text-gray-900 text-[14px]">Not traditional cloud resources — just the AI assets that matter.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {aiAssets.map((a, i) => (
                  <div key={i} className="flex items-center space-x-2 bg-white border border-gray-100 rounded-xl px-3 py-2.5" data-testid={`asset-type-${i}`}>
                    <a.icon className="w-4 h-4 text-[#007aff] shrink-0" />
                    <span className="text-gray-900 text-[13px] font-medium leading-snug">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="flex items-center justify-center mb-12">
              <div className="bg-white border border-gray-200 rounded-full p-1 inline-flex shadow-sm">
                <button
                  onClick={() => setInterval('monthly')}
                  className={`px-6 py-2.5 rounded-full text-[14px] font-semibold transition-all ${interval === 'monthly' ? 'bg-[#007aff] text-white shadow-md' : 'text-gray-900 hover:bg-gray-50'}`}
                  data-testid="button-pricing-monthly"
                >
                  Monthly
                </button>
                <button
                  onClick={() => setInterval('annual')}
                  className={`px-6 py-2.5 rounded-full text-[14px] font-semibold transition-all ${interval === 'annual' ? 'bg-[#007aff] text-white shadow-md' : 'text-gray-900 hover:bg-gray-50'}`}
                  data-testid="button-pricing-annual"
                >
                  Annual <span className="text-[12px] ml-1 opacity-80">Save ~17%</span>
                </button>
              </div>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan, idx) => (
              <FadeIn key={plan.slug} delay={idx * 80}>
                <div
                  className={`relative bg-white rounded-3xl border-2 p-7 flex flex-col h-full transition-all duration-300 hover:shadow-xl ${plan.popular ? 'border-[#007aff] shadow-lg shadow-[#007aff]/10' : 'border-gray-100 hover:border-gray-200'}`}
                  data-testid={`card-plan-${plan.slug}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#007aff] text-white text-[12px] font-bold px-4 py-1 rounded-full shadow-md">
                      Most Popular
                    </div>
                  )}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${plan.popular ? 'bg-[#007aff]/10' : 'bg-gray-100'}`}>
                    <plan.icon className={`w-5 h-5 ${plan.popular ? 'text-[#007aff]' : 'text-gray-900'}`} />
                  </div>
                  <h3 className="text-gray-900 font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-gray-900 text-[13px] mb-5">{plan.best}</p>

                  <div className="mb-6">
                    {plan.price.monthly === 0 ? (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">$0</span>
                        <span className="text-gray-900 text-[14px] ml-2">forever</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900">
                          ${interval === 'monthly' ? plan.price.monthly : Math.round(plan.price.annual / 12)}
                        </span>
                        <span className="text-gray-900 text-[14px] ml-2">/mo</span>
                      </div>
                    )}
                    {plan.price.monthly > 0 && interval === 'annual' && (
                      <p className="text-[#007aff] text-[13px] mt-1 font-medium">${plan.price.annual}/year billed annually</p>
                    )}
                    <p className="text-gray-900 text-[13px] mt-1">Up to {plan.maxUnits.toLocaleString()} AI assets</p>
                  </div>

                  <button
                    onClick={() => plan.slug === 'enterprise' ? setLocation('/signup') : setLocation('/signup')}
                    className={`w-full py-3 rounded-xl font-semibold text-[14px] transition-all duration-300 mb-6 ${
                      plan.ctaStyle === 'primary'
                        ? 'bg-[#007aff] text-white shadow-lg shadow-[#007aff]/20 hover:shadow-[#007aff]/40 hover:scale-[1.02]'
                        : 'bg-white border-2 border-gray-200 text-gray-900 hover:border-[#007aff] hover:text-[#007aff]'
                    }`}
                    data-testid={`button-plan-${plan.slug}`}
                  >
                    {plan.cta}
                  </button>

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px]">
                        <Check className="w-4 h-4 text-[#007aff] shrink-0 mt-0.5" />
                        <span className="text-gray-900">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {plan.limitations.map((l, i) => (
                        <p key={i} className="flex items-start gap-2.5 text-[13px] text-gray-900 mb-1.5">
                          <X className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                          <span>{l}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={200}>
            <div className="flex flex-wrap justify-center gap-6 mt-12">
              {[
                { icon: Zap, text: 'No agents required' },
                { icon: Cloud, text: '15-minute setup' },
                { icon: Shield, text: 'Scales with your AI usage' },
                { icon: Check, text: 'Transparent asset-based pricing' },
              ].map((h, i) => (
                <div key={i} className="flex items-center space-x-2 text-[14px] text-gray-900">
                  <h.icon className="w-4 h-4 text-[#007aff]" />
                  <span className="font-medium">{h.text}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6 max-w-3xl">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-4 py-1.5 mb-6">
                <HelpCircle className="w-3.5 h-3.5 text-[#007aff]" />
                <span className="text-[#007aff] text-[14px] font-semibold uppercase tracking-wider">FAQ</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
            </div>
          </FadeIn>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 50}>
                <div className="border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left"
                    data-testid={`button-faq-${i}`}
                  >
                    <span className="text-gray-900 font-semibold text-[15px] pr-4">{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-[#007aff] shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 pb-5' : 'max-h-0'}`}>
                    <p className="px-5 text-gray-900 text-[14px] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">Start Securing Your AI Today</h2>
            <p className="text-gray-900 text-lg mb-10 max-w-xl mx-auto">
              AI innovation is accelerating. Security must evolve just as quickly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setLocation('/signup')} className="group bg-[#007aff] text-white px-8 py-4 rounded-full font-bold text-base shadow-xl shadow-[#007aff]/20 hover:shadow-[#007aff]/40 hover:scale-105 transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-cta-signup">
                <span>Start Free Scan</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => setLocation('/signup')} className="group bg-white border border-gray-200 text-gray-900 px-8 py-4 rounded-full font-semibold text-base hover:border-gray-300 hover:shadow-lg transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-cta-demo">
                <BookOpen className="w-5 h-5" />
                <span>Book a Demo</span>
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
