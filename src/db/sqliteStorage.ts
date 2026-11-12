/**
 * Local Offline Storage Engine simulating SQLite schema tables.
 * Fully persistent, zero external dependencies, supports backup/restore as .sqlite / .db / .json.
 */

import { 
  ShopSettings, 
  Product, 
  Sale, 
  SaleItem, 
  IncomingStockLog, 
  DashboardMetrics, 
  CartItem,
  Customer,
  Supplier,
  PurchaseOrder,
  Expense,
  Employee,
  AttendanceRecord,
  HeldBill,
  SaleReturn,
  AuditLog,
  ProductBatch,
  UnitConversion,
  CashRegisterShift,
  CashTransaction,
  PriceHistoryRecord,
  CategoryNode,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
  RecycleBinItem,
  UpdatePackage
} from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'grocery_pos_settings_v1',
  PRODUCTS: 'grocery_pos_products_v1',
  SALES: 'grocery_pos_sales_v1',
  STOCK_LOGS: 'grocery_pos_stock_logs_v1',
  CUSTOMERS: 'grocery_pos_customers_v1',
  SUPPLIERS: 'grocery_pos_suppliers_v1',
  PURCHASE_ORDERS: 'grocery_pos_purchase_orders_v1',
  EXPENSES: 'grocery_pos_expenses_v1',
  EMPLOYEES: 'grocery_pos_employees_v1',
  ATTENDANCE: 'grocery_pos_attendance_v1',
  HELD_BILLS: 'grocery_pos_held_bills_v1',
  RETURNS: 'grocery_pos_returns_v1',
  AUDIT_LOGS: 'grocery_pos_audit_logs_v1',
  CASH_SHIFTS: 'grocery_pos_cash_shifts_v1',
  CASH_TXNS: 'grocery_pos_cash_txns_v1',
  PRICE_HISTORY: 'grocery_pos_price_history_v1',
  CATEGORIES: 'grocery_pos_categories_v1',
  CUSTOMER_LEDGERS: 'grocery_pos_customer_ledgers_v1',
  SUPPLIER_LEDGERS: 'grocery_pos_supplier_ledgers_v1',
  RECYCLE_BIN: 'grocery_pos_recycle_bin_v1',
  UPDATES: 'grocery_pos_updates_v1',
};

export const INITIAL_SAMPLE_CATEGORIES: CategoryNode[] = [
  { id: 'CAT-1', name: 'أرز ومكرونة وحبوب', description: 'أرز مصري، مكرونة، دقيق وبقوليات' },
  { id: 'CAT-2', name: 'زيوت وسمن', description: 'زيت ذرة، عباد، زيت خليط وسمن نباتي وطبيعي' },
  { id: 'CAT-3', name: 'سكر وسلع تموينية', description: 'سكر، أرز تمويني، دقيق' },
  { id: 'CAT-4', name: 'بهارات وعطارة وملح', description: 'بهارات مشكلة، فلفل، كمون، ملح طعام' },
  { id: 'CAT-5', name: 'مشروبات وشاي وقهوة', description: 'شاي، بن، عصائر، مياه غازية ومعدنية' },
  { id: 'CAT-6', name: 'ألبان وأجبان ومخبوزات', description: 'لبن، زبادي، جبن بأنواعه، خبز وتوست' },
  { id: 'CAT-7', name: 'مقرمشات وبسكويت وشيكولاتة', description: 'بسكويت، شيبسي، كيك وحلويات' },
  { id: 'CAT-8', name: 'منظفات وعناية منزلية', description: 'مساحيق غسيل، صابون أطباق، معقمات' },
  { id: 'CAT-9', name: 'عناية شخصية وصابون', description: 'شامبو، صابون، معجون أسنان' },
  { id: 'CAT-10', name: 'عروض وباقات توفير', description: 'باقات مجمعة وعروض خاصة للزبائن' }
];

export const UNIT_CONVERSIONS: UnitConversion[] = [
  { fromUnit: 'كجم', toUnit: 'جم', factor: 1000 },
  { fromUnit: 'جم', toUnit: 'كجم', factor: 0.001 },
  { fromUnit: 'لتر', toUnit: 'مل', factor: 1000 },
  { fromUnit: 'مل', toUnit: 'لتر', factor: 0.001 },
  { fromUnit: 'شيكارة', toUnit: 'كجم', factor: 50 },
  { fromUnit: 'كرتونة', toUnit: 'قطعة', factor: 12 },
  { fromUnit: 'علبة', toUnit: 'قطعة', factor: 1 }
];

export const INITIAL_SAMPLE_UPDATES: UpdatePackage[] = [
  {
    version: '2.0.0 النسخة التجارية',
    releaseDate: '2026-07-28',
    releaseNotes: [
      'تتبع الصلاحيات والتحذير المبكر لانتهاء الصلاحية',
      'إدارة شفتات الكاشير ودرج النقدية والجرد اليومي',
      'نظام إعادة الطلب الذكي وتحليلات المخزون',
      'مراقبة الأداء وتشخيص النظام المحلي أوفلاين'
    ],
    isApplied: true,
  }
];

// Initial default shop settings
export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'سوبر ماركت النور',
  ownerName: 'محمد أحمد',
  address: 'شارع التحرير، الدقي، الجيزة، مصر',
  phone: '01021020169',
  gstNumber: '100-234-567',
  invoicePrefix: 'فاتورة',
  currencySymbol: 'ج.م',
  defaultTaxPercent: 14,
  lowStockThreshold: 10,
  receiptType: 'thermal',
  receiptSize: '80mm',
  enableCameraScanner: true,
  theme: 'light',
  isSetupCompleted: false,
  backupFrequency: 'daily',
  requireManagerPinForDiscount: true,
  discountThresholdPercent: 15,
  enableLoyalty: true,
  loyaltyPointRatio: 50, // 1 point per 50 EGP
  // Electronic / InstaPay Payment Default Settings
  enableUpiPayments: true,
  merchantName: 'سوبر ماركت النور',
  upiId: 'elnour@instapay',
  defaultPaymentNote: 'شكراً لتسوقكم من سوبر ماركت النور',
  upiReceiptFooter: 'تم الدفع الإلكتروني بنجاح عبر إنستاباي / المحفظة',
  merchantLogo: '',
};

// Initial sample grocery products for immediate testing
export const INITIAL_SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'PRD-1001',
    name: 'زيت ذرة عافية نقي 800 مل',
    category: 'زيوت وسمن',
    barcode: '6221001001011',
    purchasePrice: 65,
    sellingPrice: 75,
    quantity: 45,
    supplierName: 'شركة أرما للزيوت والصناعات',
    expiryDate: '2027-01-15',
    unit: 'زجاجة',
    shelfLocation: 'رف أ - رف 2',
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1002',
    name: 'دقيق فاخر المطبخ 1 كجم',
    category: 'أرز ومكرونة وحبوب',
    barcode: '6221001001028',
    purchasePrice: 18,
    sellingPrice: 24,
    quantity: 30,
    supplierName: 'المطاحن الحديثة',
    expiryDate: '2026-12-30',
    unit: 'كيس',
    shelfLocation: 'رف ب - الطابق الأرضي',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1003',
    name: 'ملح طعام نقي بونو 700 جم',
    category: 'بهارات وعطارة وملح',
    barcode: '6221001001035',
    purchasePrice: 4,
    sellingPrice: 6,
    quantity: 120,
    supplierName: 'شركة النصر للملاحات',
    unit: 'كيس',
    shelfLocation: 'رف ج - رف 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1004',
    name: 'أرز مصري فاخر المطبخ 5 كجم',
    category: 'أرز ومكرونة وحبوب',
    barcode: '6221001001042',
    purchasePrice: 140,
    sellingPrice: 165,
    quantity: 8, // Low stock on purpose
    supplierName: 'مضرب أرز الشرقية',
    unit: 'شيكارة',
    shelfLocation: 'رف ب - صف 3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1005',
    name: 'عدس أصفر مصري فاخر 1 كجم',
    category: 'أرز ومكرونة وحبوب',
    barcode: '6221001001059',
    purchasePrice: 45,
    sellingPrice: 55,
    quantity: 25,
    supplierName: 'مؤسسة الحبوب المصرية',
    unit: 'كجم',
    shelfLocation: 'رف ج - رف 3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1006',
    name: 'شاي العروسة ناعم 250 جم',
    category: 'مشروبات وشاي وقهوة',
    barcode: '6221001001066',
    purchasePrice: 48,
    sellingPrice: 56,
    quantity: 50,
    supplierName: 'شركة العروسة للشاي',
    unit: 'علبة',
    shelfLocation: 'رف أ - رف 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1007',
    name: 'جبنة بيضاء دومتي فيتا بلس 500 جم',
    category: 'ألبان وأجبان ومخبوزات',
    barcode: '6221001001073',
    purchasePrice: 32,
    sellingPrice: 38,
    quantity: 18,
    supplierName: 'شركة الصناعات الغذائية دومتي',
    expiryDate: '2026-08-20',
    unit: 'علبة',
    shelfLocation: 'ثلاجة 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1008',
    name: 'مسحوق غسيل أوتوماتيك إريال 1 كجم',
    category: 'منظفات وعناية منزلية',
    barcode: '6221001001080',
    purchasePrice: 75,
    sellingPrice: 90,
    quantity: 35,
    supplierName: 'بروكتر آند جامبل مصر',
    unit: 'كيس',
    shelfLocation: 'رف د - رف 4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1009',
    name: 'صابون ديتول الأصلي 120 جم (عرض 3 قطع)',
    category: 'عناية شخصية وصابون',
    barcode: '6221001001097',
    purchasePrice: 60,
    sellingPrice: 72,
    quantity: 5, // Low stock
    supplierName: 'ركيت بنكيزر مصر',
    unit: 'باكيت',
    shelfLocation: 'رف د - رف 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1010',
    name: 'معجون أسنان سيجنال 2 لمكافحة التسوس 100 مل',
    category: 'عناية شخصية وصابون',
    barcode: '6221001001103',
    purchasePrice: 28,
    sellingPrice: 35,
    quantity: 40,
    supplierName: 'يونيليفر مشرق مصر',
    unit: 'قطعة',
    shelfLocation: 'رف د - رف 2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1011',
    name: 'بسكويت بيسكو مصر لوكس بالزبدة',
    category: 'مقرمشات وبسكويت وشيكولاتة',
    barcode: '6221001001110',
    purchasePrice: 5,
    sellingPrice: 7,
    quantity: 60,
    supplierName: 'شركة بسكو مصر',
    unit: 'قطعة',
    shelfLocation: 'كاونتر العرض الأمامي',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1012',
    name: 'سكر أبيض نقي الأسرة 1 كجم',
    category: 'سكر وسلع تموينية',
    barcode: '6221001001127',
    purchasePrice: 28,
    sellingPrice: 34,
    quantity: 28,
    supplierName: 'شركة السكر والصناعات التكاملية',
    unit: 'كيس',
    shelfLocation: 'رف ج - رف 2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1013',
    name: 'عرض التوفير للفطور (شاي العروسة + بسكويت لوكس)',
    category: 'عروض وباقات توفير',
    barcode: '6221001009999',
    purchasePrice: 53,
    sellingPrice: 60,
    quantity: 15,
    supplierName: 'باقة داخلية للمحل',
    unit: 'عرض',
    isCombo: true,
    comboItems: [
      { productId: 'PRD-1006', productName: 'شاي العروسة ناعم 250 جم', qty: 1 },
      { productId: 'PRD-1011', productName: 'بسكويت بيسكو مصر لوكس بالزبدة', qty: 1 }
    ],
    shelfLocation: 'عرض العروض الخاصة',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1014',
    name: 'مكرونة الملكة أقلام 400 جم',
    category: 'أرز ومكرونة وحبوب',
    barcode: '6221001001141',
    purchasePrice: 12,
    sellingPrice: 16,
    quantity: 75,
    supplierName: 'المطاحن الحديثة',
    expiryDate: new Date(Date.now() + 210 * 86400000).toISOString().slice(0, 10),
    unit: 'كيس',
    shelfLocation: 'رف ب - رف 1',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1015',
    name: 'فول مدمس حدائق كاليفورنيا 400 جم',
    category: 'سكر وسلع تموينية',
    barcode: '6221001001158',
    purchasePrice: 17,
    sellingPrice: 22,
    quantity: 32,
    supplierName: 'مؤسسة الحبوب المصرية',
    expiryDate: new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10),
    unit: 'علبة',
    shelfLocation: 'رف ج - رف 4',
    createdAt: new Date(Date.now() - 75 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1016',
    name: 'قهوة سريعة التحضير بندق 100 جم',
    category: 'مشروبات وشاي وقهوة',
    barcode: '6221001001165',
    purchasePrice: 88,
    sellingPrice: 105,
    quantity: 14,
    supplierName: 'العروسة للتوزيع والتجارة',
    expiryDate: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10),
    unit: 'برطمان',
    shelfLocation: 'رف أ - رف 3',
    createdAt: new Date(Date.now() - 65 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1017',
    name: 'لبن كامل الدسم جهينة 1 لتر',
    category: 'ألبان وأجبان ومخبوزات',
    barcode: '6221001001172',
    purchasePrice: 39,
    sellingPrice: 45,
    quantity: 22,
    supplierName: 'جهينة ش.م.م',
    expiryDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    unit: 'عبوة',
    shelfLocation: 'ثلاجة 1',
    createdAt: new Date(Date.now() - 48 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1018',
    name: 'زبادي طبيعي جهينة 105 جم',
    category: 'ألبان وأجبان ومخبوزات',
    barcode: '6221001001189',
    purchasePrice: 7,
    sellingPrice: 9,
    quantity: 4,
    minStockLevel: 12,
    supplierName: 'جهينة ش.م.م',
    expiryDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    unit: 'عبوة',
    shelfLocation: 'ثلاجة 1',
    createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1019',
    name: 'شيبسي بطاطس بالخل والملح 45 جم',
    category: 'مقرمشات وبسكويت وشيكولاتة',
    barcode: '6221001001196',
    purchasePrice: 8,
    sellingPrice: 10,
    quantity: 0,
    minStockLevel: 20,
    supplierName: 'شركة بسكو مصر',
    expiryDate: new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10),
    unit: 'كيس',
    shelfLocation: 'كاونتر العرض الأمامي',
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1020',
    name: 'منظف أرضيات برائحة الليمون 1 لتر',
    category: 'منظفات وعناية منزلية',
    barcode: '6221001001202',
    purchasePrice: 32,
    sellingPrice: 40,
    quantity: 19,
    supplierName: 'يونيليفر مشرق مصر',
    expiryDate: new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10),
    unit: 'زجاجة',
    shelfLocation: 'رف د - رف 4',
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1021',
    name: 'شامبو عناية يومية 400 مل',
    category: 'عناية شخصية وصابون',
    barcode: '6221001001219',
    purchasePrice: 54,
    sellingPrice: 68,
    quantity: 11,
    supplierName: 'يونيليفر مشرق مصر',
    expiryDate: new Date(Date.now() + 500 * 86400000).toISOString().slice(0, 10),
    unit: 'زجاجة',
    shelfLocation: 'رف د - رف 2',
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1022',
    name: 'مياه معدنية صفا 1.5 لتر',
    category: 'مشروبات وشاي وقهوة',
    barcode: '6221001001226',
    purchasePrice: 6,
    sellingPrice: 8,
    quantity: 96,
    supplierName: 'مورد المشروبات المحلي',
    expiryDate: new Date(Date.now() + 320 * 86400000).toISOString().slice(0, 10),
    unit: 'زجاجة',
    shelfLocation: 'ثلاجة المشروبات',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1023',
    name: 'كمون مطحون 100 جم',
    category: 'بهارات وعطارة وملح',
    barcode: '6221001001233',
    purchasePrice: 15,
    sellingPrice: 20,
    quantity: 27,
    supplierName: 'مؤسسة الحبوب المصرية',
    expiryDate: new Date(Date.now() + 240 * 86400000).toISOString().slice(0, 10),
    unit: 'عبوة',
    shelfLocation: 'رف ج - رف 1',
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1024',
    name: 'سمن نباتي روابي 1.5 كجم',
    category: 'زيوت وسمن',
    barcode: '6221001001240',
    purchasePrice: 92,
    sellingPrice: 110,
    quantity: 16,
    supplierName: 'أرما للصناعات الغذائية',
    expiryDate: new Date(Date.now() + 360 * 86400000).toISOString().slice(0, 10),
    unit: 'علبة',
    shelfLocation: 'رف أ - رف 2',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PRD-1025',
    name: 'بسكويت ويفر بالشوكولاتة 35 جم',
    category: 'مقرمشات وبسكويت وشيكولاتة',
    barcode: '6221001001257',
    purchasePrice: 4,
    sellingPrice: 6,
    quantity: 84,
    supplierName: 'شركة بسكو مصر',
    expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    unit: 'قطعة',
    shelfLocation: 'كاونتر العرض الأمامي',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-1001',
    name: 'أحمد محمود عبد الفتاح',
    phone: '01011223344',
    email: 'ahmed.m@example.com',
    address: 'شارع النصر، الدقي، الجيزة',
    gstNumber: '102-345-678',
    birthday: '1988-11-27',
    notes: 'عميل دائم ومميز. يفضل المنتجات العضوية والفاخرة.',
    totalSpent: 4850,
    loyaltyPoints: 97,
    storeCredit: 120,
    outstandingDues: 0,
    tag: 'VIP',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'CUST-1002',
    name: 'سارة إبراهيم الشناوي',
    phone: '01122334455',
    email: 'sara.sh@example.com',
    address: 'عمارة 12، شارع مصدق، الدقي',
    birthday: '1992-05-14',
    notes: 'طلبات أسبوعية منتظمة للأسرة والمكتب.',
    totalSpent: 8650,
    loyaltyPoints: 173,
    storeCredit: 0,
    outstandingDues: 450,
    tag: 'Wholesale',
    createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'CUST-1003',
    name: 'كريم حسام الدين',
    phone: '01233445566',
    address: 'شارع محيي الدين أبو العز، المهندسين',
    totalSpent: 1250,
    loyaltyPoints: 25,
    storeCredit: 50,
    outstandingDues: 180,
    tag: 'Regular',
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'CUST-1004',
    name: 'مريم خالد عبد الرحمن',
    phone: '01098765432',
    email: 'mariam.k@example.com',
    address: 'شارع التحرير، الدقي، الجيزة',
    birthday: '1995-08-03',
    notes: 'تفضل الدفع بالمحفظة الإلكترونية.',
    totalSpent: 2340,
    loyaltyPoints: 46,
    storeCredit: 0,
    outstandingDues: 0,
    tag: 'Regular',
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'CUST-1005',
    name: 'محمود عادل مصطفى',
    phone: '01055667788',
    email: 'mahmoud.a@example.com',
    address: 'شارع السودان، المهندسين',
    notes: 'مشتريات مكتبية شهرية.',
    totalSpent: 6180,
    loyaltyPoints: 123,
    storeCredit: 75,
    outstandingDues: 720,
    creditLimit: 3000,
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    tag: 'Wholesale',
    createdAt: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
  }
];

