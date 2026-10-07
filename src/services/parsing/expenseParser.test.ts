import { describe, expect, it } from 'vitest';
import { parseTranscript } from './expenseParser';

// Monday 5 Oct 2026, 18:30 local time.
const NOW = new Date(2026, 9, 5, 18, 30);
const parse = (s: string) => parseTranscript(s, { now: NOW, defaultPaymentMethod: 'upi' });
const day = (ts: number) => new Date(ts).toDateString();

describe('parseTranscript — single items', () => {
  it('I spent 250 rupees on lunch', () => {
    const { drafts } = parse('I spent 250 rupees on lunch');
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ amount: 250, description: 'Lunch', categoryId: 'food', type: 'expense' });
    expect(day(drafts[0].occurredAt)).toBe(NOW.toDateString());
  });

  it('Spent 500 on petrol', () => {
    const [d] = parse('Spent 500 on petrol').drafts;
    expect(d).toMatchObject({ amount: 500, description: 'Petrol', categoryId: 'fuel' });
  });

  it('Bought groceries for 1200', () => {
    const [d] = parse('Bought groceries for 1200').drafts;
    expect(d).toMatchObject({ amount: 1200, description: 'Groceries', categoryId: 'groceries' });
  });

  it('Yesterday I spent 300 for dinner', () => {
    const { drafts, dayOffset } = parse('Yesterday I spent 300 for dinner');
    expect(drafts[0]).toMatchObject({ amount: 300, description: 'Dinner', categoryId: 'food' });
    expect(dayOffset).toBe(-1);
    expect(day(drafts[0].occurredAt)).toBe(new Date(2026, 9, 4).toDateString());
    expect(new Date(drafts[0].occurredAt).getHours()).toBe(20);
  });

  it('I paid 150 rupees for coffee', () => {
    const [d] = parse('I paid 150 rupees for coffee').drafts;
    expect(d).toMatchObject({ amount: 150, description: 'Coffee', categoryId: 'food' });
  });

  it('handles the ₹ symbol and thousands separators from the recogniser', () => {
    const [d] = parse('spent ₹1,250 on electricity bill').drafts;
    expect(d).toMatchObject({ amount: 1250, description: 'Electricity Bill', categoryId: 'bills' });
  });

  it('handles Rs. prefixes and decimals', () => {
    const [d] = parse('paid Rs. 99.50 for tea').drafts;
    expect(d).toMatchObject({ amount: 99.5, description: 'Tea' });
  });

  it('handles spelled-out numbers', () => {
    const [d] = parse('spent two hundred and fifty rupees on lunch').drafts;
    expect(d.amount).toBe(250);
    const [e] = parse('fifteen hundred for shoes').drafts;
    expect(e).toMatchObject({ amount: 1500, description: 'Shoes', categoryId: 'shopping' });
    const [f] = parse('paid 2 lakh for the car loan').drafts;
    expect(f.amount).toBe(200000);
    const [g] = parse('rent 1.5k').drafts;
    expect(g).toMatchObject({ amount: 1500, description: 'Rent', categoryId: 'bills' });
  });

  it('detects income', () => {
    const [d] = parse('received salary of 50000').drafts;
    expect(d).toMatchObject({ type: 'income', amount: 50000, categoryId: 'salary', description: 'Salary' });
    const [e] = parse('got 2500 from freelance project').drafts;
    expect(e).toMatchObject({ type: 'income', amount: 2500, categoryId: 'work', description: 'Freelance Project' });
  });

  it('detects payment methods without polluting the description', () => {
    const [d] = parse('paid 400 for uber via upi').drafts;
    expect(d).toMatchObject({ amount: 400, description: 'Uber', categoryId: 'transport', paymentMethod: 'upi' });
    const [e] = parse('spent 2000 on clothes using credit card').drafts;
    expect(e).toMatchObject({ description: 'Clothes', paymentMethod: 'credit_card' });
    const [f] = parse('paid 60 in cash for chai').drafts;
    expect(f).toMatchObject({ description: 'Chai', paymentMethod: 'cash' });
  });

  it('does not treat times, day counts or quantities as amounts', () => {
    const [d] = parse('spent 300 on dinner at 9 pm').drafts;
    expect(d.amount).toBe(300);
    expect(new Date(d.occurredAt).getHours()).toBe(21);
    const r = parse('3 days ago paid 450 for medicines');
    expect(r.drafts).toHaveLength(1);
    expect(r.drafts[0]).toMatchObject({ amount: 450, categoryId: 'health' });
    expect(day(r.drafts[0].occurredAt)).toBe(new Date(2026, 9, 2).toDateString());
    const q = parse('bought 2 kg tomatoes for 80');
    expect(q.drafts).toHaveLength(1);
    expect(q.drafts[0]).toMatchObject({ amount: 80, categoryId: 'groceries' });
  });

  it('keeps "and" inside a single item description', () => {
    const [d] = parse('spent 45 on chai and snacks').drafts;
    expect(d).toMatchObject({ amount: 45, description: 'Chai & Snacks', categoryId: 'food' });
  });

  it('parses explicit dates', () => {
    const [d] = parse('paid 1200 electricity bill on 3rd october').drafts;
    expect(day(d.occurredAt)).toBe(new Date(2026, 9, 3).toDateString());
    expect(d.categoryId).toBe('bills');
    const [e] = parse('spent 500 on groceries last friday').drafts;
    expect(day(e.occurredAt)).toBe(new Date(2026, 9, 2).toDateString());
  });
});

