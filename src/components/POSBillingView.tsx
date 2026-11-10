import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, ShopSettings, Sale } from '../types';
import { UPIPaymentModal } from './UPIPaymentModal';
import { UPIPaymentService } from '../services/paymentService';
import { sqliteDB } from '../db/sqliteStorage';
import { playPosSuccessBeep, playPosErrorBeep } from '../utils/sound';
import { 
  Barcode, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Camera, 
  Printer, 
  User, 
  Phone, 
  CreditCard, 
  Coins, 
  QrCode, 
  CheckCircle, 
  RotateCcw,
  ShoppingBag,
  Sparkles,
  AlertCircle,
  Zap,
  Activity,
  Keyboard
} from 'lucide-react';

interface POSBillingViewProps {
  products: Product[];
  settings: ShopSettings;
  onRecordSale: (
    cartItems: CartItem[],
    customerName: string,
    customerPhone: string,
    paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit',
    receivedAmount: number,
    discountAmount: number,
    taxPercent: number
  ) => Sale;
  onOpenCameraScanner: () => void;
  scannedBarcode: string | null;
  onClearScannedBarcode: () => void;
}

export const POSBillingView: React.FC<POSBillingViewProps> = ({
  products,
  settings,
  onRecordSale,
  onOpenCameraScanner,
  scannedBarcode,
  onClearScannedBarcode,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card' | 'Credit'>('Cash');
  
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [taxPercentInput, setTaxPercentInput] = useState<number>(settings.defaultTaxPercent || 0);
  const [receivedAmountInput, setReceivedAmountInput] = useState<string>('');
  const [isUpiModalOpen, setIsUpiModalOpen] = useState<boolean>(false);
  const [draftInvoiceNumber, setDraftInvoiceNumber] = useState<string>('');

  // Toast & Scanner Status Notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const currency = settings.currencySymbol || 'ج.م';

  // Categories list
  const categories = ['الكل', ...Array.from(new Set(products.map(p => p.category)))];

  // Helper function to keep input persistently focused for instant USB scanning
  const focusBarcodeInput = () => {
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 50);
  };

  // Initial Auto Focus on Mount
  useEffect(() => {
    focusBarcodeInput();
  }, []);

  // Global Keyboard Shortcuts (F2: New Sale/Checkout, F3: Focus Barcode, F4: Camera Scanner, Ctrl+L: Clear Cart)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleCheckout();
        return;
      }

      if (e.key === 'F3') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
        return;
      }

      if (e.key === 'F4') {
        e.preventDefault();
        onOpenCameraScanner();
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (cart.length > 0 && confirm('هل تريد تفريغ سلة الفاتورة الحالية؟')) {
          setCart([]);
          showToast('success', 'تم تفريغ السلة');
        }
        return;
      }

      // Auto focus barcode input if typing numbers or scanning barcode
      if (
        document.activeElement?.tagName !== 'INPUT' && 
        document.activeElement?.tagName !== 'SELECT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        barcodeInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customerName, customerPhone, paymentMode, receivedAmountInput, discountInput, taxPercentInput]);

  // Handle external camera scanned barcode
  useEffect(() => {
    if (scannedBarcode) {
      handleBarcodeScanned(scannedBarcode);
      onClearScannedBarcode();
    }
  }, [scannedBarcode]);

  // Display Brief Toast Banner
  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Barcode Submission with USB Wedge Detection & Duplicate Guard (<100ms)
  const handleBarcodeScanned = (barcode: string) => {
    const cleaned = barcode.trim().replace(/\s+/g, '');
    if (!cleaned) return;

    const now = Date.now();
    // Ignore duplicate scans within 1000ms
    if (
      lastScannedTimeRef.current.code === cleaned &&
      now - lastScannedTimeRef.current.time < 1000
    ) {
      setSearchQuery('');
      focusBarcodeInput();
      return;
    }

    lastScannedTimeRef.current = { code: cleaned, time: now };

    const matchedProduct = products.find(p => p.barcode === cleaned || p.id.toLowerCase() === cleaned.toLowerCase());
    if (matchedProduct) {
      addToCart(matchedProduct);
      setSearchQuery('');
      playPosSuccessBeep();
      showToast('success', `تمت الإضافة: ${matchedProduct.name} (${matchedProduct.sellingPrice} ${currency})`);
    } else {
      playPosErrorBeep();
      showToast('error', `لم يتم العثور على الصنف للباركود: "${cleaned}"`);
    }

    focusBarcodeInput();
  };

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      playPosErrorBeep();
      showToast('error', `الصنف "${product.name}" نفد من المخزن!`);
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.id === product.id);
      if (existingIndex !== -1) {
        const existingItem = prevCart[existingIndex];
        if (existingItem.quantity + 1 > product.quantity) {
          playPosErrorBeep();
          showToast('error', `تم الوصول للحد الأقصى المتاح بالمخزن لـ ${product.name}!`);
          return prevCart;
        }

        const updated = [...prevCart];
        const newQty = existingItem.quantity + 1;
        updated[existingIndex] = {
          ...existingItem,
          quantity: newQty,
          totalPrice: newQty * existingItem.unitSellingPrice,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity: 1,
            unitSellingPrice: product.sellingPrice,
            totalPrice: product.sellingPrice,
          }
        ];
      }
    });

    focusBarcodeInput();
  };

  // Modify Item Quantity in Cart
  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;

          if (newQty > item.product.quantity) {
            alert(`وصلت للحد الأقصى من المخزون! المتاح: ${item.product.quantity}`);
            return item;
          }

          return {
            ...item,
            quantity: newQty,
            totalPrice: newQty * item.unitSellingPrice,
          };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeCartItem = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm('هل تريد تفريغ سلة الأصناف الحالية؟')) {
      setCart([]);
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const taxAmount = (subtotal - discountInput) * (taxPercentInput / 100);
  const grandTotal = Math.max(0, Math.round(subtotal - discountInput + taxAmount));

  const receivedNum = parseFloat(receivedAmountInput) || 0;
  const changeDue = Math.max(0, receivedNum - grandTotal);

  // Complete Sale
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('السلة فارغة! قم بمسح الباركود أو اختيار المنتجات لإتمام الفاتورة.');
      return;
    }

    if (paymentMode === 'Cash' && receivedNum > 0 && receivedNum < grandTotal) {
      alert(`المبلغ المدفوع نقداً (${receivedNum} ${currency}) أقل من إجمالي الفاتورة (${grandTotal} ${currency}).`);
      return;
    }

    if (paymentMode === 'UPI') {
      const upiService = new UPIPaymentService(settings);
      if (!upiService.isAvailable()) {
        alert('الدفع الإلكتروني / إنستاباي غير مفعل أو ينقصه معرف التحويل. يرجى ضبط إعدادات إنستاباي والمحافظ من شاشة الإعدادات.');
        return;
      }
      setDraftInvoiceNumber(sqliteDB.getNextInvoiceNumber());
      setIsUpiModalOpen(true);
      return;
    }

    onRecordSale(
      cart,
      customerName,
      customerPhone,
      paymentMode,
      receivedNum > 0 ? receivedNum : grandTotal,
      discountInput,
      taxPercentInput
    );

    // Reset Form
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setReceivedAmountInput('');
    setDiscountInput(0);
    setSearchQuery('');
  };

  const finalizeUpiSale = () => {
    onRecordSale(
      cart,
      customerName,
      customerPhone,
      'UPI',
      grandTotal,
      discountInput,
      taxPercentInput
    );

    setIsUpiModalOpen(false);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setReceivedAmountInput('');
    setDiscountInput(0);
    setSearchQuery('');
  };

  // Filtered Products for quick grid
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'الكل' || p.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 h-[calc(100vh-3.5rem)] flex flex-col md:flex-row gap-4 overflow-hidden relative">
      
      {/* Toast Popup Notification */}
      {toastMessage && (
        <div className={`absolute top-6 left-6 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 border ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950 text-emerald-200 border-emerald-700/80 shadow-emerald-950/40'
            : 'bg-rose-950 text-rose-200 border-rose-700/80 shadow-rose-950/40'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Left/Main Column: Product Search, Category Filters & Fast Product Grid */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        
        {/* Top Search & Barcode Bar */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-700 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/80">
          
          {/* Scanner Status Indicator Header */}
          <div className="flex items-center justify-between text-[11px] border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full font-bold border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                🟢 قارئ الباركود USB متصل وجاهز
              </span>
              <span className="hidden lg:inline text-slate-400">
                تركيز تلقائي دائم • استجابة فورية
              </span>
            </div>

            {/* Keyboard Shortcuts Legend */}
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px]">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-bold">F2: إنهاء الفاتورة</span>
              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-bold">F3: بحث وباركود</span>
              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-bold">F4: مسح بالكاميرا</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 absolute right-3 top-2.5 text-emerald-600 dark:text-emerald-400 pointer-events-none" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="امسح الباركود بجهاز الاسكانر أو اكتب اسم الصنف... (اضغط F3 للتركيز)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleBarcodeScanned(searchQuery);
                  }
                }}
                className="w-full pr-10 pl-8 py-2.5 bg-white dark:bg-slate-900 border-2 border-emerald-500/50 dark:border-emerald-500/60 rounded-xl text-sm font-semibold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none transition shadow-sm text-slate-900 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); focusBarcodeInput(); }}
                  className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={onOpenCameraScanner}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 border border-slate-200 dark:border-slate-600 cursor-pointer"
              title="فتح كاميرا الموبايل/الويب كام لقراءة الباركود (F4)"
            >
              <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">مسح بالكاميرا</span>
            </button>
          </div>

          {/* Category Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); focusBarcodeInput(); }}
                className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 p-3.5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400 dark:text-slate-500 space-y-2">
              <Search className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-sm font-medium">لم يتم العثور على أصناف تطابق البحث.</p>
              <p className="text-xs">امسح باركود المنتج أو اختر قسماً آخر.</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const isOut = product.quantity <= 0;
              const isLow = product.quantity <= 10;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={isOut}
                  className={`p-3 rounded-xl border text-right flex flex-col justify-between transition relative group ${
                    isOut
                      ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      {product.category}
                    </span>
                    <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-100 mt-1 line-clamp-2 leading-tight">
                      {product.name}
                    </h4>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {product.sellingPrice} {currency}
                    </span>

                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      isOut
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : isLow
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {isOut ? 'نفد المخزون' : `${product.quantity} ${product.unit || 'قطعة'}`}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

      </div>

      {/* Right Column: Active Cart Terminal & Checkout */}
      <div className="w-full md:w-[420px] lg:w-[460px] shrink-0 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        
        {/* Cart Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              سلة الفاتورة الحالية ({cart.length})
            </h3>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              تفريغ السلة
            </button>
          )}
        </div>

        {/* Customer Info Inputs */}
        <div className="p-3 bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              اسم العميل (اختياري)
            </label>
            <input
              type="text"
              placeholder="عميل نقدي / عام"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
              رقم الموبايل
            </label>
            <input
              type="text"
              placeholder="01xxxxxxxxx"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none"
            />
          </div>
        </div>

        {/* Cart Itemized List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
              <ShoppingBag className="w-12 h-12 mx-auto stroke-1 opacity-50" />
              <p className="text-sm font-semibold">السلة فارغة حالياً</p>
              <p className="text-xs">امسح باركود المنتج بجهاز المسح أو اضغط على أي صنف من القائمة لإضافته.</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.product.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs"
              >
                <div className="flex-1 min-w-0 pl-2">
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {item.product.name}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono" dir="ltr">
                    {item.unitSellingPrice} {currency} × {item.quantity} = <strong>{item.totalPrice} {currency}</strong>
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateCartQuantity(item.product.id, -1)}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold font-mono text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.product.id, 1)}
                    className="p-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeCartItem(item.product.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition mr-1 cursor-pointer"
                    title="حذف الصنف من الفاتورة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary & Checkout Panel */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 space-y-3">
          
          {/* Subtotal, Tax, Discount inputs */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>المجموع الفرعي</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{subtotal} {currency}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-400">قيمة الخصم ({currency})</span>
              <input
                type="number"
                min="0"
                value={discountInput || ''}
                onChange={e => setDiscountInput(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-center font-bold font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-400">ضريبة القيمة المضافة (%)</span>
              <input
                type="number"
                min="0"
                value={taxPercentInput || ''}
                onChange={e => setTaxPercentInput(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-center font-bold font-mono text-xs"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-base font-bold text-slate-900 dark:text-slate-100">
              <span>الإجمالي المطلوب سداده</span>
              <span className="text-xl text-emerald-600 dark:text-emerald-400 font-black">{grandTotal} {currency}</span>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { id: 'Cash', label: 'كاش (نقدي)' },
              { id: 'UPI', label: 'إنستاباي / محفظة' },
              { id: 'Card', label: 'فيزا / بطاقة' },
              { id: 'Credit', label: 'آجل (شكك)' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setPaymentMode(mode.id as any)}
                className={`py-1.5 px-1 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center ${
                  paymentMode === mode.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Cash Received & Change Calculator */}
          {paymentMode === 'Cash' && grandTotal > 0 && (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">المبلغ المستلم من الزبون ({currency}):</span>
                <input
                  type="number"
                  placeholder={`${grandTotal}`}
                  value={receivedAmountInput}
                  onChange={e => setReceivedAmountInput(e.target.value)}
                  className="w-28 px-2 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-center font-bold text-sm outline-none"
                />
              </div>

              {receivedNum > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">الباقي للعميل (الفكة):</span>
                  <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                    {changeDue} {currency}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Complete Sale Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
              cart.length === 0
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-[0.99]'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>حفظ وطباعة الفاتورة (F2)</span>
          </button>

        </div>

      </div>

      {/* Dynamic Electronic / InstaPay Payment Modal */}
      <UPIPaymentModal
        isOpen={isUpiModalOpen}
        onClose={() => setIsUpiModalOpen(false)}
        onPaymentSuccess={finalizeUpiSale}
        settings={settings}
        invoiceNumber={draftInvoiceNumber || 'فاتورة-2026-0001'}
        customerName={customerName}
        amount={grandTotal}
      />

    </div>
  );
};
