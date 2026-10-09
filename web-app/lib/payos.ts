/**
 * PayOS client – viết tay bằng fetch + node:crypto, KHÔNG dùng @payos/node
 * (repo không cài được thêm package, và như vậy tránh lệ thuộc phiên bản SDK).
 *
 * Thuật toán chữ ký bám đúng SDK chính thức @payos/node v2.0.5:
 *  - HMAC-SHA256 (KHÔNG phải SHA512 – SHA512 là của VNPay, đã bị loại bỏ khỏi dự án này).
 *  - Chữ ký webhook: sắp xếp key alphabet (so sánh chuỗi mặc định), nối `key=value` bằng `&`,
 *    key có giá trị `undefined` bị bỏ, `null`/`'null'`/`'undefined'` chuyển thành chuỗi rỗng.
 *  - Chữ ký tạo link: HMAC-SHA256 trên
 *    `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`.
 *
 * CHỈ ĐƯỢC IMPORT Ở SERVER (đọc PAYOS_API_KEY / PAYOS_CHECKSUM_KEY từ process.env).
 * Tài liệu: https://payos.vn/docs – API merchant v2: https://api-merchant.payos.vn
 */

import crypto from 'node:crypto';

export const PAYOS_API_URL =
  process.env.PAYOS_API_URL ?? 'https://api-merchant.payos.vn';

export interface PayosCredentials {
  clientId: string;
  apiKey: string;
  checksumKey: string;
}

export class PayosConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayosConfigError';
  }
}

/** Đọc 3 khóa PayOS từ biến môi trường (chỉ server). */
export function getPayosCredentials(): PayosCredentials {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) {
    throw new PayosConfigError(
      'Thiếu PAYOS_CLIENT_ID / PAYOS_API_KEY / PAYOS_CHECKSUM_KEY trong biến môi trường server.'
    );
  }

  return { clientId, apiKey, checksumKey };
}

/* ------------------------------------------------------------------ */
/* Chữ ký                                                              */
/* ------------------------------------------------------------------ */

export function computeHmacSha256(rawData: string, checksumKey: string): string {
  return crypto.createHmac('sha256', checksumKey).update(rawData).digest('hex');
}

/** Sắp xếp key alphabet và trả về object mới (giống sortObjDataByKey của SDK). */
export function sortObjectByKey<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  return Object.keys(data)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});
}

/**
 * Chuyển object thành query string đúng như SDK (convertObjToQueryStr):
 * key `undefined` bị loại bỏ, `null`/`'null'`/`'undefined'` → chuỗi rỗng.
 */
export function convertObjectToQueryString(data: Record<string, unknown>): string {
  return Object.keys(data)
    .filter((key) => data[key] !== undefined)
    .map((key) => {
      let value: unknown = data[key];

      if (Array.isArray(value)) {
        value = JSON.stringify(
          value.map((item) =>
            item && typeof item === 'object'
              ? sortObjectByKey(item as Record<string, unknown>)
              : item
          )
        );
      }

      if (value === null || value === undefined || value === 'null' || value === 'undefined') {
        value = '';
      }

      return `${key}=${value}`;
    })
    .join('&');
}

/**
 * Chữ ký dùng để xác thực webhook (và chữ ký trong body phản hồi của PayOS).
 * Tương đương `crypto.createSignatureFromObj(data, checksumKey)` của SDK.
 */
export function createSignatureFromObject(
  data: Record<string, unknown>,
  checksumKey: string
): string {
  const sorted = sortObjectByKey(data);
  return computeHmacSha256(convertObjectToQueryString(sorted), checksumKey);
}

/**
 * Chữ ký cho request tạo link thanh toán.
 * Đúng 5 trường và đúng thứ tự alphabet: amount, cancelUrl, description, orderCode, returnUrl.
 */
export function createPaymentRequestSignature(
  data: Pick<
    CreatePaymentLinkInput,
    'amount' | 'cancelUrl' | 'description' | 'orderCode' | 'returnUrl'
  >,
  checksumKey: string
): string {
  const raw =
    `amount=${data.amount}` +
    `&cancelUrl=${data.cancelUrl}` +
    `&description=${data.description}` +
    `&orderCode=${data.orderCode}` +
    `&returnUrl=${data.returnUrl}`;
  return computeHmacSha256(raw, checksumKey);
}

