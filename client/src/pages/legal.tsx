import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { FyxLogo } from "@/components/fyx-logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, FileText, Cookie, Globe, Lock } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function LegalNavbar() {
  const [, setLocation] = useLocation();
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-900"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Home
            </Button>
          </div>
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setLocation("/")}>
            <FyxLogo className="h-6 w-6" />
            <span className="text-base font-bold text-slate-900">Fyx Cloud</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function LegalSidebar({ active }: { active: string }) {
  const pages = [
    { slug: "privacy", label: "Privacy Policy", icon: Shield },
    { slug: "terms", label: "Terms of Service", icon: FileText },
    { slug: "security", label: "Security", icon: Lock },
    { slug: "cookies", label: "Cookie Policy", icon: Cookie },
    { slug: "gdpr", label: "GDPR", icon: Globe },
  ];

  return (
    <div className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24 space-y-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Legal</p>
        {pages.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.slug} href={`/legal/${p.slug}`}>
              <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                active === p.slug ? "bg-blue-50 text-[#007aff] font-semibold" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}>
                <Icon className="h-4 w-4" />
                {p.label}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function PrivacyContent() {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: February 25, 2026</p>

      <Section title="1. Introduction">
        <p>Fyx Cloud ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI Security Posture Management platform and related services.</p>
        <p>By accessing or using Fyx Cloud, you agree to the collection and use of information in accordance with this policy.</p>
      </Section>

      <Section title="2. Information We Collect">
        <p><strong>Account Information:</strong> When you create an account, we collect your name, email address, organization name, and password (stored as a secure hash). If you enable MFA, we store your TOTP secret securely.</p>
        <p><strong>Cloud Credentials:</strong> When you connect cloud providers (e.g., AWS), we collect access credentials such as Access Key IDs and Secret Access Keys. These are encrypted using AES-256-GCM at rest and are never stored in plaintext.</p>
        <p><strong>Usage Data:</strong> We collect information about how you interact with the platform, including pages visited, features used, scan results, and API calls made.</p>
        <p><strong>Asset Data:</strong> When performing cloud scans, we discover and catalog information about your AI models, cloud resources, IAM roles, and other infrastructure components.</p>
        <p><strong>Log Data:</strong> We automatically collect server logs including IP addresses, browser type, access times, and referring URLs.</p>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide, maintain, and improve the Fyx Cloud platform</li>
          <li>Perform security scans and policy evaluations on your cloud resources</li>
          <li>Generate security findings, reports, and compliance assessments</li>
          <li>Send notifications about critical security findings and platform updates</li>
          <li>Provide customer support and respond to your requests</li>
          <li>Detect, investigate, and prevent fraudulent or unauthorized activities</li>
          <li>Comply with legal obligations and enforce our terms</li>
        </ul>
      </Section>

      <Section title="4. Data Sharing and Disclosure">
        <p>We do not sell your personal information. We may share information in the following circumstances:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Within your organization:</strong> Users within your organization can access shared resources, findings, and reports based on their role permissions.</li>
          <li><strong>Service providers:</strong> We may share data with third-party vendors who assist us in operating the platform, subject to confidentiality agreements.</li>
          <li><strong>Legal requirements:</strong> We may disclose information if required by law, regulation, or legal process.</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity.</li>
        </ul>
      </Section>

      <Section title="5. Data Security">
        <p>We implement industry-standard security measures to protect your data:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>AES-256-GCM encryption for sensitive credentials at rest</li>
          <li>TLS 1.3 encryption for all data in transit</li>
          <li>bcrypt password hashing with salt rounds</li>
          <li>Session-based authentication with secure, httpOnly cookies</li>
          <li>Role-based access control (RBAC) with 5 distinct permission levels</li>
          <li>Multi-factor authentication (TOTP) support</li>
          <li>Regular security audits and vulnerability assessments</li>
        </ul>
      </Section>

      <Section title="6. Data Retention">
        <p>We retain your personal data for as long as your account is active or as needed to provide services. Scan results and findings are retained for the duration of your subscription. When you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law.</p>
      </Section>

      <Section title="7. Your Rights">
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to or restrict processing of your data</li>
          <li>Request data portability</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p>To exercise these rights, contact us at privacy@fyxcloud.com.</p>
      </Section>

      <Section title="8. Contact Us">
        <p>If you have questions about this Privacy Policy, please contact us at:</p>
        <p><strong>Fyx Cloud Privacy Team</strong><br />Email: privacy@fyxcloud.com</p>
      </Section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: February 25, 2026</p>

      <Section title="1. Acceptance of Terms">
        <p>By accessing or using the Fyx Cloud AI Security Posture Management platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.</p>
      </Section>

      <Section title="2. Description of Service">
        <p>Fyx Cloud provides an AI Security Posture Management (AI-SPM) platform that enables organizations to discover, monitor, and secure AI models and cloud infrastructure. The Service includes but is not limited to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Cloud asset discovery and inventory management</li>
          <li>Security policy evaluation with 110+ detection rules</li>
          <li>Findings management with automated remediation suggestions</li>
          <li>Compliance mapping across multiple regulatory frameworks</li>
          <li>Security graph visualization of cloud topology</li>
          <li>AI model artifact scanning (Hex Scanner integration)</li>
          <li>Report generation and export capabilities</li>
          <li>API access for programmatic integration</li>
          <li>Webhook and third-party integration support</li>
        </ul>
      </Section>

      <Section title="3. User Accounts">
        <p>You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide accurate and complete registration information</li>
          <li>Promptly update your information if it changes</li>
          <li>Enable multi-factor authentication when required by your organization</li>
          <li>Notify us immediately of any unauthorized access to your account</li>
          <li>Not share your account credentials with third parties</li>
        </ul>
      </Section>

      <Section title="4. Subscription and Billing">
        <p>Fyx Cloud offers various subscription plans. By subscribing, you agree to pay the applicable fees. Subscriptions automatically renew unless cancelled before the renewal date. Refund requests are handled on a case-by-case basis in accordance with our refund policy.</p>
      </Section>

      <Section title="5. Acceptable Use">
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Violate any applicable law, regulation, or third-party rights</li>
          <li>Attempt to gain unauthorized access to other users' accounts or data</li>
          <li>Interfere with the operation of the Service or its infrastructure</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code</li>
          <li>Use automated tools to scrape, crawl, or harvest data from the Service</li>
          <li>Store or transmit malicious code through the Service</li>
          <li>Resell or redistribute the Service without authorization</li>
        </ul>
      </Section>

      <Section title="6. Cloud Credentials and Access">
        <p>When you provide cloud provider credentials (e.g., AWS Access Keys), you authorize Fyx Cloud to access your cloud resources for the purpose of asset discovery, security scanning, and policy evaluation. You are responsible for ensuring that the provided credentials have appropriate permissions and that your use complies with your cloud provider's terms of service.</p>
        <p>We encrypt all credentials using AES-256-GCM and never access your cloud resources beyond what is necessary for the Service.</p>
      </Section>

      <Section title="7. Intellectual Property">
        <p>The Service, including its design, features, content, policies, and underlying technology, is owned by Fyx Cloud and protected by intellectual property laws. You retain ownership of your data, including scan results and configurations. You grant us a limited license to process your data solely to provide the Service.</p>
      </Section>

      <Section title="8. Data Ownership">
        <p>Your data remains yours. We do not claim ownership of any data you submit to the Service, including cloud configurations, scan results, findings, or reports. You may export or delete your data at any time through the Service interface or API.</p>
      </Section>

      <Section title="9. Limitation of Liability">
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, FYX CLOUD SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR GOODWILL, ARISING OUT OF YOUR ACCESS TO OR USE OF THE SERVICE.</p>
        <p>Our total liability for any claims arising out of or relating to these Terms or the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
      </Section>

      <Section title="10. Disclaimer of Warranties">
        <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not guarantee that the Service will detect all security vulnerabilities or prevent all security incidents.</p>
      </Section>

      <Section title="11. Indemnification">
        <p>You agree to indemnify and hold Fyx Cloud harmless from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the Service, violation of these Terms, or infringement of any third-party rights.</p>
      </Section>

      <Section title="12. Termination">
        <p>We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason with reasonable notice. Upon termination, your right to use the Service ceases immediately. You may export your data within 30 days of termination.</p>
      </Section>

      <Section title="13. Modifications">
        <p>We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the Service. Your continued use of the Service after changes become effective constitutes acceptance of the modified Terms.</p>
      </Section>

      <Section title="14. Governing Law">
        <p>These Terms are governed by and construed in accordance with applicable laws. Any disputes arising out of these Terms shall be resolved through binding arbitration or in the courts of the applicable jurisdiction.</p>
      </Section>

      <Section title="15. Contact">
        <p>For questions about these Terms, contact us at legal@fyxcloud.com.</p>
      </Section>
    </>
  );
}

