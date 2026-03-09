import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-slate-400 hover:text-white text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms and Conditions</h1>
        <p className="text-slate-500 text-sm mb-12">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-10 text-slate-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using TradeGuardX (&quot;Service&quot;), including our browser extension, website, and dashboard, you agree to be bound by these Terms and Conditions. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              TradeGuardX is a browser extension and related web services that help traders monitor and enforce risk rules on supported trading platforms. We do not provide trading, investment, or financial advice. The Service is provided &quot;as is&quot; for informational and risk-management assistance only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Eligibility</h2>
            <p>
              You must be at least 18 years old and capable of forming a binding contract to use the Service. By using the Service, you represent that you meet these requirements and that you will use the Service in compliance with all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Account and Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must notify us promptly of any unauthorized use. We are not liable for losses arising from unauthorized access due to your failure to secure your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Reverse engineer, decompile, or attempt to extract source code of the extension or our systems</li>
              <li>Resell, sublicense, or commercially exploit the Service without our written permission</li>
              <li>Interfere with or disrupt the Service or servers/networks connected to the Service</li>
              <li>Use the Service in any way that could harm us, other users, or third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Subscription and Payment</h2>
            <p>
              Paid plans are billed in accordance with the pricing displayed at the time of purchase. Fees are non-refundable except as stated in our Refund Policy. We may change pricing with reasonable notice; continued use after a price change constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT IT WILL CORRECTLY DETECT OR ENFORCE ALL TRADING RULES. YOU USE THE SERVICE AT YOUR OWN RISK.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRADEGUARDX AND ITS AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR TRADING LOSSES, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason. You may stop using the Service at any time. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive (e.g. disclaimers, limitation of liability) will survive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes</h2>
            <p>
              We may modify these Terms from time to time. We will post the updated Terms on this page and update the &quot;Last updated&quot; date. Material changes may be communicated via email or in-product notice. Your continued use of the Service after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
            <p>
              For questions about these Terms, contact us at: <a href="mailto:legal@tradeguardx.com" className="text-accent hover:underline">legal@tradeguardx.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