describe('parseTranscript — multiple items', () => {
  it('splits the design example with punctuation', () => {
    const { drafts } = parse('I spent 14 rupees for dinner, 14 rupees for lunch and 14 rupees for petrol today.');
    expect(drafts.map((d) => [d.description, d.amount, d.categoryId])).toEqual([
      ['Dinner', 14, 'food'],
      ['Lunch', 14, 'food'],
      ['Petrol', 14, 'fuel'],
    ]);
  });

  it('splits without punctuation (typical recogniser output)', () => {
    const { drafts } = parse('i spent 14 rupees for dinner 14 rupees for lunch and 14 rupees for petrol today');
    expect(drafts.map((d) => d.description)).toEqual(['Dinner', 'Lunch', 'Petrol']);
  });

  it('handles mixed word orders', () => {
    const { drafts } = parse('bought groceries for 1200 and spent 300 on dinner');
    expect(drafts.map((d) => [d.description, d.amount])).toEqual([
      ['Groceries', 1200],
      ['Dinner', 300],
    ]);
  });

  it('handles terse lists', () => {
    const { drafts } = parse('lunch 250 dinner 300');
    expect(drafts.map((d) => [d.description, d.amount])).toEqual([
      ['Lunch', 250],
      ['Dinner', 300],
    ]);
  });

  it('handles income and expense in one sentence', () => {
    const { drafts } = parse('received 5000 salary and spent 200 on movie');
    expect(drafts.map((d) => [d.type, d.description, d.amount])).toEqual([
      ['income', 'Salary', 5000],
      ['expense', 'Movie', 200],
    ]);
  });
});

describe('parseTranscript — invalid input', () => {
  it('returns no drafts without an amount', () => {
    expect(parse('I had lunch with friends').drafts).toHaveLength(0);
    expect(parse('').drafts).toHaveLength(0);
    expect(parse('   ').drafts).toHaveLength(0);
  });

  it('flags drafts that need review', () => {
    const [d] = parse('spent 500').drafts;
    expect(d.amount).toBe(500);
    expect(d.needsReview).toBe(true);
    expect(d.description).toBe('Expense');
  });

  it('rejects absurd amounts', () => {
    const [d] = parse('spent 99999999999 on lunch').drafts;
    expect(d.amount).toBeNull();
    expect(d.needsReview).toBe(true);
  });
});
