import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../components/common/ToastProvider';
import { useAuth } from '../context/AuthContext';

function formEndpoint() {
  return (import.meta.env.VITE_BETA_SIGNUP_ENDPOINT || '').trim();
}

function isFormConfigured() {
  return formEndpoint().length > 0;
}

async function postBetaRegistration(payload) {
  const url = formEndpoint();
  if (!url) {
    throw new Error('Form is not configured. Set VITE_BETA_SIGNUP_ENDPOINT for this deployment.');
  }
  const body = {
    _subject: 'TradeGuardX beta / research signup',
    email: payload.email.trim(),
    _replyto: payload.email.trim(),
    first_name: payload.firstName.trim(),
    last_name: payload.lastName.trim(),
    place: payload.place.trim() || '—',
    funded_account_info: payload.fundedAccountInfo.trim(),
    mobile: payload.mobile.trim(),
    video_call_ok: payload.videoCallOk ? 'yes' : 'no',
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error('beta registration POST', res.status, text);
    throw new Error('Could not send your registration. Please try again or email support@tradeguardx.com.');
  }
}

const inputCls =
  'w-full rounded-xl border border-surface-700/60 bg-surface-800/50 px-4 py-3 text-[15px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors';

export default function BetaTestRegistrationPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [place, setPlace] = useState('');
  const [fundedAccountInfo, setFundedAccountInfo] = useState('');
  const [mobile, setMobile] = useState('');
  const [videoCallOk, setVideoCallOk] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const configured = isFormConfigured();

  useEffect(() => {
    const q = searchParams.get('email');
    if (q) setEmail(decodeURIComponent(q));
  }, [searchParams]);

  useEffect(() => {
    if (user?.email) setEmail((prev) => (prev ? prev : user.email));
  }, [user?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (videoCallOk === null) {
      toast.error('Video sessions', 'Please let us know if you are open to a short video call.');
      return;
    }
    setSubmitting(true);
    try {
      await postBetaRegistration({
        email,
        firstName,
        lastName,
        place,
        fundedAccountInfo,
        mobile,
        videoCallOk,
      });
      setDone(true);
      toast.success('You are on the list', 'Thanks — we will reach out soon.');
    } catch (err) {
      toast.error('Submission failed', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-xl mx-auto relative">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <span className="inline-block text-accent text-sm font-semibold tracking-wider uppercase mb-3">
            Research & feedback
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3">Help shape TradeGuardX</h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-3">
            We are inviting traders for short feedback sessions. If you join a video call and help us test the product,
            we will credit you with <span className="text-slate-200 font-medium">one month free</span> on TradeGuardX
            as a thank-you.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Want a password account instead?{' '}
            <Link to="/signup" className="text-accent hover:underline">
              Create account
            </Link>
          </p>
        </motion.div>

        {!configured && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-amber-100/90 text-sm mb-8 leading-relaxed">
            Set <code className="text-amber-200/90">VITE_BETA_SIGNUP_ENDPOINT</code> in{' '}
            <code className="text-amber-200/90">.env.local</code> or Vercel (e.g. Formspree URL), then restart or redeploy.
          </div>
        )}

        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-accent/25 bg-accent/5 px-6 py-8 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-semibold text-white mb-2">Thank you</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              We have your details. Our team will contact you about scheduling. Eligible participants who complete a feedback
              session receive one month free as described above.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent text-surface-950 font-semibold text-sm hover:bg-accent-hover transition-colors"
            >
              Return home
            </Link>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/[0.08] bg-surface-900/60 backdrop-blur-xl p-6 md:p-8 space-y-5 shadow-xl shadow-black/20"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="beta-first" className="block text-sm font-medium text-slate-300 mb-1.5">
                  First name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="beta-first"
                  className={inputCls}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label htmlFor="beta-last" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Last name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="beta-last"
                  className={inputCls}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="beta-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email <span className="text-rose-400">*</span>
              </label>
              <input
                id="beta-email"
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="beta-place" className="block text-sm font-medium text-slate-300 mb-1.5">
                City / country
              </label>
              <input
                id="beta-place"
                className={inputCls}
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Where you are based"
                autoComplete="address-level2"
              />
            </div>

            <div>
              <label htmlFor="beta-funded" className="block text-sm font-medium text-slate-300 mb-1.5">
                Funded accounts & trading <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="beta-funded"
                className={`${inputCls} min-h-[100px] resize-y`}
                value={fundedAccountInfo}
                onChange={(e) => setFundedAccountInfo(e.target.value)}
                required
                placeholder="e.g. prop firm name, evaluation or funded, account size, markets you trade"
              />
            </div>

            <div>
              <label htmlFor="beta-mobile" className="block text-sm font-medium text-slate-300 mb-1.5">
                Mobile number <span className="text-rose-400">*</span>
              </label>
              <input
                id="beta-mobile"
                type="tel"
                className={inputCls}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                placeholder="+1 … include country code"
                autoComplete="tel"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-300 mb-3">
                Are you comfortable joining a short video call to try the product with us? <span className="text-rose-400">*</span>
              </legend>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: true, label: 'Yes' },
                  { value: false, label: 'No' },
                ].map(({ value, label }) => (
                  <label
                    key={label}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                      videoCallOk === value
                        ? 'border-accent/50 bg-accent/10 text-white'
                        : 'border-surface-700/60 bg-surface-800/40 text-slate-400 hover:border-surface-600/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="videoCallOk"
                      className="sr-only"
                      checked={videoCallOk === value}
                      onChange={() => setVideoCallOk(value)}
                    />
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        videoCallOk === value ? 'border-accent' : 'border-slate-600'
                      }`}
                    >
                      {videoCallOk === value ? <span className="w-2 h-2 rounded-full bg-accent" /> : null}
                    </span>
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="text-xs text-slate-500 leading-relaxed">
              By submitting, you agree that we may contact you about this program. See our{' '}
              <Link to="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            <button
              type="submit"
              disabled={submitting || !configured}
              className="w-full py-3.5 rounded-xl bg-accent text-surface-950 font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? 'Sending…' : 'Submit registration'}
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