function SecurityContent() {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Security</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: February 25, 2026</p>

      <Section title="Our Commitment to Security">
        <p>At Fyx Cloud, security is at the core of everything we do. As a platform dedicated to AI security posture management, we hold ourselves to the highest standards of security practices. This page outlines the measures we take to protect your data and the platform.</p>
      </Section>

      <Section title="Infrastructure Security">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Encryption at Rest:</strong> All sensitive data, including cloud credentials, is encrypted using AES-256-GCM with unique initialization vectors per record.</li>
          <li><strong>Encryption in Transit:</strong> All communications are encrypted using TLS 1.3.</li>
          <li><strong>Database Security:</strong> PostgreSQL databases are configured with strict access controls, automated backups, and encryption at rest.</li>
          <li><strong>Network Isolation:</strong> Our infrastructure is deployed with network segmentation and firewall rules to minimize attack surface.</li>
        </ul>
      </Section>

      <Section title="Application Security">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Authentication:</strong> Session-based authentication with secure, httpOnly, sameSite cookies. Support for TOTP-based multi-factor authentication.</li>
          <li><strong>Password Security:</strong> Passwords are hashed using bcrypt with appropriate salt rounds. We enforce minimum password complexity requirements.</li>
          <li><strong>Authorization:</strong> Granular role-based access control (RBAC) with 5 distinct roles: Viewer, Analyst, Security Engineer, Admin, and Owner.</li>
          <li><strong>API Security:</strong> API key authentication with SHA-256 hashing, per-key permissions, and automatic expiration support.</li>
          <li><strong>Input Validation:</strong> All user inputs are validated using Zod schemas to prevent injection attacks.</li>
          <li><strong>CSRF Protection:</strong> Cross-site request forgery protection via SameSite cookie attributes and origin validation.</li>
        </ul>
      </Section>

      <Section title="Data Protection">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Multi-tenancy Isolation:</strong> Complete data isolation between organizations. Every database query is scoped to the authenticated user's organization.</li>
          <li><strong>Credential Handling:</strong> Cloud provider credentials are encrypted with AES-256-GCM. Decryption occurs only at the moment of use and keys are immediately discarded from memory.</li>
          <li><strong>Session Management:</strong> Sessions are stored server-side in PostgreSQL with automatic expiration. Session IDs are regenerated on privilege changes.</li>
        </ul>
      </Section>

      <Section title="Operational Security">
        <ul className="list-disc pl-5 space-y-1">
          <li>Regular security assessments and code reviews</li>
          <li>Dependency vulnerability scanning and automated updates</li>
          <li>Comprehensive audit logging of administrative actions</li>
          <li>Incident response procedures with defined escalation paths</li>
          <li>Employee security awareness training</li>
        </ul>
      </Section>

      <Section title="Responsible Disclosure">
        <p>We welcome responsible disclosure of security vulnerabilities. If you discover a security issue, please report it to security@fyxcloud.com. We commit to acknowledging receipt within 24 hours and providing a resolution timeline within 72 hours. We do not pursue legal action against security researchers acting in good faith.</p>
      </Section>
    </>
  );
}

