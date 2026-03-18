import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, BookOpen, Calendar, Clock, ArrowRight, Tag, User } from 'lucide-react';
import { FyxLogo } from '@/components/fyx-logo';
import { PublicNavbar, PublicFooter } from '@/components/public-layout';

const blogPosts = [
  {
    id: 'understanding-ai-spm',
    title: 'Understanding AI Security Posture Management (AI-SPM)',
    excerpt: 'As organizations adopt AI at scale, securing models, data pipelines, and inference endpoints becomes critical. Learn what AI-SPM is and why it matters for your enterprise security strategy.',
    author: 'Fyx Cloud Team',
    date: 'Feb 25, 2026',
    readTime: '8 min read',
    category: 'AI Security',
    featured: true,
  },
  {
    id: 'owasp-ml-top-10',
    title: 'OWASP Machine Learning Top 10: A Practical Guide',
    excerpt: 'A deep dive into the OWASP ML Top 10 security risks, with real-world examples and actionable remediation steps for each vulnerability category.',
    author: 'Security Research',
    date: 'Feb 18, 2026',
    readTime: '12 min read',
    category: 'Vulnerabilities',
    featured: true,
  },
  {
    id: 'pickle-deserialization-attacks',
    title: 'How Pickle Deserialization Attacks Compromise ML Models',
    excerpt: 'Pickle files are everywhere in machine learning. We explain how attackers exploit Python\'s pickle format to achieve remote code execution through malicious model files.',
    author: 'Threat Intelligence',
    date: 'Feb 10, 2026',
    readTime: '10 min read',
    category: 'Threat Research',
    featured: false,
  },
  {
    id: 'eu-ai-act-compliance',
    title: 'Preparing for the EU AI Act: A Compliance Checklist',
    excerpt: 'The EU AI Act introduces mandatory requirements for high-risk AI systems. Here is a practical checklist to help your organization prepare for compliance.',
    author: 'Compliance Team',
    date: 'Feb 3, 2026',
    readTime: '15 min read',
    category: 'Compliance',
    featured: false,
  },
  {
    id: 'securing-llm-deployments',
    title: 'Securing Large Language Model Deployments in Production',
    excerpt: 'From prompt injection to data exfiltration, LLMs introduce unique security challenges. Learn best practices for hardening your LLM infrastructure.',
    author: 'Fyx Cloud Team',
    date: 'Jan 27, 2026',
    readTime: '11 min read',
    category: 'Best Practices',
    featured: false,
  },
  {
    id: 'model-supply-chain-security',
    title: 'Model Supply Chain Security: Protecting Against Poisoned Models',
    excerpt: 'Pre-trained models from public repositories can contain backdoors and trojans. Discover how to implement supply chain security for your ML models.',
    author: 'Security Research',
    date: 'Jan 20, 2026',
    readTime: '9 min read',
    category: 'Supply Chain',
    featured: false,
  },
  {
    id: 'cicd-ml-security-gates',
    title: 'Adding Security Gates to Your ML CI/CD Pipeline',
    excerpt: 'Shift-left AI security by integrating automated model scanning and policy checks into your ML training and deployment pipelines.',
    author: 'DevSecOps',
    date: 'Jan 13, 2026',
    readTime: '7 min read',
    category: 'CI/CD',
    featured: false,
  },
  {
    id: 'nist-ai-rmf-guide',
    title: 'Implementing NIST AI Risk Management Framework',
    excerpt: 'A practical guide to mapping your AI security controls to the NIST AI RMF, with step-by-step implementation guidance and tool recommendations.',
    author: 'Compliance Team',
    date: 'Jan 6, 2026',
    readTime: '13 min read',
    category: 'Compliance',
    featured: false,
  },
  {
    id: 'adversarial-ml-defense',
    title: 'Defending Against Adversarial Machine Learning Attacks',
    excerpt: 'Adversarial examples, model evasion, and data poisoning — understand the attack landscape and practical defense strategies for production ML systems.',
    author: 'Threat Intelligence',
    date: 'Dec 30, 2025',
    readTime: '14 min read',
    category: 'Threat Research',
    featured: false,
  },
];

