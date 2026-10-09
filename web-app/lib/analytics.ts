/**
 * GA4 – chỉ gửi 2 sự kiện được duyệt cho MVP: `view_item` và `purchase`
 * (theo phạm vi đã chốt: bỏ các sự kiện GA4 chi tiết khác).
 *
 * Không bao giờ gửi thông tin cá nhân (email, số điện thoại) trong tham số sự kiện.
 */

export interface GaItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
}

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function pushToGtag(...args: unknown[]): void {
  if (typeof window === 'undefined') return;
  const w = window as GtagWindow;
  if (typeof w.gtag === 'function') {
    w.gtag(...args);
    return;
  }
  // Fallback: đẩy vào dataLayer nếu gtag chưa kịp nạp
  if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push(args);
  }
}

/** Sự kiện xem chi tiết sản phẩm (C04). */
export function trackViewItem(product: {
  product_id: number | string;
  name: string;
  price: number;
  category_name?: string | null;
}): void {
  const item: GaItem = {
    item_id: String(product.product_id),
    item_name: product.name,
    price: Number(product.price),
  };
  if (product.category_name) item.item_category = product.category_name;

  pushToGtag('event', 'view_item', {
    currency: 'VND',
    value: Number(product.price),
    items: [item],
  });
}

/** Sự kiện mua hàng thành công (C07), transaction_id = mã đơn. */
export function trackPurchase(input: {
  orderCode: string;
  total: number;
  items?: GaItem[];
}): void {
  pushToGtag('event', 'purchase', {
    transaction_id: input.orderCode,
    currency: 'VND',
    value: Number(input.total),
    items: input.items ?? [],
  });
}
