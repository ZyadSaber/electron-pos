import React, { useState, useEffect, useRef } from 'react';
import { Product, ShopSettings } from '../types';
import { Barcode as BarcodeIcon, Printer, Sparkles, RefreshCw, Layers } from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorViewProps {
  products: Product[];
  selectedProductForLabel: Product | null;
  settings: ShopSettings;
}

const StickerItem: React.FC<{
  shopName: string;
  name: string;
  barcode: string;
  price: number | string;
  currency: string;
}> = ({ shopName, name, barcode, price, currency }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && barcode) {
      try {
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          width: 1.2,
          height: 32,
          displayValue: true,
          fontSize: 9,
          margin: 2,
        });
      } catch (err) {
        console.error('Barcode error', err);
      }
    }
  }, [barcode]);

  return (
    <div className="p-2.5 bg-white text-black rounded-lg border border-slate-300 shadow-2xs text-center font-sans text-xs flex flex-col justify-between break-inside-avoid">
      <div>
        <p className="font-bold text-[10px] text-slate-700 tracking-tight uppercase truncate">{shopName}</p>
        <p className="font-semibold text-[11px] truncate leading-tight mt-0.5">{name}</p>
      </div>

      <div className="my-1 flex justify-center">
        <svg ref={svgRef} className="max-w-full h-auto" />
      </div>

      <p className="font-black text-xs font-mono text-slate-900">
        السعر: {price} {currency}
      </p>
    </div>
  );
};

export const BarcodeGeneratorView: React.FC<BarcodeGeneratorViewProps> = ({
  products,
  selectedProductForLabel,
  settings,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    selectedProductForLabel ? selectedProductForLabel.id : (products[0]?.id || '')
  );
  
  const [customBarcode, setCustomBarcode] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [copies, setCopies] = useState<number>(12);

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);
  const currency = settings.currencySymbol || 'ج.م';

  const activeProduct = products.find(p => p.id === selectedProductId);

  const displayBarcode = activeProduct ? activeProduct.barcode : (customBarcode || '6221234567890');
  const displayName = activeProduct ? activeProduct.name : (customName || 'منتج تجريبي');
  const displayPrice = activeProduct ? activeProduct.sellingPrice : (parseFloat(customPrice) || 25);

  useEffect(() => {
    if (selectedProductForLabel) {
      setSelectedProductId(selectedProductForLabel.id);
    }
  }, [selectedProductForLabel]);

  useEffect(() => {
    if (barcodeSvgRef.current && displayBarcode) {
      try {
        JsBarcode(barcodeSvgRef.current, displayBarcode, {
          format: 'CODE128',
          width: 1.8,
          height: 45,
          displayValue: true,
          fontSize: 12,
          margin: 5,
        });
      } catch (err) {
        console.error('Barcode rendering error', err);
      }
    }
  }, [displayBarcode, selectedProductId]);

  const handlePrintLabels = () => {
    // Attempt standard browser print first
    try {
      window.print();
    } catch (err) {
      console.warn('Standard window.print failed, attempting popup print:', err);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const stickersHtml = Array.from({ length: copies }).map(() => `
          <div style="
            width: 58mm;
            height: 38mm;
            padding: 3mm;
            border: 1px solid #000;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            text-align: center;
            font-family: Arial, sans-serif;
            background: #fff;
            color: #000;
            direction: rtl;
            page-break-inside: avoid;
          ">
            <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">${settings.shopName || 'سوبر ماركت'}</div>
            <div style="font-size: 11px; font-weight: 600; margin: 2px 0;">${displayName}</div>
            <svg class="barcode-svg" data-code="${displayBarcode}"></svg>
            <div style="font-size: 11px; font-weight: bold; font-family: monospace;">السعر: ${displayPrice} ${currency}</div>
          </div>
        `).join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl">
            <head>
              <title>طباعة ملصقات الباركود</title>
              <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
              <style>
                body { margin: 10mm; padding: 0; background: #fff; direction: rtl; }
                .grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 5mm;
                }
                @media print {
                  body { margin: 0; }
                  .grid { gap: 3mm; }
                }
              </style>
            </head>
            <body>
              <div class="grid">${stickersHtml}</div>
              <script>
                window.onload = function() {
                  document.querySelectorAll('.barcode-svg').forEach(function(el) {
                    try {
                      JsBarcode(el, el.getAttribute('data-code'), {
                        format: "CODE128",
                        width: 1.4,
                        height: 35,
                        displayValue: true,
                        fontSize: 10,
                        margin: 2
                      });
                    } catch(e){}
                  });
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 300);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarcodeIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            طباعة ملصقات واستيكرات الباركود والأسعار
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            توليد وطباعة أوراق الباركود للأصناف والسلع بدون باركود مسبق أو للأرفف.
          </p>
        </div>

        <button
          onClick={handlePrintLabels}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة ورقة الاستيكرات ({copies} ملصق)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Controls (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 text-right">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
            إعدادات الملصق
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اختر المنتج من المخزن
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium outline-none"
            >
              <option value="">-- إدخال باركود يدوي مخصص --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sellingPrice} {currency} - باركود: {p.barcode})
                </option>
              ))}
            </select>
          </div>

          {!selectedProductId && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المنتج على الملصق
                </label>
                <input
                  type="text"
                  placeholder="مثال: سكر ناعم 1 كجم"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الباركود
                  </label>
                  <input
                    type="text"
                    placeholder="6221234567890"
                    value={customBarcode}
                    onChange={e => setCustomBarcode(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    السعر ({currency})
                  </label>
                  <input
                    type="number"
                    placeholder="25"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              عدد الملصقات في الورقة الواحدة
            </label>
            <select
              value={copies}
              onChange={e => setCopies(parseInt(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium"
            >
              <option value={6}>6 ملصقات بالورقة</option>
              <option value={12}>12 ملصق بالورقة</option>
              <option value={24}>24 ملصق بالورقة</option>
              <option value={40}>40 ملصق بالورقة</option>
            </select>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">معاينة مباشرة لشكل الاستيكر</span>
            <div className="p-3 bg-white text-black rounded-lg border border-slate-300 max-w-[220px] mx-auto shadow-xs text-center font-sans">
              <p className="font-bold text-xs truncate">{settings.shopName}</p>
              <p className="text-[11px] font-semibold truncate leading-tight mt-0.5">{displayName}</p>
              <div className="my-1 flex justify-center">
                <svg ref={barcodeSvgRef} />
              </div>
              <p className="font-bold text-sm font-mono">السعر: {displayPrice} {currency}</p>
            </div>
          </div>
        </div>

        {/* Right Preview Sheet (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              تخطيط ورقة الملصقات للطباعة ({copies} استيكر)
            </h3>
            <span className="text-xs text-slate-400">معاينة شبكة صفحة A4</span>
          </div>

          <div className="printable-area p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 min-h-[400px]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: copies }).map((_, idx) => (
                <StickerItem
                  key={idx}
                  shopName={settings.shopName || 'سوبر ماركت'}
                  name={displayName}
                  barcode={displayBarcode}
                  price={displayPrice}
                  currency={currency}
                />
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