function CookiesContent() {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Cookie Policy</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: February 25, 2026</p>

      <Section title="What Are Cookies">
        <p>Cookies are small text files stored on your device when you visit a website. They help websites function properly, remember your preferences, and provide analytics about how the site is used.</p>
      </Section>

      <Section title="How We Use Cookies">
        <p>Fyx Cloud uses cookies for the following purposes:</p>
        <p><strong>Essential Cookies (Required):</strong> These cookies are necessary for the platform to function. They include session cookies that maintain your authenticated state and CSRF protection tokens. Without these cookies, the Service cannot operate.</p>
        <p><strong>Preference Cookies:</strong> These cookies remember your settings, such as your preferred theme (light/dark mode), sidebar state, and display preferences. They improve your experience but are not essential.</p>
        <p><strong>Analytics Cookies:</strong> We may use analytics cookies to understand how users interact with the platform. This helps us improve features and user experience. Analytics data is aggregated and anonymized.</p>
      </Section>

      <Section title="Cookie Details">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-200 text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Cookie</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Purpose</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Duration</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono">connect.sid</td>
                <td className="border border-slate-200 px-3 py-2">Session authentication</td>
                <td className="border border-slate-200 px-3 py-2">24 hours</td>
                <td className="border border-slate-200 px-3 py-2">Essential</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2 font-mono">theme</td>
                <td className="border border-slate-200 px-3 py-2">Theme preference (light/dark)</td>
                <td className="border border-slate-200 px-3 py-2">1 year</td>
                <td className="border border-slate-200 px-3 py-2">Preference</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Managing Cookies">
        <p>You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. However, blocking essential cookies will prevent you from using the Service. Refer to your browser's help documentation for instructions on managing cookies.</p>
      </Section>

      <Section title="Updates to This Policy">
        <p>We may update this Cookie Policy periodically. Changes will be posted on this page with an updated revision date. Continued use of the Service after changes constitutes acceptance.</p>
      </Section>
    </>
  );
}

