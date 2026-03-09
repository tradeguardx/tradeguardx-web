import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-slate-400 hover:text-white text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-12">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-10 text-slate-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              TradeGuardX (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our browser extension and related services. Please read this policy carefully.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-slate-300">Account information:</strong> Email address, name, and password when you create an account.</li>
              <li><strong className="text-slate-300">Usage data:</strong> How you use the extension, including rule settings and trade-related data that you choose to sync.</li>
              <li><strong className="text-slate-300">Technical data:</strong> Browser type, extension version, and device information necessary for the service to function.</li>
              <li><strong className="text-slate-300">Payment information:</strong> Processed by third-party payment providers; we do not store full payment details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related communications</li>
              <li>Send you updates, security alerts, and support messages</li>
              <li>Respond to your requests and comply with legal obligations</li>
              <li>Analyze usage to improve our product (in aggregate or anonymized form where possible)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Storage and Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data. Data may be stored on secure servers and, for extension functionality, locally in your browser. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Third-Party Services</h2>
            <p>
              Our service may integrate with or link to third-party services (e.g. payment processors, analytics). Their use of your information is governed by their respective privacy policies. We encourage you to review those policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to access, correct, delete, or port your personal data, and to object to or restrict certain processing. To exercise these rights, contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact Us</h2>
            <p>
              For questions about this Privacy Policy or our data practices, contact us at: <a href="mailto:privacy@tradeguardx.com" className="text-accent hover:underline">privacy@tradeguardx.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
