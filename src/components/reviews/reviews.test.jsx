import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReviewForm from './ReviewForm';
import ReviewCard from './ReviewCard';

const STATE = {
  eligible: true,
  exchanges: ['Delta Exchange'],
  traderSince: '2026-08',
  defaultName: 'Priya S.',
  limits: { bodyMin: 20, bodyMax: 2000, titleMax: 80, displayNameMax: 40 },
  review: null,
};
const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const BODY = 'It locked me out after three losses. Annoying, but it was right.';

describe('ReviewForm', () => {
  it('sends a trader with no exchange to connect one instead of showing a form', () => {
    wrap(<ReviewForm state={{ ...STATE, eligible: false }} onSave={vi.fn()} />);
    expect(screen.getByText(/connected an exchange/i)).toBeTruthy();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('cannot post until there is a rating and enough words', () => {
    wrap(<ReviewForm state={STATE} onSave={vi.fn()} />);
    const post = screen.getByRole('button', { name: 'Post review' });
    expect(post.disabled).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: /Poor, 2 of 5/ }));
    expect(post.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: BODY } });
    expect(post.disabled).toBe(false);
  });

  it('says it goes live with no approval, before you post', () => {
    wrap(<ReviewForm state={STATE} onSave={vi.fn()} />);
    expect(screen.getByText(/goes live straight away/i)).toBeTruthy();
    expect(screen.getByText(/never hide a review for being negative/i)).toBeTruthy();
  });

  it('posts a low rating as-is, and can post without a name', async () => {
    const onSave = vi.fn().mockResolvedValue({ review: { id: 'x', rating: 1, body: BODY, displayName: 'A TradeGuardX trader', exchanges: ['Delta Exchange'], traderSince: '2026-08', createdAt: '2026-10-25T00:00:00Z', redactions: [] } });
    wrap(<ReviewForm state={STATE} onSave={onSave} />);
    fireEvent.click(screen.getByRole('radio', { name: /Bad, 1 of 5/ }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: BODY } });
    fireEvent.click(screen.getByLabelText('Post without my name'));
    fireEvent.click(screen.getByRole('button', { name: 'Post review' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ rating: 1, body: BODY, displayName: 'A TradeGuardX trader' });
    expect(await screen.findByText(/your review is live/i)).toBeTruthy();
  });

  it('tells the reviewer when contact details were blanked', async () => {
    const onSave = vi.fn().mockResolvedValue({ review: { id: 'x', rating: 4, body: 'call [number removed]', displayName: 'Priya S.', exchanges: [], traderSince: '2026-08', createdAt: '2026-10-25T00:00:00Z', redactions: ['phone'] } });
    wrap(<ReviewForm state={STATE} onSave={onSave} />);
    fireEvent.click(screen.getByRole('radio', { name: /Good, 4 of 5/ }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: BODY } });
    fireEvent.click(screen.getByRole('button', { name: 'Post review' }));
    expect(await screen.findByText(/blanked out a phone number/i)).toBeTruthy();
  });
});

describe('ReviewCard', () => {
  it('shows a hidden review as a stub with its reason and none of its words', () => {
    wrap(<ReviewCard review={{ id: 'h', displayName: 'Rahul V.', exchanges: ['CoinDCX'], traderSince: '2026-09', createdAt: '2026-10-01T00:00:00Z', hidden: { reason: 'Spam or advertising' }, body: null, rating: null, reply: null }} />);
    expect(screen.getByText(/Review hidden: Spam or advertising/)).toBeTruthy();
    expect(screen.getByText(/Verified · CoinDCX/)).toBeTruthy();
  });

  it('shows our reply under the review', () => {
    wrap(<ReviewCard review={{ id: 'r', displayName: 'Priya S.', exchanges: ['Delta Exchange'], traderSince: '2026-08', createdAt: '2026-10-01T00:00:00Z', rating: 2, body: BODY, hidden: null, reply: { body: 'Fair. We fixed it.', at: null } }} />);
    expect(screen.getByText('Reply from TradeGuardX')).toBeTruthy();
    expect(screen.getByText('Fair. We fixed it.')).toBeTruthy();
  });
});
