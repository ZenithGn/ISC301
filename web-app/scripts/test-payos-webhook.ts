/**
 * Test thật webhook PayOS đang chạy ở http://localhost:3000.
 *
 * Dùng CHÍNH `createSignatureFromObject` trong `lib/payos.ts` để ký, nên test này
 * chứng minh vòng tròn: ký bằng thuật toán của app → server xác thực → gọi RPC.
 *
 * Biến môi trường:
 *   PAYOS_CHECKSUM_KEY  (bắt buộc) – lấy từ .env.local
 *   TEST_BASE_URL       (mặc định http://localhost:3000)
 *   TEST_ORDER_CODE     – payos_order_code của một đơn PayOS ĐÃ THANH TOÁN
 *   TEST_AMOUNT         – đúng số tiền của đơn đó
 *   TEST_REFERENCE      – reference trùng với bản ghi payments sẵn có (để không thêm dòng mới)
 */

import { createSignatureFromObject } from '../lib/payos';

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY ?? '';
const ORDER_CODE = Number(process.env.TEST_ORDER_CODE ?? '0');
const AMOUNT = Number(process.env.TEST_AMOUNT ?? '0');
const REFERENCE = process.env.TEST_REFERENCE ?? 'REF-TEST';

let failures = 0;

function check(name: string, condition: boolean, detail: string): void {
  if (!condition) failures++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}

function buildBody(orderCode: number, amount: number, reference: string, sign: boolean) {
  const data = {
    orderCode,
    amount,
    description: `HQ test ${orderCode}`,
    accountNumber: '0123456789',
    reference,
    transactionDateTime: '2026-10-09 20:00:00',
    currency: 'VND',
    paymentLinkId: `link-${orderCode}`,
    code: '00',
    desc: 'success',
    counterAccountBankId: null,
    counterAccountName: 'NGUYEN VAN A',
    counterAccountNumber: '9876543210',
    virtualAccountName: null,
    virtualAccountNumber: null,
  };

  return {
    code: '00',
    desc: 'success',
    success: true,
    data,
    signature: sign ? createSignatureFromObject(data, CHECKSUM_KEY) : 'chu-ky-sai',
  };
}

async function post(label: string, body: unknown): Promise<{ status: number; text: string }> {
  const response = await fetch(`${BASE}/api/payos/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  console.log(`--- ${label} → HTTP ${response.status}  ${text}`);
  return { status: response.status, text };
}

async function main(): Promise<void> {
  if (!CHECKSUM_KEY) throw new Error('Thiếu PAYOS_CHECKSUM_KEY');
  if (!ORDER_CODE || !AMOUNT) throw new Error('Thiếu TEST_ORDER_CODE / TEST_AMOUNT');

  const bad = await post(
    '1. chữ ký SAI (phải bị từ chối 400)',
    buildBody(ORDER_CODE, AMOUNT, REFERENCE, false)
  );
  check('chữ ký sai bị từ chối', bad.status === 400, `HTTP ${bad.status} – ${bad.text}`);

  const already = await post(
    '2. chữ ký ĐÚNG, đơn đã thanh toán (phải ALREADY_PAID)',
    buildBody(ORDER_CODE, AMOUNT, REFERENCE, true)
  );
  check(
    'webhook hợp lệ được xử lý và chống trùng',
    already.status === 200 && already.text.includes('ALREADY_PAID'),
    `HTTP ${already.status} – ${already.text}`
  );

  const missing = await post(
    '3. chữ ký ĐÚNG, mã đơn không tồn tại (phải ORDER_NOT_FOUND)',
    buildBody(999999999, 1000, 'REF-KHONG-CO', true)
  );
  check(
    'mã đơn lạ trả ORDER_NOT_FOUND',
    missing.status === 200 && missing.text.includes('ORDER_NOT_FOUND'),
    `HTTP ${missing.status} – ${missing.text}`
  );

  const trialData = { description: 'confirm webhook' };
  const trial = await post('4. webhook thử khi đăng ký (không có orderCode)', {
    code: '00',
    desc: 'success',
    success: true,
    data: trialData,
    signature: createSignatureFromObject(trialData, CHECKSUM_KEY),
  });
  check('webhook thử trả 200', trial.status === 200, `HTTP ${trial.status} – ${trial.text}`);

  console.log(failures === 0 ? '\nTất cả kiểm tra webhook đều PASS.' : `\n${failures} kiểm tra FAIL.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Lỗi khi chạy test:', error);
  process.exit(1);
});