/** So sánh chuỗi chữ ký theo thời gian hằng định. */
export function safeCompare(expected: string, actual: string | null | undefined): boolean {
  if (!actual) return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(actual), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Xác thực chữ ký webhook. Trả false (không ném lỗi) khi thiếu cấu hình. */
export function verifyWebhookSignature(
  data: Record<string, unknown> | null | undefined,
  signature: string | null | undefined,
  checksumKey?: string
): boolean {
  if (!data || typeof data !== 'object' || !signature) return false;
  try {
    const key = checksumKey ?? getPayosCredentials().checksumKey;
    return safeCompare(createSignatureFromObject(data, key), signature);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Kiểu dữ liệu                                                        */
/* ------------------------------------------------------------------ */

export interface CreatePaymentLinkInput {
  /** Số nguyên dương, duy nhất trong hệ thống PayOS của merchant. */
  orderCode: number;
  /** Số tiền VND, số nguyên. */
  amount: number;
  /** Tối đa 25 ký tự. */
  description: string;
  returnUrl: string;
  cancelUrl: string;
  /** Unix timestamp (giây). */
  expiredAt?: number;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  buyerAddress?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

export interface PayosTransaction {
  reference: string;
  amount: number;
  accountNumber: string;
  description: string;
  transactionDateTime: string;
  currency?: string | null;
  orderCode?: number | null;
  paymentLinkId?: string | null;
  code?: string | null;
  desc?: string | null;
  counterAccountBankId?: string | null;
  counterAccountBankName?: string | null;
  counterAccountName?: string | null;
  counterAccountNumber?: string | null;
  virtualAccountName?: string | null;
  virtualAccountNumber?: string | null;
}

export interface PayosPaymentLink {
  id: string;
  orderCode: number;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  /** PENDING | PROCESSING | PAID | CANCELLED | EXPIRED (PayOS có thể thêm trạng thái mới). */
  status: string;
  createdAt?: string | null;
  transactions?: PayosTransaction[] | null;
  cancellationReason?: string | null;
  canceledAt?: string | null;
  checkoutUrl: string;
  qrCode?: string;
  paymentLinkId: string;
  currency?: string | null;
  expiredAt?: number | null;
  [key: string]: unknown;
}

export interface PayosWebhookData {
  orderCode: number;
  amount: number;
  description: string;
  accountNumber?: string | null;
  reference?: string | null;
  transactionDateTime?: string | null;
  currency?: string | null;
  paymentLinkId?: string | null;
  code?: string | null;
  desc?: string | null;
  counterAccountBankId?: string | null;
  counterAccountBankName?: string | null;
  counterAccountName?: string | null;
  counterAccountNumber?: string | null;
  virtualAccountName?: string | null;
  virtualAccountNumber?: string | null;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Gọi API                                                             */
/* ------------------------------------------------------------------ */

interface PayosApiResponse<T> {
  code: string;
  desc: string;
  data: T | null;
  signature?: string | null;
}

export class PayosApiError extends Error {
  code: string | null;
  status: number;
  payload: unknown;

  constructor(message: string, code: string | null, status: number, payload?: unknown) {
    super(message);
    this.name = 'PayosApiError';
    this.code = code;
    this.status = status;
    this.payload = payload;
  }
}

async function payosFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { clientId, apiKey, checksumKey } = getPayosCredentials();

  const response = await fetch(`${PAYOS_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  let body: PayosApiResponse<T> | null = null;
  try {
    body = (await response.json()) as PayosApiResponse<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body) {
    throw new PayosApiError(
      `PayOS HTTP ${response.status}: ${body?.desc ?? 'không đọc được phản hồi'}`,
      body?.code ?? null,
      response.status,
      body
    );
  }

  if (body.code !== '00') {
    throw new PayosApiError(
      `PayOS lỗi ${body.code}: ${body.desc}`,
      body.code,
      response.status,
      body
    );
  }

  // Kiểm tra toàn vẹn phản hồi: PayOS ký trên object `data`
  if (body.signature && body.data && typeof body.data === 'object') {
    const expected = createSignatureFromObject(
      body.data as unknown as Record<string, unknown>,
      checksumKey
    );
    if (!safeCompare(expected, body.signature)) {
      throw new PayosApiError(
        'Chữ ký phản hồi PayOS không hợp lệ (dữ liệu có thể bị can thiệp).',
        'INVALID_SIGNATURE',
        response.status,
        body
      );
    }
  }

  return body.data as T;
}

/** Tạo link thanh toán PayOS. */
export async function createPaymentLink(
  input: CreatePaymentLinkInput
): Promise<PayosPaymentLink> {
  const { checksumKey } = getPayosCredentials();

  const payload: Record<string, unknown> = {
    orderCode: input.orderCode,
    amount: Math.round(input.amount),
    description: input.description.slice(0, 25),
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
  };

  if (input.expiredAt) payload.expiredAt = Math.floor(input.expiredAt);
  if (input.buyerName) payload.buyerName = input.buyerName;
  if (input.buyerPhone) payload.buyerPhone = input.buyerPhone;
  if (input.buyerEmail) payload.buyerEmail = input.buyerEmail;
  if (input.buyerAddress) payload.buyerAddress = input.buyerAddress;
  if (input.items?.length) payload.items = input.items;

  const signature = createPaymentRequestSignature(
    {
      amount: payload.amount as number,
      cancelUrl: payload.cancelUrl as string,
      description: payload.description as string,
      orderCode: payload.orderCode as number,
      returnUrl: payload.returnUrl as string,
    },
    checksumKey
  );

  return payosFetch<PayosPaymentLink>('/v2/payment-requests', {
    method: 'POST',
    body: JSON.stringify({ ...payload, signature }),
  });
}

/** Lấy thông tin link thanh toán (đối soát thủ công ở A05). */
export async function getPaymentLink(orderCode: number): Promise<PayosPaymentLink> {
  return payosFetch<PayosPaymentLink>(`/v2/payment-requests/${orderCode}`);
}

/** Hủy link thanh toán. */
export async function cancelPaymentLink(
  orderCode: number,
  cancellationReason = 'Huy don hang'
): Promise<PayosPaymentLink> {
  return payosFetch<PayosPaymentLink>(
    `/v2/payment-requests/${orderCode}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ cancellationReason: cancellationReason.slice(0, 100) }),
    }
  );
}

/** Đăng ký URL webhook với PayOS (chạy một lần cho mỗi môi trường). */
export async function confirmWebhook(webhookUrl: string): Promise<unknown> {
  const { clientId, apiKey } = getPayosCredentials();
  const response = await fetch(`${PAYOS_API_URL}/confirm-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ webhookUrl }),
    cache: 'no-store',
  });

  const body = (await response.json().catch(() => null)) as
    | { code?: string; desc?: string; data?: unknown }
    | null;

  if (!response.ok || !body || body.code !== '00') {
    throw new PayosApiError(
      `Không đăng ký được webhook: ${body?.desc ?? response.status}`,
      body?.code ?? null,
      response.status,
      body
    );
  }
  return body.data;
}

/* ------------------------------------------------------------------ */
/* Tiện ích webhook                                                    */
/* ------------------------------------------------------------------ */

export interface ParsedWebhook {
  /** Chữ ký hợp lệ. */
  valid: boolean;
  /** PayOS báo giao dịch thành công (success === true && code === '00'). */
  success: boolean;
  /** Số tiền PayOS báo đã nhận. */
  amount: number;
  /** Mã đơn số nguyên phía PayOS. */
  orderCode: number | null;
  data: PayosWebhookData | null;
  code: string | null;
  desc: string | null;
}

/** Kiểm tra chữ ký + trích xuất dữ liệu webhook. Không ném lỗi. */
export function parsePayosWebhook(body: unknown): ParsedWebhook {
  const empty: ParsedWebhook = {
    valid: false,
    success: false,
    amount: 0,
    orderCode: null,
    data: null,
    code: null,
    desc: null,
  };

  if (!body || typeof body !== 'object') return empty;

  const raw = body as Record<string, unknown>;
  const data = (raw.data ?? null) as PayosWebhookData | null;
  const signature = (raw.signature ?? null) as string | null;
  const code = (raw.code ?? null) as string | null;
  const desc = (raw.desc ?? null) as string | null;

  const valid = verifyWebhookSignature(
    data as unknown as Record<string, unknown> | null,
    signature
  );

  const orderCode =
    data && typeof data.orderCode === 'number' ? data.orderCode : null;
  const amount =
    data && typeof data.amount === 'number' && Number.isFinite(data.amount)
      ? data.amount
      : 0;

  return {
    valid,
    success: raw.success === true && code === '00',
    amount,
    orderCode,
    data,
    code,
    desc,
  };
}

/**
 * Mô tả đơn gửi sang PayOS: tối đa 25 ký tự, chỉ chữ và số.
 * Ví dụ: HQ20270101000123 -> HQ20270101000123 (giữ nguyên nếu đủ ngắn).
 */
export function buildPaymentDescription(orderCode: string): string {
  const compact = orderCode.replace(/[^A-Za-z0-9]/g, '');
  return compact.slice(0, 25);
}

/** Trạng thái PayOS được coi là đã thanh toán. */
export function isPaidStatus(status: string | null | undefined): boolean {
  return status === 'PAID';
}

/** Trạng thái PayOS được coi là còn hiệu lực. */
export function isActiveStatus(status: string | null | undefined): boolean {
  return status === 'PENDING' || status === 'PROCESSING';
}
