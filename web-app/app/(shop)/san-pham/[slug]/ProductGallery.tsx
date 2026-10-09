'use client';

import { useState } from 'react';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  discountPercent: number | null;
}

/** C04 – Gallery ảnh sản phẩm: ảnh lớn + dải thumbnail (bàn phím chọn được). */
export function ProductGallery({ images, productName, discountPercent }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-stone-900 border border-stone-800 shadow-xl">
        <img
          src={activeImage}
          alt={productName}
          className="w-full h-full object-cover object-center"
        />
        {discountPercent !== null && (
          <span className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            Tiết kiệm {discountPercent}%
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3" role="listbox" aria-label="Thư viện ảnh sản phẩm">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              role="option"
              aria-selected={index === activeIndex}
              aria-label={`Xem ảnh ${index + 1} của ${productName}`}
              className={`relative aspect-square rounded-xl overflow-hidden border transition-all ${
                index === activeIndex
                  ? 'border-amber-500 ring-2 ring-amber-500/40'
                  : 'border-stone-800 hover:border-amber-600/60'
              }`}
            >
              <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
