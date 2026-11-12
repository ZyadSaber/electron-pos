import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Activity,
  Banknote,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Tags,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AttendanceRecord,
  CashRegisterShift,
  CashTransaction,
  CategoryNode,
  Customer,
  CustomerLedgerEntry,
  Employee,
  Expense,
  HeldBill,
  IncomingStockLog,
  PriceHistoryRecord,
  Product,
  ProductBatch,
  ProductVariant,
  PurchaseOrder,
  Sale,
  SaleReturn,
  ShopSettings,
  Supplier,
  SupplierLedgerEntry,
} from '../types';
import { sqliteDB } from '../db/sqliteStorage';

interface ReportsViewProps {
  sales: Sale[];
  products: Product[];
  settings: ShopSettings;
}

type ReportValue = string | number | boolean | null;
type ReportRow = Record<string, ReportValue>;

interface ReportTable {
  name: string;
  title: string;
  rows: ReportRow[];
}

interface ReportSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  summaries: { label: string; value: string }[];
  tables: ReportTable[];
}

type Period = 'today' | 'week' | 'month' | 'all' | 'custom';

const todayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const dateValue = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateLabel = (value?: string) => {
  const date = dateValue(value);
  return date ? date.toLocaleString('ar-EG') : value || '—';
};

const escapeHtml = (value: ReportValue) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sum = (values: number[]) => values.reduce((total, value) => total + (Number(value) || 0), 0);

const cash = (value: number, currency: string) => `${Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`;

const toRows = <T extends object>(items: T[], map: (item: T) => ReportRow) => items.map(map);

const paymentLabels: Record<string, string> = {
  Cash: 'نقدي',
  UPI: 'محفظة / تحويل فوري',
  Card: 'بطاقة',
  Credit: 'آجل',
  Split: 'دفع متعدد',
  Bank: 'تحويل بنكي',
  Wallet: 'محفظة',
  'Gift Voucher': 'قسيمة شرائية',
  'Store Credit': 'رصيد متجر',
};

const saleStatusLabels: Record<Sale['status'], string> = {
  Completed: 'مكتملة',
  Cancelled: 'ملغاة',
  Refunded: 'مستردة',
  'Partially Refunded': 'مستردة جزئياً',
};

const expenseCategoryLabels: Record<Expense['category'], string> = {
  Rent: 'إيجار',
  Electricity: 'كهرباء',
  Salary: 'رواتب',
  Internet: 'إنترنت',
  Transport: 'نقل',
  Miscellaneous: 'متنوعة',
};

const ledgerTypeLabels: Record<CustomerLedgerEntry['type'], string> = {
  SaleCredit: 'فاتورة بيع',
  PaymentReceived: 'تحصيل',
  Return: 'مرتجع',
  Adjustment: 'تسوية',
};

const supplierLedgerTypeLabels: Record<SupplierLedgerEntry['type'], string> = {
  Invoice: 'فاتورة مورد',
  Payment: 'سداد',
  Return: 'مرتجع للمورد',
  Adjustment: 'تسوية',
};

const purchaseStatusLabels: Record<PurchaseOrder['status'], string> = {
  Draft: 'مسودة',
  Ordered: 'بانتظار التوريد',
  'Partially Received': 'استلام جزئي',
  Received: 'مستلم',
  Cancelled: 'ملغي',
};

const shiftStatusLabels: Record<CashRegisterShift['status'], string> = {
  Open: 'مفتوح',
  Closed: 'مغلق',
};

const attendanceStatusLabels: Record<AttendanceRecord['status'], string> = {
  Present: 'حاضر',
  Late: 'متأخر',
  'Half Day': 'نصف يوم',
  Absent: 'غائب',
};

const getPaymentAmounts = (sale: Sale) => {
  if (sale.paymentMode === 'Split' && sale.splitPayments?.length) {
    return sale.splitPayments.reduce<Record<string, number>>((amounts, payment) => {
      amounts[payment.mode] = (amounts[payment.mode] || 0) + payment.amount;
      return amounts;
    }, {});
  }
  if (sale.paymentMode === 'Cash') {
    const paid = sale.receivedAmount > 0
      ? Math.max(0, sale.receivedAmount - (sale.changeAmount || 0))
      : sale.totalAmount;
    return { Cash: paid };
  }
  return { [sale.paymentMode]: sale.totalAmount };
};

