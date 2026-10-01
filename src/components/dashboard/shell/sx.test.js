import { describe, expect, it } from 'vitest';
import { sx } from './sx';

/**
 * sx is used in inline `style={}` on hundreds of elements, so a value it
 * returns that React cannot apply does not fail locally — it throws inside
 * completeWork and takes the whole tree to the error boundary. The user sees
 * "Something went wrong" on a page that rendered a second ago, with nothing
 * naming the component.
 *
 * That is exactly what happened: the second argument was spread blind, so a
 * string passed there became {0:'m', 1:'a', …} and React tried to set
 * CSSStyleDeclaration[0]. These tests pin the shape of what comes out, not
 * just the values.
 */

describe('what sx returns', () => {
  it('parses a declaration string into camelCase props', () => {
    expect(sx('max-width:420px;font-size:13px')).toEqual({ maxWidth: '420px', fontSize: '13px' });
  });

  it('never returns a numeric key, whatever the layers are', () => {
    // The one property that matters. A numeric key is the crash.
    const layers = [
      sx('flex:1', 'max-width:420px'),
      sx('flex:1', { color: 'red' }),
      sx('flex:1', 'max-width:420px', { color: 'red' }),
      sx({ color: 'red' }, 'flex:1'),
    ];
    for (const style of layers) {
      for (const key of Object.keys(style)) {
        expect(Number.isNaN(Number(key))).toBe(true);
      }
    }
  });

  it('merges a string layer instead of spreading its characters', () => {
    expect(sx('flex:1', 'max-width:420px')).toEqual({ flex: '1', maxWidth: '420px' });
  });

  it('lets later layers win', () => {
    expect(sx('color:red', 'color:blue')).toEqual({ color: 'blue' });
    expect(sx('color:red', { color: 'green' })).toEqual({ color: 'green' });
  });

  it('still takes an object as the second layer, as it always did', () => {
    expect(sx('flex:1', { border: '1px solid var(--line)' })).toEqual({
      flex: '1',
      border: '1px solid var(--line)',
    });
  });

  it('skips empty layers rather than merging them', () => {
    // Conditional layers are written `cond && {...}`, which is false when off.
    expect(sx('flex:1', false, null, undefined)).toEqual({ flex: '1' });
  });

  it('keeps custom properties and -webkit- prefixes usable', () => {
    expect(sx('--dash-x:3px;-webkit-text-security:disc')).toEqual({
      '--dash-x': '3px',
      WebkitTextSecurity: 'disc',
    });
  });

  it('does not split on a semicolon inside url()', () => {
    const style = sx("background:url(data:image/svg+xml;base64,AAA);color:red");
    expect(style.color).toBe('red');
    expect(style.background).toBe('url(data:image/svg+xml;base64,AAA)');
  });

  it('does not let a merged call mutate the cache a single call returns', () => {
    // Single-arg calls hand back the cached object itself. If a merge wrote
    // into that, one component's override would leak into every other use of
    // the same string — invisible, and impossible to reason about.
    const merged = sx('flex:1', 'flex:9');
    expect(merged.flex).toBe('9');
    expect(sx('flex:1')).toEqual({ flex: '1' });
  });
});
