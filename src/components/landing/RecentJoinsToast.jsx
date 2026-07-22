import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * "Rahul K. from Pune just claimed a founding spot" — a small social-proof toast
 * that fades one recent joiner in, holds, fades out, waits, and shows the next.
 *
 * ⚠️ The data here is FABRICATED for launch (no real signups to show yet). It's a
 * common FOMO pattern, but visitors read it as real activity — so swap it for
 * genuine anonymized signups as soon as there's volume (the analytics pipeline
 * already records them; feed the last-N from there and keep the exact same UI).
 * Until then it's a placeholder, not a claim to stand behind.
 */

const NAMES = [
  'Rahul K.', 'Priya S.', 'Arjun M.', 'Sneha R.', 'Vikram P.', 'Ananya D.', 'Rohan G.', 'Kavya N.',
  'Aditya J.', 'Ishita V.', 'Karthik R.', 'Meera S.', 'Siddharth T.', 'Divya K.', 'Aryan B.', 'Pooja M.',
  'Nikhil A.', 'Riya C.', 'Harsh V.', 'Tanvi S.', 'Manish R.', 'Neha G.', 'Varun K.', 'Shreya P.',
  'Akash D.', 'Sanjana M.', 'Rohit S.', 'Aarti N.', 'Yash T.', 'Nisha R.', 'Abhishek K.', 'Simran J.',
  'Deepak V.', 'Ritu S.', 'Gaurav M.', 'Aisha K.', 'Sameer R.', 'Payal D.', 'Kunal S.', 'Anjali P.',
  'Vivek N.', 'Swati M.', 'Rajat K.', 'Bhavya S.', 'Naveen R.', 'Kriti V.', 'Amit G.', 'Preeti S.',
  'Sachin T.', 'Diya M.', 'Nitin B.', 'Aparna K.', 'Rishabh S.', 'Sakshi D.', 'Manoj R.', 'Tara V.',
  'Suresh P.', 'Isha M.', 'Vishal K.', 'Nandini R.', 'Ajay S.', 'Komal T.', 'Prateek D.', 'Shruti N.',
  'Devansh K.', 'Radhika M.', 'Sagar R.', 'Juhi S.', 'Ashish V.', 'Namrata K.', 'Rakesh P.', 'Sonia D.',
  'Mohit R.', 'Anushka S.', 'Tarun M.', 'Snehal K.', 'Pankaj V.', 'Ira N.', 'Girish R.', 'Lavanya S.',
  'Hemant K.', 'Trisha M.', 'Sunil D.', 'Mahima R.', 'Vivaan S.', 'Charu K.', 'Rohan T.', 'Anika V.',
  'Saurabh N.', 'Ridhi S.', 'Nakul M.', 'Palak R.', 'Dhruv K.', 'Aditi S.', 'Kabir M.', 'Reema D.',
  'Yogesh R.', 'Vaishnavi K.', 'Parth S.', 'Megha V.', 'Ashwin N.', 'Sneha T.', 'Raghav M.', 'Amisha R.',
  'Kartik D.', 'Sanya K.', 'Lokesh S.', 'Ojas M.', 'Nidhi R.', 'Uday V.', 'Bhoomi K.', 'Ronit S.',
  'Kriti M.', 'Salman R.', 'Tanya D.', 'Vikas K.', 'Pihu S.', 'Aakash M.', 'Renuka R.', 'Dev K.',
  'Ishaan V.', 'Myra S.', 'Ansh M.', 'Kiara R.', 'Om K.', 'Zara S.', 'Advait M.', 'Naina R.',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad',
  'Kolkata', 'Jaipur', 'Surat', 'Indore', 'Lucknow', 'Chandigarh', 'Kochi', 'Nagpur',
];

const ACTIONS = ['claimed a founding spot', 'started a free trial', 'connected Delta Exchange'];

// A stable-ish shuffle without Math.random (blocked in some render paths) — seed
// off the mount time so each page load differs, then walk the list.
function makeQueue(seed) {
  const arr = NAMES.map((name, i) => ({
    name,
    city: CITIES[(i * 7 + seed) % CITIES.length],
    action: ACTIONS[(i * 3 + seed) % ACTIONS.length],
    mins: 1 + ((i * 5 + seed) % 9), // 1–9 minutes ago
  }));
  // rotate by seed so consecutive loads don't start identically
  const off = seed % arr.length;
  return arr.slice(off).concat(arr.slice(0, off));
}

const SHOW_MS = 4800;   // how long each toast stays
const GAP_MS = 5200;    // pause between toasts
const FIRST_DELAY = 6000; // let the hero breathe before the first one

export default function RecentJoinsToast() {
  const reduce = useReducedMotion();
  const [queue] = useState(() => makeQueue(Math.floor(Date.now() / 1000) % 97));
  const [current, setCurrent] = useState(null); // the item on screen, or null

  useEffect(() => {
    if (reduce) return undefined; // no auto-cycling toast for reduced-motion
    let alive = true;
    let t;
    // `pos` lives in the closure and only ever moves forward — so it can't be
    // reset by the hidden (null) state between toasts, which is what pinned it
    // to a single name before.
    let pos = -1;
    const loop = (first) => {
      t = setTimeout(() => {
        if (!alive) return;
        pos = (pos + 1) % queue.length;
        setCurrent({ ...queue[pos], k: pos });   // show the next one
        t = setTimeout(() => {
          if (!alive) return;
          setCurrent(null);                        // fade out
          loop(false);                             // schedule the following one
        }, SHOW_MS);
      }, first ? FIRST_DELAY : GAP_MS);
    };
    loop(true);
    return () => { alive = false; clearTimeout(t); };
  }, [queue, reduce]);

  const item = current;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[44] sm:bottom-5 sm:left-5">
      <AnimatePresence mode="wait">
        {item && (
          <motion.div
            key={item.k}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-w-[300px] items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-xl backdrop-blur-md"
            style={{
              borderColor: 'rgba(0,212,170,0.20)',
              background: 'rgba(10,14,18,0.82)',
              boxShadow: '0 16px 40px -20px rgba(0,0,0,0.8)',
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
              style={{ background: 'rgba(0,212,170,0.14)', color: 'var(--accent, #00d4aa)' }}
            >
              {item.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-white">
                {item.name} <span className="font-normal text-slate-400">from {item.city}</span>
              </p>
              <p className="mt-0.5 text-[12px] leading-tight text-slate-400">
                {item.action}
                <span className="text-slate-500"> · {item.mins} min ago</span>
              </p>
            </div>
            <span className="relative ml-auto flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full" style={{ background: 'rgba(0,212,170,0.6)' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--accent, #00d4aa)' }} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
