import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMyanmarExpenseFallback } from './aiParser';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './ledger';

test('parseMyanmarExpenseFallback parses "ဒီနေ့မနက် မနက်စာ ငါးထောင်ဖိုးစားလိုက်တယ်"', () => {
  const result = parseMyanmarExpenseFallback(
    'ဒီနေ့မနက် မနက်စာ ငါးထောင်ဖိုးစားလိုက်တယ်',
    DEFAULT_ACCOUNTS,
    DEFAULT_CATEGORIES
  );

  assert.equal(result.amount, 5000);
  assert.equal(result.type, 'expense');
  assert.equal(result.category, 'အစားအသောက် / မနက်စာ');
  // Since account wasn't named and multiple accounts exist, it asks for clarification
  assert.equal(result.needsAccountClarification, true);
  assert.ok(result.clarificationQuestion?.includes('အကောင့်'));
});

test('parseMyanmarExpenseFallback recognizes explicit account when mentioned', () => {
  const result = parseMyanmarExpenseFallback(
    'အိမ်စရိတ်ထဲက ဈေးဖိုး ၂သောင်းဖိုး ဝယ်လိုက်တယ်',
    DEFAULT_ACCOUNTS,
    DEFAULT_CATEGORIES
  );

  assert.equal(result.amount, 20000);
  assert.equal(result.type, 'expense');
  assert.equal(result.category, 'ဈေးဖိုး / ကုန်စုံ');
  assert.equal(result.accountName, 'အိမ်စရိတ်');
  assert.equal(result.needsAccountClarification, false);
});

test('parseMyanmarExpenseFallback recognizes income and salary', () => {
  const result = parseMyanmarExpenseFallback(
    'လစာ ၁၀ သိန်း ဝင်တယ် KBZPay ထဲ',
    DEFAULT_ACCOUNTS,
    DEFAULT_CATEGORIES
  );

  assert.equal(result.amount, 1000000);
  assert.equal(result.type, 'income');
  assert.equal(result.category, 'လစာ / ပုံမှန်ဝင်ငွေ');
  assert.equal(result.accountName, 'KBZPay / WavePay');
  assert.equal(result.needsAccountClarification, false);
});