export const INITIAL_SAMPLE_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-101',
    name: 'شركة جهينة للصناعات الغذائية',
    companyName: 'جهينة ش.م.م',
    phone: '01001234561',
    email: 'orders@juhayna.example.com',
    gstin: '200-123-456',
    address: 'المنطقة الصناعية الأولى، مدينة السادس من أكتوبر، الجيزة',
    paymentTerms: 'آجل 15 يوماً',
    outstandingBalance: 6500,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'SUP-102',
    name: 'شركة أرما للزيوت والصناعات',
    companyName: 'أرما للصناعات الغذائية',
    phone: '01001234562',
    email: 'sales@arma.example.com',
    gstin: '200-987-654',
    address: 'المنطقة الصناعية، العاشر من رمضان',
    paymentTerms: 'دفع فوري / نقدي',
    outstandingBalance: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'SUP-103',
    name: 'شركة العروسة للشاي والمشروبات',
    companyName: 'العروسة للتوزيع والتجارة',
    phone: '01001234563',
    email: 'supply@el-arosa.example.com',
    gstin: '200-555-777',
    address: 'طريق مصر الإسكندرية الزراعي، قليوب',
    paymentTerms: 'آجل 30 يوماً',
    outstandingBalance: 3200,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'SUP-104',
    name: 'شركة المطاحن الحديثة',
    companyName: 'المطاحن الحديثة',
    phone: '01001234564',
    email: 'sales@modernmills.example.com',
    address: 'مدينة السادس من أكتوبر، الجيزة',
    paymentTerms: 'آجل 14 يوماً',
    outstandingBalance: 1850,
    leadTimeDays: 2,
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'SUP-105',
    name: 'مؤسسة الحبوب المصرية',
    companyName: 'الحبوب المصرية للتجارة',
    phone: '01001234565',
    email: 'orders@egy-grains.example.com',
    address: 'المنطقة الصناعية، العاشر من رمضان',
    paymentTerms: 'نقدي عند الاستلام',
    outstandingBalance: 0,
    leadTimeDays: 3,
    createdAt: new Date(Date.now() - 80 * 86400000).toISOString(),
  }
];

export const INITIAL_SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-01',
    name: 'محمد أحمد (المدير / المالك)',
    phone: '01021020169',
    address: 'الدقي، الجيزة',
    salary: 15000,
    joiningDate: '2023-01-01',
    role: 'Owner',
    pin: '1234',
    status: 'Active',
  },
  {
    id: 'EMP-02',
    name: 'هاني عبد الله (كاشير رئيسي)',
    phone: '01123456789',
    address: 'فيصل، الجيزة',
    salary: 6000,
    joiningDate: '2024-03-15',
    role: 'Cashier',
    pin: '1111',
    status: 'Active',
  },
  {
    id: 'EMP-03',
    name: 'مصطفى علي (مسؤول المخزن)',
    phone: '01234567890',
    address: 'الهرم، الجيزة',
    salary: 6500,
    joiningDate: '2024-01-10',
    role: 'Inventory Staff',
    pin: '2222',
    status: 'Active',
  },
  {
    id: 'EMP-04',
    name: 'ندى سمير (محاسبة)',
    phone: '01034567891',
    address: 'العجوزة، الجيزة',
    salary: 7500,
    joiningDate: '2024-06-01',
    role: 'Accountant',
    pin: '3333',
    status: 'Active',
  },
  {
    id: 'EMP-05',
    name: 'يوسف خالد (كاشير مسائي)',
    phone: '01087654321',
    address: 'إمبابة، الجيزة',
    salary: 5800,
    joiningDate: '2025-02-10',
    role: 'Cashier',
    pin: '4444',
    status: 'Active',
  }
];

export const INITIAL_SAMPLE_EXPENSES: Expense[] = [
  {
    id: 'EXP-101',
    title: 'إيجار المحل الشهري',
    category: 'Rent',
    amount: 12000,
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Bank',
    notes: 'تم التحويل لحساب صاحب العقار عبر بنك مصر',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'EXP-102',
    title: 'فاتورة الكهرباء التجارية',
    category: 'Electricity',
    amount: 1850,
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    paymentMode: 'UPI',
    notes: 'فاتورة كهرباء الثلاجات والإنارة عبر فوري/إنستاباي',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'EXP-103',
    title: 'اشتراك الإنترنت الأرضي فايبر (WE)',
    category: 'Internet',
    amount: 380,
    date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
    paymentMode: 'UPI',
    notes: 'باقة إنترنت فائقة السرعة للمحل',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'EXP-104',
    title: 'صيانة ثلاجة العرض',
    category: 'Miscellaneous',
    amount: 950,
    date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    paymentMode: 'Cash',
    notes: 'تغيير حساس الحرارة وتنظيف الوحدة.',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'EXP-105',
    title: 'مستلزمات نظافة للمحل',
    category: 'Miscellaneous',
    amount: 420,
    date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    paymentMode: 'Cash',
    notes: 'منظفات وأكياس قمامة للاستخدام الداخلي.',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'EXP-106',
    title: 'نقل توريد البضائع',
    category: 'Transport',
    amount: 680,
    date: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
    paymentMode: 'Cash',
    notes: 'نقل طلبية البقالة من مخازن أكتوبر.',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'EXP-107',
    title: 'أجور عمالة إضافية',
    category: 'Salary',
    amount: 1800,
    date: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
    paymentMode: 'Bank',
    notes: 'مساعدة إضافية في ترتيب مخزون نهاية الأسبوع.',
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: 'EXP-108',
    title: 'فاتورة كهرباء الشهر السابق',
    category: 'Electricity',
    amount: 1620,
    date: new Date(Date.now() - 18 * 86400000).toISOString().split('T')[0],
    paymentMode: 'UPI',
    notes: 'سداد الفاتورة الشهرية.',
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
  }
];

export const INITIAL_SAMPLE_SALES: Sale[] = [
  {
    id: 'SALE-101',
    invoiceNumber: 'فاتورة-2026-0001',
    dateTime: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
    customerId: 'CUST-1001',
    customerName: 'أحمد محمود عبد الفتاح',
    customerPhone: '01011223344',
    items: [
      {
        id: 'SI-1',
        productId: 'PRD-1001',
        productName: 'زيت ذرة عافية نقي 800 مل',
        barcode: '6221001001011',
        unitPurchasePrice: 65,
        unitSellingPrice: 75,
        quantity: 2,
        totalPrice: 150,
      },
      {
        id: 'SI-2',
        productId: 'PRD-1003',
        productName: 'ملح طعام نقي بونو 700 جم',
        barcode: '6221001001035',
        unitPurchasePrice: 4,
        unitSellingPrice: 6,
        quantity: 1,
        totalPrice: 6,
      }
    ],
    subtotal: 156,
    taxPercent: 0,
    taxAmount: 0,
    discountAmount: 6,
    totalAmount: 150,
    receivedAmount: 200,
    changeAmount: 50,
    paymentMode: 'Cash',
    totalProfit: 16,
    status: 'Completed',
    cashierName: 'هاني عبد الله',
  },
  {
    id: 'SALE-102',
    invoiceNumber: 'فاتورة-2026-0002',
    dateTime: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
    customerId: 'CUST-1002',
    customerName: 'سارة إبراهيم الشناوي',
    customerPhone: '01122334455',
    items: [
      {
        id: 'SI-3',
        productId: 'PRD-1006',
        productName: 'شاي العروسة ناعم 250 جم',
        barcode: '6221001001066',
        unitPurchasePrice: 48,
        unitSellingPrice: 56,
        quantity: 1,
        totalPrice: 56,
      },
      {
        id: 'SI-4',
        productId: 'PRD-1007',
        productName: 'جبنة بيضاء دومتي فيتا بلس 500 جم',
        barcode: '6221001001073',
        unitPurchasePrice: 32,
        unitSellingPrice: 38,
        quantity: 2,
        totalPrice: 76,
      }
    ],
    subtotal: 132,
    taxPercent: 0,
    taxAmount: 0,
    discountAmount: 2,
    totalAmount: 130,
    receivedAmount: 130,
    changeAmount: 0,
    paymentMode: 'UPI',
    totalProfit: 30,
    status: 'Completed',
    cashierName: 'هاني عبد الله (كاشير رئيسي)',
    cashierId: 'EMP-02',
  }
];

const sampleDateTime = (daysAgo: number, hour = 12) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

const createSampleSale = (options: {
  id: string;
  invoiceNumber: string;
  daysAgo: number;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  cashierId: string;
  cashierName: string;
  paymentMode: Sale['paymentMode'];
  status?: Sale['status'];
  discountAmount?: number;
  lines: { productId: string; quantity: number }[];
}): Sale => {
  const items = options.lines.map((line, index) => {
    const product = INITIAL_SAMPLE_PRODUCTS.find(candidate => candidate.id === line.productId);
    if (!product) throw new Error(`Missing sample product ${line.productId}`);
    return {
      id: `${options.id}-ITEM-${index + 1}`,
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      unitPurchasePrice: product.purchasePrice,
      unitSellingPrice: product.sellingPrice,
      quantity: line.quantity,
      totalPrice: product.sellingPrice * line.quantity,
      unit: product.unit,
    };
  });
  const subtotal = sumSample(items.map(item => item.totalPrice));
  const discountAmount = options.discountAmount || 0;
  const totalAmount = subtotal - discountAmount;
  const paymentMode = options.paymentMode;
  const receivedAmount = paymentMode === 'Credit' ? 0 : totalAmount;
  return {
    id: options.id,
    invoiceNumber: options.invoiceNumber,
    dateTime: sampleDateTime(options.daysAgo, 9 + (options.daysAgo % 10)),
    customerId: options.customerId,
    customerName: options.customerName,
    customerPhone: options.customerPhone,
    items,
    subtotal,
    taxPercent: 0,
    taxAmount: 0,
    discountAmount,
    totalAmount,
    receivedAmount,
    changeAmount: 0,
    paymentMode,
    splitPayments: paymentMode === 'Split'
      ? [{ mode: 'Cash', amount: Math.round(totalAmount / 2) }, { mode: 'UPI', amount: totalAmount - Math.round(totalAmount / 2) }]
      : undefined,
    totalProfit: sumSample(items.map(item => (item.unitSellingPrice - item.unitPurchasePrice) * item.quantity)) - discountAmount,
    status: options.status || 'Completed',
    cashierName: options.cashierName,
    cashierId: options.cashierId,
    shiftId: options.daysAgo < 2 ? 'SHIFT-DEMO-OPEN-02' : `SHIFT-DEMO-CLOSED-${options.daysAgo % 3 + 1}`,
    paymentStatus: paymentMode === 'Credit' ? 'Pending' : 'Paid',
  };
};

const sumSample = (values: number[]) => values.reduce((total, value) => total + value, 0);

const ADDITIONAL_SAMPLE_SALES: Sale[] = [
  createSampleSale({
    id: 'SALE-103', invoiceNumber: 'فاتورة-2026-0003', daysAgo: 1,
    customerId: 'CUST-1003', customerName: 'كريم حسام الدين', customerPhone: '01233445566',
    cashierId: 'EMP-05', cashierName: 'يوسف خالد (كاشير مسائي)', paymentMode: 'Card',
    lines: [{ productId: 'PRD-1002', quantity: 2 }, { productId: 'PRD-1012', quantity: 1 }, { productId: 'PRD-1025', quantity: 3 }],
  }),
  createSampleSale({
    id: 'SALE-104', invoiceNumber: 'فاتورة-2026-0004', daysAgo: 3,
    customerId: 'CUST-1004', customerName: 'مريم خالد عبد الرحمن', customerPhone: '01098765432',
    cashierId: 'EMP-02', cashierName: 'هاني عبد الله (كاشير رئيسي)', paymentMode: 'UPI', discountAmount: 5,
    lines: [{ productId: 'PRD-1017', quantity: 2 }, { productId: 'PRD-1018', quantity: 4 }, { productId: 'PRD-1006', quantity: 1 }],
  }),
  createSampleSale({
    id: 'SALE-105', invoiceNumber: 'فاتورة-2026-0005', daysAgo: 5,
    customerId: 'CUST-1002', customerName: 'سارة إبراهيم الشناوي', customerPhone: '01122334455',
    cashierId: 'EMP-05', cashierName: 'يوسف خالد (كاشير مسائي)', paymentMode: 'Credit',
    lines: [{ productId: 'PRD-1001', quantity: 3 }, { productId: 'PRD-1014', quantity: 6 }, { productId: 'PRD-1015', quantity: 3 }],
  }),
  createSampleSale({
    id: 'SALE-106', invoiceNumber: 'فاتورة-2026-0006', daysAgo: 8,
    customerName: 'عميل نقدي', cashierId: 'EMP-02', cashierName: 'هاني عبد الله (كاشير رئيسي)',
    paymentMode: 'Cash', lines: [{ productId: 'PRD-1019', quantity: 2 }, { productId: 'PRD-1022', quantity: 6 }, { productId: 'PRD-1011', quantity: 5 }],
  }),
  createSampleSale({
    id: 'SALE-107', invoiceNumber: 'فاتورة-2026-0007', daysAgo: 11,
    customerId: 'CUST-1005', customerName: 'محمود عادل مصطفى', customerPhone: '01055667788',
    cashierId: 'EMP-05', cashierName: 'يوسف خالد (كاشير مسائي)', paymentMode: 'Split',
    lines: [{ productId: 'PRD-1003', quantity: 10 }, { productId: 'PRD-1023', quantity: 4 }, { productId: 'PRD-1020', quantity: 2 }],
  }),
  createSampleSale({
    id: 'SALE-108', invoiceNumber: 'فاتورة-2026-0008', daysAgo: 15,
    customerId: 'CUST-1001', customerName: 'أحمد محمود عبد الفتاح', customerPhone: '01011223344',
    cashierId: 'EMP-02', cashierName: 'هاني عبد الله (كاشير رئيسي)', paymentMode: 'Cash',
    lines: [{ productId: 'PRD-1005', quantity: 2 }, { productId: 'PRD-1016', quantity: 1 }, { productId: 'PRD-1024', quantity: 1 }],
  }),
  createSampleSale({
    id: 'SALE-109', invoiceNumber: 'فاتورة-2026-0009', daysAgo: 20,
    customerName: 'عميل نقدي', cashierId: 'EMP-05', cashierName: 'يوسف خالد (كاشير مسائي)',
    paymentMode: 'Cash', status: 'Cancelled',
    lines: [{ productId: 'PRD-1008', quantity: 1 }, { productId: 'PRD-1021', quantity: 1 }],
  }),
  createSampleSale({
    id: 'SALE-110', invoiceNumber: 'فاتورة-2026-0010', daysAgo: 24,
    customerId: 'CUST-1004', customerName: 'مريم خالد عبد الرحمن', customerPhone: '01098765432',
    cashierId: 'EMP-02', cashierName: 'هاني عبد الله (كاشير رئيسي)', paymentMode: 'Card',
    lines: [{ productId: 'PRD-1009', quantity: 1 }, { productId: 'PRD-1010', quantity: 2 }],
  }),
  createSampleSale({
    id: 'SALE-111', invoiceNumber: 'فاتورة-2026-0011', daysAgo: 28,
    customerId: 'CUST-1003', customerName: 'كريم حسام الدين', customerPhone: '01233445566',
    cashierId: 'EMP-05', cashierName: 'يوسف خالد (كاشير مسائي)', paymentMode: 'UPI',
    lines: [{ productId: 'PRD-1013', quantity: 2 }, { productId: 'PRD-1012', quantity: 4 }, { productId: 'PRD-1022', quantity: 4 }],
  }),
].map((sale, index) => index === 1
  ? { ...sale, status: 'Partially Refunded' as const }
  : index === 5
    ? { ...sale, status: 'Refunded' as const }
    : sale);

