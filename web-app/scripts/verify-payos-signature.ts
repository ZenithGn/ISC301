/**
 * Kiểm chứng thuật toán chữ ký PayOS so với bộ test vector CHÍNH THỨC của
 * @payos/node (tests/crypto/testCases.json, CHECKSUM_KEY = 'test_checksum_key').
 *
 * Chạy:
 *   npm run verify:payos
 *
 * Không dùng framework test vì repo không cài vitest và môi trường build
 * không có mạng để npm install.
 */

import {
  createSignatureFromObject,
  createPaymentRequestSignature,
  verifyWebhookSignature,
  buildPaymentDescription,
  convertObjectToQueryString,
  sortObjectByKey,
} from '../lib/payos';

const CHECKSUM_KEY = 'test_checksum_key';

interface Case {
  name: string;
  actual: string;
  expected: string;
}

const cases: Case[] = [];

/* ---------------- create-payment-link (chữ ký request) ---------------- */

cases.push({
  name: 'create payment link full fields',
  actual: createPaymentRequestSignature(
    {
      amount: 3300,
      description: 'ABC456',
      orderCode: 0,
      cancelUrl: 'http://localhost',
      returnUrl: 'http://localhost',
    },
    CHECKSUM_KEY
  ),
  expected: '189864813370cdf819974dc3f63c3a93a7e7af0a0d10b21344b14e4f7358999b',
});

cases.push({
  name: 'create payment link with Vietnamese description',
  actual: createPaymentRequestSignature(
    {
      amount: 2000,
      description: 'Thanh toán đơn hàng',
      orderCode: 0,
      cancelUrl: 'http://localhost',
      returnUrl: 'http://localhost',
    },
    CHECKSUM_KEY
  ),
  expected: 'd8b7b0e5d19edfe7b1f53dedeb8d1c7c2b62fabd7eb320dbc514c58f13e9e2c5',
});

/* ---------------- body (chữ ký webhook / phản hồi PayOS) ---------------- */

cases.push({
  name: 'webhook payload (orderCode=0, empty counterAccount fields)',
  actual: createSignatureFromObject(
    {
      accountNumber: '0123456789',
      amount: 20000,
      description: 'thanh toan',
      reference: 'FT-REFERENCE',
      transactionDateTime: '2025-12-12 09:00:00',
      virtualAccountNumber: '',
      counterAccountBankId: '01202001',
      counterAccountBankName: '',
      counterAccountName: 'NGUYEN VAN A',
      counterAccountNumber: '9876543210',
      virtualAccountName: '',
      currency: 'VND',
      orderCode: 0,
      paymentLinkId: 'payment-link-id',
      code: '00',
      desc: 'success',
    },
    CHECKSUM_KEY
  ),
  expected: '302b3becca1672dff99daafae2965f40e48ea3ca39453e4bf37fbcc26807a0e8',
});

cases.push({
  name: 'paid payment link with 1 transaction (null fields)',
  actual: createSignatureFromObject(
    {
      id: 'payment-link-id',
      orderCode: 0,
      amount: 2000,
      amountPaid: 2000,
      amountRemaining: 0,
      status: 'PAID',
      createdAt: '2025-12-12T09:00:00+07:00',
      transactions: [
        {
          accountNumber: '0123456789',
          amount: 2000,
          counterAccountBankId: '01202001',
          counterAccountBankName: null,
          counterAccountName: 'NGUYEN VAN A',
          counterAccountNumber: '9876543210',
          description: 'TRANSACTION DESCRIPTION',
          reference: 'FT-REFERENCE',
          transactionDateTime: '2025-12-12T09:00:00+07:00',
          virtualAccountName: null,
          virtualAccountNumber: null,
        },
      ],
      canceledAt: null,
      cancellationReason: null,
    },
    CHECKSUM_KEY
  ),
  expected: '6af5e2c9a28256c140169ed624114b43295915d7b6e2fa6278b17a7c43aadefd',
});

