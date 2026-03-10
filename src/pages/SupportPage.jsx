import { Link } from 'react-router-dom';

export default function SupportPage() {
  return (
    <div className="min-h-screen pt-28 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-slate-400 hover:text-white text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Support &amp; Contact</h1>
        <p className="text-slate-500 text-sm mb-12">
          If you have any questions about TradeGuardX, your account, billing, or technical issues, you can reach our
          support team at:
        </p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-400 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Email Support</h2>
            <p>
              Send us an email at{' '}
              <a href="mailto:support@tradeguardx.com" className="text-accent hover:underline">
                support@tradeguardx.com
              </a>{' '}
              for:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>General questions about how TradeGuardX works</li>
              <li>Billing or subscription questions</li>
              <li>Technical issues, bugs, or error reports</li>
              <li>Feedback and feature requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What to Include</h2>
            <p>To help us assist you faster, please include where possible:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>The email address linked to your TradeGuardX account</li>
              <li>Your browser and operating system</li>
              <li>A short description of the issue and steps to reproduce it</li>
              <li>Screenshots or screen recordings, if relevant</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

