import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield, ArrowRight, Check, Lock, Eye,
  Menu, X, Server, Database, Cloud, Layers,
  Brain, Zap, AlertTriangle, BarChart3, Globe,
  BookOpen, Radio, KeyRound, ShieldCheck, MonitorSmartphone,
  Network, Bot, Workflow, Container
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

function ArchitectureDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ref, isVisible } = useInView(0.1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number, frame = 0;
    let w: number, h: number;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = rect?.width || 800; h = rect?.height || 500;
      canvas.width = w * 2; canvas.height = h * 2;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const t = frame * 0.008;
      const colW = w / 3;
      const layerLabels = ['Ingestion Layer', 'AI Risk Engine', 'Presentation Layer'];
      const layerColors = ['#f97316', '#007aff', '#10b981'];

      layerLabels.forEach((label, i) => {
        const lx = i * colW + colW / 2;
        ctx.fillStyle = layerColors[i] + '08';
        ctx.beginPath();
        ctx.roundRect(i * colW + 10, 45, colW - 20, h - 70, 16);
        ctx.fill();
        ctx.strokeStyle = layerColors[i] + '20';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = layerColors[i];
        ctx.font = 'bold 11px Rubik, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx, 30);
      });

      const col1Nodes = ['AWS', 'Azure', 'GCP'];
      const col2Nodes = ['Detection', 'Graph', 'Data Sec', 'Runtime'];
      const col3Nodes = ['Dashboard', 'AI-BOM', 'Alerts', 'Reports'];

      const drawNode = (x: number, y: number, label: string, color: string, size: number) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        g.addColorStop(0, color + '10'); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.fillRect(x - size * 2, y - size * 2, size * 4, size * 4);
        ctx.beginPath(); ctx.arc(x, y, size, 0, 6.28);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = color + '50'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = color; ctx.font = `bold ${size > 18 ? 9 : 8}px Rubik, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
      };

      const positions: { x: number; y: number }[][] = [[], [], []];

      col1Nodes.forEach((n, i) => {
        const x = colW / 2;
        const y = 100 + i * ((h - 140) / (col1Nodes.length - 1 || 1));
        positions[0].push({ x, y });
        drawNode(x, y, n, '#f97316', 22);
      });

      col2Nodes.forEach((n, i) => {
        const x = colW + colW / 2;
        const y = 85 + i * ((h - 120) / (col2Nodes.length - 1 || 1));
        positions[1].push({ x, y });
        drawNode(x, y, n, '#007aff', 22);
      });

      col3Nodes.forEach((n, i) => {
        const x = colW * 2 + colW / 2;
        const y = 85 + i * ((h - 120) / (col3Nodes.length - 1 || 1));
        positions[2].push({ x, y });
        drawNode(x, y, n, '#10b981', 22);
      });

      positions[0].forEach(from => {
        positions[1].forEach(to => {
          ctx.beginPath(); ctx.moveTo(from.x + 24, from.y); ctx.lineTo(to.x - 24, to.y);
          ctx.strokeStyle = '#007aff12'; ctx.lineWidth = 1; ctx.stroke();
        });
      });
      positions[1].forEach(from => {
        positions[2].forEach(to => {
          ctx.beginPath(); ctx.moveTo(from.x + 24, from.y); ctx.lineTo(to.x - 24, to.y);
          ctx.strokeStyle = '#10b98112'; ctx.lineWidth = 1; ctx.stroke();
        });
      });

      const flowCount = 6;
      for (let f = 0; f < flowCount; f++) {
        const prog = ((t * 2 + f * 1.2) % 4) / 4;
        let fx: number, fy: number;
        if (prog < 0.5) {
          const p = prog / 0.5;
          const fromIdx = f % positions[0].length;
          const toIdx = f % positions[1].length;
          const from = positions[0][fromIdx], to = positions[1][toIdx];
          fx = from.x + 24 + (to.x - 24 - from.x - 24) * p;
          fy = from.y + (to.y - from.y) * p;
        } else {
          const p = (prog - 0.5) / 0.5;
          const fromIdx = f % positions[1].length;
          const toIdx = f % positions[2].length;
          const from = positions[1][fromIdx], to = positions[2][toIdx];
          fx = from.x + 24 + (to.x - 24 - from.x - 24) * p;
          fy = from.y + (to.y - from.y) * p;
        }
        const dotG = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8);
        dotG.addColorStop(0, '#007affcc'); dotG.addColorStop(1, 'transparent');
        ctx.fillStyle = dotG; ctx.fillRect(fx - 8, fy - 8, 16, 16);
        ctx.beginPath(); ctx.arc(fx, fy, 3, 0, 6.28);
        ctx.fillStyle = '#007aff'; ctx.fill();
      }

      frame++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [isVisible]);

  return (
    <div ref={ref} className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

const ingestionIntegrations = [
  {
    cloud: 'AWS',
    color: '#f97316',
    services: ['Bedrock', 'SageMaker', 'S3', 'IAM', 'CloudWatch', 'CloudTrail'],
  },
  {
    cloud: 'Azure',
    color: '#007aff',
    services: ['Azure OpenAI', 'Azure ML', 'Entra ID', 'Purview'],
  },
  {
    cloud: 'GCP',
    color: '#22c55e',
    services: ['Vertex AI', 'GCS', 'IAM', 'Logging'],
  },
];

const dataCollected = [
  'AI asset inventory',
  'IAM roles and permissions',
  'Network configurations',
  'Storage metadata',
  'Model configurations',
  'Runtime logs',
];

const riskEngineComponents = [
  { icon: AlertTriangle, title: 'Detection Engine', desc: 'Runs 100+ AI-SPM rules including shadow AI detection, IAM misconfigurations, data exposure risks, and runtime vulnerabilities.', color: '#ef4444' },
  { icon: Network, title: 'Graph Correlation Engine', desc: 'Builds relationships between identities, data sources, models, and endpoints. Enables Toxic Path Analysis.', color: '#8b5cf6' },
  { icon: Database, title: 'Data Security Engine', desc: 'PII/PHI detection, data lineage tracking, dataset integrity validation.', color: '#007aff' },
  { icon: Radio, title: 'Runtime Analysis Engine', desc: 'Prompt injection detection, jailbreak monitoring, output safety validation.', color: '#f97316' },
];

const presentationFeatures = [
  { icon: BarChart3, label: 'Unified dashboard' },
  { icon: Layers, label: 'AI-BOM inventory view' },
  { icon: AlertTriangle, label: 'Risk prioritization' },
  { icon: Shield, label: 'Compliance reports' },
  { icon: MonitorSmartphone, label: 'Alerting system' },
];

const dataFlow = [
  'Cloud APIs provide AI asset data',
  'Fyx normalizes and enriches metadata',
  'Detection engine applies AI-SPM rules',
  'Graph engine identifies toxic paths',
  'Results are presented in dashboard and alerts',
];

const securityByDesign = [
  { icon: Zap, label: 'Agentless architecture' },
  { icon: KeyRound, label: 'Least-privilege access' },
  { icon: Lock, label: 'Encrypted communication' },
  { icon: Globe, label: 'Scalable multi-cloud design' },
];

export default function ArchitecturePage() {
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
                <span className="text-[#007aff] text-[14px] font-medium" data-testid="badge-architecture">Platform Architecture</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6" data-testid="text-arch-heading">
                AI Security, Built as a <span className="bg-gradient-to-r from-[#007aff] via-[#00a8ff] to-[#6366f1] bg-clip-text text-transparent">System.</span>
              </h1>
              <p className="text-gray-900 text-lg leading-relaxed mb-4">
                A unified architecture for securing the entire AI lifecycle.
              </p>
              <p className="text-gray-900 text-[14px] leading-relaxed max-w-2xl mx-auto">
                Fyx Cloud AI is designed to map, monitor, and secure the complete AI supply chain — from raw data ingestion to model inference and agent execution. Our architecture provides deep visibility without disrupting your cloud environment.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-16 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Architecture <span className="text-[#007aff]">Overview</span></h2>
              <p className="text-gray-900 text-base max-w-xl mx-auto">Fyx operates across three core layers: Ingestion, Analysis, and Presentation.</p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="bg-white border border-gray-100 rounded-3xl p-4 md:p-6 max-w-4xl mx-auto h-[380px] md:h-[440px] overflow-hidden" data-testid="architecture-diagram">
              <ArchitectureDiagram />
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start max-w-6xl mx-auto">
            <div>
              <FadeIn>
                <div className="inline-flex items-center space-x-2 bg-[#f97316]/10 border border-[#f97316]/20 rounded-full px-4 py-1.5 mb-5">
                  <span className="text-[#f97316] text-[14px] font-semibold">Layer 1</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Ingestion <span className="text-[#f97316]">Layer</span></h2>
                <p className="text-gray-900 text-[14px] leading-relaxed mb-8">
                  Connects to cloud environments and collects AI-related metadata via secure, read-only API integrations.
                </p>
              </FadeIn>
              <div className="space-y-4">
                {ingestionIntegrations.map((cloud, i) => (
                  <FadeIn key={i} delay={i * 80}>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5" data-testid={`ingestion-cloud-${i}`}>
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cloud.color + '15' }}>
                          <Globe className="w-4 h-4" style={{ color: cloud.color }} />
                        </div>
                        <h4 className="text-gray-900 font-bold text-[15px]">{cloud.cloud}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cloud.services.map((s, j) => (
                          <span key={j} className="text-[13px] font-medium px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-900">{s}</span>
                        ))}
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
            <div>
              <FadeIn delay={100}>
                <h3 className="text-xl font-bold text-gray-900 mb-5">Data Collected</h3>
              </FadeIn>
              <div className="space-y-3">
                {dataCollected.map((d, i) => (
                  <FadeIn key={i} delay={i * 50 + 100}>
                    <div className="flex items-center space-x-3 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5">
                      <Check className="w-4 h-4 text-[#f97316] shrink-0" />
                      <span className="text-gray-900 text-[14px] font-medium">{d}</span>
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
              <div className="inline-flex items-center space-x-2 bg-[#007aff]/10 border border-[#007aff]/20 rounded-full px-4 py-1.5 mb-5">
                <span className="text-[#007aff] text-[14px] font-semibold">Layer 2</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">AI Risk <span className="text-[#007aff]">Engine</span></h2>
              <p className="text-gray-900 text-base max-w-xl mx-auto">Analyzes AI assets and detects risks using AI-SPM rules and graph correlation.</p>
            </div>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {riskEngineComponents.map((c, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="bg-white border border-gray-100 rounded-2xl p-7 h-full hover:shadow-lg hover:border-gray-200 transition-all duration-300" data-testid={`risk-engine-${i}`}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: c.color + '12' }}>
                    <c.icon className="w-6 h-6" style={{ color: c.color }} />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg mb-2">{c.title}</h3>
                  <p className="text-gray-900 text-[14px] leading-relaxed">{c.desc}</p>
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
                <div className="inline-flex items-center space-x-2 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full px-4 py-1.5 mb-5">
                  <span className="text-[#10b981] text-[14px] font-semibold">Layer 3</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Presentation <span className="text-[#10b981]">Layer</span></h2>
                <p className="text-gray-900 text-[14px] leading-relaxed mb-8">Provides actionable insights to security teams through a unified interface.</p>
              </FadeIn>
              <div className="space-y-3">
                {presentationFeatures.map((f, i) => (
                  <FadeIn key={i} delay={i * 60}>
                    <div className="flex items-center space-x-3 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 hover:border-gray-200 transition-all">
                      <f.icon className="w-5 h-5 text-[#10b981]" />
                      <span className="text-gray-900 text-[14px] font-medium">{f.label}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
            <div>
              <FadeIn delay={100}>
                <h3 className="text-xl font-bold text-gray-900 mb-5">Data Flow Summary</h3>
              </FadeIn>
              <div className="space-y-0">
                {dataFlow.map((step, i) => (
                  <FadeIn key={i} delay={i * 80 + 100}>
                    <div className="flex items-start gap-4 pb-6 relative">
                      {i < dataFlow.length - 1 && (
                        <div className="absolute left-[15px] top-[32px] w-px h-[calc(100%-20px)] bg-[#007aff]/15" />
                      )}
                      <div className="w-8 h-8 rounded-full bg-[#007aff] text-white flex items-center justify-center text-[13px] font-bold shrink-0 relative z-10">
                        {i + 1}
                      </div>
                      <span className="text-gray-900 text-[14px] font-medium pt-1.5">{step}</span>
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
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <FadeIn>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Deployment <span className="text-[#007aff]">Model</span></h2>
              </FadeIn>
              <div className="space-y-5">
                <FadeIn delay={60}>
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
                    <h4 className="text-gray-900 font-bold text-[15px] mb-2">SaaS (Default)</h4>
                    <ul className="space-y-2">
                      {['Fully managed by Fyx', 'Secure API integrations', 'No infrastructure required'].map((s, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-[14px] text-gray-900">
                          <Check className="w-4 h-4 text-[#007aff] shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
                <FadeIn delay={120}>
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
                    <h4 className="text-gray-900 font-bold text-[15px] mb-2">Private Deployment (Enterprise)</h4>
                    <ul className="space-y-2">
                      {['VPC deployment options', 'Data residency control', 'Dedicated environments'].map((s, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-[14px] text-gray-900">
                          <Check className="w-4 h-4 text-[#007aff] shrink-0" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              </div>
            </div>
            <div>
              <FadeIn>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Security by <span className="text-[#007aff]">Design</span></h2>
              </FadeIn>
              <div className="space-y-3">
                {securityByDesign.map((s, i) => (
                  <FadeIn key={i} delay={i * 60}>
                    <div className="flex items-center space-x-4 bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-gray-200 transition-all">
                      <div className="w-10 h-10 rounded-lg bg-[#007aff]/10 flex items-center justify-center shrink-0">
                        <s.icon className="w-5 h-5 text-[#007aff]" />
                      </div>
                      <span className="text-gray-900 text-[14px] font-medium">{s.label}</span>
                    </div>
                  </FadeIn>
                ))}
              </div>

              <FadeIn delay={200}>
                <div className="mt-8 bg-gradient-to-br from-[#007aff]/5 to-[#6366f1]/5 border border-[#007aff]/15 rounded-2xl p-6">
                  <h4 className="text-gray-900 font-bold text-[15px] mb-3">Key Differentiator</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/80 rounded-xl p-4 border border-gray-100">
                      <p className="text-gray-900 text-[13px] font-semibold mb-1">Traditional tools</p>
                      <p className="text-gray-900 text-[14px]">Scan infrastructure</p>
                    </div>
                    <div className="bg-[#007aff]/5 rounded-xl p-4 border border-[#007aff]/20">
                      <p className="text-[#007aff] text-[13px] font-semibold mb-1">Fyx</p>
                      <p className="text-gray-900 text-[14px] font-medium">Secures the AI lifecycle</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">See How Fyx Secures Your AI Stack</h2>
            <p className="text-gray-900 text-lg mb-10 max-w-xl mx-auto">
              Get a detailed walkthrough of our architecture and how it secures your AI environment.
            </p>
            <button onClick={() => setLocation('/signup')} className="group bg-[#007aff] text-white px-8 py-4 rounded-full font-bold text-base shadow-xl shadow-[#007aff]/20 hover:shadow-[#007aff]/40 hover:scale-105 transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-arch-cta">
              <span>Request Architecture Walkthrough</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </FadeIn>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
