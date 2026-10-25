import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReviewForm from './ReviewForm';
import ReviewCard from './ReviewCard';

const STATE = {
  eligible: true,
  exchanges: ['CoinDCX', 'Delta Exchange', 'Exness', 'Shark Exchange'],
  traderSince: '2026-09',
  defaultName: 'Priya S.',
  limits: { bodyMin: 20, bodyMax: 2000, titleMax: 80, displayNameMax: 40 },
  review: null,
};
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const BODY = 'It locked me out after three losses. Annoying, but it was right.';
const saved = (over = {}) => ({ id: 'x', rating: 4, body: BODY, displayName: 'Priya S.', exchanges: ['Delta Exchange'], traderSince: '2026-08', createdAt: '2026-10-25T00:00:00Z', redactions: [], status: 'published', hidden: null, reply: null, ...over });

describe('ReviewForm', () => {
  it('asks a trader with no exchange to connect one, with no form', () => {
    wrap(<ReviewForm state={{ ...STATE, eligible: false }} onSave={vi.fn()} />);
    expect(screen.getByText(/connect an exchange to leave a review/i)).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('starts with just the stars, then opens the box with a question that fits the rating', () => {
    wrap(<ReviewForm state={STATE} onSave={vi.fn()} />);
    expect(screen.queryByLabelText('Your review')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /Poor, 2 of 5/ }));
    expect(screen.getByLabelText('Your review').getAttribute('placeholder')).toBe('What went wrong?');
    fireEvent.click(screen.getByRole('radio', { name: /Great, 5 of 5/ }));
    expect(screen.getByLabelText('Your review').getAttribute('placeholder')).toBe('What do you like about it?');
  });

  it('cannot post until there are enough words, and says how many are missing', () => {
    wrap(<ReviewForm state={STATE} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /Good, 4 of 5/ }));
    const post = screen.getByRole('button', { name: 'Post review' });
    expect(post.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'Too short' } });
    expect(screen.getByText('11 more characters')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: BODY } });
    expect(post.disabled).toBe(false);
  });

  it('keeps the policy to one line: public right away, never hidden for being negative', () => {
    wrap(<ReviewForm state={STATE} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /Bad, 1 of 5/ }));
    expect(screen.getByText('Public right away. We never hide a review for being negative.')).toBeTruthy();
  });

  it('shows two exchanges and a count, not all four', () => {
    wrap(<ReviewForm state={STATE} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /Good, 4 of 5/ }));
    expect(screen.getByText(/Verified · CoinDCX, Delta Exchange\s*\+2/)).toBeTruthy();
  });

  it('posts a 1-star review as written, anonymously if asked, then shows it as live', async () => {
    const onSave = vi.fn().mockResolvedValue({ review: saved({ rating: 1, displayName: 'A TradeGuardX trader' }) });
    wrap(<ReviewForm state={STATE} onSave={onSave} />);
    fireEvent.click(screen.getByRole('radio', { name: /Bad, 1 of 5/ }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: BODY } });
    fireEvent.click(screen.getByLabelText('Hide my name'));
    fireEvent.click(screen.getByRole('button', { name: 'Post review' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ rating: 1, body: BODY, displayName: 'A TradeGuardX trader' });
    expect(await screen.findByText(/It’s live/)).toBeTruthy();
  });

  it('says when contact details were blanked', async () => {
    const onSave = vi.fn().mockResolvedValue({ review: saved({ redactions: ['phone'] }) });
    wrap(<ReviewForm state={STATE} onSave={onSave} />);
    fireEvent.click(screen.getByRole('radio', { name: /Good, 4 of 5/ }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: BODY } });
    fireEvent.click(screen.getByRole('button', { name: 'Post review' }));
    expect(await screen.findByText(/blanked out a phone number/i)).toBeTruthy();
  });

  it('shows an existing review as a card with Edit and Delete, not a form', async () => {
    const onDelete = vi.fn().mockResolvedValue({});
    wrap(<ReviewForm state={{ ...STATE, review: saved() }} onSave={vi.fn()} onDelete={onDelete} />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete it' }));
    expect(await screen.findByText('Review deleted')).toBeTruthy();
  });
});

describe('ReviewCard', () => {
  it('shows a hidden review as a stub with its reason and none of its words', () => {
    wrap(<ReviewCard review={{ id: 'h', displayName: 'Rahul V.', exchanges: ['CoinDCX'], traderSince: '2026-09', createdAt: '2026-10-01T00:00:00Z', hidden: { reason: 'Spam or advertising' }, body: null, rating: null, reply: null }} />);
    expect(screen.getByText(/Review hidden: Spam or advertising/)).toBeTruthy();
    expect(screen.getByText(/Verified · CoinDCX/)).toBeTruthy();
  });

  it('shows our reply under the review', () => {
    wrap(<ReviewCard review={saved({ reply: { body: 'Fair. We fixed it.', at: null } })} />);
    expect(screen.getByText('Reply from TradeGuardX')).toBeTruthy();
    expect(screen.getByText('Fair. We fixed it.')).toBeTruthy();
  });
});
