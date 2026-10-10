import '@testing-library/jest-dom/vitest';

/**
 * jsdom ships no IntersectionObserver, and framer-motion's `whileInView` calls
 * it on mount. Any page using a scroll-reveal section therefore throws in a
 * test for a reason that has nothing to do with the page — so it is stubbed
 * once here rather than mocked per test file.
 *
 * The stub never fires, which is correct: `whileInView` renders its children
 * either way, and a test asserting on content should not depend on a scroll
 * position it cannot have.
 */
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

/*
 * findBy/waitFor wait 1s by default. The shell renders once every input is in
 * (GuardContext `ready`), and with 44 files running in parallel that can take
 * just over a second — one render test failed that way in about one run in
 * eight. A broken screen never appears however long we wait, so a longer
 * ceiling hides nothing; it only stops load from failing a correct page.
 */
import { configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 3000 });
