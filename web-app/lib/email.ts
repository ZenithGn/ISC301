/**
 * Gửi email giao dịch qua Resend REST API (không dùng SDK `resend`).
 *
 * Nguyên tắc: email KHÔNG bao giờ được làm hỏng luồng đặt hàng.
 * Nếu thiếu RESEND_API_KEY hoặc Resend lỗi, hàm trả về { sent: false } và chỉ ghi log.
 */

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  reason?: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
}

interface ResendResponse {
  id?: string;
  message?: string;
  name?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatVndForEmail(amount: number): string {
  return `${Number(amount ?? 0).toLocaleString('vi-VN')}đ`;
}

/** Gửi một email HTML. Không ném lỗi. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn('[email] Bỏ qua gửi email: thiếu RESEND_API_KEY hoặc EMAIL_FROM.');
    return { sent: false, reason: 'missing_config' };
  }

  const payload: ResendPayload = {
    from,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
  };
  if (input.replyTo) payload.reply_to = input.replyTo;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const body = (await response.json().catch(() => null)) as ResendResponse | null;

    if (!response.ok) {
      console.error('[email] Resend lỗi:', response.status, body?.message ?? body?.name);
      return { sent: false, reason: body?.message ?? `http_${response.status}` };
    }

    return { sent: true, id: body?.id };
  } catch (error) {
    console.error('[email] Không gửi được email:', error);
    return { sent: false, reason: 'network_error' };
  }
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;background:#0c0a09;font-family:Arial,Helvetica,sans-serif;color:#e7e5e4;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#7f1d1d;border-radius:16px 16px 0 0;padding:20px;text-align:center;">
      <span style="font-size:24px;font-weight:bold;color:#fcd34d;letter-spacing:2px;">HƯƠNG QUÊ</span>
      <div style="font-size:12px;color:#fecaca;margin-top:4px;">Tinh hoa quà Tết ba miền</div>
    </div>
    <div style="background:#1c1917;padding:24px;border:1px solid #292524;border-top:none;border-radius:0 0 16px 16px;">
      <h1 style="font-size:18px;color:#fcd34d;margin:0 0 16px;">${escapeHtml(title)}</h1>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #292524;margin:24px 0;" />
      <p style="font-size:12px;color:#a8a29e;margin:0;">
        Hương Quê – Hotline 0901 000 000 – lienhe@huongque.vn<br/>
        Bạn nhận được email này vì đã đặt hàng hoặc đăng ký nhận tin tại huongque.vn.
      </p>
    </div>
  </div>
</body></html>`;
}

export interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}

export interface OrderConfirmationInput {
  to: string;
  orderCode: string;
  total: number;
  paymentMethod: string;
  recipientName?: string | null;
  shippingAddress?: string | null;
  items?: OrderEmailItem[];
  /** Bắt buộc để hiển thị nút "Thanh toán ngay" cho đơn PayOS chưa trả tiền. */
  checkoutUrl?: string | null;
  /** true khi email gửi sau khi đã thanh toán (webhook PayOS) hoặc đơn COD. */
  paid?: boolean;
}

/** Email xác nhận đơn hàng (gửi 1 lần cho mỗi đơn). */
export async function sendOrderConfirmationEmail(
  input: OrderConfirmationInput
): Promise<SendEmailResult> {
  const itemsHtml =
    input.items && input.items.length > 0
      ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${input.items
            .map(
              (item) => `<tr>
                <td style="padding:8px 0;border-bottom:1px solid #292524;">${escapeHtml(item.name)} × ${item.quantity}</td>
                <td style="padding:8px 0;border-bottom:1px solid #292524;text-align:right;color:#fcd34d;">${formatVndForEmail(item.price * item.quantity)}</td>
              </tr>`
            )
            .join('')}
        </table>`
      : '';

  const payButton =
    !input.paid && input.checkoutUrl
      ? `<div style="text-align:center;margin:24px 0;">
           <a href="${escapeHtml(input.checkoutUrl)}" style="display:inline-block;background:#f59e0b;color:#1c1917;font-weight:bold;padding:12px 24px;border-radius:12px;text-decoration:none;">Thanh toán ngay</a>
         </div>`
      : '';

  const statusLine = input.paid
    ? 'Đơn hàng đã được ghi nhận và thanh toán.'
    : input.paymentMethod === 'cod'
      ? 'Bạn sẽ thanh toán khi nhận hàng (COD).'
      : 'Đơn hàng đang chờ thanh toán. Vui lòng hoàn tất trong thời gian hiệu lực của link.';

  const html = emailLayout(
    `Xác nhận đơn hàng ${input.orderCode}`,
    `<p style="font-size:14px;color:#d6d3d1;">Xin chào ${escapeHtml(input.recipientName ?? 'Quý khách')},</p>
     <p style="font-size:14px;color:#d6d3d1;">Cảm ơn bạn đã đặt quà Tết tại Hương Quê. ${statusLine}</p>
     <p style="font-size:14px;color:#d6d3d1;"><b>Mã đơn:</b> ${escapeHtml(input.orderCode)}<br/>
     <b>Người nhận:</b> ${escapeHtml(input.recipientName ?? '—')}<br/>
     <b>Địa chỉ:</b> ${escapeHtml(input.shippingAddress ?? '—')}<br/>
     <b>Phương thức:</b> ${escapeHtml(input.paymentMethod.toUpperCase())}</p>
     ${itemsHtml}
     <p style="font-size:16px;color:#fcd34d;text-align:right;margin-top:16px;"><b>Tổng tiền: ${formatVndForEmail(input.total)}</b></p>
     ${payButton}
     <p style="font-size:13px;color:#a8a29e;">Theo dõi đơn hàng bất cứ lúc nào tại
       <a href="${appUrl()}/tra-cuu-don" style="color:#fcd34d;">${appUrl()}/tra-cuu-don</a> bằng mã đơn và số điện thoại.</p>`
  );

  return sendEmail({
    to: input.to,
    subject: `Hương Quê – Xác nhận đơn hàng ${input.orderCode}`,
    html,
  });
}

/** Email xác nhận đăng ký bản tin, kèm link hủy đăng ký (yêu cầu pháp lý). */
export async function sendNewsletterWelcomeEmail(
  to: string,
  unsubscribeToken: string
): Promise<SendEmailResult> {
  const unsubscribeUrl = `${appUrl()}/huy-dang-ky?token=${encodeURIComponent(unsubscribeToken)}`;
  const html = emailLayout(
    'Đăng ký nhận tin thành công',
    `<p style="font-size:14px;color:#d6d3d1;">Cảm ơn bạn đã đăng ký nhận thông tin khuyến mãi quà Tết từ Hương Quê.</p>
     <p style="font-size:14px;color:#d6d3d1;">Chúng tôi sẽ gửi thông báo sớm nhất về các set quà giới hạn và ưu đãi vận chuyển.</p>
     <p style="font-size:13px;color:#a8a29e;">Nếu không muốn tiếp tục nhận email, bạn có thể
       <a href="${escapeHtml(unsubscribeUrl)}" style="color:#fcd34d;">hủy đăng ký tại đây</a>.</p>`
  );

  return sendEmail({
    to,
    subject: 'Hương Quê – Đăng ký nhận tin thành công',
    html,
  });
}
