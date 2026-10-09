'use client';

import { useEffect } from 'react';
import { trackViewItem } from '@/lib/analytics';

interface ViewItemTrackerProps {
  productId: number;
  name: string;
  price: number;
  categoryName?: string | null;
}

/**
 * C04 – Gửi sự kiện GA4 `view_item` khi trang chi tiết sản phẩm được xem.
 * Chỉ gửi id/tên/giá/danh mục; TUYỆT ĐỐI không gửi email hay số điện thoại.
 */
export function ViewItemTracker({ productId, name, price, categoryName }: ViewItemTrackerProps) {
  useEffect(() => {
    trackViewItem({
      product_id: productId,
      name,
      price,
      category_name: categoryName ?? null,
    });
  }, [productId, name, price, categoryName]);

  return null;
}