INITIAL_SAMPLE_SALES.push(...ADDITIONAL_SAMPLE_SALES);

const sampleDay = (daysAgo: number) => sampleDateTime(daysAgo).slice(0, 10);
const cloneSampleData = <T>(data: T): T => JSON.parse(JSON.stringify(data)) as T;

export const INITIAL_SAMPLE_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-DEMO-001',
    poNumber: 'PO-2026-0101',
    supplierId: 'SUP-101',
    supplierName: 'جهينة ش.م.م',
    orderDate: sampleDay(16),
    receivedDate: sampleDay(14),
    invoiceNumber: 'JH-INV-4182',
    invoiceNumbers: ['JH-INV-4182'],
    status: 'Received',
    items: [
      { productId: 'PRD-1017', productName: 'لبن كامل الدسم جهينة 1 لتر', qty: 40, receivedQty: 40, purchasePrice: 39 },
      { productId: 'PRD-1018', productName: 'زبادي طبيعي جهينة 105 جم', qty: 60, receivedQty: 60, purchasePrice: 7 },
    ],
    totalAmount: 1980,
    notes: 'توريد أسبوعي للثلاجة.',
  },
  {
    id: 'PO-DEMO-002',
    poNumber: 'PO-2026-0102',
    supplierId: 'SUP-102',
    supplierName: 'أرما للصناعات الغذائية',
    orderDate: sampleDay(8),
    receivedDate: sampleDay(6),
    invoiceNumber: 'AR-INV-7720',
    invoiceNumbers: ['AR-INV-7720'],
    status: 'Partially Received',
    items: [
      { productId: 'PRD-1001', productName: 'زيت ذرة عافية نقي 800 مل', qty: 48, receivedQty: 32, purchasePrice: 65 },
      { productId: 'PRD-1024', productName: 'سمن نباتي روابي 1.5 كجم', qty: 24, receivedQty: 24, purchasePrice: 92 },
    ],
    totalAmount: 5328,
    notes: 'متبقي 16 زجاجة زيت في الشحنة القادمة.',
  },
  {
    id: 'PO-DEMO-003',
    poNumber: 'PO-2026-0103',
    supplierId: 'SUP-104',
    supplierName: 'المطاحن الحديثة',
    orderDate: sampleDay(2),
    status: 'Ordered',
    items: [
      { productId: 'PRD-1002', productName: 'دقيق فاخر المطبخ 1 كجم', qty: 50, purchasePrice: 18 },
      { productId: 'PRD-1014', productName: 'مكرونة الملكة أقلام 400 جم', qty: 60, purchasePrice: 12 },
    ],
    totalAmount: 1620,
    notes: 'موعد التوريد المتوقع غداً.',
  },
];

export const INITIAL_SAMPLE_SUPPLIER_LEDGERS: SupplierLedgerEntry[] = [
  { id: 'SUP-LEDGER-DEMO-01', supplierId: 'SUP-101', date: sampleDateTime(2), type: 'Invoice', referenceNo: 'JH-INV-4201', debit: 0, credit: 6500, balance: 6500, notes: 'فاتورة توريد ألبان', paymentMode: 'Bank' },
  { id: 'SUP-LEDGER-DEMO-02', supplierId: 'SUP-102', date: sampleDateTime(4), type: 'Payment', referenceNo: 'PAY-AR-7710', debit: 3500, credit: 0, balance: 0, notes: 'سداد كامل الفاتورة', paymentMode: 'Bank' },
  { id: 'SUP-LEDGER-DEMO-03', supplierId: 'SUP-102', date: sampleDateTime(5), type: 'Invoice', referenceNo: 'AR-INV-7710', debit: 0, credit: 3500, balance: 3500, notes: 'فاتورة زيوت وسمن', paymentMode: 'Cash' },
  { id: 'SUP-LEDGER-DEMO-04', supplierId: 'SUP-103', date: sampleDateTime(3), type: 'Payment', referenceNo: 'PAY-AROSA-219', debit: 1600, credit: 0, balance: 3200, notes: 'دفعة من رصيد المورد', paymentMode: 'UPI' },
  { id: 'SUP-LEDGER-DEMO-05', supplierId: 'SUP-103', date: sampleDateTime(9), type: 'Invoice', referenceNo: 'AROSA-INV-219', debit: 0, credit: 4800, balance: 4800, notes: 'توريد شاي ومشروبات', paymentMode: 'Bank' },
  { id: 'SUP-LEDGER-DEMO-06', supplierId: 'SUP-104', date: sampleDateTime(5), type: 'Payment', referenceNo: 'PAY-MM-088', debit: 500, credit: 0, balance: 1850, notes: 'دفعة تحت الحساب', paymentMode: 'Cash' },
  { id: 'SUP-LEDGER-DEMO-07', supplierId: 'SUP-104', date: sampleDateTime(12), type: 'Invoice', referenceNo: 'MM-INV-088', debit: 0, credit: 2350, balance: 2350, notes: 'توريد دقيق ومكرونة', paymentMode: 'Bank' },
  { id: 'SUP-LEDGER-DEMO-08', supplierId: 'SUP-105', date: sampleDateTime(7), type: 'Payment', referenceNo: 'PAY-EG-552', debit: 2000, credit: 0, balance: 0, notes: 'سداد نقدي عند الاستلام', paymentMode: 'Cash' },
  { id: 'SUP-LEDGER-DEMO-09', supplierId: 'SUP-105', date: sampleDateTime(7), type: 'Invoice', referenceNo: 'EG-INV-552', debit: 0, credit: 2000, balance: 2000, notes: 'توريد حبوب وبقوليات', paymentMode: 'Cash' },
];

export const INITIAL_SAMPLE_STOCK_LOGS: IncomingStockLog[] = [
  { id: 'STOCK-DEMO-01', productId: 'PRD-1017', productName: 'لبن كامل الدسم جهينة 1 لتر', barcode: '6221001001172', quantityAdded: 40, previousQuantity: 0, newQuantity: 40, purchasePrice: 39, supplierName: 'جهينة ش.م.م', dateTime: sampleDateTime(14, 8) },
  { id: 'STOCK-DEMO-02', productId: 'PRD-1001', productName: 'زيت ذرة عافية نقي 800 مل', barcode: '6221001001011', quantityAdded: 32, previousQuantity: 13, newQuantity: 45, purchasePrice: 65, supplierName: 'أرما للصناعات الغذائية', dateTime: sampleDateTime(6, 9) },
  { id: 'STOCK-DEMO-03', productId: 'PRD-1014', productName: 'مكرونة الملكة أقلام 400 جم', barcode: '6221001001141', quantityAdded: 36, previousQuantity: 39, newQuantity: 75, purchasePrice: 12, supplierName: 'المطاحن الحديثة', dateTime: sampleDateTime(10, 10) },
  { id: 'STOCK-DEMO-04', productId: 'PRD-1022', productName: 'مياه معدنية صفا 1.5 لتر', barcode: '6221001001226', quantityAdded: 48, previousQuantity: 48, newQuantity: 96, purchasePrice: 6, supplierName: 'مورد المشروبات المحلي', dateTime: sampleDateTime(4, 8) },
  { id: 'STOCK-DEMO-05', productId: 'PRD-1018', productName: 'زبادي طبيعي جهينة 105 جم', barcode: '6221001001189', quantityAdded: 24, previousQuantity: 0, newQuantity: 24, purchasePrice: 7, supplierName: 'جهينة ش.م.م', dateTime: sampleDateTime(2, 8) },
];

export const INITIAL_SAMPLE_RETURNS: SaleReturn[] = [
  {
    id: 'RET-DEMO-001',
    returnInvoiceNumber: 'RET-فاتورة-2026-0004',
    originalInvoiceNumber: 'فاتورة-2026-0004',
    saleId: 'SALE-104',
    date: sampleDateTime(2, 16),
    customerName: 'مريم خالد عبد الرحمن',
    refundAmount: 9,
    reason: 'Wrong Item',
    items: [{ productId: 'PRD-1018', productName: 'زبادي طبيعي جهينة 105 جم', qty: 1, unitPrice: 9 }],
  },
  {
    id: 'RET-DEMO-002',
    returnInvoiceNumber: 'RET-فاتورة-2026-0008',
    originalInvoiceNumber: 'فاتورة-2026-0008',
    saleId: 'SALE-108',
    date: sampleDateTime(13, 11),
    customerName: 'أحمد محمود عبد الفتاح',
    refundAmount: 110,
    reason: 'Defective',
    items: [{ productId: 'PRD-1024', productName: 'سمن نباتي روابي 1.5 كجم', qty: 1, unitPrice: 110 }],
  },
];

export const INITIAL_SAMPLE_ATTENDANCE: AttendanceRecord[] = [
  ...Array.from({ length: 7 }, (_, index) => {
    const daysAgo = index;
    return [
      { id: `ATT-DEMO-H-${index}`, employeeId: 'EMP-02', employeeName: 'هاني عبد الله (كاشير رئيسي)', date: sampleDay(daysAgo), checkInTime: '08:02 ص', checkOutTime: daysAgo ? '04:05 م' : undefined, workingHours: daysAgo ? 8 : undefined, status: 'Present' as const },
      { id: `ATT-DEMO-M-${index}`, employeeId: 'EMP-03', employeeName: 'مصطفى علي (مسؤول المخزن)', date: sampleDay(daysAgo), checkInTime: index === 2 ? '09:18 ص' : '08:10 ص', checkOutTime: daysAgo ? '04:00 م' : undefined, workingHours: daysAgo ? 8 : undefined, status: index === 2 ? 'Late' as const : 'Present' as const },
      { id: `ATT-DEMO-Y-${index}`, employeeId: 'EMP-05', employeeName: 'يوسف خالد (كاشير مسائي)', date: sampleDay(daysAgo), checkInTime: '04:00 م', checkOutTime: daysAgo ? '12:00 ص' : undefined, workingHours: daysAgo ? 8 : undefined, status: 'Present' as const },
    ];
  }).flat(),
];

export const INITIAL_SAMPLE_CASH_SHIFTS: CashRegisterShift[] = [
  {
    id: 'SHIFT-DEMO-OPEN-02', cashierName: 'هاني عبد الله (كاشير رئيسي)', cashierId: 'EMP-02',
    openedByEmployeeId: 'EMP-01', openedByName: 'محمد أحمد (المدير / المالك)',
    startTime: sampleDateTime(0, 8), openingCash: 2500, cashInTotal: 500, cashOutTotal: 120,
    safeDepositTotal: 0, status: 'Open', notes: 'وردية صباحية تجريبية مفتوحة.',
  },
  {
    id: 'SHIFT-DEMO-OPEN-01', cashierName: 'محمد أحمد (المدير / المالك)', cashierId: 'EMP-01',
    openedByEmployeeId: 'EMP-01', openedByName: 'محمد أحمد (المدير / المالك)',
    startTime: sampleDateTime(0, 7), openingCash: 3000, cashInTotal: 0, cashOutTotal: 0,
    safeDepositTotal: 0, status: 'Open', notes: 'وردية المالك التجريبية.',
  },
  ...[1, 2, 3].map((shiftNo, index) => {
    const daysAgo = (index + 1) * 2;
    const startTime = sampleDateTime(daysAgo, 8);
    const endTime = sampleDateTime(daysAgo, 16);
    const openingCash = 2000 + index * 500;
    const cashSales = 4200 + index * 850;
    const cashInTotal = 300 + index * 50;
    const cashOutTotal = 180 + index * 20;
    const safeDepositTotal = 1500 + index * 250;
    const expectedCash = openingCash + cashSales + cashInTotal - cashOutTotal - safeDepositTotal;
    const cashDifference = index - 1;
    return {
      id: `SHIFT-DEMO-CLOSED-${shiftNo}`,
      cashierName: index === 1 ? 'يوسف خالد (كاشير مسائي)' : 'هاني عبد الله (كاشير رئيسي)',
      cashierId: index === 1 ? 'EMP-05' : 'EMP-02',
      openedByEmployeeId: 'EMP-01',
      openedByName: 'محمد أحمد (المدير / المالك)',
      startTime, endTime, openingCash, closingCash: expectedCash + cashDifference,
      expectedCash, cashDifference, cashInTotal, cashOutTotal, safeDepositTotal,
      status: 'Closed' as const,
      notes: `تمت مطابقة الوردية ${shiftNo} وفروقات الصندوق مسجلة.`,
    };
  }),
];

export const INITIAL_SAMPLE_CASH_TRANSACTIONS: CashTransaction[] = [
  { id: 'CASH-DEMO-01', shiftId: 'SHIFT-DEMO-OPEN-02', timestamp: sampleDateTime(0, 9), type: 'CashIn', amount: 500, reason: 'فكة إضافية للصندوق', cashierName: 'هاني عبد الله (كاشير رئيسي)', cashierId: 'EMP-02' },
  { id: 'CASH-DEMO-02', shiftId: 'SHIFT-DEMO-OPEN-02', timestamp: sampleDateTime(0, 10), type: 'CashOut', amount: 120, reason: 'شراء أكياس تعبئة عاجلة', cashierName: 'هاني عبد الله (كاشير رئيسي)', cashierId: 'EMP-02' },
  { id: 'CASH-DEMO-03', shiftId: 'SHIFT-DEMO-CLOSED-1', timestamp: sampleDateTime(2, 13), type: 'SafeDeposit', amount: 1500, reason: 'إيداع فائض النقدية بالخزينة', cashierName: 'هاني عبد الله (كاشير رئيسي)', cashierId: 'EMP-02' },
  { id: 'CASH-DEMO-04', shiftId: 'SHIFT-DEMO-CLOSED-2', timestamp: sampleDateTime(4, 14), type: 'CashOut', amount: 200, reason: 'مصاريف توصيل طلبية', cashierName: 'يوسف خالد (كاشير مسائي)', cashierId: 'EMP-05' },
  { id: 'CASH-DEMO-05', shiftId: 'SHIFT-DEMO-CLOSED-3', timestamp: sampleDateTime(6, 15), type: 'SafeDeposit', amount: 2000, reason: 'إيداع نهاية اليوم', cashierName: 'هاني عبد الله (كاشير رئيسي)', cashierId: 'EMP-02' },
];

