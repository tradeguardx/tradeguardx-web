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
