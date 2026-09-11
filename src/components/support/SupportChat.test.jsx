import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

const { renderReply, inline } = await import('./supportMarkdown');

/**
 * The assistant writes a small markdown subset. These pin the two rendering
 * failures that reached production:
 *  - a list following an intro line with no blank line rendered as one
 *    paragraph with literal asterisks
 *  - a reply truncated mid-bold printed its "**" opener
 */
describe('renderReply', () => {
  it('renders bullets that follow an intro line as a real list', () => {
    // Verbatim shape from the live reply about the manual kill switch.
    const text =
      'The **Manual Kill Switch** allows you to lock yourself out.\n' +
      'Here is how it works:\n' +
      '* **Must be flat first**: You cannot arm it with open positions.\n' +
      '* **Blocks new trades**: Any new position is closed within seconds.\n' +
      '* **Cannot be cancelled**: There is no unlock button.';
    const { container } = render(renderReply(text));

    const items = container.querySelectorAll('ul li');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toMatch(/^Must be flat first/);
    expect(container.querySelectorAll('strong').length).toBe(4);
    // no literal markers survive
    expect(container.textContent).not.toContain('*');
    // the two intro lines are ONE paragraph (single newline), separate from the list
    expect(container.querySelectorAll('p').length).toBe(1);
    expect(container.querySelector('p').textContent).toMatch(/Here is how it works:$/);
  });

  it('splits bullets the model ran into the intro sentence on one line', () => {
    // Verbatim from production: no newlines at all between the items.
    const text =
      'Here is how the data is handled: * **Source**: It reads your synced Delta trades. ' +
      '* **Classification**: F&O is Business Income. * **Currency Conversion**: Delta reports in USD.';
    const { container } = render(renderReply(text));
    const items = container.querySelectorAll('ul li');
    expect(items.length).toBe(3);
    expect(items[1].textContent).toMatch(/^Classification/);
    expect(container.textContent).not.toContain('*');
    expect(container.querySelector('p').textContent).toBe('Here is how the data is handled:');
  });

  it('does not split bold markers as if they were bullets', () => {
    const { container } = render(renderReply('The **Tax Centre** converts to **INR**.'));
    expect(container.querySelectorAll('li').length).toBe(0);
    expect(container.querySelectorAll('strong').length).toBe(2);
  });

  it('renders numbered steps as an ordered list', () => {
    const { container } = render(renderReply('Do this:\n1. Close positions on Delta.\n2. Go to Account → Security.\n3. Choose 3, 6 or 12 hours.'));
    expect(container.querySelectorAll('ol li').length).toBe(3);
  });

  it('separates paragraphs on blank lines', () => {
    const { container } = render(renderReply('First.\n\nSecond.'));
    expect(container.querySelectorAll('p').length).toBe(2);
  });
});

describe('inline', () => {
  it('drops a dangling bold opener instead of printing it', () => {
    const { container } = render(<span>{inline('closed trade was **XRPUSD (')}</span>);
    expect(container.textContent).toBe('closed trade was XRPUSD (');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('renders code spans', () => {
    const { container } = render(<span>{inline('status `failed` means rejected')}</span>);
    expect(container.querySelector('code')?.textContent).toBe('failed');
  });
});
