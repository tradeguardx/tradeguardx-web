import { Link } from 'react-router-dom';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-slate-400 hover:text-white text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms &amp; Conditions</h1>
        <p className="text-slate-500 text-sm mb-12">
          Last updated: {new Date().toLocaleDateString('en-US')}
        </p>

        <div className="prose prose-invert prose-slate max-w-none space-y-10 text-slate-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              These Terms and Conditions govern your access to and use of the TradeGuardX browser extension, web
              application, and related services (collectively, the &quot;Service&quot;), provided by TradeGuardX
              (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). By installing, accessing, or using the Service, you
              agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
            <p className="mt-3">
              You must be at least 18 years old and legally capable of entering into a binding agreement to use the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of the Service</h2>
            <p>
              TradeGuardX is a trading assistant and journaling tool that displays prompts, alerts, and suggestions on
              your trading charts based on rules and conditions you configure. It records and logs trading activity and
              may send such data to our servers to provide analytics, journaling, and other features designed to help
              you trade with more structure and discipline.
            </p>
            <p className="mt-3">
              We offer multiple subscription plans, which may include a free tier, a standard paid plan, and a master
              plan. Each plan has different limits on devices, accounts, journaling history, and available features as
              described on our current pricing or plans page. We may update plan features, limits, and pricing from
              time to time.
            </p>
            <p className="mt-3 font-semibold text-slate-200">
              No trade execution or protection guarantee: the Service does not open, close, manage, or protect your
              trades for you. It does not guarantee that any trade will be closed at a certain price, that losses will
              be limited, or that your capital will be protected. The Service is designed to alert you, apply your
              predefined rules, and support disciplined, rules-based trading and journaling, but all trading decisions
              and actions remain entirely your responsibility.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Plans and Billing</h2>
            <p>
              Access to certain features of the Service requires a paid subscription. Paid subscriptions are billed in
              advance on a recurring basis (for example, monthly) until cancelled. By starting a paid subscription, you
              authorize us and our payment processors to automatically charge your selected payment method at the
              then-current rate for your plan, plus any applicable taxes, until you cancel.
            </p>
            <p className="mt-3">
              We may change plan features and pricing from time to time. Material changes for existing subscribers (such
              as price increases or significant feature reductions) will be communicated in advance, and if you do not
              agree to the new terms you may cancel before they take effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. No Investment Advice; No Execution or Protection Service
            </h2>
            <p>
              The Service provides prompts, alerts, rules-based signals, and journaling tools for informational and
              educational purposes only. Nothing in the Service is, or should be taken as, financial, investment,
              trading, tax, or legal advice, or a recommendation to buy, sell, or hold any asset.
            </p>
            <p className="mt-3">
              We do not execute, close, hedge, or otherwise manage trades on your behalf. We do not monitor your
              positions in real time for the purpose of executing or closing them on your behalf. We do not guarantee to
              protect your account, your positions, or your capital, and we do not promise that any trade will be opened
              or closed at a particular level or within a particular time.
            </p>
            <p className="mt-3">
              Our goal is to help you follow your own rules more consistently and develop better trading discipline
              through alerts and journaling. Any references to helping you become a more profitable trader or improving
              your trading describe the intended purpose of the tools, not a promised or guaranteed result. You remain
              solely responsible for all trades you place and all outcomes of those trades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Eligibility and Account</h2>
            <p>
              To use the Service, you may be required to create an account and provide accurate, current, and complete
              information. You agree to maintain and promptly update your information, keep your login credentials
              secure, and notify us immediately of any unauthorized use of your account. You are responsible for all
              activity that occurs under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Use of the Service</h2>
            <p>
              Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable,
              revocable license to install and use the extension and apps on the number of devices allowed by your plan
              and to access the Service for your personal or internal business trading and journaling purposes.
            </p>
            <p className="mt-3">
              You agree not to copy, modify, reverse engineer, decompile, or disassemble the Service (except where
              permitted by law), attempt to circumvent device or account limits, use the Service in any unlawful manner
              or in violation of applicable regulations, or use the Service to build a competing product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data, Journaling, and Privacy</h2>
            <p>
              The Service may collect and process trade-related data, such as instruments traded, entry and exit prices
              and times, position size and direction, profit and loss, and any notes or tags you add. This data is used
              to display prompts and rules on your charts, provide journaling, analytics, and reporting, and operate and
              improve the Service.
            </p>
            <p className="mt-3">
              Our collection and use of personal data is described in our Privacy Policy, which is incorporated into
              these Terms. Please review the Privacy Policy to understand how we handle your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Third-Party Services</h2>
            <p>
              The Service may interact with or rely on third-party platforms, brokers, charting tools, or data
              providers. We do not control and are not responsible for these third-party services, and your use of them
              is governed by their own terms and policies. We are not liable for any unavailability, errors, or issues
              caused by third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Risk Disclosure</h2>
            <p>
              Trading financial instruments (including but not limited to stocks, options, futures, forex, and
              cryptocurrencies) involves significant risk of loss and may not be suitable for all investors. You may
              lose some or all of your capital. Past performance, analytics, backtests, or statistics provided by the
              Service do not guarantee future results, and the Service may contain bugs, delays, inaccuracies, or data
              errors that affect prompts, rules, or journaling.
            </p>
            <p className="mt-3">
              While the Service may help you structure and follow rules, review your performance, and receive alerts, it
              cannot eliminate trading risk or guarantee profitability. You understand and agree that you may lose money
              even when using the Service exactly as intended and that you use the Service at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Intellectual Property</h2>
            <p>
              The Service and all content, features, and functionality (including software, text, graphics, logos, and
              documentation) are owned by TradeGuardX or its licensors and are protected by intellectual property laws.
              Except as expressly stated, you acquire no ownership rights in the Service. All rights not expressly
              granted are reserved.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service if you breach these Terms, fail to pay applicable
              fees, or if we discontinue the Service. Upon termination, your right to use the Service will cease, and we
              may delete or anonymize your data in accordance with our data retention practices and applicable law.
              Provisions that by their nature should survive termination (such as disclaimers, limitations of
              liability, and indemnity) will continue to apply.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Disclaimers</h2>
            <p>
              The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of
              any kind, whether express, implied, or statutory, including implied warranties of merchantability, fitness
              for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted,
              error-free, secure, or free of harmful components, or that any specific trading performance or outcome
              will be achieved.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">13. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we are not liable for any indirect, incidental, consequential,
              special, punitive, or exemplary damages, including loss of profits, trading losses, loss of data, or
              business interruption, arising out of or related to your use of or inability to use the Service, even if
              we have been advised of the possibility of such damages. Our total aggregate liability for any and all
              claims arising out of or related to the Service will not exceed the greater of the amount you paid for the
              Service in the three months before the event giving rise to the claim or US $100.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">14. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless TradeGuardX and its officers, directors, employees, and
              agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable
              legal and accounting fees, arising out of or in any way connected with your use of the Service, your
              violation of these Terms, or your violation of any law or third-party right.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">15. Changes to the Service and Terms</h2>
            <p>
              We may update, modify, or discontinue the Service (or any part of it) at any time. We may also revise
              these Terms from time to time. When we do, we will update the &quot;Last updated&quot; date, and where
              required by law or where changes are material, we will provide notice. Your continued use of the Service
              after changes take effect constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">16. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws applicable in your primary
              jurisdiction of residence, unless otherwise required by mandatory consumer protection laws. Any disputes
              arising out of or relating to these Terms or the Service will be subject to the exclusive jurisdiction of
              the courts in a competent jurisdiction, except where applicable law provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">17. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">
                support@tradeguardx.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

