import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield, ArrowRight, Check, X as XIcon, Minus,
  Menu, X, Zap, Cloud, Brain, Database, Bot, KeyRound,
  Server, BookOpen, Eye, AlertTriangle, Network,
  Lock, Radio, Layers, Scale, Target, TrendingUp,
  ShieldCheck, CircleAlert, Search, Route, Blocks
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

type CellValue = 'full' | 'yes' | 'partial' | 'limited' | 'no' | 'native' | 'infra';

const comparisonRows: { capability: string; fyx: CellValue; wiz: CellValue; orca: CellValue; prisma: CellValue }[] = [
  { capability: 'AI Asset Inventory (AI-BOM)', fyx: 'full', wiz: 'partial', orca: 'partial', prisma: 'partial' },
  { capability: 'Shadow AI Detection', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'AI Model Visibility', fyx: 'full', wiz: 'limited', orca: 'limited', prisma: 'limited' },
  { capability: 'Vector Database Security', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'RAG Data Lineage', fyx: 'full', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'Prompt Injection Detection', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'Jailbreak Detection', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'AI Runtime Monitoring', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'Toxic Path Analysis (AI-specific)', fyx: 'yes', wiz: 'limited', orca: 'limited', prisma: 'limited' },
  { capability: 'AI Identity (Agent) Security', fyx: 'full', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'AI Guardrail Monitoring', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'Data Poisoning Detection', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'AI Compliance (EU AI Act)', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
  { capability: 'Multi-Cloud AI Security', fyx: 'native', wiz: 'infra', orca: 'infra', prisma: 'infra' },
  { capability: 'Agentic AI Protection', fyx: 'yes', wiz: 'no', orca: 'no', prisma: 'no' },
];

function CellBadge({ value }: { value: CellValue }) {
  if (value === 'full' || value === 'yes' || value === 'native') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
        <Check className="w-3.5 h-3.5" />
        {value === 'full' ? 'Full' : value === 'native' ? 'Native' : 'Yes'}
      </span>
    );
  }
  if (value === 'partial' || value === 'limited' || value === 'infra') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
        <Minus className="w-3.5 h-3.5" />
        {value === 'partial' ? 'Partial' : value === 'infra' ? 'Infra only' : 'Limited'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
      <XIcon className="w-3.5 h-3.5" />
      No
    </span>
  );
}

const advantages = [
  {
    icon: Eye, title: 'AI-Native Visibility',
    traditional: 'See compute and storage',
    fyx: 'Sees models, prompts, agents, and embeddings',
    outcome: 'Complete visibility into the AI layer',
  },
  {
    icon: Shield, title: 'Prompt Lifecycle Security',
    traditional: 'No visibility into prompts or outputs',
    fyx: 'Detects prompt injection, jailbreaks, and unsafe outputs',
    outcome: 'Runtime protection for AI interactions',
  },
  {
    icon: Database, title: 'Data Supply Chain Protection',
    traditional: 'Focus on storage misconfigurations',
    fyx: 'Tracks data from source to embedding to model',
    outcome: 'Prevents data leakage and poisoning',
  },
  {
    icon: Bot, title: 'Agentic AI Governance',
    traditional: 'Focus on human identities',
    fyx: 'Secures non-human AI agents and their permissions',
    outcome: 'Prevents autonomous privilege abuse',
  },
  {
    icon: Route, title: 'AI Risk Prioritization',
    traditional: 'Thousands of disconnected alerts',
    fyx: 'Identifies real attack paths using graph correlation',
    outcome: 'Focus on what actually matters',
  },
];

const categoryShift = [
  { area: 'Focus', cnapp: 'Infrastructure', aispm: 'AI Lifecycle' },
  { area: 'Visibility', cnapp: 'Compute, storage', aispm: 'Models, agents, data, prompts' },
  { area: 'Threats', cnapp: 'Misconfigurations', aispm: 'Prompt injection, data poisoning, model abuse' },
  { area: 'Identity', cnapp: 'Human users', aispm: 'Human + AI agents' },
  { area: 'Data', cnapp: 'Static storage', aispm: 'Dynamic AI data flows' },
  { area: 'Output', cnapp: 'Alerts', aispm: 'Actionable attack paths' },
];