export const ReportsView: React.FC<ReportsViewProps> = ({ sales, products, settings }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [today] = useState(todayISO);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 29);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const [toDate, setToDate] = useState(todayISO);
  const [activeSection, setActiveSection] = useState('sales');
  const currency = settings.currencySymbol || 'ج.م';

  const periodBounds = useMemo(() => {
    const end = new Date(`${toDate || today}T23:59:59.999`);
    const start = new Date(`${fromDate || today}T00:00:00`);
    if (period === 'today') {
      start.setTime(new Date(`${today}T00:00:00`).getTime());
      end.setTime(new Date(`${today}T23:59:59.999`).getTime());
    } else if (period === 'week') {
      start.setTime(new Date(`${today}T00:00:00`).getTime());
      start.setDate(start.getDate() - 6);
      end.setTime(new Date(`${today}T23:59:59.999`).getTime());
    } else if (period === 'month') {
      start.setTime(new Date(`${today}T00:00:00`).getTime());
      start.setDate(start.getDate() - 29);
      end.setTime(new Date(`${today}T23:59:59.999`).getTime());
    }
    return { start, end };
  }, [fromDate, period, today, toDate]);

  const inPeriod = (value?: string) => {
    if (period === 'all') return true;
    const date = dateValue(value);
    return Boolean(date && date >= periodBounds.start && date <= periodBounds.end);
  };

  const sections = useMemo<ReportSection[]>(() => {
    const completedSales = sales.filter(sale =>
      inPeriod(sale.dateTime) && (sale.status === 'Completed' || sale.status === 'Partially Refunded')
    );
    const periodSales = sales.filter(sale => inPeriod(sale.dateTime));
    const periodExpenses = sqliteDB.getExpenses().filter(expense => inPeriod(expense.date));
    const periodReturns = sqliteDB.getReturns().filter(returnEntry => inPeriod(returnEntry.date));
    const suppliers = sqliteDB.getSuppliers();
    const customers = sqliteDB.getCustomers();
    const employees = sqliteDB.getEmployees();
    const attendance = sqliteDB.getAttendance().filter(record => inPeriod(record.date));
    const purchaseOrders = sqliteDB.getPurchaseOrders().filter(order => inPeriod(order.receivedDate || order.orderDate));
    const supplierLedger = suppliers.flatMap(supplier => sqliteDB.getSupplierLedger(supplier.id))
      .filter(entry => inPeriod(entry.date));
    const customerLedger = customers.flatMap(customer => sqliteDB.getCustomerLedger(customer.id))
      .filter(entry => inPeriod(entry.date));
    const stockLogs = sqliteDB.getStockLogs().filter(log => inPeriod(log.dateTime));
    const priceHistory = sqliteDB.getPriceHistory().filter(record => inPeriod(record.dateChanged));
    const cashTransactions = sqliteDB.getCashTransactions().filter(transaction => inPeriod(transaction.timestamp));
    const auditLogs = sqliteDB.getAuditLogs().filter(log => inPeriod(log.timestamp));
    const heldBills = sqliteDB.getHeldBills().filter(bill => inPeriod(bill.timestamp));
    const categories = sqliteDB.getCategories();
    const recycledItems = sqliteDB.getRecycleBin().filter(item => inPeriod(item.deletedAt));
    const cashShifts = sqliteDB.getCashShifts().filter(shift =>
      inPeriod(shift.startTime) || inPeriod(shift.endTime) ||
      (period !== 'all' && new Date(shift.startTime) < periodBounds.start && (!shift.endTime || new Date(shift.endTime) > periodBounds.end))
    );

    const salesRevenue = sum(completedSales.map(sale => sale.totalAmount));
    const salesProfit = sum(completedSales.map(sale => sale.totalProfit));
    const salesDiscount = sum(completedSales.map(sale => sale.discountAmount));
    const soldUnits = sum(completedSales.flatMap(sale => sale.items.map(item => item.quantity)));
    const salesItems = completedSales.flatMap(sale => sale.items.map(item => ({
      sale,
      item,
    })));
    const performanceByProduct = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    salesItems.forEach(({ item }) => {
      const current = performanceByProduct.get(item.productId) || {
        name: item.productName,
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.totalPrice;
      current.profit += (item.unitSellingPrice - item.unitPurchasePrice) * item.quantity;
      performanceByProduct.set(item.productId, current);
    });
    const productPerformance = [...performanceByProduct.values()].sort((a, b) => b.quantity - a.quantity);
    const paymentTotals = new Map<string, number>();
    completedSales.forEach(sale => {
      Object.entries(getPaymentAmounts(sale)).forEach(([mode, amount]) => {
        paymentTotals.set(mode, (paymentTotals.get(mode) || 0) + amount);
      });
    });

    const totalExpenses = sum(periodExpenses.map(expense => expense.amount));
    const supplierInvoiceTotal = sum(supplierLedger
      .filter(entry => entry.type === 'Invoice')
      .map(entry => entry.credit));
    const supplierPaymentTotal = sum(supplierLedger
      .filter(entry => entry.type === 'Payment')
      .map(entry => entry.debit));
    const totalRefunds = sum(periodReturns.map(returnEntry => returnEntry.refundAmount));
    const inventoryValue = sum(products.map(product => product.quantity * product.purchasePrice));
    const lowStock = products.filter(product => product.quantity <= (product.minStockLevel ?? settings.lowStockThreshold));
    const outOfStock = products.filter(product => product.quantity <= 0);
    const expiredProducts = products.filter(product => product.expiryDate && product.expiryDate < today);
    const expiringProducts = products.filter(product => {
      if (!product.expiryDate || product.expiryDate < today) return false;
      const days = (new Date(`${product.expiryDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000;
      return days <= 30;
    });

    const invoiceRows = toRows<Sale>(periodSales, sale => ({
      'رقم الفاتورة': sale.invoiceNumber,
      'التاريخ': dateLabel(sale.dateTime),
      'العميل': sale.customerName || 'عميل نقدي',
      'الهاتف': sale.customerPhone || '',
      'عدد الأصناف': sale.items.length,
      'الكمية': sum(sale.items.map(item => item.quantity)),
      'الخصم': sale.discountAmount,
      'الإجمالي': sale.totalAmount,
      'المدفوع': sale.receivedAmount,
      'طريقة الدفع': sale.paymentMode === 'Split' && sale.splitPayments?.length
        ? sale.splitPayments.map(payment => `${paymentLabels[payment.mode] || payment.mode}: ${payment.amount}`).join('، ')
        : paymentLabels[sale.paymentMode] || sale.paymentMode,
      'الربح': sale.totalProfit,
      'الكاشير': sale.cashierName || '',
      'الحالة': saleStatusLabels[sale.status],
      'ملاحظات': sale.notes || '',
    }));

    const salesItemRows = salesItems.map(({ sale, item }) => ({
      'رقم الفاتورة': sale.invoiceNumber,
      'التاريخ': dateLabel(sale.dateTime),
      'العميل': sale.customerName || 'عميل نقدي',
      'الصنف': item.productName,
      'الباركود': item.barcode,
      'الوحدة': item.unit || item.variantName || '',
      'رقم التشغيلة': item.batchNumber || '',
      'الكمية': item.quantity,
      'سعر البيع': item.unitSellingPrice,
      'سعر الشراء': item.unitPurchasePrice,
      'الإجمالي': item.totalPrice,
      'الربح': (item.unitSellingPrice - item.unitPurchasePrice) * item.quantity,
    }));

    const expenseCategoryTotals = new Map<string, number>();
    periodExpenses.forEach(expense => expenseCategoryTotals.set(
      expense.category,
      (expenseCategoryTotals.get(expense.category) || 0) + expense.amount,
    ));

    const purchaseItemRows = purchaseOrders.flatMap(order => order.items.map(item => ({
      'رقم أمر الشراء': order.poNumber,
      'رقم الفاتورة': (order.invoiceNumbers || [order.invoiceNumber]).filter(Boolean).join('، '),
      'المورد': order.supplierName,
      'التاريخ': order.receivedDate || order.orderDate,
      'الصنف': item.productName,
      'الكمية المطلوبة': item.qty,
      'المستلم': item.receivedQty || 0,
      'سعر الشراء': item.purchasePrice,
      'إجمالي الصنف': item.qty * item.purchasePrice,
      'الحالة': purchaseStatusLabels[order.status],
    })));

    const sectionsData: ReportSection[] = [
      {
        id: 'sales',
        title: 'المبيعات',
        description: 'الفواتير، تفاصيل الأصناف، الأرباح، الخصومات وطرق التحصيل.',
        icon: ShoppingCart,
        summaries: [
          { label: 'إيراد المبيعات', value: cash(salesRevenue, currency) },
          { label: 'عدد الفواتير', value: completedSales.length.toLocaleString('ar-EG') },
          { label: 'صافي الربح', value: cash(salesProfit, currency) },
          { label: 'الخصومات', value: cash(salesDiscount, currency) },
          { label: 'الوحدات المباعة', value: soldUnits.toLocaleString('ar-EG') },
        ],
        tables: [
          { name: 'فواتير المبيعات', title: 'فواتير المبيعات', rows: invoiceRows },
          { name: 'أصناف المبيعات', title: 'تفاصيل أصناف الفواتير', rows: salesItemRows },
          {
            name: 'طرق الدفع',
            title: 'ملخص طرق الدفع',
            rows: [...paymentTotals.entries()].map(([mode, amount]) => ({
              'طريقة الدفع': paymentLabels[mode] || mode,
              'المبلغ المحصل': amount,
              'نسبة من إجمالي المبيعات': salesRevenue ? `${((amount / salesRevenue) * 100).toFixed(1)}%` : '0%',
            })),
          },
          {
            name: 'أداء الأصناف',
            title: 'أداء الأصناف المباعة',
            rows: productPerformance.map(item => ({
              'الصنف': item.name,
              'الكمية المباعة': item.quantity,
              'إيراد الصنف': item.revenue,
              'الربح': item.profit,
            })),
          },
        ],
      },
      {
        id: 'purchases',
        title: 'المشتريات والموردون',
        description: 'أوامر الشراء، الأصناف المستلمة، حركة حسابات الموردين وأرصدتهم.',
        icon: ShoppingBag,
        summaries: [
          { label: 'قيمة فواتير الموردين', value: cash(supplierInvoiceTotal, currency) },
          { label: 'المدفوع للموردين', value: cash(supplierPaymentTotal, currency) },
          { label: 'رصيد الموردين الحالي', value: cash(sum(suppliers.map(supplier => supplier.outstandingBalance)), currency) },
          { label: 'أوامر الشراء', value: purchaseOrders.length.toLocaleString('ar-EG') },
        ],
        tables: [
          {
            name: 'الموردون',
            title: 'دليل الموردين والأرصدة الحالية',
            rows: toRows<Supplier>(suppliers, supplier => ({
              'المورد': supplier.companyName || supplier.name,
              'اسم المسؤول': supplier.name,
              'الهاتف': supplier.phone,
              'البريد': supplier.email || '',
              'العنوان': supplier.address || '',
              'شروط الدفع': supplier.paymentTerms || '',
              'الرصيد المستحق': supplier.outstandingBalance,
              'تاريخ الإضافة': supplier.createdAt,
            })),
          },
          {
            name: 'أوامر الشراء',
            title: 'أوامر الشراء والفواتير',
            rows: toRows<PurchaseOrder>(purchaseOrders, order => ({
              'رقم الأمر': order.poNumber,
              'أرقام فواتير المورد': (order.invoiceNumbers || [order.invoiceNumber]).filter(Boolean).join('، '),
              'المورد': order.supplierName,
              'تاريخ الأمر': order.orderDate,
              'تاريخ الاستلام': order.receivedDate || '',
              'عدد الأصناف': order.items.length,
              'الكمية المطلوبة': sum(order.items.map(item => item.qty)),
              'الكمية المستلمة': sum(order.items.map(item => item.receivedQty || 0)),
              'قيمة الأمر': order.totalAmount,
              'الحالة': purchaseStatusLabels[order.status],
              'ملاحظات': order.notes || '',
            })),
          },
          { name: 'أصناف المشتريات', title: 'تفاصيل أصناف أوامر الشراء', rows: purchaseItemRows },
          {
            name: 'حسابات الموردين',
            title: 'حركة حسابات الموردين',
            rows: toRows<SupplierLedgerEntry>(supplierLedger, entry => ({
              'التاريخ': dateLabel(entry.date),
              'المورد': suppliers.find(supplier => supplier.id === entry.supplierId)?.companyName
                || suppliers.find(supplier => supplier.id === entry.supplierId)?.name
                || entry.supplierId,
              'نوع الحركة': supplierLedgerTypeLabels[entry.type],
              'رقم المرجع': entry.referenceNo,
              'مدين': entry.debit,
              'دائن': entry.credit,
              'الرصيد بعد الحركة': entry.balance,
              'طريقة الدفع': entry.paymentMode ? paymentLabels[entry.paymentMode] || entry.paymentMode : '',
              'ملاحظات': entry.notes || '',
            })),
          },
        ],
      },
      {
        id: 'expenses',
        title: 'المصروفات',
        description: 'تفاصيل المصروفات، تصنيفاتها وطرق الدفع.',
        icon: Wallet,
        summaries: [
          { label: 'إجمالي المصروفات', value: cash(totalExpenses, currency) },
          { label: 'عدد المصروفات', value: periodExpenses.length.toLocaleString('ar-EG') },
          { label: 'متوسط المصروف', value: cash(periodExpenses.length ? totalExpenses / periodExpenses.length : 0, currency) },
        ],
        tables: [
          {
            name: 'المصروفات',
            title: 'سجل المصروفات',
            rows: toRows<Expense>(periodExpenses, expense => ({
              'التاريخ': expense.date,
              'البيان': expense.title,
              'التصنيف': expenseCategoryLabels[expense.category],
              'المبلغ': expense.amount,
              'طريقة الدفع': paymentLabels[expense.paymentMode] || expense.paymentMode,
              'ملاحظات': expense.notes || '',
            })),
          },
          {
            name: 'تصنيفات المصروفات',
            title: 'ملخص المصروفات حسب التصنيف',
            rows: [...expenseCategoryTotals.entries()].map(([category, amount]) => ({
              'التصنيف': expenseCategoryLabels[category as Expense['category']] || category,
              'إجمالي المبلغ': amount,
              'النسبة من المصروفات': totalExpenses ? `${((amount / totalExpenses) * 100).toFixed(1)}%` : '0%',
            })),
          },
        ],
      },
      {
        id: 'inventory',
        title: 'المخزون والأصناف',
        description: 'قيمة المخزون الحالية، النواقص، الصلاحية، الوارد وتاريخ تغيّر الأسعار.',
        icon: Boxes,
        summaries: [
          { label: 'عدد الأصناف', value: products.length.toLocaleString('ar-EG') },
          { label: 'إجمالي الوحدات بالمخزون', value: sum(products.map(product => product.quantity)).toLocaleString('ar-EG') },
          { label: 'قيمة المخزون بسعر الشراء', value: cash(inventoryValue, currency) },
          { label: 'أصناف منخفضة المخزون', value: lowStock.length.toLocaleString('ar-EG') },
          { label: 'أصناف منتهية الصلاحية', value: expiredProducts.length.toLocaleString('ar-EG') },
        ],
        tables: [
          {
            name: 'المخزون الحالي',
            title: 'الأصناف والمخزون الحالي',
            rows: toRows<Product>(products, product => ({
              'الصنف': product.name,
              'الباركود': product.barcode,
              'التصنيف': product.category,
              'الوحدة': product.unit || '',
              'الكمية': product.quantity,
              'حد التنبيه': product.minStockLevel ?? settings.lowStockThreshold,
              'سعر الشراء': product.purchasePrice,
              'سعر البيع': product.sellingPrice,
              'قيمة المخزون': product.quantity * product.purchasePrice,
              'المورد': product.supplierName || '',
              'الموقع': product.shelfLocation || '',
              'الصلاحية': product.expiryDate || '',
              'الحالة': product.quantity <= 0 ? 'نفد' : product.quantity <= (product.minStockLevel ?? settings.lowStockThreshold) ? 'مخزون منخفض' : 'متوفر',
            })),
          },
          {
            name: 'تنبيهات المخزون',
            title: 'النواقص والأصناف القريبة من انتهاء الصلاحية',
            rows: products.filter(product =>
              product.quantity <= (product.minStockLevel ?? settings.lowStockThreshold) ||
              (product.expiryDate && (product.expiryDate < today || expiringProducts.includes(product)))
            ).map(product => ({
              'الصنف': product.name,
              'الكمية': product.quantity,
              'حد التنبيه': product.minStockLevel ?? settings.lowStockThreshold,
              'الصلاحية': product.expiryDate || '',
              'نوع التنبيه': [
                product.quantity <= 0 ? 'نفد المخزون' : product.quantity <= (product.minStockLevel ?? settings.lowStockThreshold) ? 'مخزون منخفض' : '',
                product.expiryDate && product.expiryDate < today ? 'منتهي الصلاحية' : '',
                product.expiryDate && expiringProducts.includes(product) ? 'ينتهي خلال 30 يوماً' : '',
              ].filter(Boolean).join('، '),
              'قيمة المخزون': product.quantity * product.purchasePrice,
            })),
          },
          {
            name: 'حركة المخزون',
            title: 'سجل الوارد إلى المخزون',
            rows: toRows<IncomingStockLog>(stockLogs, log => ({
              'التاريخ': dateLabel(log.dateTime),
              'الصنف': log.productName,
              'الباركود': log.barcode,
              'المورد': log.supplierName,
              'الكمية المضافة': log.quantityAdded,
              'الرصيد السابق': log.previousQuantity,
              'الرصيد الجديد': log.newQuantity,
              'سعر الشراء': log.purchasePrice,
            })),
          },
          {
            name: 'تشغيلات الأصناف',
            title: 'تفاصيل التشغيلات والصلاحية',
            rows: products.flatMap(product => (product.batches || []).map((batch: ProductBatch) => ({
              'الصنف': product.name,
              'رقم التشغيلة': batch.batchNumber,
              'مرجع المورد': batch.supplierBatchRef || '',
              'تاريخ التصنيع': batch.mfgDate || '',
              'تاريخ الصلاحية': batch.expiryDate,
              'الكمية': batch.quantity,
              'سعر الشراء': batch.purchasePrice,
              'سعر البيع': batch.sellingPrice ?? product.sellingPrice,
            }))),
          },
          {
            name: 'متغيرات الأصناف',
            title: 'تفاصيل متغيرات الأصناف',
            rows: products.flatMap(product => (product.variants || []).map((variant: ProductVariant) => ({
              'الصنف': product.name,
              'المتغير': variant.name,
              'الباركود': variant.barcode,
              'الكمية': variant.quantity,
              'سعر الشراء': variant.purchasePrice,
              'سعر البيع': variant.sellingPrice,
            }))),
          },
          {
            name: 'تاريخ الأسعار',
            title: 'تاريخ تغيّر الأسعار',
            rows: toRows<PriceHistoryRecord>(priceHistory, record => ({
              'التاريخ': dateLabel(record.dateChanged),
              'الصنف': record.productName,
              'سعر الشراء السابق': record.oldPurchasePrice,
              'سعر الشراء الجديد': record.newPurchasePrice,
              'سعر البيع السابق': record.oldSellingPrice,
              'سعر البيع الجديد': record.newSellingPrice,
              'عدّل بواسطة': record.changedBy,
            })),
          },
        ],
      },
      {
        id: 'categories',
        title: 'تصنيفات المنتجات',
        description: 'ملخص التصنيفات وعدد المنتجات المرتبطة بكل تصنيف.',
        icon: Tags,
        summaries: [
          { label: 'التصنيفات', value: categories.length.toLocaleString('ar-EG') },
          { label: 'الأصناف المصنفة', value: products.filter(product => product.category).length.toLocaleString('ar-EG') },
        ],
        tables: [
          {
            name: 'التصنيفات',
            title: 'دليل تصنيفات المنتجات',
            rows: toRows<CategoryNode>(categories, category => ({
              'التصنيف': category.name,
              'التصنيف الرئيسي': categories.find(parent => parent.id === category.parentId)?.name || '',
              'عدد الأصناف': products.filter(product => product.parentCategoryId === category.id || product.category === category.name).length,
              'الوصف': category.description || '',
            })),
          },
        ],
      },
      {
        id: 'customers',
        title: 'العملاء والأرصدة',
        description: 'ملف العملاء، المشتريات، الولاء، الأرصدة وحركة حساب العميل.',
        icon: Users,
        summaries: [
          { label: 'عدد العملاء', value: customers.length.toLocaleString('ar-EG') },
          { label: 'إجمالي مستحقات العملاء', value: cash(sum(customers.map(customer => customer.outstandingDues)), currency) },
          { label: 'إجمالي نقاط الولاء', value: sum(customers.map(customer => customer.loyaltyPoints)).toLocaleString('ar-EG') },
          { label: 'حركات الحساب', value: customerLedger.length.toLocaleString('ar-EG') },
        ],
        tables: [
          {
            name: 'العملاء',
            title: 'دليل العملاء والأرصدة الحالية',
            rows: toRows<Customer>(customers, customer => ({
              'العميل': customer.name,
              'الهاتف': customer.phone,
              'البريد': customer.email || '',
              'العنوان': customer.address || '',
              'الفئة': customer.tag,
              'إجمالي المشتريات': customer.totalSpent,
              'المستحقات': customer.outstandingDues,
              'رصيد المتجر': customer.storeCredit,
              'نقاط الولاء': customer.loyaltyPoints,
              'حد الائتمان': customer.creditLimit ?? '',
              'تاريخ الإضافة': customer.createdAt,
              'ملاحظات': customer.notes || '',
            })),
          },
          {
            name: 'حسابات العملاء',
            title: 'حركة حسابات العملاء',
            rows: toRows<CustomerLedgerEntry>(customerLedger, entry => ({
              'التاريخ': dateLabel(entry.date),
              'العميل': customers.find(customer => customer.id === entry.customerId)?.name || entry.customerId,
              'نوع الحركة': ledgerTypeLabels[entry.type],
              'رقم المرجع': entry.referenceNo,
              'مدين': entry.debit,
              'دائن': entry.credit,
              'الرصيد بعد الحركة': entry.balance,
              'طريقة الدفع': entry.paymentMode ? paymentLabels[entry.paymentMode] || entry.paymentMode : '',
              'ملاحظات': entry.notes || '',
            })),
          },
        ],
      },
      {
        id: 'returns',
        title: 'المرتجعات والاستردادات',
        description: 'الفواتير المرتجعة، أسباب الإرجاع والأصناف والكميات المستردة.',
        icon: RotateCcw,
        summaries: [
          { label: 'عدد عمليات الإرجاع', value: periodReturns.length.toLocaleString('ar-EG') },
          { label: 'إجمالي المبالغ المستردة', value: cash(totalRefunds, currency) },
          { label: 'الوحدات المرتجعة', value: sum(periodReturns.flatMap(entry => entry.items.map(item => item.qty))).toLocaleString('ar-EG') },
        ],
        tables: [
          {
            name: 'المرتجعات',
            title: 'سجل المرتجعات',
            rows: toRows<SaleReturn>(periodReturns, entry => ({
              'التاريخ': dateLabel(entry.date),
              'رقم المرتجع': entry.returnInvoiceNumber,
              'الفاتورة الأصلية': entry.originalInvoiceNumber,
              'العميل': entry.customerName,
              'عدد الأصناف': entry.items.length,
              'الكمية': sum(entry.items.map(item => item.qty)),
              'المبلغ المسترد': entry.refundAmount,
              'السبب': entry.reason,
            })),
          },
          {
            name: 'أصناف المرتجعات',
            title: 'تفاصيل أصناف المرتجعات',
            rows: periodReturns.flatMap(entry => entry.items.map(item => ({
              'رقم المرتجع': entry.returnInvoiceNumber,
              'الفاتورة الأصلية': entry.originalInvoiceNumber,
              'التاريخ': dateLabel(entry.date),
              'العميل': entry.customerName,
              'الصنف': item.productName,
              'الكمية': item.qty,
              'سعر الوحدة': item.unitPrice,
              'الإجمالي': item.qty * item.unitPrice,
              'السبب': entry.reason,
            }))),
          },
        ],
      },
      {
        id: 'team',
        title: 'الموظفون والحضور',
        description: 'بيانات الموظفين والرواتب والحضور والانصراف.',
        icon: BriefcaseBusiness,
        summaries: [
          { label: 'عدد الموظفين', value: employees.length.toLocaleString('ar-EG') },
          { label: 'الموظفون النشطون', value: employees.filter(employee => employee.status === 'Active').length.toLocaleString('ar-EG') },
          { label: 'إجمالي الرواتب الشهرية', value: cash(sum(employees.map(employee => employee.salary)), currency) },
          { label: 'سجلات الحضور', value: attendance.length.toLocaleString('ar-EG') },
        ],
        tables: [
          {
            name: 'الموظفون',
            title: 'دليل الموظفين',
            rows: toRows<Employee>(employees, employee => ({
              'الموظف': employee.name,
              'الهاتف': employee.phone,
              'الدور': employee.role,
              'الحالة': employee.status === 'Active' ? 'نشط' : 'غير نشط',
              'الراتب': employee.salary,
              'تاريخ التعيين': employee.joiningDate,
              'العنوان': employee.address,
            })),
          },
          {
            name: 'الحضور والانصراف',
            title: 'سجل الحضور والانصراف',
            rows: toRows<AttendanceRecord>(attendance, record => ({
              'التاريخ': record.date,
              'الموظف': record.employeeName,
              'الحضور': record.checkInTime,
              'الانصراف': record.checkOutTime || '',
              'ساعات العمل': record.workingHours ?? '',
              'الحالة': attendanceStatusLabels[record.status],
            })),
          },
        ],
      },
      {
        id: 'cash',
        title: 'الخزينة والورديات',
        description: 'إغلاق الورديات، العهدة، الفروقات وحركات درج النقدية.',
        icon: Banknote,
        summaries: [
          { label: 'عدد الورديات', value: cashShifts.length.toLocaleString('ar-EG') },
          { label: 'ورديات مفتوحة', value: cashShifts.filter(shift => shift.status === 'Open').length.toLocaleString('ar-EG') },
          { label: 'حركات الدرج', value: cashTransactions.length.toLocaleString('ar-EG') },
          { label: 'إجمالي الحركات', value: cash(sum(cashTransactions.map(transaction => transaction.amount)), currency) },
        ],
        tables: [
          {
            name: 'ورديات الخزينة',
            title: 'سجل الورديات',
            rows: toRows<CashRegisterShift>(cashShifts, shift => ({
              'الكاشير': shift.cashierName,
              'بداية الوردية': dateLabel(shift.startTime),
              'نهاية الوردية': dateLabel(shift.endTime),
              'الحالة': shiftStatusLabels[shift.status],
              'العهدة الافتتاحية': shift.openingCash,
              'المبيعات النقدية المتوقعة': shift.expectedCash ?? '',
              'المبلغ الفعلي عند الإغلاق': shift.closingCash ?? '',
              'الفرق': shift.cashDifference ?? '',
              'إيداع الخزينة': shift.safeDepositTotal,
              'ملاحظات': shift.notes || '',
            })),
          },
          {
            name: 'حركات درج النقدية',
            title: 'حركات درج النقدية',
            rows: toRows<CashTransaction>(cashTransactions, transaction => ({
              'التاريخ': dateLabel(transaction.timestamp),
              'الكاشير': transaction.cashierName,
              'نوع الحركة': transaction.type === 'CashIn' ? 'إيداع نقدي' : transaction.type === 'CashOut' ? 'مصروف نقدي' : 'إيداع بالخزينة',
              'المبلغ': transaction.amount,
              'السبب': transaction.reason,
              'رقم الوردية': transaction.shiftId,
            })),
          },
        ],
      },
      {
        id: 'activity',
        title: 'النشاط والمسودات',
        description: 'سجل تدقيق التغييرات والفواتير المعلقة.',
        icon: Activity,
        summaries: [
          { label: 'سجلات النشاط', value: auditLogs.length.toLocaleString('ar-EG') },
          { label: 'فواتير معلقة', value: heldBills.length.toLocaleString('ar-EG') },
          { label: 'أصناف في الفواتير المعلقة', value: sum(heldBills.flatMap(bill => bill.cartItems.map(item => item.quantity))).toLocaleString('ar-EG') },
        ],
        tables: [
          {
            name: 'سجل النشاط',
            title: 'سجل التدقيق والنشاط',
            rows: auditLogs.map(log => ({
              'التاريخ': dateLabel(log.timestamp),
              'المستخدم': log.user,
              'الإجراء': log.action,
              'التفاصيل': log.details,
            })),
          },
          {
            name: 'الفواتير المعلقة',
            title: 'الفواتير المعلقة',
            rows: toRows<HeldBill>(heldBills, bill => ({
              'وقت التعليق': dateLabel(bill.timestamp),
              'العميل': bill.customerName,
              'الهاتف': bill.customerPhone,
              'الكاشير': bill.cashierName || '',
              'عدد الأصناف': bill.cartItems.length,
              'الكمية': sum(bill.cartItems.map(item => item.quantity)),
              'الإجمالي التقديري': sum(bill.cartItems.map(item => item.totalPrice)),
              'ملاحظات': bill.note || '',
            })),
          },
          {
            name: 'سلة المحذوفات',
            title: 'العناصر المحذوفة القابلة للاستعادة',
            rows: recycledItems.map(item => ({
              'تاريخ الحذف': dateLabel(item.deletedAt),
              'نوع السجل': item.type,
              'العنوان': item.title,
              'حذف بواسطة': item.deletedBy,
              'المعرف الأصلي': item.originalId,
            })),
          },
        ],
      },
    ];

    return sectionsData;
  }, [sales, products, settings.lowStockThreshold, periodBounds, period, fromDate, toDate, today]);

  const active = sections.find(section => section.id === activeSection) || sections[0];
  const allTables = sections.flatMap(section => section.tables.map(table => ({
    ...table,
    sheetName: `${section.title} - ${table.name}`,
  })));

  const applyPeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);
    if (nextPeriod === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (nextPeriod === 'week') {
      const start = new Date(`${today}T00:00:00`);
      start.setDate(start.getDate() - 6);
      setFromDate(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`);
      setToDate(today);
    } else if (nextPeriod === 'month') {
      const start = new Date(`${today}T00:00:00`);
      start.setDate(start.getDate() - 29);
      setFromDate(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`);
      setToDate(today);
    }
  };

  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const summaryRows = sections.flatMap(section => [
        { 'التقرير': section.title, 'المؤشر': '', 'القيمة': '' },
        ...section.summaries.map(summary => ({
          'التقرير': '',
          'المؤشر': summary.label,
          'القيمة': summary.value,
        })),
      ]);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'ملخص التقارير');
      allTables.forEach((table, index) => {
        const worksheet = XLSX.utils.json_to_sheet(table.rows.length ? table.rows : [{ 'لا توجد بيانات': '' }]);
        const sheetName = `${index + 1}-${table.sheetName}`.slice(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });
      XLSX.writeFile(workbook, `تقارير_المحل_${today}.xlsx`);
    } catch (error) {
      console.error('Excel report export failed:', error);
      alert('تعذر تصدير ملف Excel. حاول مرة أخرى.');
    }
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('تعذر فتح نافذة التقرير للطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
      return;
    }

    const printTables = allTables.map(table => {
      const columns = Object.keys(table.rows[0] || {});
      const rows = table.rows.map(row => `<tr>${columns.map(column => `<td>${escapeHtml(row[column])}</td>`).join('')}</tr>`).join('');
      return `
        <section>
          <h2>${escapeHtml(table.sheetName)}</h2>
          ${columns.length
            ? `<table dir="rtl"><thead><tr>${columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${rows || `<tr><td colspan="${columns.length}">لا توجد بيانات</td></tr>`}</tbody></table>`
            : '<p>لا توجد بيانات في الفترة المحددة.</p>'}
        </section>`;
    }).join('');
    const summary = sections.map(section => `
      <section>
        <h2>${escapeHtml(section.title)} — الملخص</h2>
        <table dir="rtl"><thead><tr><th>المؤشر</th><th>القيمة</th></tr></thead><tbody>
          ${section.summaries.map(item => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.value)}</td></tr>`).join('')}
        </tbody></table>
      </section>`).join('');

    printWindow.document.write(`<!doctype html>
      <html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقارير المحل</title>
      <style>
        body{font-family:Arial,sans-serif;color:#172033;margin:24px;font-size:11px}
        h1{font-size:22px;margin:0 0 6px}h2{font-size:15px;margin:0 0 10px}
        p{color:#64748b}section{margin:22px 0;page-break-inside:avoid}
        table{width:100%;border-collapse:collapse;table-layout:auto}
        th,td{border:1px solid #cbd5e1;padding:5px;text-align:right;vertical-align:top;overflow-wrap:anywhere}
        th{background:#e2e8f0}thead{display:table-header-group}
        @media print{body{margin:10mm}section{page-break-inside:auto}tr{page-break-inside:avoid}}
      </style></head><body>
      <h1>${escapeHtml(settings.shopName || 'تقارير المحل')}</h1>
      <p>تقارير من ${escapeHtml(period === 'all' ? 'كل الفترات' : fromDate)} إلى ${escapeHtml(period === 'all' ? 'كل الفترات' : toDate)} — تم الإنشاء ${escapeHtml(new Date().toLocaleString('ar-EG'))}</p>
      ${summary}${printTables}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    printWindow.print();
  };

  const handlePrintCurrent = () => window.print();

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto" dir="rtl">
      <header className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ChartNoAxesCombined className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            مركز التقارير والتحليلات
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تقارير تفصيلية للمبيعات والمخزون والموردين والعملاء والمصروفات والموظفين والخزينة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button onClick={handleExportExcel} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4" /> تصدير كل التقارير Excel
          </button>
          <button onClick={handleExportPdf} className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
            <FileText className="w-4 h-4" /> تصدير كل التقارير PDF
          </button>
          <button onClick={handlePrintCurrent} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> طباعة القسم
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <CalendarDays className="w-4 h-4 text-emerald-600" /> الفترة الزمنية
          <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            {([
              ['today', 'اليوم'],
              ['week', 'آخر 7 أيام'],
              ['month', 'آخر 30 يوماً'],
              ['all', 'كل الفترات'],
              ['custom', 'مخصص'],
            ] as [Period, string][]).map(([key, label]) => (
              <button key={key} onClick={() => applyPeriod(key)} className={`px-2.5 py-1.5 rounded-md text-[11px] ${period === key ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {period !== 'all' && (
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5">من
              <input type="date" value={fromDate} max={toDate || undefined} onChange={event => { setFromDate(event.target.value); setPeriod('custom'); }} className="p-2 rounded-lg border bg-white dark:bg-slate-900" />
            </label>
            <label className="flex items-center gap-1.5">إلى
              <input type="date" value={toDate} min={fromDate || undefined} onChange={event => { setToDate(event.target.value); setPeriod('custom'); }} className="p-2 rounded-lg border bg-white dark:bg-slate-900" />
            </label>
          </div>
        )}
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-1 no-print" aria-label="أقسام التقارير">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <button key={section.id} onClick={() => setActiveSection(section.id)} className={`shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition ${activeSection === section.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <Icon className="w-4 h-4" />{section.title}
            </button>
          );
        })}
      </nav>

      {active && (
        <main className="space-y-5 print-report printable-area">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{active.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{active.description}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {active.summaries.map(summary => (
              <div key={summary.label} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-[11px] font-semibold text-slate-500">{summary.label}</p>
                <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1 break-words">{summary.value}</p>
              </div>
            ))}
          </div>
          {active.tables.map(table => {
            const columns = Object.keys(table.rows[0] || {});
            return (
              <section key={table.name} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{table.title}</h4>
                  <span className="text-[10px] text-slate-400">({table.rows.length.toLocaleString('ar-EG')})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    {columns.length > 0 && (
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500">
                          {columns.map(column => <th key={column} className="p-3 whitespace-nowrap font-bold">{column}</th>)}
                        </tr>
                      </thead>
                    )}
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {table.rows.length ? table.rows.map((row, index) => (
                        <tr key={index} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                          {columns.map(column => <td key={column} className="p-3 min-w-24 max-w-80">{row[column] === null || row[column] === '' ? '—' : typeof row[column] === 'number' ? row[column].toLocaleString('ar-EG', { maximumFractionDigits: 2 }) : String(row[column])}</td>)}
                        </tr>
                      )) : (
                        <tr><td colSpan={Math.max(columns.length, 1)} className="p-8 text-center text-slate-400">لا توجد بيانات في الفترة المحددة.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </main>
      )}

    </div>
  );
};
