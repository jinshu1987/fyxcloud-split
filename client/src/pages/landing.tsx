import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield, ArrowRight, CheckCircle, Zap, Lock, Eye, FileSearch,
  Terminal, Search, Bug, Fingerprint, Scale, Server,
  Check, ChevronRight, Layers, ChevronDown, Play,
  GitBranch, Box, ScanLine, Menu, X, Brain, Cpu,
  Workflow, LayoutGrid, Users, Sparkles,
  Network, Database, Cloud, AlertTriangle, BarChart3, Settings,
  Globe, Radio, KeyRound, ShieldCheck, BookOpen, Radar,
  MonitorSmartphone, Route, Blocks, Container, Bot
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
    <div ref={ref} className={className} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(25px)', transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms` }}>
      {children}
    </div>
  );
}

function NetworkAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    let w: number, h: number;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = rect?.width || 600; h = rect?.height || 500;
      canvas.width = w * 2; canvas.height = h * 2;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    interface N { x: number; y: number; vx: number; vy: number; r: number; b: number; p: number; ps: number; t: number }
    interface P { fi: number; ti: number; pr: number; sp: number; c: string }
    const nodes: N[] = [];
    for (let i = 0; i < 5; i++) nodes.push({ x: 80 + Math.random() * (w - 160), y: 60 + Math.random() * (h - 120), vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, r: 5 + Math.random() * 3, b: 0.8 + Math.random() * 0.2, p: Math.random() * 6.28, ps: 0.02 + Math.random() * 0.02, t: 0 });
    for (let i = 0; i < 35; i++) nodes.push({ x: 40 + Math.random() * (w - 80), y: 30 + Math.random() * (h - 60), vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: 2 + Math.random() * 2, b: 0.4 + Math.random() * 0.4, p: Math.random() * 6.28, ps: 0.03 + Math.random() * 0.03, t: 1 });
    for (let i = 0; i < 20; i++) nodes.push({ x: 20 + Math.random() * (w - 40), y: 15 + Math.random() * (h - 30), vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: 1 + Math.random() * 1.5, b: 0.2 + Math.random() * 0.3, p: Math.random() * 6.28, ps: 0.04 + Math.random() * 0.04, t: 2 });
    const edges: [number, number][] = [];
    const md = 130;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y; if (Math.sqrt(dx * dx + dy * dy) < md) edges.push([i, j]); }
    const pkts: P[] = [];
    const cols = ['#007aff', '#00a8ff', '#6366f1', '#06b6d4', '#8b5cf6'];
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, w, h);
      const g1 = ctx.createRadialGradient(w * 0.4, h * 0.45, 0, w * 0.4, h * 0.45, w * 0.6);
      g1.addColorStop(0, 'rgba(0,122,255,0.06)'); g1.addColorStop(1, 'transparent'); ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
      const g2 = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.4);
      g2.addColorStop(0, 'rgba(99,102,241,0.04)'); g2.addColorStop(1, 'transparent'); ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
      nodes.forEach(n => { n.x += n.vx; n.y += n.vy; if (n.x < 10 || n.x > w - 10) n.vx *= -1; if (n.y < 10 || n.y > h - 10) n.vy *= -1; n.p += n.ps; });
      edges.forEach(([i, j]) => { const a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy), al = Math.max(0, 0.12 * (1 - d / md)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(0,122,255,${al})`; ctx.lineWidth = 0.5; ctx.stroke(); });
      nodes.forEach(n => { const ps = 1 + Math.sin(n.p) * 0.3, r = n.r * ps; if (n.t === 0) { const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4); g.addColorStop(0, `rgba(0,122,255,${0.1 * n.b})`); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(n.x - r * 4, n.y - r * 4, r * 8, r * 8); } ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.28); ctx.fillStyle = n.t === 0 ? `rgba(0,122,255,${n.b * 0.7})` : n.t === 1 ? `rgba(0,122,255,${n.b * 0.5})` : `rgba(99,102,241,${n.b * 0.4})`; ctx.fill(); if (n.t < 2) { ctx.beginPath(); ctx.arc(n.x, n.y, r * 2, 0, 6.28); ctx.strokeStyle = `rgba(0,122,255,${0.08 * n.b * (0.5 + Math.sin(n.p) * 0.5)})`; ctx.lineWidth = 0.5; ctx.stroke(); } });
      for (let i = pkts.length - 1; i >= 0; i--) { const p = pkts[i]; p.pr += p.sp; if (p.pr >= 1) { pkts.splice(i, 1); continue; } const f = nodes[p.fi], t = nodes[p.ti], px = f.x + (t.x - f.x) * p.pr, py = f.y + (t.y - f.y) * p.pr; const g = ctx.createRadialGradient(px, py, 0, px, py, 8); g.addColorStop(0, p.c + '99'); g.addColorStop(0.5, p.c + '22'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(px - 8, py - 8, 16, 16); ctx.beginPath(); ctx.arc(px, py, 2, 0, 6.28); ctx.fillStyle = p.c; ctx.fill(); }
      if (frame % 8 === 0 && pkts.length < 15 && edges.length > 0) { const e = edges[Math.floor(Math.random() * edges.length)]; const d = Math.random() > 0.5; pkts.push({ fi: d ? e[0] : e[1], ti: d ? e[1] : e[0], pr: 0, sp: 0.005 + Math.random() * 0.015, c: cols[Math.floor(Math.random() * cols.length)] }); }
      frame++; animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function GithubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>;
}

function LinkedInIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>;
}

function TwitterIcon({ className = "w-5 h-5" }: { className?: string }) {
  return <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>;
}


function SecurityVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;
    let w: number, h: number;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = rect?.width || 500; h = rect?.height || 500;
      canvas.width = w * 2; canvas.height = h * 2;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const cx = () => w / 2, cy = () => h / 2;
    const orbitR1 = () => Math.min(w, h) * 0.28;
    const orbitR2 = () => Math.min(w, h) * 0.40;

    interface ONode { angle: number; speed: number; orbit: number; label: string; color: string; size: number }
    interface Threat { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }
    interface ScanPulse { r: number; maxR: number; alpha: number }
    interface DataFlow { fromIdx: number; progress: number; speed: number; color: string }

    const innerNodes: ONode[] = [
      { angle: 0, speed: 0.008, orbit: 1, label: 'AWS', color: '#f97316', size: 22 },
      { angle: 2.09, speed: 0.008, orbit: 1, label: 'Azure', color: '#007aff', size: 22 },
      { angle: 4.19, speed: 0.008, orbit: 1, label: 'GCP', color: '#22c55e', size: 22 },
    ];
    const outerNodes: ONode[] = [
      { angle: 0.5, speed: 0.005, orbit: 2, label: 'Models', color: '#8b5cf6', size: 16 },
      { angle: 1.5, speed: 0.005, orbit: 2, label: 'Agents', color: '#06b6d4', size: 16 },
      { angle: 2.5, speed: 0.005, orbit: 2, label: 'Data', color: '#ec4899', size: 16 },
      { angle: 3.5, speed: 0.005, orbit: 2, label: 'Vector DB', color: '#f59e0b', size: 16 },
      { angle: 4.5, speed: 0.005, orbit: 2, label: 'Identity', color: '#10b981', size: 16 },
      { angle: 5.5, speed: 0.005, orbit: 2, label: 'Runtime', color: '#ef4444', size: 16 },
    ];

    const threats: Threat[] = [];
    const pulses: ScanPulse[] = [];
    const flows: DataFlow[] = [];
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const x = cx(), y = cy(), r1 = orbitR1(), r2 = orbitR2();

      const bg = ctx.createRadialGradient(x, y, 0, x, y, r2 * 1.4);
      bg.addColorStop(0, 'rgba(0,122,255,0.03)');
      bg.addColorStop(0.5, 'rgba(99,102,241,0.02)');
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.beginPath(); ctx.arc(x, y, r1, 0, 6.28);
      ctx.strokeStyle = 'rgba(0,122,255,0.12)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, r2, 0, 6.28);
      ctx.strokeStyle = 'rgba(0,122,255,0.07)'; ctx.lineWidth = 1; ctx.setLineDash([3, 8]); ctx.stroke(); ctx.setLineDash([]);

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.r += 1.2; p.alpha = 1 - p.r / p.maxR;
        if (p.r >= p.maxR) { pulses.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.28);
        ctx.strokeStyle = `rgba(0,122,255,${p.alpha * 0.15})`; ctx.lineWidth = 2; ctx.stroke();
      }
      if (frame % 90 === 0) pulses.push({ r: 20, maxR: r2 * 1.3, alpha: 1 });

      innerNodes.forEach(n => { n.angle += n.speed; });
      outerNodes.forEach(n => { n.angle += n.speed; });

      const allNodes = [...innerNodes, ...outerNodes];
      const nodePositions = allNodes.map(n => {
        const rad = n.orbit === 1 ? r1 : r2;
        return { x: x + Math.cos(n.angle) * rad, y: y + Math.sin(n.angle) * rad };
      });

      innerNodes.forEach((_, i) => {
        const p = nodePositions[i];
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = 'rgba(0,122,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
      });

      outerNodes.forEach((_, i) => {
        const oi = i + innerNodes.length;
        const closest = nodePositions.slice(0, innerNodes.length).reduce((best, p, idx) => {
          const d = Math.hypot(p.x - nodePositions[oi].x, p.y - nodePositions[oi].y);
          return d < best.d ? { d, idx } : best;
        }, { d: Infinity, idx: 0 });
        const from = nodePositions[closest.idx], to = nodePositions[oi];
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = 'rgba(0,122,255,0.05)'; ctx.lineWidth = 0.5; ctx.stroke();
      });

      for (let i = flows.length - 1; i >= 0; i--) {
        const fl = flows[i];
        fl.progress += fl.speed;
        if (fl.progress >= 1) { flows.splice(i, 1); continue; }
        const from = nodePositions[fl.fromIdx];
        const px = from.x + (x - from.x) * fl.progress;
        const py = from.y + (y - from.y) * fl.progress;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 6);
        g.addColorStop(0, fl.color + 'cc'); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.fillRect(px - 6, py - 6, 12, 12);
        ctx.beginPath(); ctx.arc(px, py, 2, 0, 6.28);
        ctx.fillStyle = fl.color; ctx.fill();
      }
      if (frame % 25 === 0 && flows.length < 8) {
        const idx = Math.floor(Math.random() * allNodes.length);
        flows.push({ fromIdx: idx, progress: 0, speed: 0.01 + Math.random() * 0.015, color: allNodes[idx].color });
      }

      if (frame % 120 === 60 && threats.length < 4) {
        const edge = Math.random() * 4;
        let tx = 0, ty = 0;
        if (edge < 1) { tx = Math.random() * w; ty = -10; }
        else if (edge < 2) { tx = w + 10; ty = Math.random() * h; }
        else if (edge < 3) { tx = Math.random() * w; ty = h + 10; }
        else { tx = -10; ty = Math.random() * h; }
        const ang = Math.atan2(y - ty, x - tx);
        threats.push({ x: tx, y: ty, vx: Math.cos(ang) * 0.8, vy: Math.sin(ang) * 0.8, life: 0, maxLife: 150 });
      }
      for (let i = threats.length - 1; i >= 0; i--) {
        const t = threats[i];
        t.x += t.vx; t.y += t.vy; t.life++;
        const d = Math.hypot(t.x - x, t.y - y);
        if (d < r1 * 0.8 || t.life > t.maxLife) {
          if (d < r1 * 0.8) {
            for (let s = 0; s < 6; s++) {
              const sa = Math.random() * 6.28, sr = 3 + Math.random() * 8;
              ctx.beginPath(); ctx.arc(t.x + Math.cos(sa) * sr, t.y + Math.sin(sa) * sr, 2, 0, 6.28);
              ctx.fillStyle = 'rgba(239,68,68,0.6)'; ctx.fill();
            }
          }
          threats.splice(i, 1); continue;
        }
        const alpha = Math.min(1, t.life / 20) * (1 - Math.max(0, (t.life - t.maxLife + 30) / 30));
        ctx.beginPath(); ctx.arc(t.x, t.y, 4, 0, 6.28);
        ctx.fillStyle = `rgba(239,68,68,${alpha * 0.8})`; ctx.fill();
        const tg = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 12);
        tg.addColorStop(0, `rgba(239,68,68,${alpha * 0.2})`); tg.addColorStop(1, 'transparent');
        ctx.fillStyle = tg; ctx.fillRect(t.x - 12, t.y - 12, 24, 24);
        ctx.beginPath(); ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x - t.vx * 12, t.y - t.vy * 12);
        ctx.strokeStyle = `rgba(239,68,68,${alpha * 0.3})`; ctx.lineWidth = 1.5; ctx.stroke();
      }

      allNodes.forEach((n, i) => {
        const p = nodePositions[i];
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, n.size * 1.8);
        g.addColorStop(0, n.color + '20'); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.fillRect(p.x - n.size * 2, p.y - n.size * 2, n.size * 4, n.size * 4);
        ctx.beginPath(); ctx.arc(p.x, p.y, n.size, 0, 6.28);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, n.size, 0, 6.28);
        ctx.strokeStyle = n.color + '60'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = n.color; ctx.font = `bold ${n.orbit === 1 ? 9 : 7}px Rubik, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(n.label, p.x, p.y);
      });

      const shieldSize = Math.min(w, h) * 0.09;
      const sg = ctx.createRadialGradient(x, y, 0, x, y, shieldSize * 2);
      sg.addColorStop(0, 'rgba(0,122,255,0.08)'); sg.addColorStop(1, 'transparent');
      ctx.fillStyle = sg; ctx.fillRect(x - shieldSize * 2, y - shieldSize * 2, shieldSize * 4, shieldSize * 4);
      ctx.beginPath(); ctx.arc(x, y, shieldSize, 0, 6.28);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, shieldSize, 0, 6.28);
      const sgs = ctx.createLinearGradient(x - shieldSize, y - shieldSize, x + shieldSize, y + shieldSize);
      sgs.addColorStop(0, '#007aff'); sgs.addColorStop(1, '#6366f1');
      ctx.strokeStyle = sgs; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#007aff'; ctx.font = `bold ${shieldSize * 0.55}px Rubik, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('FYX', x, y - shieldSize * 0.12);
      ctx.fillStyle = '#6366f1'; ctx.font = `500 ${shieldSize * 0.28}px Rubik, sans-serif`;
      ctx.fillText('AI-SPM', x, y + shieldSize * 0.35);

      const scanAngle = frame * 0.015;
      const scanLen = r2 * 0.9;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.arc(x, y, scanLen, scanAngle, scanAngle + 0.3);
      ctx.closePath();
      const scanGrad = ctx.createRadialGradient(x, y, 0, x, y, scanLen);
      scanGrad.addColorStop(0, 'rgba(0,122,255,0.06)');
      scanGrad.addColorStop(1, 'rgba(0,122,255,0.01)');
      ctx.fillStyle = scanGrad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(scanAngle) * scanLen, y + Math.sin(scanAngle) * scanLen);
      ctx.strokeStyle = 'rgba(0,122,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();

      frame++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function HeroSection() {
  const [, setLocation] = useLocation();
  const { ref, isVisible } = useInView(0.05);
  return (
    <section ref={ref} className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`, backgroundSize: '32px 32px' }} />

      <div className="relative z-10 container mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[calc(100vh-5rem)]">
          <div style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateX(0)' : 'translateX(-30px)', transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 200ms' }}>
            <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-5 py-2.5 mb-7">
              <div className="w-2 h-2 rounded-full bg-[#007aff] animate-pulse" />
              <span className="text-[#007aff] text-[14px] font-medium" data-testid="badge-hero">AI Security Posture Management</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.08] mb-6 tracking-tight" data-testid="text-hero-heading">
              <span className="text-gray-900">Secure the </span>
              <span className="bg-gradient-to-r from-[#007aff] via-[#00a8ff] to-[#6366f1] bg-clip-text text-transparent">Intelligence Layer</span>
              <span className="text-gray-900"> of Your Cloud.</span>
            </h1>

            <p className="text-gray-900 text-lg leading-relaxed mb-5 max-w-xl" data-testid="text-hero-subtitle">
              Full visibility, governance, and protection for AI across <span className="font-bold">AWS</span>, <span className="font-bold">Azure</span>, and <span className="font-bold">GCP</span>.
            </p>

            <p className="text-gray-900 text-[14px] leading-relaxed mb-8 max-w-lg">
              Models, agents, datasets, and prompt pipelines are deployed across clouds without oversight. Fyx discovers every AI asset, maps the supply chain, and detects toxic security paths before they become breaches.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <button
                onClick={() => setLocation('/signup')}
                className="group bg-[#007aff] text-white px-8 py-4 rounded-2xl font-semibold text-base shadow-xl shadow-[#007aff]/20 hover:shadow-[#007aff]/40 hover:scale-105 transition-all duration-300 inline-flex items-center space-x-3"
                data-testid="button-hero-signup"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                href="/docs"
                className="group bg-white border border-gray-200 text-gray-900 px-8 py-4 rounded-2xl font-semibold text-base hover:border-gray-300 hover:shadow-lg transition-all duration-300 inline-flex items-center space-x-3"
                data-testid="link-hero-docs"
              >
                <BookOpen className="w-5 h-5" />
                <span>Read the Docs</span>
              </Link>
            </div>
          </div>

          <div
            className="relative h-[420px] md:h-[500px] lg:h-[560px]"
            style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateX(0) scale(1)' : 'translateX(30px) scale(0.95)', transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1) 400ms' }}
            data-testid="hero-animation"
          >
            <SecurityVisualization />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductOverview() {
  const visItems = [
    { icon: Brain, label: 'AI models & endpoints' },
    { icon: Bot, label: 'AI agents & prompt flows' },
    { icon: Database, label: 'Vector databases & knowledge bases' },
    { icon: Layers, label: 'Training datasets & feature stores' },
    { icon: KeyRound, label: 'AI identities & permissions' },
    { icon: Radio, label: 'Runtime AI interactions' },
  ];
  return (
    <section className="relative py-24 bg-white border-t border-gray-100">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <FadeIn>
              <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-4 py-1.5 mb-5">
                <Eye className="w-3.5 h-3.5 text-[#007aff]" />
                <span className="text-[#007aff] text-[14px] font-semibold uppercase tracking-wider">What Fyx Cloud AI Does</span>
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5 leading-tight">
                Cloud-native AI Security Posture Management
              </h2>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="text-gray-900 text-base leading-relaxed mb-4">
                Fyx Cloud AI secures the complete lifecycle of AI systems. It provides continuous visibility and connects components into a unified risk graph, enabling organizations to detect and prioritize security risks that traditional tools miss.
              </p>
              <p className="text-gray-900 text-[14px] leading-relaxed">
                The platform works across AWS, Azure, and Google Cloud, integrating directly with cloud APIs to inventory AI resources, analyze configurations, and enforce security policies.
              </p>
            </FadeIn>
          </div>
          <div>
            <FadeIn delay={300}>
              <div className="grid grid-cols-2 gap-4">
                {visItems.map((item, i) => (
                  <div key={i} className="group flex items-center space-x-3 bg-gray-50 hover:bg-[#007aff]/5 border border-gray-100 hover:border-[#007aff]/20 rounded-xl p-4 transition-all duration-300" data-testid={`card-visibility-${i}`}>
                    <div className="w-10 h-10 rounded-lg bg-[#007aff]/8 flex items-center justify-center shrink-0 group-hover:bg-[#007aff]/15 transition-colors">
                      <item.icon className="w-5 h-5 text-[#007aff]" />
                    </div>
                    <span className="text-gray-900 text-[14px] font-medium leading-snug">{item.label}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}

const capabilities = [
  { icon: Search, title: 'AI Asset Discovery & AI-BOM', desc: 'Continuously discovers and inventories every AI-related resource. Creates a complete AI Bill of Materials including models, agents, training jobs, datasets, and vector databases.', items: ['Unified AI Asset Inventory & AI-BOM', 'Model, endpoint, agent, and notebook discovery', 'Vector DB discovery (OpenSearch, Pinecone, Weaviate, Milvus, pgvector, Neptune)', 'Training job & knowledge base inventory'], gradient: 'from-[#007aff] to-[#00a8ff]' },
  { icon: Radar, title: 'Shadow AI Detection', desc: 'Identifies unsanctioned AI systems operating outside approved environments — from rogue GPU workloads to unauthorized SaaS AI integrations.', items: ['Shadow SaaS AI detection (OpenAI, Anthropic, Mistral)', 'Rogue GPU compute & unmanaged model endpoints', 'Shadow data pipelines & local LLM detection', 'Unauthorized OAuth AI app discovery'], gradient: 'from-[#f97316] to-[#ef4444]' },
  { icon: Route, title: 'Toxic Path Risk Analysis', desc: 'Uses a graph-based risk engine to detect multi-step attack paths that combine identity, data, and model vulnerabilities.', items: ['Identity-Data-Model correlation', 'Critical risk path detection', 'Prioritized remediation guidance', 'Attack path visualization'], gradient: 'from-[#8b5cf6] to-[#7c3aed]' },
  { icon: Blocks, title: 'Data Supply Chain Security', desc: 'Protects the full AI data lifecycle — from RAG data lineage to dataset integrity monitoring and data poisoning detection.', items: ['RAG data lineage tracking', 'PII/PHI detection in datasets', 'Dataset integrity & poisoning detection', 'Cross-account data access monitoring'], gradient: 'from-[#10b981] to-[#059669]' },
  { icon: ShieldCheck, title: 'AI Runtime Threat Protection', desc: 'Monitors runtime model behavior and protects against prompt injection, jailbreaks, and AI-specific denial-of-service attacks.', items: ['Prompt injection & jailbreak detection', 'Indirect prompt injection via RAG documents', 'Model output & inference rate monitoring', 'Safety filter verification'], gradient: 'from-[#06b6d4] to-[#0891b2]' },
  { icon: KeyRound, title: 'Identity & Access Security for AI', desc: 'Applies identity governance to non-human AI identities — from execution role hardening to credential leak detection.', items: ['AI identity inventory & role hardening', 'Permission boundary enforcement', 'Short-lived credential enforcement', 'Agent permission monitoring'], gradient: 'from-[#ec4899] to-[#be185d]' },
  { icon: Server, title: 'Cloud Infrastructure Hardening', desc: 'Analyzes cloud configurations used by AI systems to ensure proper network isolation, encryption, and access controls.', items: ['Network isolation verification', 'Encryption enforcement for models & data', 'Endpoint exposure & notebook security', 'Vector database security checks'], gradient: 'from-[#007aff] to-[#6366f1]' },
  { icon: Scale, title: 'Compliance & Governance', desc: 'Helps organizations meet emerging AI governance requirements including EU AI Act, NIST AI RMF, and ISO 42001.', items: ['EU AI Act compliance monitoring', 'NIST AI RMF reporting', 'ISO 42001 readiness & audit trails', 'Transparency & regulatory reporting'], gradient: 'from-[#f59e0b] to-[#d97706]' },
];

function CapabilityAnimation({ index }: { index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ref, isVisible } = useInView(0.2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number, frame = 0;
    let w: number, h: number;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      w = rect?.width || 400; h = rect?.height || 300;
      canvas.width = w * 2; canvas.height = h * 2;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const cx = () => w / 2, cy = () => h / 2;
    const colors = ['#007aff', '#f97316', '#8b5cf6', '#10b981', '#06b6d4', '#ec4899', '#6366f1', '#f59e0b'];
    const color = colors[index % 8];

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const x = cx(), y = cy();
      const maxR = Math.min(w, h) * 0.42;
      const t = frame * 0.01;

      if (index === 0) {
        const nodeCount = 8;
        const nodes: { px: number; py: number; r: number; label: string }[] = [];
        for (let i = 0; i < nodeCount; i++) {
          const a = (i / nodeCount) * 6.28 + t * 0.3;
          const rad = maxR * (0.5 + 0.2 * Math.sin(t + i));
          const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
          nodes.push({ px, py, r: 12 + 4 * Math.sin(t * 2 + i), label: ['ML', 'DB', 'API', 'GPU', 'VDB', 'RAG', 'AGT', 'LLM'][i] });
        }
        nodes.forEach((n, i) => {
          nodes.forEach((m, j) => {
            if (j <= i) return;
            const d = Math.hypot(n.px - m.px, n.py - m.py);
            if (d < maxR * 1.2) {
              ctx.beginPath(); ctx.moveTo(n.px, n.py); ctx.lineTo(m.px, m.py);
              ctx.strokeStyle = color + '15'; ctx.lineWidth = 1; ctx.stroke();
            }
          });
          const g = ctx.createRadialGradient(n.px, n.py, 0, n.px, n.py, n.r * 2.5);
          g.addColorStop(0, color + '15'); g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.fillRect(n.px - n.r * 3, n.py - n.r * 3, n.r * 6, n.r * 6);
          ctx.beginPath(); ctx.arc(n.px, n.py, n.r, 0, 6.28);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = color + '40'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = color; ctx.font = 'bold 8px Rubik, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(n.label, n.px, n.py);
        });
        const pulse = (frame % 120) / 120 * maxR;
        ctx.beginPath(); ctx.arc(x, y, pulse, 0, 6.28);
        ctx.strokeStyle = color + Math.round((1 - pulse / maxR) * 30).toString(16).padStart(2, '0');
        ctx.lineWidth = 2; ctx.stroke();
      } else if (index === 1) {
        const scanA = t * 2;
        for (let r = 0; r < 4; r++) {
          ctx.beginPath(); ctx.arc(x, y, maxR * (0.25 + r * 0.2), 0, 6.28);
          ctx.strokeStyle = color + '10'; ctx.lineWidth = 1; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.arc(x, y, maxR * 0.85, scanA, scanA + 0.5);
        ctx.closePath();
        const sg = ctx.createRadialGradient(x, y, 0, x, y, maxR * 0.85);
        sg.addColorStop(0, color + '10'); sg.addColorStop(1, color + '02');
        ctx.fillStyle = sg; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(scanA) * maxR * 0.85, y + Math.sin(scanA) * maxR * 0.85);
        ctx.strokeStyle = color + '40'; ctx.lineWidth = 1.5; ctx.stroke();
        const shadows = [0.4, 1.2, 2.5, 3.8, 5.0];
        shadows.forEach((sa, i) => {
          const sr = maxR * (0.3 + i * 0.12);
          const sx = x + Math.cos(sa) * sr, sy = y + Math.sin(sa) * sr;
          const detected = Math.abs(((scanA % 6.28) - sa + 6.28) % 6.28) < 0.6;
          ctx.beginPath(); ctx.arc(sx, sy, detected ? 6 : 4, 0, 6.28);
          ctx.fillStyle = detected ? '#ef4444' + 'cc' : '#ef4444' + '40'; ctx.fill();
          if (detected) {
            ctx.beginPath(); ctx.arc(sx, sy, 12, 0, 6.28);
            ctx.strokeStyle = '#ef444440'; ctx.lineWidth = 1; ctx.stroke();
          }
        });
      } else if (index === 2) {
        const layers = 5;
        const layerNodes: { x: number; y: number; layer: number }[] = [];
        for (let l = 0; l < layers; l++) {
          const count = l === 0 ? 1 : l === 1 ? 2 : l === 2 ? 3 : l === 3 ? 2 : 1;
          const ly = y - maxR * 0.6 + (l / (layers - 1)) * maxR * 1.2;
          for (let n = 0; n < count; n++) {
            const lx = x + (n - (count - 1) / 2) * 55;
            layerNodes.push({ x: lx, y: ly, layer: l });
          }
        }
        layerNodes.forEach((a, ai) => {
          layerNodes.forEach((b, bi) => {
            if (bi <= ai || b.layer !== a.layer + 1) return;
            if (Math.abs(a.x - b.x) > 80) return;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = color + '18'; ctx.lineWidth = 1.5; ctx.stroke();
            const prog = ((t * 3 + ai * 0.5) % 3) / 3;
            if (prog < 1) {
              const px = a.x + (b.x - a.x) * prog, py = a.y + (b.y - a.y) * prog;
              ctx.beginPath(); ctx.arc(px, py, 3, 0, 6.28);
              ctx.fillStyle = color + 'aa'; ctx.fill();
            }
          });
        });
        layerNodes.forEach(n => {
          ctx.beginPath(); ctx.arc(n.x, n.y, 14, 0, 6.28);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = n.layer === 0 || n.layer === 4 ? '#ef444460' : color + '50';
          ctx.lineWidth = 2; ctx.stroke();
          if (n.layer === 0 || n.layer === 4) {
            ctx.beginPath(); ctx.arc(n.x, n.y, 18 + Math.sin(t * 3) * 3, 0, 6.28);
            ctx.strokeStyle = '#ef444420'; ctx.lineWidth = 1; ctx.stroke();
          }
        });
      } else if (index === 3) {
        const stages = ['Ingest', 'Clean', 'Train', 'Deploy'];
        const stageW = w * 0.16;
        stages.forEach((s, i) => {
          const sx = w * 0.15 + i * (w * 0.23), sy = y;
          ctx.beginPath();
          ctx.roundRect(sx - stageW / 2, sy - 25, stageW, 50, 10);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = color + '30'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = color; ctx.font = 'bold 10px Rubik, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s, sx, sy);
          if (i < stages.length - 1) {
            const nx = w * 0.15 + (i + 1) * (w * 0.23);
            ctx.beginPath(); ctx.moveTo(sx + stageW / 2 + 4, sy); ctx.lineTo(nx - stageW / 2 - 4, sy);
            ctx.strokeStyle = color + '25'; ctx.lineWidth = 1.5; ctx.stroke();
            const prog = ((t * 2 + i) % 4) / 4;
            const px = sx + stageW / 2 + 4 + (nx - stageW / 2 - 4 - sx - stageW / 2 - 4) * prog;
            ctx.beginPath(); ctx.arc(px, sy, 3, 0, 6.28);
            ctx.fillStyle = color; ctx.fill();
          }
        });
        const checkY = y + 50;
        [0.25, 0.48, 0.72, 0.93].forEach((p, i) => {
          const cx2 = w * p;
          const verified = (frame + i * 40) % 160 < 120;
          ctx.beginPath(); ctx.arc(cx2, checkY, 8, 0, 6.28);
          ctx.fillStyle = verified ? '#10b981' + '20' : '#ef4444' + '20'; ctx.fill();
          ctx.strokeStyle = verified ? '#10b981' + '60' : '#ef4444' + '60'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = verified ? '#10b981' : '#ef4444'; ctx.font = 'bold 9px Rubik, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(verified ? '✓' : '!', cx2, checkY);
        });
      } else if (index === 4) {
        ctx.beginPath(); ctx.arc(x, y, maxR * 0.3, 0, 6.28);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = color + '40'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = color; ctx.font = 'bold 12px Rubik, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('MODEL', x, y);
        const threats = 6;
        for (let i = 0; i < threats; i++) {
          const a = (i / threats) * 6.28 + t;
          const inbound = ((t * 0.5 + i) % 3);
          const tr = maxR * 0.5 + (maxR * 0.4) * (1 - inbound / 3);
          const tx2 = x + Math.cos(a) * tr, ty2 = y + Math.sin(a) * tr;
          if (inbound < 2.5) {
            ctx.beginPath(); ctx.arc(tx2, ty2, 4, 0, 6.28);
            ctx.fillStyle = '#ef4444' + '80'; ctx.fill();
            ctx.beginPath(); ctx.moveTo(tx2, ty2);
            ctx.lineTo(tx2 + Math.cos(a) * 8, ty2 + Math.sin(a) * 8);
            ctx.strokeStyle = '#ef4444' + '40'; ctx.lineWidth = 1; ctx.stroke();
          }
          if (inbound > 2) {
            const blockR = maxR * 0.38;
            const bx = x + Math.cos(a) * blockR, by2 = y + Math.sin(a) * blockR;
            for (let s = 0; s < 4; s++) {
              const sa2 = Math.random() * 6.28, sr2 = 3 + Math.random() * 6;
              ctx.beginPath(); ctx.arc(bx + Math.cos(sa2) * sr2, by2 + Math.sin(sa2) * sr2, 1.5, 0, 6.28);
              ctx.fillStyle = color + '60'; ctx.fill();
            }
          }
        }
        ctx.beginPath(); ctx.arc(x, y, maxR * 0.38, 0, 6.28);
        ctx.strokeStyle = color + '20'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      } else if (index === 5) {
        const keys = 5;
        for (let i = 0; i < keys; i++) {
          const a = (i / keys) * 6.28 + t * 0.5;
          const kr = maxR * 0.55;
          const kx = x + Math.cos(a) * kr, ky2 = y + Math.sin(a) * kr;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky2);
          const secure = i % 2 === 0;
          ctx.strokeStyle = (secure ? '#10b981' : '#ef4444') + '20'; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath(); ctx.arc(kx, ky2, 16, 0, 6.28);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = (secure ? '#10b981' : '#ef4444') + '50'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = secure ? '#10b981' : '#ef4444'; ctx.font = 'bold 10px Rubik, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(secure ? '🔑' : '⚠', kx, ky2);
        }
        ctx.beginPath(); ctx.arc(x, y, 22, 0, 6.28);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = color + '50'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = color; ctx.font = 'bold 9px Rubik, sans-serif';
        ctx.fillText('IAM', x, y);
      } else if (index === 6) {
        const gridS = 5;
        const cellW = (w * 0.6) / gridS, cellH = (h * 0.6) / gridS;
        const ox = x - (w * 0.3), oy = y - (h * 0.3);
        for (let r = 0; r < gridS; r++) {
          for (let c = 0; c < gridS; c++) {
            const gx = ox + c * cellW, gy2 = oy + r * cellH;
            const active = ((frame + r * 20 + c * 30) % 200) < 140;
            ctx.beginPath();
            ctx.roundRect(gx + 2, gy2 + 2, cellW - 4, cellH - 4, 6);
            ctx.fillStyle = active ? color + '08' : '#fff';
            ctx.fill();
            ctx.strokeStyle = active ? color + '25' : '#e5e7eb';
            ctx.lineWidth = 1; ctx.stroke();
            if (active) {
              ctx.beginPath(); ctx.arc(gx + cellW / 2, gy2 + cellH / 2, 3, 0, 6.28);
              ctx.fillStyle = color + '60'; ctx.fill();
            }
          }
        }
        const scanLine = oy + ((frame % 150) / 150) * h * 0.6;
        ctx.beginPath(); ctx.moveTo(ox, scanLine); ctx.lineTo(ox + w * 0.6, scanLine);
        ctx.strokeStyle = color + '30'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        const sections = ['EU AI Act', 'NIST RMF', 'ISO 42001'];
        sections.forEach((s, i) => {
          const sy = y - 55 + i * 55;
          const barW = w * 0.5;
          const bx = x - barW / 2;
          ctx.beginPath(); ctx.roundRect(bx, sy - 15, barW, 30, 8);
          ctx.fillStyle = '#fff'; ctx.fill();
          ctx.strokeStyle = color + '20'; ctx.lineWidth = 1; ctx.stroke();
          const prog = Math.min(1, ((t * 0.3 + i * 0.8) % 3) / 2);
          ctx.beginPath(); ctx.roundRect(bx + 2, sy - 13, (barW - 4) * prog, 26, 6);
          ctx.fillStyle = color + '15'; ctx.fill();
          ctx.fillStyle = color; ctx.font = 'bold 10px Rubik, sans-serif';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(s, bx + 10, sy);
          ctx.textAlign = 'right';
          ctx.fillText(Math.round(prog * 100) + '%', bx + barW - 10, sy);
        });
      }

      frame++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [isVisible, index]);

  return (
    <div ref={ref} className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

function CapabilitiesSection() {
  return (
    <section id="capabilities" className="relative py-28 bg-[#f8fafc] overflow-hidden border-t border-gray-100">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <FadeIn>
            <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-4 py-1.5 mb-6">
              <Layers className="w-3.5 h-3.5 text-[#007aff]" />
              <span className="text-[#007aff] text-[14px] font-semibold uppercase tracking-wider">Core Platform Capabilities</span>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5">Full-Spectrum <span className="text-[#007aff]">AI Security</span></h2>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-gray-900 text-lg max-w-2xl mx-auto">
              Eight integrated modules working together to give you complete visibility and control over your AI security posture.
            </p>
          </FadeIn>
        </div>

        <div className="space-y-8">
          {capabilities.map((cap, idx) => (
            <FadeIn key={idx} delay={100}>
              <div
                className={`group grid lg:grid-cols-2 gap-8 bg-white border border-gray-100 rounded-3xl p-8 md:p-10 hover:shadow-xl hover:border-gray-200 transition-all duration-500 items-center`}
                data-testid={`card-capability-${idx}`}
              >
                <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-all duration-500`}>
                    <cap.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-xl md:text-2xl mb-3">{cap.title}</h3>
                  <p className="text-gray-900 text-[15px] leading-relaxed mb-5">{cap.desc}</p>
                  <ul className="space-y-2.5">
                    {cap.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14px]">
                        <div className="w-5 h-5 rounded-full bg-[#007aff]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-[#007aff]" />
                        </div>
                        <span className="text-gray-900">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${idx % 2 === 1 ? 'lg:order-1' : ''} h-[280px] md:h-[320px] rounded-2xl bg-gradient-to-br from-gray-50 to-[#f8fafc] border border-gray-100 overflow-hidden`}>
                  <CapabilityAnimation index={idx} />
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function CloudCoverageSection() {
  const clouds = [
    { name: 'AWS', color: '#f97316', services: ['Amazon Bedrock models & custom models', 'Bedrock agents, knowledge bases & flows', 'SageMaker models, endpoints & notebooks', 'SageMaker pipelines, training jobs & feature store', 'OpenSearch vector collections', 'S3 training datasets & IAM execution roles', 'Lambda action groups & Step Functions orchestration'] },
    { name: 'Azure', color: '#007aff', services: ['Azure OpenAI deployments', 'Azure AI Foundry', 'Azure ML workspaces & endpoints', 'Azure AI agents', 'Azure Blob training data', 'Microsoft Purview data labels', 'Entra ID AI identities & AI Content Safety'] },
    { name: 'Google Cloud', color: '#22c55e', services: ['Vertex AI models & endpoints', 'Vertex AI datasets & pipelines', 'Vertex AI workbenches & agents', 'GCS training datasets', 'Vertex vector search', 'Model Armor safety services'] },
  ];

  return (
    <section id="cloud-coverage" className="relative py-28 bg-white border-t border-gray-100">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <FadeIn>
            <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-4 py-1.5 mb-6">
              <Cloud className="w-3.5 h-3.5 text-[#007aff]" />
              <span className="text-[#007aff] text-[14px] font-semibold uppercase tracking-wider">Multi-Cloud Coverage</span>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">Deep Visibility Across <span className="text-[#007aff]">Every Cloud</span></h2>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-gray-900 text-base max-w-2xl mx-auto">
              Fyx provides native integration with AWS, Azure, and Google Cloud AI services — no agents or infrastructure changes required.
            </p>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {clouds.map((cloud, idx) => (
            <FadeIn key={idx} delay={idx * 100}>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300 h-full" data-testid={`card-cloud-${idx}`}>
                <div className="flex items-center space-x-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cloud.color + '15' }}>
                    <Globe className="w-5 h-5" style={{ color: cloud.color }} />
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg">{cloud.name}</h3>
                </div>
                <ul className="space-y-2.5">
                  {cloud.services.map((svc, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[14px]">
                      <Check className="w-4 h-4 text-[#007aff] mt-0.5 shrink-0" />
                      <span className="text-gray-900">{svc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformSection() {
  const features = [
    { icon: Zap, title: 'Agentless Deployment', desc: 'Integrates using read-only APIs. No agents or infrastructure changes. Setup takes less than 15 minutes.' },
    { icon: LayoutGrid, title: 'Unified Dashboard', desc: 'Centralized view of AI assets, active risks, shadow AI activity, compliance posture, and toxic risk paths.' },
    { icon: Settings, title: 'Policy Engine', desc: 'Create custom AI security policies using the built-in rule engine with over 100 precision detection rules.' },
    { icon: Terminal, title: 'Automated Remediation', desc: 'Provides remediation guidance and automated scripts for fixing common security issues.' },
    { icon: Network, title: 'Security Integrations', desc: 'Integrates with SIEM platforms, incident response systems, messaging, and security orchestration workflows.' },
    { icon: ShieldCheck, title: 'Compliance Reporting', desc: 'Automated reports aligned with EU AI Act, NIST AI RMF, ISO 42001, and other emerging frameworks.' },
  ];

  return (
    <section id="platform" className="relative py-28 bg-[#f8fafc] overflow-hidden border-t border-gray-100">
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`, backgroundSize: '80px 80px' }} />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <FadeIn>
            <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-4 py-1.5 mb-6">
              <Cpu className="w-3.5 h-3.5 text-[#007aff]" />
              <span className="text-[#007aff] text-[14px] font-semibold uppercase tracking-wider">Platform Usability</span>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5">Built for <span className="text-[#007aff]">Security Teams</span></h2>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-gray-900 text-lg max-w-2xl mx-auto">Deploy in minutes, not months. Fyx is designed to work with your existing security stack.</p>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, idx) => (
            <FadeIn key={idx} delay={idx * 80}>
              <div className="group bg-white border border-gray-100 rounded-2xl p-6 h-full hover:shadow-lg hover:border-gray-200 transition-all duration-300" data-testid={`card-platform-${idx}`}>
                <div className="w-11 h-11 rounded-xl bg-[#007aff]/8 border border-[#007aff]/15 flex items-center justify-center mb-4 group-hover:bg-[#007aff]/15 transition-all">
                  <f.icon className="w-5 h-5 text-[#007aff]" />
                </div>
                <h3 className="text-gray-900 font-bold text-[15px] mb-2">{f.title}</h3>
                <p className="text-gray-900 text-[14px] leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const [, setLocation] = useLocation();
  return (
    <section className="relative py-28 bg-white overflow-hidden border-t border-gray-100">
      <div className="absolute inset-0 bg-gradient-to-br from-[#007aff]/5 via-transparent to-[#6366f1]/5" />
      <div className="container mx-auto px-6 max-w-3xl text-center relative z-10">
        <FadeIn>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight" data-testid="text-cta-heading">
            Secure Your AI Infrastructure Today
          </h2>
        </FadeIn>
        <FadeIn delay={100}>
          <p className="text-gray-900 text-lg mb-5">
            AI innovation is accelerating. Security must evolve just as quickly.
          </p>
          <p className="text-gray-900 text-[14px] mb-10 max-w-xl mx-auto">
            Fyx Cloud AI provides the visibility, governance, and protection needed to safely deploy AI across the modern multi-cloud environment.
          </p>
        </FadeIn>
        <FadeIn delay={200}>
          <div className="flex flex-col items-center space-y-4 mb-10">
            <div className="flex flex-col sm:flex-row gap-3 text-[14px] font-medium text-gray-900">
              <span className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#007aff]" /><span>Discover your AI assets</span></span>
              <span className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#007aff]" /><span>Identify your real risks</span></span>
              <span className="flex items-center space-x-2"><Check className="w-4 h-4 text-[#007aff]" /><span>Fix your AI security posture</span></span>
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={300}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setLocation('/signup')} className="group bg-black text-white px-8 py-4 rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="button-cta-signup">
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link href="/docs" className="group bg-white border border-gray-200 text-gray-900 px-8 py-4 rounded-full font-semibold text-base hover:border-gray-300 hover:shadow-lg transition-all duration-300 inline-flex items-center justify-center space-x-3" data-testid="link-cta-docs">
              <span>Read the Docs</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-['Rubik'] text-[14px] overflow-x-hidden">
      <PublicNavbar />
      <HeroSection />
      <ProductOverview />
      <CapabilitiesSection />
      <CloudCoverageSection />
      <PlatformSection />
      <CTASection />
      <PublicFooter />
    </div>
  );
}