const needFyx = [
  'You are using AWS Bedrock, Azure OpenAI, or Vertex AI',
  'You have RAG pipelines or vector databases',
  'You are building AI agents or copilots',
  'You handle sensitive data in AI workflows',
  'You need to comply with AI regulations (EU AI Act)',
];

const customerValue = [
  'Full AI visibility across multi-cloud',
  'Reduced risk of data leakage',
  'Protection against AI-specific attacks',
  'Faster compliance readiness',
  'Reduced alert fatigue through prioritization',
];

export default function ComparePage() {
  const [, setLocation] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white font-['Rubik']">
      <PublicNavbar />

      <section className="pt-28 pb-16 bg-white">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-5 py-2.5 mb-7">
                <div className="w-2 h-2 rounded-full bg-[#007aff] animate-pulse" />
                <span className="text-[#007aff] text-[14px] font-medium" data-testid="badge-compare">Fyx Cloud AI vs Traditional CNAPP</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-gray-900 leading-tight mb-6" data-testid="text-compare-heading">
                Traditional Cloud Security Stops at Infrastructure.{' '}
                <span className="bg-gradient-to-r from-[#007aff] via-[#00a8ff] to-[#6366f1] bg-clip-text text-transparent">Fyx Secures the Intelligence Layer.</span>
              </h1>
              <p className="text-gray-900 text-lg leading-relaxed mb-5">
                Compare how Fyx Cloud AI goes beyond Wiz, Orca, and Prisma Cloud to secure the full AI lifecycle.
              </p>
              <p className="text-gray-900 text-[14px] leading-relaxed max-w-3xl mx-auto">
                Cloud security platforms were built for infrastructure — VMs, containers, and misconfigurations. But modern environments are powered by AI: models, agents, vector databases, and data pipelines. Fyx Cloud AI introduces AI Security Posture Management (AI-SPM) — a new approach that secures the AI supply chain, runtime behavior, and agentic systems across AWS, Azure, and GCP.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="max-w-3xl mx-auto text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-red-500/8 border border-red-500/15 rounded-full px-4 py-1.5 mb-5">
                <CircleAlert className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-500 text-[14px] font-semibold uppercase tracking-wider">The Core Problem</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">Why CNAPP Tools Are <span className="text-red-500">Not Enough</span></h2>
              <p className="text-gray-900 text-base mb-8">Traditional tools like Wiz, Orca, and Prisma Cloud:</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
            {[
              'Focus on infrastructure and workloads',
              'Lack visibility into AI models and agents',
              'Do not understand prompt-based attacks',
              'Cannot map AI data lineage or RAG pipelines',
              'Treat AI risks as generic misconfigurations',
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-5 py-4">
                  <XIcon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-gray-900 text-[14px] font-medium">{item}</span>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={300}>
            <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <p className="text-gray-900 font-bold text-lg">Result: Critical AI risks remain invisible.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Feature <span className="text-[#007aff]">Comparison</span></h2>
              <p className="text-gray-900 text-base">Fyx Cloud AI vs Wiz vs Orca vs Prisma Cloud</p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="max-w-6xl mx-auto overflow-x-auto">
              <table className="w-full border-collapse" data-testid="comparison-table">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-gray-900 font-bold text-[14px] border-b-2 border-gray-200 bg-gray-50 rounded-tl-xl">Capability</th>
                    <th className="px-5 py-4 text-center font-bold text-[14px] border-b-2 border-[#007aff] bg-[#007aff]/5 text-[#007aff]">
                      <div className="flex items-center justify-center gap-2">
                        <FyxLogo className="w-5 h-5" />
                        Fyx Cloud AI
                      </div>
                    </th>
                    <th className="px-5 py-4 text-center text-gray-900 font-bold text-[14px] border-b-2 border-gray-200 bg-gray-50">Wiz</th>
                    <th className="px-5 py-4 text-center text-gray-900 font-bold text-[14px] border-b-2 border-gray-200 bg-gray-50">Orca</th>
                    <th className="px-5 py-4 text-center text-gray-900 font-bold text-[14px] border-b-2 border-gray-200 bg-gray-50 rounded-tr-xl">Prisma Cloud</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#007aff]/[0.02] transition-colors`}>
                      <td className="px-5 py-3.5 text-gray-900 font-medium text-[14px] border-b border-gray-100">{row.capability}</td>
                      <td className="px-5 py-3.5 text-center border-b border-gray-100 bg-[#007aff]/[0.02]"><CellBadge value={row.fyx} /></td>
                      <td className="px-5 py-3.5 text-center border-b border-gray-100"><CellBadge value={row.wiz} /></td>
                      <td className="px-5 py-3.5 text-center border-b border-gray-100"><CellBadge value={row.orca} /></td>
                      <td className="px-5 py-3.5 text-center border-b border-gray-100"><CellBadge value={row.prisma} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Where Fyx <span className="text-[#007aff]">Wins</span></h2>
            </div>
          </FadeIn>
          <div className="space-y-6 max-w-4xl mx-auto">
            {advantages.map((adv, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="bg-white border border-gray-100 rounded-2xl p-7 hover:shadow-lg hover:border-gray-200 transition-all duration-300" data-testid={`advantage-${i}`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl bg-[#007aff]/10 flex items-center justify-center">
                      <adv.icon className="w-5 h-5 text-[#007aff]" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg">{i + 1}. {adv.title}</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-red-50/50 border border-red-100 rounded-xl px-5 py-4">
                      <p className="text-red-500 text-[12px] font-bold uppercase tracking-wider mb-1">Traditional CNAPP</p>
                      <p className="text-gray-900 text-[14px]">{adv.traditional}</p>
                    </div>
                    <div className="bg-[#007aff]/5 border border-[#007aff]/15 rounded-xl px-5 py-4">
                      <p className="text-[#007aff] text-[12px] font-bold uppercase tracking-wider mb-1">Fyx Cloud AI</p>
                      <p className="text-gray-900 text-[14px] font-medium">{adv.fyx}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-emerald-700 text-[14px] font-semibold">{adv.outcome}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Example Scenario: <span className="text-[#007aff]">Data Leak via AI</span></h2>
            </div>
          </FadeIn>

          <div className="max-w-5xl mx-auto">
            <FadeIn delay={80}>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8">
                <h4 className="text-gray-900 font-bold text-[15px] mb-3">Environment</h4>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {['Public S3 bucket with sensitive data', 'Overprivileged IAM role', 'Bedrock model using that data', 'AI agent with database write access'].map((e, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-[14px] text-gray-900 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
                      <Server className="w-4 h-4 text-gray-400 shrink-0" />
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <div className="grid lg:grid-cols-2 gap-6">
              <FadeIn delay={160}>
                <div className="bg-red-50/50 border border-red-200 rounded-2xl p-7 h-full">
                  <h4 className="text-red-600 font-bold text-lg mb-4">Wiz / Orca / Prisma Cloud</h4>
                  <div className="space-y-2.5 mb-5">
                    {['Detect public S3 bucket', 'Flag IAM role permissions'].map((d, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-[14px] text-gray-900">
                        <Check className="w-4 h-4 text-amber-500 shrink-0" />{d}
                      </div>
                    ))}
                  </div>
                  <div className="bg-white border border-red-200 rounded-xl p-4">
                    <p className="text-red-500 text-[13px] font-bold uppercase tracking-wider mb-2">What they miss:</p>
                    <ul className="space-y-2">
                      {['Data is used in RAG pipeline', 'Model can expose data via prompts', 'Agent can act on leaked data'].map((m, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-[14px] text-gray-900">
                          <XIcon className="w-4 h-4 text-red-400 shrink-0" />{m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeIn>

              <FadeIn delay={240}>
                <div className="bg-[#007aff]/[0.03] border border-[#007aff]/20 rounded-2xl p-7 h-full">
                  <h4 className="text-[#007aff] font-bold text-lg mb-4">Fyx Cloud AI</h4>
                  <div className="space-y-2.5 mb-5">
                    {[
                      'Detects public S3 bucket',
                      'Detects overprivileged IAM role',
                      'Identifies model using that dataset',
                      'Maps agent permissions',
                      'Correlates full attack path',
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-[14px] text-gray-900">
                        <Check className="w-4 h-4 text-[#007aff] shrink-0" />{d}
                      </div>
                    ))}
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <p className="text-emerald-700 font-bold text-[15px]">Critical Toxic Path identified and prioritized</p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">The Category Shift: <span className="text-[#007aff]">CNAPP vs AI-SPM</span></h2>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="max-w-4xl mx-auto overflow-x-auto">
              <table className="w-full border-collapse" data-testid="category-table">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-4 text-gray-900 font-bold text-[14px] border-b-2 border-gray-200 bg-gray-50">Area</th>
                    <th className="px-5 py-4 text-center text-gray-900 font-bold text-[14px] border-b-2 border-gray-200 bg-gray-50">CNAPP</th>
                    <th className="px-5 py-4 text-center font-bold text-[14px] border-b-2 border-[#007aff] bg-[#007aff]/5 text-[#007aff]">AI-SPM (Fyx)</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryShift.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-5 py-3.5 text-gray-900 font-semibold text-[14px] border-b border-gray-100">{row.area}</td>
                      <td className="px-5 py-3.5 text-center text-gray-900 text-[14px] border-b border-gray-100">{row.cnapp}</td>
                      <td className="px-5 py-3.5 text-center text-[#007aff] font-medium text-[14px] border-b border-gray-100 bg-[#007aff]/[0.02]">{row.aispm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <FadeIn>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">When You Need <span className="text-[#007aff]">Fyx</span></h2>
                <p className="text-gray-900 text-[14px] mb-5">You need Fyx Cloud AI if:</p>
              </FadeIn>
              <div className="space-y-3">
                {needFyx.map((item, i) => (
                  <FadeIn key={i} delay={i * 60}>
                    <div className="flex items-start gap-3 bg-[#007aff]/5 border border-[#007aff]/15 rounded-xl px-5 py-4">
                      <Check className="w-5 h-5 text-[#007aff] shrink-0 mt-0.5" />
                      <span className="text-gray-900 text-[14px] font-medium">{item}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
            <div>
              <FadeIn>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">What Customers <span className="text-[#007aff]">Gain</span></h2>
              </FadeIn>
              <div className="space-y-3">
                {customerValue.map((item, i) => (
                  <FadeIn key={i} delay={i * 60}>
                    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4">
                      <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-gray-900 text-[14px] font-medium">{item}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6 text-center max-w-3xl">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">
              Stop Securing the Past. <span className="text-[#007aff]">Start Securing AI.</span>
            </h2>
            <p className="text-gray-900 text-base leading-relaxed mb-4">
              Wiz, Orca, and Prisma Cloud were built for a world before AI became the core of modern applications.
            </p>
            <p className="text-gray-900 text-[14px] leading-relaxed mb-10 max-w-2xl mx-auto">
              Fyx Cloud AI is built for what comes next — a world of autonomous systems, intelligent agents, and data-driven decision-making.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => setLocation('/signup')} className="group bg-[#007aff] text-white px-8 py-4 rounded-full font-bold text-base shadow-xl shadow-[#007aff]/20 hover:shadow-[#007aff]/40 hover:scale-105 transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-compare-demo">
                <span>Book a Demo</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => setLocation('/signup')} className="group bg-white border border-gray-200 text-gray-900 px-8 py-4 rounded-full font-semibold text-base hover:border-gray-300 hover:shadow-lg transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-compare-scan">
                <Search className="w-5 h-5" />
                <span>Run a Free AI Exposure Scan</span>
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