function GDPRContent() {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">GDPR Compliance</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: February 25, 2026</p>

      <Section title="Our Commitment to GDPR">
        <p>Fyx Cloud is committed to compliance with the General Data Protection Regulation (GDPR) for all users in the European Economic Area (EEA), United Kingdom, and Switzerland. This page outlines how we meet our obligations under the GDPR.</p>
      </Section>

      <Section title="Legal Basis for Processing">
        <p>We process personal data under the following legal bases:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Contract Performance:</strong> Processing necessary to provide the Service you've subscribed to, including account management, cloud scanning, and security analysis.</li>
          <li><strong>Legitimate Interests:</strong> Processing for platform security, fraud prevention, service improvement, and analytics, where our interests don't override your rights.</li>
          <li><strong>Consent:</strong> Where required, we obtain your explicit consent before processing, such as for marketing communications.</li>
          <li><strong>Legal Obligation:</strong> Processing necessary to comply with legal requirements.</li>
        </ul>
      </Section>

      <Section title="Your Rights Under GDPR">
        <p>As a data subject in the EEA, you have the following rights:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Right of Access (Art. 15):</strong> Request a copy of the personal data we hold about you.</li>
          <li><strong>Right to Rectification (Art. 16):</strong> Request correction of inaccurate or incomplete data.</li>
          <li><strong>Right to Erasure (Art. 17):</strong> Request deletion of your personal data ("right to be forgotten").</li>
          <li><strong>Right to Restrict Processing (Art. 18):</strong> Request limitation of data processing in certain circumstances.</li>
          <li><strong>Right to Data Portability (Art. 20):</strong> Receive your data in a structured, machine-readable format.</li>
          <li><strong>Right to Object (Art. 21):</strong> Object to processing based on legitimate interests.</li>
          <li><strong>Right Related to Automated Decision-Making (Art. 22):</strong> Not be subject to decisions based solely on automated processing.</li>
        </ul>
        <p>To exercise any of these rights, contact our Data Protection Officer at dpo@fyxcloud.com. We will respond within 30 days.</p>
      </Section>

      <Section title="Data Processing Activities">
        <p>We maintain a Record of Processing Activities (ROPA) as required by Article 30. Key processing activities include:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>User account management and authentication</li>
          <li>Cloud resource discovery and security scanning</li>
          <li>Security finding generation and management</li>
          <li>Report generation and compliance assessment</li>
          <li>Notification and alerting services</li>
          <li>Analytics and service improvement</li>
        </ul>
      </Section>

      <Section title="Data Protection Impact Assessments">
        <p>We conduct Data Protection Impact Assessments (DPIAs) for processing activities that may result in high risk to individuals' rights and freedoms. This includes our cloud scanning activities and any new features that involve processing personal data.</p>
      </Section>

      <Section title="International Data Transfers">
        <p>When personal data is transferred outside the EEA, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) approved by the European Commission, or transferring to countries with adequacy decisions.</p>
      </Section>

      <Section title="Data Breach Notification">
        <p>In the event of a personal data breach that poses a risk to your rights and freedoms, we will notify the relevant supervisory authority within 72 hours of becoming aware of the breach. If the breach is likely to result in a high risk, we will also notify affected individuals without undue delay.</p>
      </Section>

      <Section title="Data Protection Officer">
        <p>You can contact our Data Protection Officer for any GDPR-related inquiries:</p>
        <p><strong>Fyx Cloud Data Protection Officer</strong><br />Email: dpo@fyxcloud.com</p>
      </Section>

      <Section title="Supervisory Authority">
        <p>You have the right to lodge a complaint with your local supervisory authority if you believe your data protection rights have been violated.</p>
      </Section>
    </>
  );
}

const contentMap: Record<string, { component: () => JSX.Element; slug: string }> = {
  privacy: { component: PrivacyContent, slug: "privacy" },
  terms: { component: TermsContent, slug: "terms" },
  security: { component: SecurityContent, slug: "security" },
  cookies: { component: CookiesContent, slug: "cookies" },
  gdpr: { component: GDPRContent, slug: "gdpr" },
};

export default function LegalPage({ page }: { page: string }) {
  const entry = contentMap[page] || contentMap.privacy;
  const Content = entry.component;

  return (
    <div className="min-h-screen bg-white font-['Nunito_Sans']">
      <LegalNavbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-12">
          <LegalSidebar active={entry.slug} />
          <motion.main
            className="flex-1 min-w-0"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <Content />
          </motion.main>
        </div>
      </div>
    </div>
  );
}