cases.push({
  name: 'pending payment link (empty transactions array)',
  actual: createSignatureFromObject(
    {
      id: 'payment-link-id',
      orderCode: 0,
      amount: 2000,
      amountPaid: 0,
      amountRemaining: 2000,
      status: 'PENDING',
      createdAt: '2025-12-12T09:00:00+07:00',
      transactions: [],
      canceledAt: null,
      cancellationReason: null,
    },
    CHECKSUM_KEY
  ),
  expected: '33093364158b143baa9ecd2e705d9a2a5a5d391a3cab7cb0a371588b3731368f',
});

cases.push({
  name: 'invoice information with many invoices (array of objects with nulls)',
  actual: createSignatureFromObject(
    {
      invoices: [
        {
          invoiceId: 'invoice-id',
          invoiceNumber: 'invoiceNo',
          issuedTimestamp: 1765504800,
          issuedDatetime: '2025-12-12T09:00:00+07:00',
          transactionId: 'transactionId',
          reservationCode: 'reservationCode',
          codeOfTax: 'codeOfTax',
        },
        {
          invoiceId: 'invoice-id',
          invoiceNumber: null,
          issuedTimestamp: null,
          issuedDatetime: null,
          transactionId: null,
          reservationCode: null,
          codeOfTax: null,
        },
      ],
    },
    CHECKSUM_KEY
  ),
  expected: '8ceca4558787d5ec58b24caaf5aaa7693df83242efbb28e7b70cf3391f3a1138',
});

cases.push({
  name: 'empty body',
  actual: createSignatureFromObject({}, CHECKSUM_KEY),
  expected: 'd9dd60ea06e1ee2dc960267c7a798f0c70307a4783ac0460d015772412c37938',
});

/* ---------------- hành vi bổ sung của module ---------------- */

let failures = 0;

for (const testCase of cases) {
  const ok = testCase.actual === testCase.expected;
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${testCase.name}` +
      (ok ? '' : `\n      expected ${testCase.expected}\n      actual   ${testCase.actual}`)
  );
}

function assert(name: string, condition: boolean) {
  if (!condition) failures++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`);
}

// verifyWebhookSignature: chữ ký đúng phải được chấp nhận
const webhookData = {
  accountNumber: '0123456789',
  amount: 20000,
  orderCode: 0,
};
const webhookSignature = createSignatureFromObject(webhookData, CHECKSUM_KEY);
assert(
  'verifyWebhookSignature chấp nhận chữ ký đúng',
  verifyWebhookSignature(webhookData, webhookSignature, CHECKSUM_KEY) === true
);
assert(
  'verifyWebhookSignature từ chối chữ ký sai',
  verifyWebhookSignature(webhookData, 'deadbeef', CHECKSUM_KEY) === false
);
assert(
  'verifyWebhookSignature từ chối khi thiếu signature',
  verifyWebhookSignature(webhookData, null, CHECKSUM_KEY) === false
);
assert(
  'verifyWebhookSignature từ chối khi data bị sửa (amount khác)',
  verifyWebhookSignature({ ...webhookData, amount: 1 }, webhookSignature, CHECKSUM_KEY) === false
);

// Bỏ key undefined, giữ key null thành chuỗi rỗng (đúng hành vi SDK)
assert(
  'key undefined bị loại bỏ',
  convertObjectToQueryString(sortObjectByKey({ a: 1, b: undefined, c: null })) === 'a=1&c='
);

// buildPaymentDescription: tối đa 25 ký tự, chỉ chữ và số
const description = buildPaymentDescription('HQ20270101000123');
assert('buildPaymentDescription <= 25 ký tự', description.length <= 25);
assert('buildPaymentDescription giữ mã đơn', description === 'HQ20270101000123');

console.log(
  failures === 0
    ? `\nTất cả ${cases.length + 7} kiểm tra PayOS đều PASS.`
    : `\n${failures} kiểm tra FAIL.`
);

process.exit(failures === 0 ? 0 : 1);