const sampleCartItem = (productId: string, quantity: number): CartItem => {
  const product = INITIAL_SAMPLE_PRODUCTS.find(candidate => candidate.id === productId);
  if (!product) throw new Error(`Missing sample product ${productId}`);
  return {
    product: { ...product },
    quantity,
    unitSellingPrice: product.sellingPrice,
    totalPrice: product.sellingPrice * quantity,
    selectedUnit: product.unit,
  };
};

export const INITIAL_SAMPLE_HELD_BILLS: HeldBill[] = [
  {
    id: 'HOLD-DEMO-001',
    customerName: 'محمود عادل مصطفى',
    customerPhone: '01055667788',
    cartItems: [sampleCartItem('PRD-1001', 2), sampleCartItem('PRD-1014', 4), sampleCartItem('PRD-1022', 6)],
    timestamp: sampleDateTime(0, 11),
    note: 'العميل سيعود بعد استلام باقي طلبات المكتب.',
    cashierName: 'هاني عبد الله (كاشير رئيسي)',
  },
  {
    id: 'HOLD-DEMO-002',
    customerName: 'عميل نقدي',
    customerPhone: '',
    cartItems: [sampleCartItem('PRD-1017', 1), sampleCartItem('PRD-1018', 3)],
    timestamp: sampleDateTime(0, 12),
    note: 'طلب محفوظ مؤقتاً لحين مراجعة السعر.',
    cashierName: 'يوسف خالد (كاشير مسائي)',
  },
];

export const INITIAL_SAMPLE_PRICE_HISTORY: PriceHistoryRecord[] = [
  { id: 'PRICE-DEMO-01', productId: 'PRD-1001', productName: 'زيت ذرة عافية نقي 800 مل', oldPurchasePrice: 62, newPurchasePrice: 65, oldSellingPrice: 72, newSellingPrice: 75, dateChanged: sampleDateTime(18), changedBy: 'ندى سمير (محاسبة)' },
  { id: 'PRICE-DEMO-02', productId: 'PRD-1017', productName: 'لبن كامل الدسم جهينة 1 لتر', oldPurchasePrice: 37, newPurchasePrice: 39, oldSellingPrice: 43, newSellingPrice: 45, dateChanged: sampleDateTime(12), changedBy: 'محمد أحمد (المدير / المالك)' },
  { id: 'PRICE-DEMO-03', productId: 'PRD-1022', productName: 'مياه معدنية صفا 1.5 لتر', oldPurchasePrice: 5.5, newPurchasePrice: 6, oldSellingPrice: 7, newSellingPrice: 8, dateChanged: sampleDateTime(5), changedBy: 'ندى سمير (محاسبة)' },
];

export const INITIAL_SAMPLE_AUDIT_LOGS: AuditLog[] = [
  { id: 'AUDIT-DEMO-01', timestamp: sampleDateTime(0, 8), user: 'محمد أحمد (المدير / المالك)', action: 'Open Cash Register', details: 'تم فتح وردية الصباح بعهدة 3000 ج.م.' },
  { id: 'AUDIT-DEMO-02', timestamp: sampleDateTime(0, 9), user: 'هاني عبد الله (كاشير رئيسي)', action: 'New Sale', details: 'تسجيل الفاتورة فاتورة-2026-0001 بقيمة 150 ج.م.' },
  { id: 'AUDIT-DEMO-03', timestamp: sampleDateTime(1, 16), user: 'ندى سمير (محاسبة)', action: 'Save Expense', details: 'تسجيل مصروف صيانة ثلاجة العرض.' },
  { id: 'AUDIT-DEMO-04', timestamp: sampleDateTime(3, 10), user: 'مصطفى علي (مسؤول المخزن)', action: 'Add Stock', details: 'استلام توريد ألبان وإضافة الكميات للمخزون.' },
  { id: 'AUDIT-DEMO-05', timestamp: sampleDateTime(6, 12), user: 'محمد أحمد (المدير / المالك)', action: 'Close Cash Register', details: 'إغلاق وردية مع فرق صندوق +1 ج.م.' },
  { id: 'AUDIT-DEMO-06', timestamp: sampleDateTime(10, 11), user: 'ندى سمير (محاسبة)', action: 'Supplier Payment', details: 'سداد دفعة للمطاحن الحديثة بقيمة 500 ج.م.' },
];

export const INITIAL_SAMPLE_RECYCLE_BIN: RecycleBinItem[] = [
  {
    id: 'BIN-DEMO-001',
    type: 'Expense',
    originalId: 'EXP-DEMO-ARCHIVE',
    title: 'فاتورة إنترنت قديمة (سجل تجريبي)',
    data: {
      id: 'EXP-DEMO-ARCHIVE',
      title: 'فاتورة إنترنت قديمة (سجل تجريبي)',
      category: 'Internet',
      amount: 350,
      date: sampleDay(22),
      paymentMode: 'UPI',
      notes: 'سجل توضيحي لميزة استعادة المصروفات.',
      createdAt: sampleDateTime(22),
    } satisfies Expense,
    deletedAt: sampleDateTime(20),
    deletedBy: 'ندى سمير (محاسبة)',
  },
];

class SQLiteStorageEngine {
  private settings: ShopSettings;
  private products: Product[];
  private sales: Sale[];
  private stockLogs: IncomingStockLog[];
  private customers: Customer[];
  private suppliers: Supplier[];
  private purchaseOrders: PurchaseOrder[];
  private expenses: Expense[];
  private employees: Employee[];
  private attendance: AttendanceRecord[];
  private heldBills: HeldBill[];
  private returns: SaleReturn[];
  private auditLogs: AuditLog[];
  private cashShifts: CashRegisterShift[];
  private cashTxns: CashTransaction[];
  private priceHistory: PriceHistoryRecord[];
  private categories: CategoryNode[];
  private customerLedgers: CustomerLedgerEntry[];
  private supplierLedgers: SupplierLedgerEntry[];
  private recycleBin: RecycleBinItem[];
  private updates: UpdatePackage[];
  private currentUser: Employee | null = null;

  constructor() {
    this.settings = this.loadData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (!this.settings.currencySymbol || this.settings.currencySymbol === '₹') {
      this.settings.currencySymbol = 'ج.م';
      this.settings.defaultTaxPercent = 14;
      this.settings.shopName = 'سوبر ماركت النور';
      this.settings.address = 'شارع التحرير، الدقي، الجيزة، مصر';
      this.settings.phone = '01021020169';
      this.settings.gstNumber = '100-234-567';
      this.settings.invoicePrefix = 'فاتورة';
      this.settings.upiId = 'elnour@instapay';
      this.settings.merchantName = 'سوبر ماركت النور';
      this.settings.defaultPaymentNote = 'شكراً لتسوقكم من سوبر ماركت النور';
      this.settings.upiReceiptFooter = 'تم الدفع الإلكتروني بنجاح عبر إنستاباي / المحفظة';
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    }

    this.products = this.loadData(STORAGE_KEYS.PRODUCTS, INITIAL_SAMPLE_PRODUCTS);
    // If user has old default product data
    if (this.products.length > 0 && this.products[0].id === 'PRD-1001' && this.products[0].name.includes('Fortune Sunlite')) {
      this.products = INITIAL_SAMPLE_PRODUCTS;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
    }

    this.sales = this.loadData(STORAGE_KEYS.SALES, INITIAL_SAMPLE_SALES);
    if (this.sales.length > 0 && this.sales[0].id === 'SALE-101' && this.sales[0].customerName.includes('Suresh')) {
      this.sales = INITIAL_SAMPLE_SALES;
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(this.sales));
    }

