import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sale, SaleReturn, ShopSettings, Product } from '../types';
import { sqliteDB } from '../db/sqliteStorage';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  Printer, 
  AlertCircle, 
  FileText, 
  X,
  PackageCheck,
  Eye,
  Mic,
  MicOff,
  Barcode,
  Calendar,
  CreditCard,
  User,
  Phone,
  ShoppingBag,
  Filter,
  Zap,
  ArrowRightLeft,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Coins,
  ChevronRight,
  Receipt
} from 'lucide-react';

interface ReturnsExchangesViewProps {
  settings: ShopSettings;
  onViewInvoice?: (sale: Sale) => void;
  onReturnProcessed?: () => void;
}

type DateFilterType = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';
type PaymentFilterType = 'all' | 'Cash' | 'UPI' | 'Card' | 'Credit';
type StatusFilterType = 'all' | 'Completed' | 'Refunded' | 'Partially Refunded' | 'Cancelled';

interface SearchSuggestion {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dateTime: string;
  matchReason: string;
  sale: Sale;
}

export const ReturnsExchangesView: React.FC<ReturnsExchangesViewProps> = ({ 
  settings,
  onViewInvoice,
  onReturnProcessed
}) => {
  const currency = settings.currencySymbol || 'ج.م';

  // State Management
  const [sales, setSales] = useState<Sale[]>(() => sqliteDB.getSales());
  const [returns, setReturns] = useState<SaleReturn[]>(() => sqliteDB.getReturns());
  const [products, setProducts] = useState<Product[]>(() => sqliteDB.getProducts());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Voice Search state
  const [isListening, setIsListening] = useState(false);

  // Return Processing modal state
  const [matchedSale, setMatchedSale] = useState<Sale | null>(null);
  const [returnReason, setReturnReason] = useState<'Defective' | 'Expired' | 'Wrong Item' | 'Customer Changed Mind'>('Defective');
  const [selectedItemReturnQty, setSelectedItemReturnQty] = useState<Record<string, number>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  const refreshAll = () => {
    setSales(sqliteDB.getSales());
    setReturns(sqliteDB.getReturns());
    setProducts(sqliteDB.getProducts());
  };

  // Keyboard Shortcuts: Ctrl+F, Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSearchQuery('');
        setShowSuggestions(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Voice Search Handler (Web Speech API with graceful fallback)
  const toggleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('البحث الصوتي غير مدعوم في هذا المتصفح. يمكنك كتابة رقم الفاتورة أو اسم الصنف يدوياً.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ar-EG';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
        setShowSuggestions(true);
      };

      recognition.onerror = (event: any) => {
        console.warn('Voice recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      setIsListening(false);
    }
  };

  // Barcode / Form Search submit
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setShowSuggestions(false);

    // Check if query directly matches a product barcode
    const matchedProductsByBarcode = products.filter(p => p.barcode && p.barcode.toLowerCase() === query.toLowerCase());
    
    let barcodeMatchedSales: Sale[] = [];
    if (matchedProductsByBarcode.length > 0) {
      const productIds = new Set(matchedProductsByBarcode.map(p => p.id));
      barcodeMatchedSales = sales.filter(s => s.items.some(item => productIds.has(item.productId) || item.barcode === query));
    } else {
      // Direct barcode match inside sale items
      barcodeMatchedSales = sales.filter(s => s.items.some(item => item.barcode && item.barcode.toLowerCase() === query.toLowerCase()));
    }

    // USB Barcode Scanner Auto-Open Rule:
    // If exact 1 sale contains this barcode, open it automatically!
    if (barcodeMatchedSales.length === 1) {
      openReturnProcessor(barcodeMatchedSales[0]);
      return;
    }

    // Direct invoice lookup
    const exactSale = sqliteDB.getSaleByInvoice(query);
    if (exactSale) {
      openReturnProcessor(exactSale);
      return;
    }
  };

  // Open Return Processor for a given Sale
  const openReturnProcessor = (sale: Sale) => {
    setMatchedSale(sale);
    const initialQtyMap: Record<string, number> = {};
    sale.items.forEach(it => {
      initialQtyMap[it.productId] = 0;
    });
    setSelectedItemReturnQty(initialQtyMap);
  };

  // Live Multi-Search Filtering Logic
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return sales.filter(sale => {
      // 1. Text Search across Invoice #, Customer Name, Phone, Items, Barcodes, Amount, Cashier
      let matchesSearch = true;
      if (q) {
        const matchInvoice = sale.invoiceNumber.toLowerCase().includes(q);
        const matchCustomer = (sale.customerName || '').toLowerCase().includes(q);
        const matchPhone = (sale.customerPhone || '').toLowerCase().includes(q);
        const matchCashier = (sale.cashierName || '').toLowerCase().includes(q);
        const matchAmount = sale.totalAmount.toString().includes(q) || `${currency}${sale.totalAmount}`.includes(q);
        const matchPayment = sale.paymentMode.toLowerCase().includes(q);
        const matchItem = sale.items.some(item => 
          item.productName.toLowerCase().includes(q) || 
          (item.barcode && item.barcode.toLowerCase().includes(q))
        );

        matchesSearch = matchInvoice || matchCustomer || matchPhone || matchCashier || matchAmount || matchPayment || matchItem;
      }

      // 2. Date Filter
      let matchesDate = true;
      const saleDate = new Date(sale.dateTime);
      const now = new Date();

      if (dateFilter === 'today') {
        matchesDate = saleDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'yesterday') {
        const yest = new Date();
        yest.setDate(now.getDate() - 1);
        matchesDate = saleDate.toDateString() === yest.toDateString();
      } else if (dateFilter === 'last7') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        matchesDate = saleDate >= sevenDaysAgo;
      } else if (dateFilter === 'last30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        matchesDate = saleDate >= thirtyDaysAgo;
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = saleDate >= start && saleDate <= end;
      }

      // 3. Payment Filter
      let matchesPayment = true;
      if (paymentFilter !== 'all') {
        matchesPayment = sale.paymentMode === paymentFilter;
      }

      // 4. Status Filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = sale.status === statusFilter;
      }

      return matchesSearch && matchesDate && matchesPayment && matchesStatus;
    });
  }, [sales, searchQuery, dateFilter, paymentFilter, statusFilter, customStartDate, customEndDate, currency]);

  // Live Search Suggestions List (Max 6 preview results)
  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: SearchSuggestion[] = [];
    for (const sale of sales) {
      if (results.length >= 6) break;

      let reason = '';
      if (sale.invoiceNumber.toLowerCase().includes(q)) {
        reason = 'Matched Invoice #';
      } else if ((sale.customerName || '').toLowerCase().includes(q)) {
        reason = `Customer: ${sale.customerName}`;
      } else if ((sale.customerPhone || '').toLowerCase().includes(q)) {
        reason = `Phone: ${sale.customerPhone}`;
      } else {
        const matchedItem = sale.items.find(i => 
          i.productName.toLowerCase().includes(q) || (i.barcode && i.barcode.toLowerCase().includes(q))
        );
        if (matchedItem) {
          reason = `Item: ${matchedItem.productName}`;
        } else if (sale.totalAmount.toString().includes(q)) {
          reason = `Amount: ${currency}${sale.totalAmount}`;
        }
      }

      if (reason) {
        results.push({
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          customerName: sale.customerName || 'Walk-in Customer',
          amount: sale.totalAmount,
          dateTime: sale.dateTime,
          matchReason: reason,
          sale,
        });
      }
    }
    return results;
  }, [sales, searchQuery, currency]);

  // Quick Action Handlers
  const handleTodaySales = () => {
    setSearchQuery('');
    setDateFilter('today');
    setPaymentFilter('all');
    setStatusFilter('all');
  };

  const handleRecentInvoices = () => {
    setSearchQuery('');
    setDateFilter('all');
    setPaymentFilter('all');
    setStatusFilter('all');
  };

  const handleHighValueBills = () => {
    setSearchQuery('');
    setDateFilter('all');
    setPaymentFilter('all');
    setStatusFilter('all');
    // Filter sales with total >= 500
    setSales(sqliteDB.getSales().filter(s => s.totalAmount >= 500));
  };

  const handleLastCustomer = () => {
    const all = sqliteDB.getSales();
    if (all.length > 0 && all[0].customerName) {
      setSearchQuery(all[0].customerName);
    } else {
      alert('لم يتم العثور على عميل مسجل مؤخراً.');
    }
  };

  const handleRepeatLastBill = () => {
    const all = sqliteDB.getSales();
    if (all.length > 0) {
      if (onViewInvoice) {
        onViewInvoice(all[0]);
      } else {
        openReturnProcessor(all[0]);
      }
    } else {
      alert('لا توجد مبيعات مسجلة في السجل.');
    }
  };

  // Process Refund Submission
  const handleProcessRefund = () => {
    if (!matchedSale) return;

    const itemsToReturn = matchedSale.items
      .filter(item => (selectedItemReturnQty[item.productId] || 0) > 0)
      .map(item => ({
        productId: item.productId,
        productName: item.productName,
        qty: selectedItemReturnQty[item.productId],
        unitPrice: item.unitSellingPrice,
      }));

    if (itemsToReturn.length === 0) {
      alert('يرجى تحديد كمية صنف واحد على الأقل للمرتجع.');
      return;
    }

    const totalRefund = itemsToReturn.reduce((acc, i) => acc + (i.qty * i.unitPrice), 0);

    const retRec = sqliteDB.recordReturn(matchedSale.id, itemsToReturn, totalRefund, returnReason);
    
    if (onReturnProcessed) {
      onReturnProcessed();
    }

    alert(`تم تسجيل إذن المرتجع بنجاح! تم استرداد مبلغ ${totalRefund} ${currency} وإعادة الأصناف لرصيد المخزن.`);
    
    refreshAll();

    const updatedSale = sqliteDB.getSaleByInvoice(matchedSale.invoiceNumber);
    setMatchedSale(null);

    if (updatedSale && onViewInvoice) {
      if (confirm('هل ترغب في معاينة وطباعة إيصال المرتجع المحدث الآن؟')) {
        onViewInvoice(updatedSale);
      }
    }
  };

  // Recent 10 Purchases for quick access
  const recentTenSales = useMemo(() => sales.slice(0, 10), [sales]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            مركز إدارة المرتجعات والاستبدال واسترداد الأموال
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            بحث شامل برقم الفاتورة، اسم العميل، رقم الهاتف، باركود الصنف أو القيمة. استرجاع فوري وإعادة البضاعة للمخزن بضغطة زر!
          </p>
        </div>

        {/* Quick Keyboard Hint */}
        <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span><strong className="text-slate-800 dark:text-slate-200">Ctrl + F</strong> للبحث السريع</span>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={handleTodaySales}
          className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shrink-0 transition"
        >
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          مبيعات اليوم
        </button>

        <button
          onClick={handleRecentInvoices}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0 transition"
        >
          <Receipt className="w-3.5 h-3.5 text-sky-500" />
          أحدث الفواتير
        </button>

        <button
          onClick={handleHighValueBills}
          className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-semibold border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 shrink-0 transition"
        >
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          الفواتير الكبيرة (&ge; 500 {currency})
        </button>

        <button
          onClick={handleLastCustomer}
          className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-xl text-xs font-semibold border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 shrink-0 transition"
        >
          <User className="w-3.5 h-3.5 text-purple-600" />
          آخر عميل
        </button>

        <button
          onClick={handleRepeatLastBill}
          className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 shrink-0 transition"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          معاينة آخر فاتورة
        </button>
      </div>

      {/* Universal Multi-Search Box with Voice & Barcode Support */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs relative">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" />
              البحث الشامل عن الفاتورة أو باركود الصنف
            </label>
            <span className="text-[11px] text-slate-400">
              يدعم قارئ الباركود، البحث الصوتي، رقم هاتف العميل، واسم الصنف
            </span>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute right-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="امسح الباركود، أو اكتب رقم الفاتورة (مثال: INV-2026-0001)، أو اسم العميل، أو الموبايل..."
              className="w-full pr-10 pl-24 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-right"
            />

            <div className="absolute left-2 flex items-center gap-1">
              {/* Voice Search Button */}
              <button
                type="button"
                onClick={toggleVoiceSearch}
                title="البحث الصوتي"
                className={`p-2 rounded-lg text-xs transition ${
                  isListening 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Submit / Find Button */}
              <button
                type="submit"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>بحث</span>
              </button>
            </div>
          </div>
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute left-5 right-5 top-[92px] z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
            <div className="p-2 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>الفواتير المطابقة للبحث ({searchSuggestions.length})</span>
              <span>اضغط للفتح أو اضغط Enter</span>
            </div>
            {searchSuggestions.map(sugg => (
              <button
                key={sugg.id}
                type="button"
                onClick={() => {
                  setSearchQuery(sugg.invoiceNumber);
                  setShowSuggestions(false);
                  openReturnProcessor(sugg.sale);
                }}
                className="w-full p-3 text-right hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 flex items-center justify-between transition group"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {sugg.invoiceNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {sugg.customerName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                    <span>{sugg.amount} {currency}</span>
                    <span>•</span>
                    <span>{new Date(sugg.dateTime).toLocaleString('ar-EG')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-semibold">
                    {sugg.matchReason}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition rotate-180" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <span>تصفية وفلترة الفواتير</span>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            عرض {filteredSales.length} فاتورة مطابقة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Date Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">الفترة الزمنية</label>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as DateFilterType)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium"
            >
              <option value="all">كل الفترات</option>
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
              <option value="last7">آخر 7 أيام</option>
              <option value="last30">آخر 30 يوماً</option>
              <option value="custom">تحديد فترة مخصصة</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">طريقة الدفع</label>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value as PaymentFilterType)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium"
            >
              <option value="all">جميع طرق الدفع</option>
              <option value="Cash">كاش فقط</option>
              <option value="UPI">إنستاباي ومحافظ ذكية</option>
              <option value="Card">بطاقة بنكية / فيزا</option>
              <option value="Credit">آجل (شكك)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">حالة الفاتورة</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilterType)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium"
            >
              <option value="all">كل الحالات</option>
              <option value="Completed">مكتملة</option>
              <option value="Refunded">مرتجعة</option>
              <option value="Cancelled">ملغاة</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {dateFilter === 'custom' && (
          <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900"
            />
            <span className="self-center text-xs font-bold text-slate-400">إلى</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900"
            />
          </div>
        )}
      </div>

      {/* Active Return Processor Modal / Card */}
      {matchedSale && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-4 animate-in fade-in zoom-in duration-150">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-sm rounded-lg">
                  {matchedSale.invoiceNumber}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {new Date(matchedSale.dateTime).toLocaleString('ar-EG')}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-1">
                العميل: {matchedSale.customerName || 'زبون نقدي'} • الهاتف: {matchedSale.customerPhone || 'غير مسجل'} • الكاشير: {matchedSale.cashierName || 'المدير'}
              </p>
            </div>
            <button
              onClick={() => setMatchedSale(null)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  سبب الإرجاع أو الاستبدال
                </label>
                <select
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Defective">منتج به عيب أو تالف</option>
                  <option value="Expired">قريب من انتهاء الصلاحية أو منتهي</option>
                  <option value="Wrong Item">صنف تم شراؤه بالخطأ</option>
                  <option value="Customer Changed Mind">رغبة العميل في التبديل أو الإرجاع</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">إجمالي الفاتورة الأصلية</div>
                  <div className="text-base font-mono font-bold text-slate-800 dark:text-slate-100">
                    {matchedSale.totalAmount} {currency}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">طريقة الدفع الأصلية</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {matchedSale.paymentMode === 'Cash' ? 'كاش (نقدي)' :
                     matchedSale.paymentMode === 'UPI' ? 'إنستاباي / محفظة' :
                     matchedSale.paymentMode === 'Card' ? 'بطاقة بنكية' : 'آجل (شكك)'}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                <span>حدد كمية الأصناف المراد إرجاعها:</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  الأصناف المحددة ستُعاد تلقائياً إلى مخزون المحل
                </span>
              </p>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                    <tr>
                      <th className="p-3 text-right">اسم الصنف</th>
                      <th className="p-3 text-center">الكمية بالفاتورة</th>
                      <th className="p-3 text-center">الكمية المرتجعة</th>
                      <th className="p-3 text-left">سعر القطعة</th>
                      <th className="p-3 text-left">المبلغ المسترد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {matchedSale.items.map(item => {
                      const returnQty = selectedItemReturnQty[item.productId] || 0;
                      const subtotalRefund = returnQty * item.unitSellingPrice;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="p-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {item.productName}
                            </div>
                            {item.barcode && (
                              <div className="text-[10px] font-mono text-slate-400">
                                باركود: {item.barcode}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-500">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const current = selectedItemReturnQty[item.productId] || 0;
                                  setSelectedItemReturnQty(prev => ({
                                    ...prev,
                                    [item.productId]: Math.max(0, current - 1)
                                  }));
                                }}
                                className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded font-bold hover:bg-slate-300"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={item.quantity}
                                value={returnQty}
                                onChange={e => {
                                  const val = Math.min(item.quantity, Math.max(0, Number(e.target.value)));
                                  setSelectedItemReturnQty(prev => ({ ...prev, [item.productId]: val }));
                                }}
                                className="w-12 p-1 border rounded text-center font-bold text-emerald-600 bg-white dark:bg-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const current = selectedItemReturnQty[item.productId] || 0;
                                  setSelectedItemReturnQty(prev => ({
                                    ...prev,
                                    [item.productId]: Math.min(item.quantity, current + 1)
                                  }));
                                }}
                                className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded font-bold hover:bg-slate-300"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-left font-mono text-slate-600 dark:text-slate-300">
                            {item.unitSellingPrice} {currency}
                          </td>
                          <td className="p-3 text-left font-mono font-bold text-rose-600">
                            {subtotalRefund} {currency}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Refund Summary & Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">إجمالي المبلغ المسترد للعميل:</span>
                <span className="font-bold text-lg text-rose-600 font-mono">
                  {matchedSale.items.reduce((acc, item) => acc + ((selectedItemReturnQty[item.productId] || 0) * item.unitSellingPrice), 0)} {currency}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onViewInvoice && (
                  <button
                    type="button"
                    onClick={() => onViewInvoice(matchedSale)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span>معاينة الفاتورة الأصلية</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleProcessRefund}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition flex items-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>تأكيد الإرجاع واستعادة المخزون</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Purchases Quick Access Grid (Latest 10 Sales) */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            أحدث عمليات الشراء والفواتير (اضغط لفتح الإرجاع السريع)
          </h3>
          <span className="text-[11px] text-slate-400">اضغط على أي فاتورة لإرجاعها أو معاينتها</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {recentTenSales.map(sale => (
            <div
              key={sale.id}
              onClick={() => openReturnProcessor(sale)}
              className="p-3 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 rounded-xl cursor-pointer transition space-y-1.5 group text-right"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 group-hover:underline">
                  {sale.invoiceNumber}
                </span>
                <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold">
                  {sale.paymentMode === 'Cash' ? 'كاش' :
                   sale.paymentMode === 'UPI' ? 'إنستاباي' :
                   sale.paymentMode === 'Card' ? 'فيزا' : 'شكك'}
                </span>
              </div>

              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                {sale.customerName || 'زبون نقدي'}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {sale.totalAmount} {currency}
                </span>
                <span className="text-[10px] text-slate-400">
                  {sale.items.length} صنف
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtered Search Results Grid / Cards */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between">
          <span>نتائج البحث وفواتير المبيعات ({filteredSales.length})</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              مسح البحث
            </button>
          )}
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSales.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-300" />
              <p>لم يتم العثور على فواتير مطابقة. جرب تغيير كلمات البحث أو الفلاتر.</p>
            </div>
          ) : (
            filteredSales.map(sale => (
              <div
                key={sale.id}
                className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3 hover:shadow-sm transition text-right"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {sale.invoiceNumber}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {new Date(sale.dateTime).toLocaleString('ar-EG')}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    sale.status === 'Completed'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : sale.status === 'Refunded'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {sale.status === 'Completed' ? 'مكتملة' :
                     sale.status === 'Refunded' ? 'مرتجعة' :
                     sale.status === 'Partially Refunded' ? 'مرتجع جزئي' : 'ملغاة'}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between font-semibold">
                    <span>العميل:</span>
                    <span>{sale.customerName || 'زبون نقدي'}</span>
                  </div>

                  {sale.customerPhone && (
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>الهاتف:</span>
                      <span className="font-mono">{sale.customerPhone}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold">
                    <span>الكاشير:</span>
                    <span>{sale.cashierName || 'المدير'}</span>
                  </div>

                  <div className="flex justify-between font-mono font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>إجمالي الفاتورة:</span>
                    <span>{sale.totalAmount} {currency} ({sale.paymentMode === 'Cash' ? 'كاش' : sale.paymentMode === 'UPI' ? 'إنستاباي' : sale.paymentMode === 'Card' ? 'فيزا' : 'شكك'})</span>
                  </div>

                  {/* Sample Items preview pill tag */}
                  <div className="pt-1.5 flex flex-wrap gap-1">
                    {sale.items.map(item => (
                      <span
                        key={item.id}
                        className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-medium"
                      >
                        {item.productName} ({item.quantity})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/80">
                  {onViewInvoice && (
                    <button
                      type="button"
                      onClick={() => onViewInvoice(sale)}
                      className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      معاينة
                    </button>
                  )}

                  {onViewInvoice && (
                    <button
                      type="button"
                      onClick={() => onViewInvoice(sale)}
                      className="py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-emerald-200 dark:border-emerald-800 transition"
                      title="طباعة الفاتورة"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      طباعة
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openReturnProcessor(sale)}
                    className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    إرجاع / استبدال
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Return Vouchers History Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="p-4 border-b font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between">
          <span>سجل وأذونات المرتجعات المنفذة</span>
          <span className="text-xs font-mono text-slate-400">إجمالي {returns.length} إذن مرتجع</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 text-right">رقم إذن المرتجع</th>
                <th className="py-3 px-4 text-right">رقم الفاتورة الأصلية</th>
                <th className="py-3 px-4 text-right">اسم العميل</th>
                <th className="py-3 px-4 text-right">سبب الإرجاع</th>
                <th className="py-3 px-4 text-left">المبلغ المسترد</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    لا توجد أذونات مرتجعات مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                returns.map(ret => (
                  <tr key={ret.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">{ret.returnInvoiceNumber}</td>
                    <td className="py-3 px-4 font-mono font-semibold">{ret.originalInvoiceNumber}</td>
                    <td className="py-3 px-4">{ret.customerName}</td>
                    <td className="py-3 px-4 font-medium">
                      {ret.reason === 'Defective' ? 'تالف / عيب بالمنتج' :
                       ret.reason === 'Expired' ? 'منتهي الصلاحية' :
                       ret.reason === 'Wrong Item' ? 'شراء بالخطأ' :
                       ret.reason === 'Customer Changed Mind' ? 'رغبة العميل' : ret.reason}
                    </td>
                    <td className="py-3 px-4 text-left font-bold text-rose-600 font-mono">
                      {ret.refundAmount} {currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          const sale = sqliteDB.getSaleByInvoice(ret.originalInvoiceNumber);
                          if (sale && onViewInvoice) {
                            onViewInvoice(sale);
                          } else {
                            alert(`تفاصيل الفاتورة رقم ${ret.originalInvoiceNumber} غير موجودة.`);
                          }
                        }}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                        طباعة الفاتورة
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
