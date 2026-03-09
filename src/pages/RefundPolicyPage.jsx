import { Link } from 'react-router-dom';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-slate-400 hover:text-white text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Refund Policy</h1>
        <p className="text-slate-500 text-sm mb-12">Last updated: {new Date().toLocaleDateString('en-US')}</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-10 text-slate-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Overview</h2>
            <p>
              TradeGuardX offers subscription plans (Pro and Pro+). This Refund Policy explains when and how you may request a refund for paid subscriptions. Our goal is to be fair and transparent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Free Plan</h2>
            <p>
              The Free plan does not require payment. No refunds apply to the Free plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Refund Eligibility</h2>
            <p className="mb-3">You may be eligible for a full refund if:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You request a refund within <strong className="text-slate-300">14 days</strong> of your initial purchase or renewal.</li>
              <li>You have not previously received a refund for the same plan in the past 12 months.</li>
              <li>The request is made in good faith (e.g. service did not work as described, technical issues we could not resolve).</li>
            </ul>
            <p className="mt-4">
              Refunds are issued at our discretion. We may ask for details about your experience to improve our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Non-Refundable Situations</h2>
            <p className="mb-3">We generally do not offer refunds in the following cases:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Requests made more than 14 days after the charge</li>
              <li>Partial refunds for unused portions of a subscription period</li>
              <li>Change of mind after the 14-day window</li>
              <li>Violation of our Terms and Conditions resulting in account termination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. How to Request a Refund</h2>
            <p>
              Send an email to <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">support@tradeguardx.com</a> with the subject line &quot;Refund Request&quot; and include your account email and the date of the charge. We will respond within 5 business days. If approved, refunds are processed to the original payment method within 7–10 business days, depending on your payment provider.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Cancellation</h2>
            <p>
              You may cancel your subscription at any time from your account or dashboard. Cancellation stops future charges but does not entitle you to a refund for the current billing period unless you meet the refund eligibility criteria above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Changes to This Policy</h2>
            <p>
              We may update this Refund Policy from time to time. The &quot;Last updated&quot; date at the top reflects the latest version. Continued use of paid services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact</h2>
            <p>
              For refund requests or questions: <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">support@tradeguardx.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