const categories = ['All', 'AI Security', 'Vulnerabilities', 'Threat Research', 'Compliance', 'Best Practices', 'Supply Chain', 'CI/CD'];

export default function ResourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const filteredPosts = selectedCategory === 'All'
    ? blogPosts
    : blogPosts.filter(p => p.category === selectedCategory);

  const featuredPosts = blogPosts.filter(p => p.featured);
  const regularPosts = filteredPosts.filter(p => !p.featured || selectedCategory !== 'All');

  return (
    <div className="min-h-screen bg-white text-gray-900 font-['Rubik'] text-[14px] overflow-x-hidden">
      <PublicNavbar />

      <section className="pt-28 pb-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-[#007aff]/8 border border-[#007aff]/15 rounded-full px-5 py-2.5 mb-7">
            <BookOpen className="w-4 h-4 text-[#007aff]" />
            <span className="text-[#007aff] text-[14px] font-medium" data-testid="badge-resources">Resources & Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-gray-900 leading-tight mb-6" data-testid="text-resources-heading">
            AI Security{' '}
            <span className="bg-gradient-to-r from-[#007aff] via-[#00a8ff] to-[#6366f1] bg-clip-text text-transparent">Insights</span>
          </h1>
          <p className="text-gray-900 text-lg max-w-3xl mx-auto leading-relaxed" data-testid="text-resources-subtitle">
            Stay ahead of emerging threats with expert analysis, best practices, and in-depth guides on securing AI and machine learning systems.
          </p>
        </div>
      </section>

      {selectedCategory === 'All' && (
        <section className="py-12 px-6 bg-[#f8fafc] border-t border-gray-100">
          <div className="container mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-8" data-testid="text-featured-heading">Featured Articles</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <div
                  key={post.id}
                  className="group bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer"
                  data-testid={`card-featured-${post.id}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#007aff]/10 text-[#007aff] text-[12px] font-semibold">
                      <Tag className="w-3 h-3 mr-1" />
                      {post.category}
                    </span>
                    <span className="text-[12px] text-gray-900 font-medium uppercase tracking-wider">Featured</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#007aff] transition-colors" data-testid={`text-featured-title-${post.id}`}>
                    {post.title}
                  </h3>
                  <p className="text-gray-900 text-[14px] mb-6 leading-relaxed">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[13px] text-gray-900">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readTime}
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#007aff] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12 px-6 bg-white border-t border-gray-100">
        <div className="container mx-auto">
          <div className="flex flex-wrap gap-3 mb-10">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
                data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedCategory === 'All' ? regularPosts.filter(p => !p.featured) : regularPosts).map((post) => (
              <article
                key={post.id}
                className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer flex flex-col"
                data-testid={`card-blog-${post.id}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-900 text-[12px] font-semibold">
                    {post.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-[#007aff] transition-colors leading-snug" data-testid={`text-blog-title-${post.id}`}>
                  {post.title}
                </h3>
                <p className="text-gray-900 text-[14px] mb-5 leading-relaxed flex-1">{post.excerpt}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-[13px] text-gray-900">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[13px] text-gray-900">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 text-lg">No posts found in this category yet.</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-20 px-6 bg-[#f8fafc] border-t border-gray-100">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4" data-testid="text-newsletter-heading">Stay Updated</h2>
          <p className="text-gray-900 text-[14px] mb-8 max-w-xl mx-auto leading-relaxed">
            Get the latest AI security research, threat intelligence, and best practices delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all text-[14px]"
              data-testid="input-newsletter-email"
            />
            <button
              className="bg-gray-900 text-white px-6 py-3 rounded-full font-semibold text-[14px] hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
              data-testid="button-newsletter-subscribe"
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