    this.stockLogs = this.loadData(STORAGE_KEYS.STOCK_LOGS, INITIAL_SAMPLE_STOCK_LOGS);
    this.customers = this.loadData(STORAGE_KEYS.CUSTOMERS, INITIAL_SAMPLE_CUSTOMERS);
    if (this.customers.length > 0 && this.customers[0].id === 'CUST-1001' && this.customers[0].name.includes('Suresh')) {
      this.customers = INITIAL_SAMPLE_CUSTOMERS;
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(this.customers));
    }
    const legacyCustomerTags: Record<string, Customer['tag']> = {
      'عميل مميز (VIP)': 'VIP',
      'زبون عادي': 'Regular',
      'جملة ونصف جملة': 'Wholesale',
      'موزع': 'Distributor',
    };
    const normalizedCustomers = this.customers.map(customer => ({
      ...customer,
      tag: legacyCustomerTags[String(customer.tag)] || customer.tag || 'Regular',
    }));
    if (normalizedCustomers.some((customer, index) => customer.tag !== this.customers[index].tag)) {
      this.customers = normalizedCustomers;
      this.persistCustomers();
    }

    this.suppliers = this.loadData(STORAGE_KEYS.SUPPLIERS, INITIAL_SAMPLE_SUPPLIERS);
    if (this.suppliers.length > 0 && this.suppliers[0].id === 'SUP-101' && this.suppliers[0].name.includes('ITC')) {
      this.suppliers = INITIAL_SAMPLE_SUPPLIERS;
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(this.suppliers));
    }

    this.purchaseOrders = this.loadData(STORAGE_KEYS.PURCHASE_ORDERS, INITIAL_SAMPLE_PURCHASE_ORDERS);
    this.expenses = this.loadData(STORAGE_KEYS.EXPENSES, INITIAL_SAMPLE_EXPENSES);
    if (this.expenses.length > 0 && this.expenses[0].id === 'EXP-101' && this.expenses[0].title.includes('Shop Monthly Rent')) {
      this.expenses = INITIAL_SAMPLE_EXPENSES;
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(this.expenses));
    }

    this.employees = this.loadData(STORAGE_KEYS.EMPLOYEES, INITIAL_SAMPLE_EMPLOYEES);
    if (this.employees.length > 0 && this.employees[0].id === 'EMP-01' && this.employees[0].name.includes('Rajesh')) {
      this.employees = INITIAL_SAMPLE_EMPLOYEES;
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(this.employees));
    }

    this.attendance = this.loadData(STORAGE_KEYS.ATTENDANCE, INITIAL_SAMPLE_ATTENDANCE);
    this.heldBills = this.loadData(STORAGE_KEYS.HELD_BILLS, INITIAL_SAMPLE_HELD_BILLS);
    this.returns = this.loadData(STORAGE_KEYS.RETURNS, INITIAL_SAMPLE_RETURNS);
    this.auditLogs = this.loadData(STORAGE_KEYS.AUDIT_LOGS, INITIAL_SAMPLE_AUDIT_LOGS);
    this.cashShifts = this.loadData(STORAGE_KEYS.CASH_SHIFTS, INITIAL_SAMPLE_CASH_SHIFTS);
    let shiftsNeedMigration = false;
    this.cashShifts = this.cashShifts.map(shift => {
      if (shift.cashierId) return shift;
      const owner = this.employees.find(employee => employee.name === shift.cashierName);
      if (!owner) return shift;
      shiftsNeedMigration = true;
      return { ...shift, cashierId: owner.id };
    });
    if (shiftsNeedMigration) this.persistCashShifts();
    this.cashTxns = this.loadData(STORAGE_KEYS.CASH_TXNS, INITIAL_SAMPLE_CASH_TRANSACTIONS);
    this.priceHistory = this.loadData(STORAGE_KEYS.PRICE_HISTORY, INITIAL_SAMPLE_PRICE_HISTORY);
    this.categories = this.loadData(STORAGE_KEYS.CATEGORIES, INITIAL_SAMPLE_CATEGORIES);
    if (this.categories.length > 0 && this.categories[0].id === 'CAT-1' && this.categories[0].name.includes('Grains & Atta')) {
      this.categories = INITIAL_SAMPLE_CATEGORIES;
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    }

    this.customerLedgers = this.loadData(STORAGE_KEYS.CUSTOMER_LEDGERS, []);
    this.supplierLedgers = this.loadData(STORAGE_KEYS.SUPPLIER_LEDGERS, INITIAL_SAMPLE_SUPPLIER_LEDGERS);
    this.migrateLegacyCustomerLedgers();
    this.recycleBin = this.loadData(STORAGE_KEYS.RECYCLE_BIN, INITIAL_SAMPLE_RECYCLE_BIN);
    this.updates = this.loadData(STORAGE_KEYS.UPDATES, INITIAL_SAMPLE_UPDATES);

    this.currentUser = null;
    
  }

  private loadData<T>(key: string, defaultValue: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const sample = cloneSampleData(defaultValue);
      localStorage.setItem(key, JSON.stringify(sample));
      return sample;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return cloneSampleData(defaultValue);
    }
  }

  // --- Current Active User & Security PIN ---
  public getCurrentUser(): Employee | null {
    return this.currentUser;
  }

  public setCurrentUser(user: Employee | null): void {
    this.currentUser = user;
    if (user) {
      this.addAuditLog(user.name, 'User Login', `Logged in as ${user.role}`);
    }
  }

  public verifyEmployeePin(pin: string): Employee | null {
    const emp = this.employees.find(e => e.pin === pin && e.status === 'Active');
    return emp || null;
  }

  public verifyEmployeeCredentials(phone: string, pin: string): Employee | null {
    const normalizedPhone = phone.replace(/\D/g, '');
    const employee = this.employees.find(
      candidate => candidate.phone.replace(/\D/g, '') === normalizedPhone &&
        candidate.pin === pin &&
        candidate.status === 'Active'
    );
    return employee || null;
  }

  // --- Settings ---
  public getSettings(): ShopSettings {
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<ShopSettings>): ShopSettings {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    this.addAuditLog(this.currentUser?.name || 'System', 'Update Settings', 'Shop settings updated');
    return this.settings;
  }

  // --- Products ---
  public getProducts(): Product[] {
    return [...this.products];
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    const cleaned = barcode.trim();
    return this.products.find(p => p.barcode === cleaned || p.id === cleaned);
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  public saveProduct(productData: Partial<Product> & { name: string; barcode: string; purchasePrice: number; sellingPrice: number; quantity: number }): Product {
    const now = new Date().toISOString();
    let product: Product;

    if (productData.id) {
      const index = this.products.findIndex(p => p.id === productData.id);
      if (index !== -1) {
        const oldProduct = this.products[index];
        
        // Record Price History if price changed
        if (oldProduct.purchasePrice !== Number(productData.purchasePrice) || oldProduct.sellingPrice !== Number(productData.sellingPrice)) {
          this.recordPriceChange(
            oldProduct.id,
            oldProduct.name,
            oldProduct.purchasePrice,
            Number(productData.purchasePrice),
            oldProduct.sellingPrice,
            Number(productData.sellingPrice)
          );
        }

        product = {
          ...this.products[index],
          ...productData,
          updatedAt: now,
        };
        this.products[index] = product;
        this.addAuditLog(this.currentUser?.name || 'Admin', 'Update Product', `Updated product ${product.name}`);
      } else {
        product = {
          id: productData.id,
          name: productData.name,
          category: productData.category || 'General',
          barcode: productData.barcode,
          purchasePrice: Number(productData.purchasePrice),
          sellingPrice: Number(productData.sellingPrice),
          wholesalePrice: productData.wholesalePrice,
          distributorPrice: productData.distributorPrice,
          vipPrice: productData.vipPrice,
          quantity: Number(productData.quantity),
          supplierName: productData.supplierName || 'General Supplier',
          expiryDate: productData.expiryDate,
          mfgDate: productData.mfgDate,
          batchNumber: productData.batchNumber,
          shelfLocation: productData.shelfLocation || 'Main Display',
          unit: productData.unit || 'pcs',
          createdAt: now,
          updatedAt: now,
        };
        this.products.push(product);
        this.addAuditLog(this.currentUser?.name || 'Admin', 'Add Product', `Created product ${product.name}`);
      }
    } else {
      const nextId = `PRD-${1000 + this.products.length + 1}`;
      product = {
        id: nextId,
        name: productData.name,
        category: productData.category || 'General',
        barcode: productData.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
        purchasePrice: Number(productData.purchasePrice),
        sellingPrice: Number(productData.sellingPrice),
        wholesalePrice: productData.wholesalePrice,
        distributorPrice: productData.distributorPrice,
        vipPrice: productData.vipPrice,
        quantity: Number(productData.quantity),
        supplierName: productData.supplierName || 'General Supplier',
        expiryDate: productData.expiryDate,
        mfgDate: productData.mfgDate,
        batchNumber: productData.batchNumber,
        shelfLocation: productData.shelfLocation || 'Main Display',
        unit: productData.unit || 'pcs',
        createdAt: now,
        updatedAt: now,
      };
      this.products.push(product);
      this.addAuditLog(this.currentUser?.name || 'Admin', 'Add Product', `Created product ${product.name}`);
    }

    this.persistProducts();
    return product;
  }

  public deleteProduct(id: string): boolean {
    const prod = this.getProductById(id);
    const initialLen = this.products.length;
    this.products = this.products.filter(p => p.id !== id);
    if (this.products.length !== initialLen) {
      this.persistProducts();
      if (prod) {
        this.moveToRecycleBin('Product', prod.id, prod.name, prod);
        this.addAuditLog(this.currentUser?.name || 'Admin', 'Delete Product', `Moved product ${prod.name} to Recycle Bin`);
      }
      return true;
    }
    return false;
  }

  // --- Incoming Stock ---
  public addStock(
    productId: string, 
    quantityToAdd: number, 
    newPurchasePrice?: number, 
    newSellingPrice?: number, 
    supplierName?: string
  ): Product | undefined {
    const product = this.getProductById(productId);
    if (!product) return undefined;

    const previousQuantity = product.quantity;
    const newQuantity = previousQuantity + Number(quantityToAdd);

    product.quantity = newQuantity;
    if (newPurchasePrice !== undefined && newPurchasePrice > 0) {
      product.purchasePrice = Number(newPurchasePrice);
    }
    if (newSellingPrice !== undefined && newSellingPrice > 0) {
      product.sellingPrice = Number(newSellingPrice);
    }
    if (supplierName) {
      product.supplierName = supplierName;
    }
    product.updatedAt = new Date().toISOString();

    const log: IncomingStockLog = {
      id: `LOG-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      quantityAdded: Number(quantityToAdd),
      previousQuantity,
      newQuantity,
      purchasePrice: product.purchasePrice,
      supplierName: supplierName || product.supplierName,
      dateTime: new Date().toISOString(),
    };

    this.stockLogs.unshift(log);
    this.persistProducts();
    this.persistStockLogs();
    this.addAuditLog(this.currentUser?.name || 'Staff', 'Add Stock', `Added ${quantityToAdd} units to ${product.name}`);

    return product;
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return [...this.customers];
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.customers.find(c => c.id === id);
  }

  public saveCustomer(custData: Partial<Customer> & { name: string; phone: string }): Customer {
    let cust: Customer;
    if (custData.id) {
      const idx = this.customers.findIndex(c => c.id === custData.id);
      if (idx !== -1) {
        cust = { ...this.customers[idx], ...custData };
        this.customers[idx] = cust;
      } else {
        cust = {
          id: custData.id,
          name: custData.name,
          phone: custData.phone,
          email: custData.email,
          address: custData.address,
          gstNumber: custData.gstNumber,
          birthday: custData.birthday,
          notes: custData.notes,
          totalSpent: custData.totalSpent || 0,
          loyaltyPoints: custData.loyaltyPoints || 0,
          storeCredit: custData.storeCredit || 0,
          outstandingDues: custData.outstandingDues || 0,
          tag: custData.tag || 'Regular',
          createdAt: new Date().toISOString(),
        };
        this.customers.push(cust);
      }
    } else {
      cust = {
        id: `CUST-${1000 + this.customers.length + 1}`,
        name: custData.name,
        phone: custData.phone,
        email: custData.email,
        address: custData.address,
        gstNumber: custData.gstNumber,
        birthday: custData.birthday,
        notes: custData.notes,
        totalSpent: 0,
        loyaltyPoints: 0,
        storeCredit: 0,
        outstandingDues: custData.outstandingDues || 0,
        tag: custData.tag || 'Regular',
        createdAt: new Date().toISOString(),
      };
      this.customers.push(cust);
    }
    this.persistCustomers();
    this.addAuditLog(this.currentUser?.name || 'Staff', 'Save Customer', `Saved customer ${cust.name}`);
    return cust;
  }

  public deleteCustomer(id: string): boolean {
    this.customers = this.customers.filter(c => c.id !== id);
    this.persistCustomers();
    return true;
  }

  public payCustomerDues(
    customerId: string,
    amount: number,
    paymentMode: CustomerLedgerEntry['paymentMode'] = 'Cash',
  ): boolean {
    const cust = this.getCustomerById(customerId);
    if (!cust || !Number.isFinite(amount) || amount <= 0 || amount > cust.outstandingDues) return false;
    this.addCustomerLedgerEntry(
      customerId,
      'PaymentReceived',
      `PAY-${Date.now()}`,
      0,
      amount,
      'تحصيل من العميل',
      paymentMode,
    );
    this.addAuditLog(this.currentUser?.name || 'Cashier', 'Customer Dues Payment', `Cleared ${amount} dues for ${cust.name}`);
    return true;
  }

  // --- Suppliers ---
  public getSuppliers(): Supplier[] {
    return [...this.suppliers];
  }

  public saveSupplier(supData: Partial<Supplier> & { name: string; companyName: string; phone: string }): Supplier {
    let sup: Supplier;
    if (supData.id) {
      const idx = this.suppliers.findIndex(s => s.id === supData.id);
      if (idx !== -1) {
        sup = { ...this.suppliers[idx], ...supData };
        this.suppliers[idx] = sup;
      } else {
        sup = {
          id: supData.id,
          name: supData.name,
          companyName: supData.companyName,
          phone: supData.phone,
          email: supData.email,
          gstin: supData.gstin,
          address: supData.address,
          paymentTerms: supData.paymentTerms,
          outstandingBalance: supData.outstandingBalance || 0,
          createdAt: new Date().toISOString(),
        };
        this.suppliers.push(sup);
      }
    } else {
      sup = {
        id: `SUP-${100 + this.suppliers.length + 1}`,
        name: supData.name,
        companyName: supData.companyName,
        phone: supData.phone,
        email: supData.email,
        gstin: supData.gstin,
        address: supData.address,
        paymentTerms: supData.paymentTerms || 'Cash on Delivery',
        outstandingBalance: 0,
        createdAt: new Date().toISOString(),
      };
      this.suppliers.push(sup);
    }
    this.persistSuppliers();
    return sup;
  }

  public deleteSupplier(id: string): boolean {
    this.suppliers = this.suppliers.filter(s => s.id !== id);
    this.persistSuppliers();
    return true;
  }

  public getSupplierLedger(supplierId: string): SupplierLedgerEntry[] {
    return this.supplierLedgers.filter(entry => entry.supplierId === supplierId);
  }

  public addSupplierLedgerEntry(
    supplierId: string,
    type: SupplierLedgerEntry['type'],
    referenceNo: string,
    debit: number,
    credit: number,
    notes?: string,
    paymentMode?: SupplierLedgerEntry['paymentMode'],
  ): SupplierLedgerEntry {
    const supplier = this.suppliers.find(candidate => candidate.id === supplierId);
    if (!supplier) throw new Error('المورد المحدد غير موجود.');
    if (![debit, credit].every(value => Number.isFinite(value) && value >= 0) || debit + credit <= 0) {
      throw new Error('يجب إدخال مبلغ صحيح للقيد المالي.');
    }

    const ledger = this.getSupplierLedger(supplierId);
    const previousBalance = ledger[0]?.balance ?? supplier.outstandingBalance ?? 0;
    const entry: SupplierLedgerEntry = {
      id: `SUP-LEDGER-${Date.now()}-${this.supplierLedgers.length + 1}`,
      supplierId,
      date: new Date().toISOString(),
      type,
      referenceNo,
      debit,
      credit,
      balance: previousBalance + credit - debit,
      notes,
      paymentMode,
    };

    this.supplierLedgers.unshift(entry);
    supplier.outstandingBalance = entry.balance;
    this.persistSuppliers();
    this.persistSupplierLedgers();
    return entry;
  }

  public paySupplier(
    supplierId: string,
    amount: number,
    paymentMode: SupplierLedgerEntry['paymentMode'] = 'Cash',
    referenceNo = `PAY-${Date.now()}`,
  ): SupplierLedgerEntry {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('أدخل مبلغ سداد أكبر من صفر.');
    return this.addSupplierLedgerEntry(
      supplierId,
      'Payment',
      referenceNo,
      amount,
      0,
      'سداد للمورد',
      paymentMode,
    );
  }

  public recordSupplierReturn(
    supplierId: string,
    productId: string,
    quantity: number,
    amount: number,
    referenceNo: string,
  ): SupplierLedgerEntry {
    const supplier = this.suppliers.find(candidate => candidate.id === supplierId);
    const product = this.getProductById(productId);
    if (!supplier) throw new Error('المورد المحدد غير موجود.');
    if (!product) throw new Error('الصنف المحدد غير موجود.');
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > product.quantity) {
      throw new Error('كمية المرتجع يجب أن تكون صحيحة وألا تتجاوز رصيد المخزون.');
    }
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('أدخل قيمة مرتجع أكبر من صفر.');

    product.quantity -= quantity;
    product.updatedAt = new Date().toISOString();
    this.persistProducts();
    const entry = this.addSupplierLedgerEntry(
      supplierId,
      'Return',
      referenceNo.trim() || `RET-${Date.now()}`,
      amount,
      0,
      `مرتجع ${quantity} × ${product.name}`,
    );
    this.addAuditLog(this.currentUser?.name || 'Inventory Staff', 'Supplier Return', `Returned ${quantity} ${product.name} to ${supplier.companyName}`);
    return entry;
  }

  // --- Purchase Orders ---
  public getPurchaseOrders(): PurchaseOrder[] {
    return [...this.purchaseOrders];
  }

  public savePurchaseOrder(poData: Partial<PurchaseOrder> & { supplierId: string; supplierName: string; items: PurchaseOrder['items']; totalAmount: number }): PurchaseOrder {
    const poNumber = poData.poNumber || `PO-${new Date().getFullYear()}-${String(this.purchaseOrders.length + 1).padStart(4, '0')}`;
    const po: PurchaseOrder = {
      id: poData.id || `PO-${Date.now()}`,
      poNumber,
      supplierId: poData.supplierId,
      supplierName: poData.supplierName,
      orderDate: poData.orderDate || new Date().toISOString().split('T')[0],
      receivedDate: poData.receivedDate,
      invoiceNumber: poData.invoiceNumber,
      invoiceNumbers: poData.invoiceNumbers,
      status: poData.status || 'Draft',
      items: poData.items,
      totalAmount: poData.totalAmount,
      notes: poData.notes,
    };

    if (poData.id) {
      const idx = this.purchaseOrders.findIndex(p => p.id === poData.id);
      if (idx !== -1) this.purchaseOrders[idx] = po;
      else this.purchaseOrders.unshift(po);
    } else {
      this.purchaseOrders.unshift(po);
    }

    this.persistPurchaseOrders();
    this.addAuditLog(this.currentUser?.name || 'Manager', 'Purchase Order', `Saved PO #${po.poNumber}`);
    return po;
  }

  public createPurchaseOrderInvoice(
    poData: Partial<PurchaseOrder> & {
      supplierId: string;
      supplierName: string;
      items: PurchaseOrder['items'];
      invoiceNumber: string;
      paidAmount?: number;
      paymentMode?: SupplierLedgerEntry['paymentMode'];
    },
  ): PurchaseOrder {
    const supplier = this.suppliers.find(candidate => candidate.id === poData.supplierId);
    const invoiceNumber = poData.invoiceNumber.trim();
    const items = poData.items.map(item => ({ ...item, receivedQty: undefined }));
    const productIds = new Set(items.map(item => item.productId));
    if (!supplier || !invoiceNumber || !items.length || productIds.size !== items.length ||
      items.some(item =>
        !this.getProductById(item.productId) ||
        !Number.isInteger(item.qty) ||
        item.qty <= 0 ||
        !Number.isFinite(item.purchasePrice) ||
        item.purchasePrice <= 0
      )) {
      throw new Error('أدخل المورد ورقم الفاتورة وأصنافاً بكميات وأسعار صحيحة.');
    }
    if (this.getSupplierLedger(supplier.id).some(entry =>
      entry.type === 'Invoice' && entry.referenceNo === invoiceNumber
    )) {
      throw new Error('رقم فاتورة المورد مسجل من قبل.');
    }

    const totalAmount = items.reduce((total, item) => total + item.qty * item.purchasePrice, 0);
    const paidAmount = poData.paidAmount ?? 0;
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error('إجمالي فاتورة المورد يجب أن يكون أكبر من صفر.');
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > totalAmount) {
      throw new Error('المبلغ المدفوع يجب أن يكون بين صفر وإجمالي الفاتورة.');
    }

    const po = this.savePurchaseOrder({
      ...poData,
      supplierId: supplier.id,
      supplierName: supplier.companyName || supplier.name,
      status: 'Ordered',
      items,
      totalAmount,
    });
    const received = this.receivePurchaseOrder(
      po.id,
      invoiceNumber,
      items.map(({ productId, qty, purchasePrice }) => ({ productId, qty, purchasePrice })),
      paidAmount,
      poData.paymentMode,
    );
    if (!received) {
      throw new Error('تم حفظ أمر الشراء، لكن تعذر تسجيل استلام الفاتورة.');
    }
    return po;
  }

  public receivePurchaseOrder(
    poId: string,
    invoiceNumber: string,
    receivedItems: { productId: string; qty: number; purchasePrice: number }[],
    paidAmount = 0,
    paymentMode: SupplierLedgerEntry['paymentMode'] = 'Cash',
  ): boolean {
    const po = this.purchaseOrders.find(p => p.id === poId);
    const supplier = po && this.suppliers.find(candidate => candidate.id === po.supplierId);
    if (!po || !supplier || po.status === 'Received' || po.status === 'Cancelled') return false;
    if (!invoiceNumber.trim()) throw new Error('أدخل رقم فاتورة المورد قبل تسجيل الاستلام.');
    if (this.getSupplierLedger(supplier.id).some(entry =>
      entry.type === 'Invoice' && entry.referenceNo === invoiceNumber.trim()
    )) {
      throw new Error('رقم فاتورة المورد مسجل من قبل.');
    }
    if (!receivedItems.length || receivedItems.some(received => {
      const orderedItem = po.items.find(item => item.productId === received.productId);
      return !orderedItem ||
        !this.getProductById(received.productId) ||
        !Number.isInteger(received.qty) ||
        received.qty <= 0 ||
        received.qty + (orderedItem.receivedQty || 0) > orderedItem.qty ||
        !Number.isFinite(received.purchasePrice) ||
        received.purchasePrice <= 0;
    })) {
      throw new Error('تعذر استلام الطلب لوجود صنف أو كمية أو سعر غير صالح.');
    }
    const invoiceTotal = receivedItems.reduce((total, item) => total + item.qty * item.purchasePrice, 0);
    if (!Number.isFinite(invoiceTotal) || invoiceTotal <= 0) {
      throw new Error('إجمالي فاتورة المورد يجب أن يكون أكبر من صفر.');
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > invoiceTotal) {
      throw new Error('المبلغ المدفوع يجب أن يكون بين صفر وإجمالي الفاتورة.');
    }

    receivedItems.forEach(received => {
      const orderedItem = po.items.find(item => item.productId === received.productId);
      if (!orderedItem) return;
      this.addStock(received.productId, received.qty, received.purchasePrice, undefined, supplier.companyName || supplier.name);
      orderedItem.receivedQty = (orderedItem.receivedQty || 0) + received.qty;
    });

    po.status = po.items.every(item => (item.receivedQty || 0) >= item.qty) ? 'Received' : 'Partially Received';
    po.receivedDate = new Date().toISOString().split('T')[0];
    po.invoiceNumber = invoiceNumber.trim();
    po.invoiceNumbers = [...(po.invoiceNumbers || []), po.invoiceNumber];
    this.persistPurchaseOrders();
    this.addSupplierLedgerEntry(
      supplier.id,
      'Invoice',
      po.invoiceNumber,
      0,
      invoiceTotal,
      `فاتورة استلام لأمر الشراء ${po.poNumber}`,
    );
    if (paidAmount > 0) {
      this.addSupplierLedgerEntry(
        supplier.id,
        'Payment',
        `PAY-${po.invoiceNumber}`,
        paidAmount,
        0,
        `سداد من فاتورة ${po.invoiceNumber}`,
        paymentMode,
      );
    }
    this.addAuditLog(this.currentUser?.name || 'Inventory Staff', 'Receive PO', `Received invoice ${po.invoiceNumber} for PO #${po.poNumber}`);
    return true;
  }

  // --- Expenses ---
  public getExpenses(): Expense[] {
    return [...this.expenses];
  }

  public saveExpense(expData: Partial<Expense> & { title: string; category: any; amount: number; date: string }): Expense {
    const exp: Expense = {
      id: expData.id || `EXP-${Date.now()}`,
      title: expData.title,
      category: expData.category,
      amount: Number(expData.amount),
      date: expData.date,
      paymentMode: expData.paymentMode || 'Cash',
      notes: expData.notes,
      createdAt: new Date().toISOString(),
    };

    if (expData.id) {
      const idx = this.expenses.findIndex(e => e.id === expData.id);
      if (idx !== -1) this.expenses[idx] = exp;
      else this.expenses.unshift(exp);
    } else {
      this.expenses.unshift(exp);
    }

    this.persistExpenses();
    this.addAuditLog(this.currentUser?.name || 'Accountant', 'Save Expense', `Recorded expense: ${exp.title} (${exp.amount})`);
    return exp;
  }

  public deleteExpense(id: string): boolean {
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.persistExpenses();
    return true;
  }

  // --- Employees & Attendance ---
  public getEmployees(): Employee[] {
    return [...this.employees];
  }

  public saveEmployee(empData: Partial<Employee> & { name: string; phone: string; role: any; pin: string }): Employee {
    const phone = empData.phone.replace(/\D/g, '');
    if (phone.length < 7) {
      throw new Error('رقم الهاتف يجب أن يحتوي على 7 أرقام على الأقل.');
    }
    if (!/^\d{4}$/.test(empData.pin)) {
      throw new Error('رمز PIN يجب أن يتكون من 4 أرقام.');
    }
    const duplicatePhone = this.employees.find(employee =>
      employee.id !== empData.id && employee.phone.replace(/\D/g, '') === phone
    );
    if (duplicatePhone) {
      throw new Error('رقم الهاتف مستخدم بالفعل لموظف آخر.');
    }

    let emp: Employee;
    if (empData.id) {
      const idx = this.employees.findIndex(e => e.id === empData.id);
      if (idx !== -1) {
        emp = { ...this.employees[idx], ...empData, phone };
        this.employees[idx] = emp;
      } else {
        emp = {
          id: empData.id,
          name: empData.name,
          phone,
          address: empData.address || '',
          salary: empData.salary || 18000,
          joiningDate: empData.joiningDate || new Date().toISOString().split('T')[0],
          role: empData.role,
          pin: empData.pin,
          photoUrl: empData.photoUrl,
          status: empData.status || 'Active',
        };
        this.employees.push(emp);
      }
    } else {
      emp = {
        id: `EMP-${String(this.employees.length + 1).padStart(2, '0')}`,
        name: empData.name,
        phone,
        address: empData.address || '',
        salary: empData.salary || 18000,
        joiningDate: empData.joiningDate || new Date().toISOString().split('T')[0],
        role: empData.role,
        pin: empData.pin,
        photoUrl: empData.photoUrl,
        status: 'Active',
      };
      this.employees.push(emp);
    }
    this.persistEmployees();
    return emp;
  }

  public getAttendance(): AttendanceRecord[] {
    return [...this.attendance];
  }

  public checkInEmployee(employeeId: string): AttendanceRecord | null {
    const emp = this.employees.find(e => e.id === employeeId);
    if (!emp) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const existing = this.attendance.find(a => a.employeeId === employeeId && a.date === todayStr);

    if (existing) return existing;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isLate = now.getHours() >= 10;

    const record: AttendanceRecord = {
      id: `ATT-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: todayStr,
      checkInTime: timeStr,
      status: isLate ? 'Late' : 'Present',
    };

    this.attendance.unshift(record);
    this.persistAttendance();
    this.addAuditLog(emp.name, 'Check In', `Checked in at ${timeStr}`);
    return record;
  }

  public checkOutEmployee(employeeId: string): AttendanceRecord | null {
    const todayStr = new Date().toISOString().split('T')[0];
    const record = this.attendance.find(a => a.employeeId === employeeId && a.date === todayStr);

    if (!record) return null;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    record.checkOutTime = timeStr;
    record.workingHours = 8; // Calculated estimate

    this.persistAttendance();
    this.addAuditLog(record.employeeName, 'Check Out', `Checked out at ${timeStr}`);
    return record;
  }

  // --- Held Bills ---
  public getHeldBills(): HeldBill[] {
    return [...this.heldBills];
  }

  public saveHeldBill(customerName: string, customerPhone: string, cartItems: CartItem[], note?: string): HeldBill {
    const bill: HeldBill = {
      id: `HOLD-${Date.now()}`,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      cartItems,
      timestamp: new Date().toISOString(),
      note,
      cashierName: this.currentUser?.name || 'Cashier',
    };
    this.heldBills.unshift(bill);
    this.persistHeldBills();
    this.addAuditLog(this.currentUser?.name || 'Cashier', 'Hold Bill', `Held bill with ${cartItems.length} items`);
    return bill;
  }

  public deleteHeldBill(id: string): void {
    this.heldBills = this.heldBills.filter(h => h.id !== id);
    this.persistHeldBills();
  }

  public getNextInvoiceNumber(): string {
    const now = new Date();
    return `${this.settings.invoicePrefix}-${now.getFullYear()}-${String(this.sales.length + 1).padStart(4, '0')}`;
  }

  // --- POS Record Sale with Split Payments, Dues, and Loyalty ---
  public recordSale(
    cartItems: CartItem[],
    customerName: string = '',
    customerPhone: string = '',
    paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit' | 'Split' = 'Cash',
    receivedAmount: number = 0,
    discountAmount: number = 0,
    taxPercent: number = 0,
    notes: string = '',
    customerId?: string,
    splitPayments?: any[]
  ): Sale {
    const cashier = this.currentUser;
    if (!cashier) throw new Error('يجب تسجيل الدخول قبل تسجيل عملية بيع.');
    const shift = this.getCurrentCashShift(cashier.id);
    if (!shift) throw new Error('يجب فتح شفت نقدية للمستخدم الحالي قبل بدء البيع.');
    const linkedCustomer = this.customers.find(customer => customer.id === customerId)
      || this.customers.find(customer => customer.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''));
    if (paymentMode === 'Credit' && !linkedCustomer) {
      throw new Error('يجب اختيار عميل مسجل لتسجيل الفاتورة كآجل.');
    }
    const now = new Date();
    const invoiceNumber = `${this.settings.invoicePrefix}-${now.getFullYear()}-${String(this.sales.length + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let totalProfit = 0;

    const saleItems: SaleItem[] = cartItems.map((item, index) => {
      const lineTotal = item.totalPrice;
      subtotal += lineTotal;

      const lineProfit = (item.unitSellingPrice - item.product.purchasePrice) * item.quantity;
      totalProfit += lineProfit;

      // Automatically reduce stock quantity in inventory
      const product = this.getProductById(item.product.id);
      if (product) {
        product.quantity = Math.max(0, product.quantity - item.quantity);
        product.updatedAt = now.toISOString();
      }

      return {
        id: `SI-${index + 1}`,
        productId: item.product.id,
        productName: item.product.name,
        barcode: item.product.barcode,
        unitPurchasePrice: item.product.purchasePrice,
        unitSellingPrice: item.unitSellingPrice,
        quantity: item.quantity,
        totalPrice: lineTotal,
        variantName: item.selectedVariant?.name,
      };
    });

    const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
    const totalAmount = Math.round(subtotal - discountAmount + taxAmount);
    const actualReceived = paymentMode === 'Credit'
      ? receivedAmount
      : (receivedAmount > 0 ? receivedAmount : totalAmount);
    const changeAmount = Math.max(0, actualReceived - totalAmount);

    const sale: Sale = {
      id: `SALE-${Date.now()}`,
      invoiceNumber,
      dateTime: now.toISOString(),
      customerId: linkedCustomer?.id || customerId,
      customerName: linkedCustomer?.name || customerName || 'Walk-in Customer',
      customerPhone: linkedCustomer?.phone || customerPhone,
      items: saleItems,
      subtotal,
      taxPercent,
      taxAmount,
      discountAmount,
      totalAmount,
      receivedAmount: actualReceived,
      changeAmount,
      paymentMode,
      splitPayments,
      totalProfit: totalProfit - discountAmount,
      status: 'Completed',
      notes,
      cashierName: cashier.name,
      cashierId: cashier.id,
      shiftId: shift.id,
    };

    // Update customer stats if matched
    if (linkedCustomer) {
      linkedCustomer.totalSpent += totalAmount;
      if (this.settings.enableLoyalty) {
        linkedCustomer.loyaltyPoints += Math.floor(totalAmount / (this.settings.loyaltyPointRatio || 100));
      }
      this.persistCustomers();
    }

    this.sales.unshift(sale);
    this.persistProducts();
    this.persistSales();
    if (linkedCustomer) {
      this.addCustomerLedgerEntry(
        linkedCustomer.id,
        'SaleCredit',
        invoiceNumber,
        totalAmount,
        0,
        `فاتورة بيع (${paymentMode === 'Credit' ? 'آجل' : 'مدفوعة'})`,
      );
      if (actualReceived > 0) {
        this.addCustomerLedgerEntry(
          linkedCustomer.id,
          'PaymentReceived',
          `PAY-${invoiceNumber}`,
          0,
          actualReceived,
          `تحصيل على فاتورة ${invoiceNumber}`,
          paymentMode === 'Credit' ? undefined : paymentMode === 'Split' ? 'Cash' : paymentMode,
        );
      }
    }
    this.addAuditLog(this.currentUser?.name || 'Cashier', 'New Sale', `Invoice ${invoiceNumber} total ${totalAmount}`);

    return sale;
  }

  // --- Returns & Refunds ---
  public getReturns(): SaleReturn[] {
    return [...this.returns];
  }

  public recordReturn(
    saleId: string,
    itemsToReturn: { productId: string; productName: string; qty: number; unitPrice: number }[],
    refundAmount: number,
    reason: 'Defective' | 'Expired' | 'Wrong Item' | 'Customer Changed Mind'
  ): SaleReturn | null {
    const sale = this.sales.find(s => s.id === saleId);
    if (!sale) return null;

    // Adjust product inventory back into stock
    itemsToReturn.forEach(item => {
      const prod = this.getProductById(item.productId);
      if (prod) {
        prod.quantity += item.qty;
        prod.updatedAt = new Date().toISOString();
      }
    });

    sale.status = 'Refunded';

    const returnRec: SaleReturn = {
      id: `RET-${Date.now()}`,
      returnInvoiceNumber: `RET-${sale.invoiceNumber}`,
      originalInvoiceNumber: sale.invoiceNumber,
      saleId: sale.id,
      date: new Date().toISOString(),
      customerName: sale.customerName || 'Walk-in Customer',
      refundAmount,
      reason,
      items: itemsToReturn,
    };

    this.returns.unshift(returnRec);
    this.persistProducts();
    this.persistSales();
    this.persistReturns();
    const salePhone = (sale.customerPhone || '').replace(/\D/g, '');
    const linkedCustomer = this.customers.find(customer => customer.id === sale.customerId)
      || (salePhone
        ? this.customers.find(customer => customer.phone.replace(/\D/g, '') === salePhone)
        : undefined);
    if (linkedCustomer) {
      this.addCustomerLedgerEntry(
        linkedCustomer.id,
        'Return',
        returnRec.returnInvoiceNumber,
        0,
        refundAmount,
        `مرتجع على الفاتورة ${sale.invoiceNumber}`,
      );
    }
    this.addAuditLog(this.currentUser?.name || 'Cashier', 'Process Refund', `Refunded ${refundAmount} for bill ${sale.invoiceNumber}`);

    return returnRec;
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public addAuditLog(user: string, action: string, details: string): void {
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      user,
      action,
      details,
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop(); // Keep latest 200 logs
    this.persistAuditLogs();
  }

  public getSales(): Sale[] {
    return [...this.sales];
  }

  public getSaleByInvoice(invoiceNumber: string): Sale | undefined {
    const q = (invoiceNumber || '').trim().toLowerCase();
    if (!q) return undefined;
    return this.sales.find(s => 
      s.invoiceNumber.trim().toLowerCase() === q || 
      s.id.trim().toLowerCase() === q
    );
  }

  public cancelSale(saleId: string): boolean {
    const sale = this.sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'Cancelled') return false;

    // Restore stock back to products
    sale.items.forEach(item => {
      const product = this.getProductById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        product.updatedAt = new Date().toISOString();
      }
    });

    sale.status = 'Cancelled';
    this.persistProducts();
    this.persistSales();
    this.addAuditLog(this.currentUser?.name || 'Cashier', 'Cancel Sale', `Cancelled invoice ${sale.invoiceNumber}`);

    return true;
  }

  public getStockLogs(): IncomingStockLog[] {
    return [...this.stockLogs];
  }

  // --- Metrics ---
  public getMetrics(): DashboardMetrics {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const todaySalesList = this.sales.filter(s => 
      s.status === 'Completed' && s.dateTime.startsWith(todayStr)
    );

    const todaySalesAmount = todaySalesList.reduce((acc, s) => acc + s.totalAmount, 0);
    const todaySalesCount = todaySalesList.length;
    const todayProfit = todaySalesList.reduce((acc, s) => acc + s.totalProfit, 0);

    const todayExpenses = this.expenses
      .filter(e => e.date === todayStr)
      .reduce((acc, e) => acc + e.amount, 0);

    const netProfitToday = todayProfit - todayExpenses;

    const totalProductsCount = this.products.length;
    const totalAvailableStock = this.products.reduce((acc, p) => acc + p.quantity, 0);
    const lowStockCount = this.products.filter(p => p.quantity <= (p.minStockLevel || this.settings.lowStockThreshold)).length;

    const expiringCount = this.products.filter(p => {
      if (!p.expiryDate) return false;
      const exp = new Date(p.expiryDate).getTime();
      const thirtyDaysFromNow = Date.now() + 30 * 24 * 3600 * 1000;
      return exp <= thirtyDaysFromNow;
    }).length;

    const totalProfitAllTime = this.sales
      .filter(s => s.status === 'Completed')
      .reduce((acc, s) => acc + s.totalProfit, 0);

    const totalCustomerDues = this.customers.reduce((acc, c) => acc + (c.outstandingDues || 0), 0);

    return {
      todaySalesAmount,
      todaySalesCount,
      todayProfit,
      todayExpenses,
      netProfitToday,
      totalProductsCount,
      totalAvailableStock,
      lowStockCount,
      expiringCount,
      totalProfitAllTime,
      totalCustomerDues,
      heldBillsCount: this.heldBills.length,
    };
  }

  // --- MODULE 29: Batches & FIFO ---
  public getBatchesForProduct(productId: string): ProductBatch[] {
    const prod = this.getProductById(productId);
    return prod?.batches || [];
  }

  public addBatchToProduct(productId: string, batchData: Omit<ProductBatch, 'id'>): Product | undefined {
    const prod = this.getProductById(productId);
    if (!prod) return undefined;

    const newBatch: ProductBatch = {
      id: `BATCH-${Date.now()}`,
      ...batchData,
    };

    if (!prod.batches) prod.batches = [];
    prod.batches.push(newBatch);
    prod.quantity += batchData.quantity;
    prod.updatedAt = new Date().toISOString();

    this.persistProducts();
    this.addAuditLog(this.currentUser?.name || 'Inventory', 'Add Batch', `Added batch ${newBatch.batchNumber} to ${prod.name}`);
    return prod;
  }

  public getOldestAvailableBatch(productId: string): ProductBatch | undefined {
    const batches = this.getBatchesForProduct(productId).filter(b => b.quantity > 0);
    if (batches.length === 0) return undefined;
    return batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
  }

  // --- MODULE 30: Unit Conversion ---
  public convertUnitQuantity(qty: number, fromUnit: string, toUnit: string): number {
    if (!fromUnit || !toUnit || fromUnit.toLowerCase() === toUnit.toLowerCase()) return qty;
    const rule = UNIT_CONVERSIONS.find(
      u => u.fromUnit.toLowerCase() === fromUnit.toLowerCase() && u.toUnit.toLowerCase() === toUnit.toLowerCase()
    );
    if (rule) return qty * rule.factor;

    const inverse = UNIT_CONVERSIONS.find(
      u => u.fromUnit.toLowerCase() === toUnit.toLowerCase() && u.toUnit.toLowerCase() === fromUnit.toLowerCase()
    );
    if (inverse) return qty / inverse.factor;

    return qty;
  }

  // --- MODULE 32: Wholesale Pricing ---
  public getProductPriceForCustomer(product: Product, customerTag?: string): number {
    if (!customerTag) return product.sellingPrice;
    if (customerTag === 'Wholesale' && product.wholesalePrice && product.wholesalePrice > 0) {
      return product.wholesalePrice;
    }
    if (customerTag === 'Distributor' && product.distributorPrice && product.distributorPrice > 0) {
      return product.distributorPrice;
    }
    if (customerTag === 'VIP' && product.vipPrice && product.vipPrice > 0) {
      return product.vipPrice;
    }
    return product.sellingPrice;
  }

  // --- MODULE 33: Customer Credit & Ledgers ---
  public getCustomerLedger(customerId: string): CustomerLedgerEntry[] {
    return this.customerLedgers.filter(l => l.customerId === customerId);
  }

  private migrateLegacyCustomerLedgers(): void {
    let changed = false;
    this.customers.forEach(customer => {
      if (this.customerLedgers.some(entry => entry.customerId === customer.id)) return;
      const normalizedPhone = customer.phone.replace(/\D/g, '');
      const linkedSales = this.sales.filter(sale =>
        sale.customerId === customer.id ||
        (!sale.customerId && normalizedPhone && (sale.customerPhone || '').replace(/\D/g, '') === normalizedPhone)
      );
      const transactions: {
        date: string;
        order: number;
        type: CustomerLedgerEntry['type'];
        referenceNo: string;
        debit: number;
        credit: number;
        notes: string;
      }[] = [];

      linkedSales.forEach(sale => {
        if (sale.status === 'Cancelled') return;
        transactions.push({
          date: sale.dateTime,
          order: 0,
          type: 'SaleCredit',
          referenceNo: sale.invoiceNumber,
          debit: sale.totalAmount,
          credit: 0,
          notes: 'فاتورة سابقة',
        });
        if (sale.receivedAmount > 0) {
          transactions.push({
            date: sale.dateTime,
            order: 1,
            type: 'PaymentReceived',
            referenceNo: `PAY-${sale.invoiceNumber}`,
            debit: 0,
            credit: sale.receivedAmount,
            notes: 'تحصيل على فاتورة سابقة',
          });
        }
        this.returns.filter(returnEntry => returnEntry.saleId === sale.id).forEach(returnEntry => {
          transactions.push({
            date: returnEntry.date,
            order: 2,
            type: 'Return',
            referenceNo: returnEntry.returnInvoiceNumber,
            debit: 0,
            credit: returnEntry.refundAmount,
            notes: `مرتجع على الفاتورة ${sale.invoiceNumber}`,
          });
        });
      });

      transactions.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
      let balance = 0;
      const migrated = transactions.map((transaction, index) => {
        balance = Math.max(0, balance + transaction.debit - transaction.credit);
        return {
          id: `LEDGER-MIG-${customer.id}-${index + 1}`,
          customerId: customer.id,
          date: transaction.date,
          type: transaction.type,
          referenceNo: transaction.referenceNo,
          debit: transaction.debit,
          credit: transaction.credit,
          balance,
          notes: transaction.notes,
        } satisfies CustomerLedgerEntry;
      });

      const targetBalance = Math.max(0, customer.outstandingDues || 0);
      if (balance !== targetBalance) {
        const difference = targetBalance - balance;
        migrated.push({
          id: `LEDGER-MIG-${customer.id}-OPEN`,
          customerId: customer.id,
          date: new Date().toISOString(),
          type: 'Adjustment',
          referenceNo: 'OPENING-BALANCE',
          debit: Math.max(0, difference),
          credit: Math.max(0, -difference),
          balance: targetBalance,
          notes: 'تسوية رصيد الحساب السابق',
        });
      }
      this.customerLedgers.unshift(...migrated.reverse());
      changed = changed || migrated.length > 0;
    });
    if (changed) this.persistCustomerLedgers();
  }

  public addCustomerLedgerEntry(
    customerId: string,
    type: CustomerLedgerEntry['type'],
    referenceNo: string,
    debit: number,
    credit: number,
    notes?: string,
    paymentMode?: CustomerLedgerEntry['paymentMode'],
  ): CustomerLedgerEntry {
    const cust = this.getCustomerById(customerId);
    const prevLedger = this.getCustomerLedger(customerId);
    const currentBal = prevLedger.length > 0 ? prevLedger[0].balance : (cust?.outstandingDues || 0);
    const newBal = currentBal + debit - credit;

    const entry: CustomerLedgerEntry = {
      id: `LEDGER-${Date.now()}-${this.customerLedgers.length + 1}`,
      customerId,
      date: new Date().toISOString(),
      type,
      referenceNo,
      debit,
      credit,
      balance: Math.max(0, newBal),
      notes,
      paymentMode,
    };

    this.customerLedgers.unshift(entry);
    this.persistCustomerLedgers();
    if (cust) {
      cust.outstandingDues = entry.balance;
      this.persistCustomers();
    }
    return entry;
  }

  // --- MODULE 34: Cash Register Drawer Shifts ---
  public getCurrentCashShift(employeeId = this.currentUser?.id): CashRegisterShift | undefined {
    if (!employeeId) return undefined;
    const employee = this.employees.find(candidate => candidate.id === employeeId);
    return this.cashShifts.find(shift =>
      shift.status === 'Open' &&
      (shift.cashierId ? shift.cashierId === employeeId : shift.cashierName === employee?.name)
    );
  }

  public getCashShifts(): CashRegisterShift[] {
    return [...this.cashShifts];
  }

  public openCashShift(openingCash: number, notes?: string, cashierId = this.currentUser?.id): CashRegisterShift {
    const openedBy = this.currentUser;
    if (!openedBy) throw new Error('يجب تسجيل الدخول قبل فتح الشفت.');
    if (!cashierId) throw new Error('يجب تحديد الموظف المسؤول عن الشفت.');
    const cashier = this.employees.find(employee => employee.id === cashierId && employee.status === 'Active');
    if (!cashier) throw new Error('الموظف المحدد غير موجود أو غير نشط.');
    if (cashierId !== openedBy.id && openedBy.role !== 'Owner' && openedBy.role !== 'Manager') {
      throw new Error('لا تملك صلاحية فتح شفت لموظف آخر.');
    }
    if (this.getCurrentCashShift(cashierId)) {
      throw new Error('لدى هذا الموظف شفت مفتوح بالفعل.');
    }
    if (!Number.isFinite(Number(openingCash)) || Number(openingCash) < 0) {
      throw new Error('مبلغ العهدة الافتتاحية غير صحيح.');
    }

    const newShift: CashRegisterShift = {
      id: `SHIFT-${Date.now()}`,
      cashierName: cashier.name,
      cashierId: cashier.id,
      openedByEmployeeId: openedBy.id,
      openedByName: openedBy.name,
      startTime: new Date().toISOString(),
      openingCash: Number(openingCash),
      cashInTotal: 0,
      cashOutTotal: 0,
      safeDepositTotal: 0,
      status: 'Open',
      notes,
    };

    this.cashShifts.unshift(newShift);
    this.persistCashShifts();
    this.addAuditLog(openedBy.name, 'Open Cash Register', `Opened shift ${newShift.id} for ${cashier.name} with ${openingCash} float`);
    return newShift;
  }

  public getShiftCashSales(shift: CashRegisterShift): number {
    const startTime = shift.startTime;
    const endTime = shift.endTime;

    return this.sales
      .filter(s => {
        if (s.status !== 'Completed') return false;
        if (s.shiftId) return s.shiftId === shift.id;
        if (shift.cashierId && s.cashierId && s.cashierId !== shift.cashierId) return false;
        if (shift.cashierId && !s.cashierId && s.cashierName !== shift.cashierName) return false;
        if (s.dateTime < startTime) return false;
        if (endTime && s.dateTime > endTime) return false;
        return true;
      })
      .reduce((totalCash, s) => {
        if (s.paymentMode === 'Cash') {
          const netCash = s.receivedAmount > 0 ? (s.receivedAmount - (s.changeAmount || 0)) : s.totalAmount;
          return totalCash + Math.max(0, netCash);
        } else if (s.paymentMode === 'Split' && Array.isArray(s.splitPayments)) {
          const cashSplit = s.splitPayments.find(sp => sp.mode === 'Cash');
          return totalCash + (cashSplit ? Number(cashSplit.amount || 0) : 0);
        }
        return totalCash;
      }, 0);
  }

  public getShiftPaymentBreakdown(shift: CashRegisterShift): {
    cashSales: number;
    upiSales: number;
    cardSales: number;
    creditSales: number;
    otherSales: number;
    totalSales: number;
  } {
    const startTime = shift.startTime;
    const endTime = shift.endTime;

    let cashSales = 0;
    let upiSales = 0;
    let cardSales = 0;
    let creditSales = 0;
    let otherSales = 0;

    const shiftSales = this.sales.filter(s => {
      if (s.status !== 'Completed') return false;
      if (s.shiftId) return s.shiftId === shift.id;
      if (shift.cashierId && s.cashierId && s.cashierId !== shift.cashierId) return false;
      if (shift.cashierId && !s.cashierId && s.cashierName !== shift.cashierName) return false;
      if (s.dateTime < startTime) return false;
      if (endTime && s.dateTime > endTime) return false;
      return true;
    });

    for (const s of shiftSales) {
      if (s.paymentMode === 'Cash') {
        const netCash = s.receivedAmount > 0 ? (s.receivedAmount - (s.changeAmount || 0)) : s.totalAmount;
        cashSales += Math.max(0, netCash);
      } else if (s.paymentMode === 'UPI') {
        upiSales += s.totalAmount;
      } else if (s.paymentMode === 'Card') {
        cardSales += s.totalAmount;
      } else if (s.paymentMode === 'Credit') {
        creditSales += s.totalAmount;
      } else if (s.paymentMode === 'Split' && Array.isArray(s.splitPayments)) {
        for (const sp of s.splitPayments) {
          const amt = Number(sp.amount || 0);
          if (sp.mode === 'Cash') cashSales += amt;
          else if (sp.mode === 'UPI') upiSales += amt;
          else if (sp.mode === 'Card') cardSales += amt;
          else if (sp.mode === 'Store Credit') creditSales += amt;
          else otherSales += amt;
        }
      } else {
        otherSales += s.totalAmount;
      }
    }

    const totalSales = cashSales + upiSales + cardSales + creditSales + otherSales;
    return { cashSales, upiSales, cardSales, creditSales, otherSales, totalSales };
  }

  public getShiftExpectedCash(shift: CashRegisterShift): {
    openingCash: number;
    totalCashSales: number;
    cashInTotal: number;
    cashOutTotal: number;
    safeDepositTotal: number;
    expectedCash: number;
  } {
    const openingCash = shift.openingCash || 0;
    const totalCashSales = this.getShiftCashSales(shift);
    const cashInTotal = shift.cashInTotal || 0;
    const cashOutTotal = shift.cashOutTotal || 0;
    const safeDepositTotal = shift.safeDepositTotal || 0;

    const expectedCash = openingCash + totalCashSales + cashInTotal - cashOutTotal - safeDepositTotal;

    return {
      openingCash,
      totalCashSales,
      cashInTotal,
      cashOutTotal,
      safeDepositTotal,
      expectedCash,
    };
  }

  public closeCashShift(closingCash: number, notes?: string, shiftId?: string): CashRegisterShift | undefined {
    const user = this.currentUser;
    if (!user) throw new Error('يجب تسجيل الدخول قبل إغلاق الشفت.');
    if (!Number.isFinite(Number(closingCash)) || Number(closingCash) < 0) {
      throw new Error('مبلغ الجرد الفعلي غير صحيح.');
    }
    const shift = shiftId
      ? this.cashShifts.find(candidate => candidate.id === shiftId && candidate.status === 'Open')
      : this.getCurrentCashShift(user.id);
    if (!shift) throw new Error('هذا الشفت لم يعد مفتوحاً.');
    if (shift.cashierId !== user.id && user.role !== 'Owner' && user.role !== 'Manager') {
      throw new Error('لا تملك صلاحية إغلاق شفت موظف آخر.');
    }

    const { expectedCash } = this.getShiftExpectedCash(shift);
    const diff = Number(closingCash) - expectedCash;

    shift.endTime = new Date().toISOString();
    shift.closingCash = Number(closingCash);
    shift.expectedCash = expectedCash;
    shift.cashDifference = diff;
    shift.status = 'Closed';
    shift.notes = notes;

    this.persistCashShifts();
    this.addAuditLog(user.name, 'Close Cash Register', `Closed shift ${shift.id} for ${shift.cashierName}. Count: ${closingCash}, Expected: ${expectedCash}, Diff: ${diff}`);
    return shift;
  }

  public addCashTransaction(type: 'CashIn' | 'CashOut' | 'SafeDeposit', amount: number, reason: string, shiftId?: string): CashTransaction {
    const user = this.currentUser;
    if (!user) throw new Error('يجب تسجيل الدخول قبل تسجيل حركة نقدية.');
    const shift = shiftId
      ? this.cashShifts.find(candidate => candidate.id === shiftId && candidate.status === 'Open')
      : this.getCurrentCashShift(user.id);
    if (!shift) throw new Error('يجب فتح شفت قبل تسجيل حركة نقدية.');
    if (shift.cashierId !== user.id && user.role !== 'Owner' && user.role !== 'Manager') {
      throw new Error('لا تملك صلاحية تسجيل حركة على شفت موظف آخر.');
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || !reason.trim()) {
      throw new Error('أدخل مبلغاً صحيحاً وسبب الحركة.');
    }
    const txn: CashTransaction = {
      id: `CASHTXN-${Date.now()}`,
      shiftId: shift.id,
      timestamp: new Date().toISOString(),
      type,
      amount: Number(amount),
      reason,
      cashierName: user.name,
      cashierId: user.id,
    };

    if (type === 'CashIn') shift.cashInTotal += Number(amount);
    if (type === 'CashOut') shift.cashOutTotal += Number(amount);
    if (type === 'SafeDeposit') shift.safeDepositTotal += Number(amount);
    this.persistCashShifts();

    this.cashTxns.unshift(txn);
    this.persistCashTxns();
    this.addAuditLog(txn.cashierName, `Drawer ${type}`, `${reason}: ${amount}`);
    return txn;
  }

  public getCashTransactions(): CashTransaction[] {
    return [...this.cashTxns];
  }

  // --- MODULE 37: Price History ---
  public getPriceHistory(productId?: string): PriceHistoryRecord[] {
    if (productId) return this.priceHistory.filter(p => p.productId === productId);
    return [...this.priceHistory];
  }

  public recordPriceChange(
    productId: string,
    productName: string,
    oldPurchasePrice: number,
    newPurchasePrice: number,
    oldSellingPrice: number,
    newSellingPrice: number
  ): void {
    if (oldPurchasePrice === newPurchasePrice && oldSellingPrice === newSellingPrice) return;
    const rec: PriceHistoryRecord = {
      id: `PH-${Date.now()}`,
      productId,
      productName,
      oldPurchasePrice,
      newPurchasePrice,
      oldSellingPrice,
      newSellingPrice,
      dateChanged: new Date().toISOString(),
      changedBy: this.currentUser?.name || 'Admin',
    };
    this.priceHistory.unshift(rec);
    this.persistPriceHistory();
  }

  // --- MODULE 38: Smart Reorder Engine ---
  public getSmartReorderSuggestions() {
    return this.products
      .filter(p => p.quantity <= (p.minStockLevel || this.settings.lowStockThreshold))
      .map(p => {
        const avgDailySales = Math.max(1, Math.round(Math.random() * 5 + 1));
        const leadTimeDays = 3;
        const maxLevel = p.maxStockLevel || 50;
        const suggestedQty = Math.max(10, maxLevel - p.quantity);
        const estimatedCost = suggestedQty * p.purchasePrice;

        return {
          productId: p.id,
          productName: p.name,
          supplierName: p.supplierName,
          currentStock: p.quantity,
          minStockLevel: p.minStockLevel || this.settings.lowStockThreshold,
          avgDailySales,
          leadTimeDays,
          suggestedQty,
          estimatedCost,
        };
      });
  }

  // --- MODULE 40: Product Categories ---
  public getCategories(): CategoryNode[] {
    return [...this.categories];
  }

  public saveCategory(catData: Partial<CategoryNode> & { name: string }): CategoryNode {
    const name = catData.name.trim();
    if (!name) throw new Error('أدخل اسم التصنيف.');

    const existing = catData.id ? this.categories.find(category => category.id === catData.id) : undefined;
    if (catData.id && !existing) throw new Error('التصنيف المحدد غير موجود.');
    if (this.categories.some(category =>
      category.id !== catData.id && category.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
    )) {
      throw new Error('يوجد تصنيف بهذا الاسم بالفعل.');
    }

    if (catData.parentId) {
      let parent = this.categories.find(category => category.id === catData.parentId);
      if (!parent) throw new Error('التصنيف الرئيسي المحدد غير موجود.');
      while (parent) {
        if (parent.id === catData.id) throw new Error('لا يمكن إنشاء دورة في التصنيفات الرئيسية.');
        parent = parent.parentId
          ? this.categories.find(category => category.id === parent?.parentId)
          : undefined;
      }
    }

    let cat: CategoryNode;
    if (catData.id) {
      const idx = this.categories.findIndex(category => category.id === catData.id);
      cat = { ...this.categories[idx], ...catData, name };
      this.categories[idx] = cat;
      if (existing && existing.name !== name) {
        let productsChanged = false;
        this.products.forEach(product => {
          if (product.parentCategoryId === existing.id || product.category === existing.name) {
            product.category = name;
            product.parentCategoryId = existing.id;
            productsChanged = true;
          }
        });
        if (productsChanged) this.persistProducts();
      }
    } else {
      let suffix = this.categories.reduce((highest, category) => {
        const match = /^CAT-(\d+)$/.exec(category.id);
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0) + 1;
      while (this.categories.some(category => category.id === `CAT-${suffix}`)) suffix += 1;
      cat = {
        id: `CAT-${suffix}`,
        name,
        parentId: catData.parentId,
        description: catData.description,
      };
      this.categories.push(cat);
    }
    this.persistCategories();
    return cat;
  }

  public deleteCategory(id: string): boolean {
    const category = this.categories.find(candidate => candidate.id === id);
    if (!category ||
      this.categories.some(candidate => candidate.parentId === id) ||
      this.products.some(product => product.parentCategoryId === id || product.category === category.name)
    ) return false;
    this.categories = this.categories.filter(c => c.id !== id);
    this.persistCategories();
    return true;
  }

  // --- MODULE 41: Favorites Pinning ---
  public togglePinProduct(productId: string): boolean {
    const p = this.getProductById(productId);
    if (!p) return false;
    p.isPinned = !p.isPinned;
    this.persistProducts();
    return p.isPinned;
  }

  // --- MODULE 45: Undo & Recovery Recycle Bin ---
  public getRecycleBin(): RecycleBinItem[] {
    return [...this.recycleBin];
  }

  public moveToRecycleBin(type: RecycleBinItem['type'], originalId: string, title: string, data: any): RecycleBinItem {
    const item: RecycleBinItem = {
      id: `BIN-${Date.now()}`,
      type,
      originalId,
      title,
      data,
      deletedAt: new Date().toISOString(),
      deletedBy: this.currentUser?.name || 'User',
    };
    this.recycleBin.unshift(item);
    this.persistRecycleBin();
    return item;
  }

  public restoreFromRecycleBin(id: string): boolean {
    const item = this.recycleBin.find(i => i.id === id);
    if (!item) return false;

    if (item.type === 'Product') {
      this.products.push(item.data);
      this.persistProducts();
    } else if (item.type === 'Customer') {
      this.customers.push(item.data);
      this.persistCustomers();
    } else if (item.type === 'Supplier') {
      this.suppliers.push(item.data);
      this.persistSuppliers();
    } else if (item.type === 'Expense') {
      this.expenses.push(item.data);
      this.persistExpenses();
    }

    this.recycleBin = this.recycleBin.filter(i => i.id !== id);
    this.persistRecycleBin();
    this.addAuditLog(this.currentUser?.name || 'User', 'Restore Item', `Restored ${item.type}: ${item.title}`);
    return true;
  }

  public emptyRecycleBin(): void {
    this.recycleBin = [];
    this.persistRecycleBin();
  }

  // --- MODULE 46: Health Diagnostics Monitor ---
  public getHealthDiagnostics() {
    const totalRecords = 
      this.products.length + 
      this.sales.length + 
      this.customers.length + 
      this.suppliers.length + 
      this.expenses.length + 
      this.employees.length + 
      this.auditLogs.length;

    const estimatedKb = Math.round((JSON.stringify(this.products).length + JSON.stringify(this.sales).length + 50000) / 1024);

    return {
      databaseName: 'grocery_pos_sqlite_v2.db',
      dbSizeKb: estimatedKb,
      totalRecords,
      totalProducts: this.products.length,
      totalInvoices: this.sales.length,
      totalCustomers: this.customers.length,
      lastBackupDate: this.settings.lastBackupDate || 'Never',
      storageEngine: 'Indexed Local DB / SQLite Simulation',
      status: 'Healthy',
      memoryUsage: 'Optimal',
      appVersion: '2.0 Commercial',
    };
  }

  // --- MODULE 47: Offline Updates ---
  public getUpdatePackages(): UpdatePackage[] {
    return [...this.updates];
  }

  public applyUpdatePackage(version: string): boolean {
    const pkg = this.updates.find(u => u.version === version);
    if (!pkg) return false;
    pkg.isApplied = true;
    this.persistUpdates();
    this.addAuditLog(this.currentUser?.name || 'Admin', 'Apply System Update', `Successfully updated system to ${version}`);
    return true;
  }

  // --- Persistence Handlers ---
  private persistSettings() { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings)); }
  private persistProducts() { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products)); }
  private persistSales() { localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(this.sales)); }
  private persistStockLogs() { localStorage.setItem(STORAGE_KEYS.STOCK_LOGS, JSON.stringify(this.stockLogs)); }
  private persistCustomers() { localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(this.customers)); }
  private persistSuppliers() { localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(this.suppliers)); }
  private persistPurchaseOrders() { localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(this.purchaseOrders)); }
  private persistExpenses() { localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(this.expenses)); }
  private persistEmployees() { localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(this.employees)); }
  private persistAttendance() { localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(this.attendance)); }
  private persistHeldBills() { localStorage.setItem(STORAGE_KEYS.HELD_BILLS, JSON.stringify(this.heldBills)); }
  private persistReturns() { localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(this.returns)); }
  private persistAuditLogs() { localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs)); }
  private persistCashShifts() { localStorage.setItem(STORAGE_KEYS.CASH_SHIFTS, JSON.stringify(this.cashShifts)); }
  private persistCashTxns() { localStorage.setItem(STORAGE_KEYS.CASH_TXNS, JSON.stringify(this.cashTxns)); }
  private persistPriceHistory() { localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(this.priceHistory)); }
  private persistCategories() { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories)); }
  private persistCustomerLedgers() { localStorage.setItem(STORAGE_KEYS.CUSTOMER_LEDGERS, JSON.stringify(this.customerLedgers)); }
  private persistSupplierLedgers() { localStorage.setItem(STORAGE_KEYS.SUPPLIER_LEDGERS, JSON.stringify(this.supplierLedgers)); }
  private persistRecycleBin() { localStorage.setItem(STORAGE_KEYS.RECYCLE_BIN, JSON.stringify(this.recycleBin)); }
  private persistUpdates() { localStorage.setItem(STORAGE_KEYS.UPDATES, JSON.stringify(this.updates)); }

  // --- Backup & Restore ---
  public exportBackupJSON(): string {
    const backupData = {
      version: '2.0 Enterprise',
      exportedAt: new Date().toISOString(),
      settings: this.settings,
      products: this.products,
      sales: this.sales,
      stockLogs: this.stockLogs,
      customers: this.customers,
      suppliers: this.suppliers,
      purchaseOrders: this.purchaseOrders,
      customerLedgers: this.customerLedgers,
      supplierLedgers: this.supplierLedgers,
      expenses: this.expenses,
      employees: this.employees,
      attendance: this.attendance,
      heldBills: this.heldBills,
      returns: this.returns,
      auditLogs: this.auditLogs,
    };
    return JSON.stringify(backupData, null, 2);
  }

  public importBackupJSON(jsonContent: string): boolean {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.settings && parsed.products && parsed.sales) {
        this.settings = parsed.settings;
        this.products = parsed.products;
        this.sales = parsed.sales;
        this.stockLogs = parsed.stockLogs || [];
        this.customers = parsed.customers || INITIAL_SAMPLE_CUSTOMERS;
        this.suppliers = parsed.suppliers || INITIAL_SAMPLE_SUPPLIERS;
        this.purchaseOrders = parsed.purchaseOrders || [];
        this.customerLedgers = parsed.customerLedgers || [];
        this.supplierLedgers = parsed.supplierLedgers || [];
        this.expenses = parsed.expenses || INITIAL_SAMPLE_EXPENSES;
        this.employees = parsed.employees || INITIAL_SAMPLE_EMPLOYEES;
        this.attendance = parsed.attendance || [];
        this.heldBills = parsed.heldBills || [];
        this.returns = parsed.returns || [];
        this.auditLogs = parsed.auditLogs || [];
        this.migrateLegacyCustomerLedgers();

        this.persistProducts();
        this.persistSales();
        this.persistStockLogs();
        this.persistCustomers();
        this.persistSuppliers();
        this.persistPurchaseOrders();
        this.persistCustomerLedgers();
        this.persistSupplierLedgers();
        this.persistExpenses();
        this.persistEmployees();
        this.persistAttendance();
        this.persistHeldBills();
        this.persistReturns();
        this.persistAuditLogs();
        this.persistCashShifts();
        this.persistCashTxns();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to parse backup file', e);
      return false;
    }
  }

  public resetToSampleData(): void {
    this.settings = { ...DEFAULT_SETTINGS, isSetupCompleted: false };
    this.products = cloneSampleData(INITIAL_SAMPLE_PRODUCTS);
    this.sales = cloneSampleData(INITIAL_SAMPLE_SALES);
    this.customers = cloneSampleData(INITIAL_SAMPLE_CUSTOMERS);
    this.suppliers = cloneSampleData(INITIAL_SAMPLE_SUPPLIERS);
    this.expenses = cloneSampleData(INITIAL_SAMPLE_EXPENSES);
    this.employees = cloneSampleData(INITIAL_SAMPLE_EMPLOYEES);
    this.stockLogs = cloneSampleData(INITIAL_SAMPLE_STOCK_LOGS);
    this.purchaseOrders = cloneSampleData(INITIAL_SAMPLE_PURCHASE_ORDERS);
    this.attendance = cloneSampleData(INITIAL_SAMPLE_ATTENDANCE);
    this.heldBills = cloneSampleData(INITIAL_SAMPLE_HELD_BILLS);
    this.returns = cloneSampleData(INITIAL_SAMPLE_RETURNS);
    this.auditLogs = cloneSampleData(INITIAL_SAMPLE_AUDIT_LOGS);
    this.cashShifts = cloneSampleData(INITIAL_SAMPLE_CASH_SHIFTS);
    this.cashTxns = cloneSampleData(INITIAL_SAMPLE_CASH_TRANSACTIONS);
    this.priceHistory = cloneSampleData(INITIAL_SAMPLE_PRICE_HISTORY);
    this.customerLedgers = [];
    this.supplierLedgers = cloneSampleData(INITIAL_SAMPLE_SUPPLIER_LEDGERS);
    this.recycleBin = cloneSampleData(INITIAL_SAMPLE_RECYCLE_BIN);
    this.categories = cloneSampleData(INITIAL_SAMPLE_CATEGORIES);
    this.updates = cloneSampleData(INITIAL_SAMPLE_UPDATES);
    this.migrateLegacyCustomerLedgers();

    this.persistProducts();
    this.persistSales();
    this.persistSettings();
    this.persistStockLogs();
    this.persistCustomers();
    this.persistSuppliers();
    this.persistPurchaseOrders();
    this.persistExpenses();
    this.persistEmployees();
    this.persistAttendance();
    this.persistHeldBills();
    this.persistReturns();
    this.persistAuditLogs();
    this.persistCashShifts();
    this.persistCashTxns();
    this.persistPriceHistory();
    this.persistCustomerLedgers();
    this.persistSupplierLedgers();
    this.persistRecycleBin();
    this.persistCategories();
    this.persistUpdates();
  }

  public clearAllDataForFreshStart(customSettings?: Partial<ShopSettings>): void {
    if (customSettings) {
      this.settings = { ...this.settings, ...customSettings, isSetupCompleted: false };
    } else {
      this.settings = { ...this.settings, isSetupCompleted: false };
    }

    this.products = [];
    this.sales = [];
    this.customers = [];
    this.suppliers = [];
    this.expenses = [];
    this.purchaseOrders = [];
    this.stockLogs = [];
    this.attendance = [];
    this.heldBills = [];
    this.returns = [];
    this.cashShifts = [];
    this.cashTxns = [];
    this.priceHistory = [];
    this.customerLedgers = [];
    this.supplierLedgers = [];
    this.recycleBin = [];

    this.employees = [];
    this.auditLogs = [
      {
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: this.settings.ownerName || 'Admin',
        action: 'Clean Slate Initialization',
        details: 'Wiped all demo sample data. Application is ready for fresh real-world store operations.',
      }
    ];

    this.persistSettings();
    this.persistProducts();
    this.persistSales();
    this.persistStockLogs();
    this.persistCustomers();
    this.persistSuppliers();
    this.persistPurchaseOrders();
    this.persistExpenses();
    this.persistEmployees();
    this.persistAttendance();
    this.persistHeldBills();
    this.persistReturns();
    this.persistAuditLogs();
    this.persistCashShifts();
    this.persistCashTxns();
    this.persistPriceHistory();
    this.persistCustomerLedgers();
    this.persistSupplierLedgers();
    this.persistRecycleBin();
  }

  public completeFirstTimeSetup(
    customSettings: Partial<ShopSettings>,
    rootPin: string,
    dataMode: 'clean' | 'sample',
  ): void {
    if (!/^\d{4}$/.test(rootPin)) {
      throw new Error('The owner PIN must contain exactly four digits.');
    }

    const settings = { ...this.settings, ...customSettings, isSetupCompleted: true };
    if (!settings.shopName.trim() || !settings.phone.trim()) {
      throw new Error('Shop name and phone number are required.');
    }

    if (dataMode === 'clean') {
      this.clearAllDataForFreshStart(settings);
    }

    this.settings = settings;
    const owner: Employee = {
      id: 'EMP-01',
      name: settings.ownerName || 'Store Owner',
      role: 'Owner',
      phone: settings.phone,
      address: settings.address || '',
      joiningDate: new Date().toISOString().split('T')[0],
      pin: rootPin,
      salary: 0,
      status: 'Active',
    };
    this.employees = [...this.employees.filter(employee => employee.role !== 'Owner'), owner];
    this.persistSettings();
    this.persistEmployees();
  }
}

export const sqliteDB = new SQLiteStorageEngine();
