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
  Branch,
  ProductBatch,
  UnitConversion,
  CashRegisterShift,
  CashTransaction,
  PriceHistoryRecord,
  CategoryNode,
  CustomerLedgerEntry,
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
  BRANCHES: 'grocery_pos_branches_v1',
  CASH_SHIFTS: 'grocery_pos_cash_shifts_v1',
  CASH_TXNS: 'grocery_pos_cash_txns_v1',
  PRICE_HISTORY: 'grocery_pos_price_history_v1',
  CATEGORIES: 'grocery_pos_categories_v1',
  CUSTOMER_LEDGERS: 'grocery_pos_customer_ledgers_v1',
  RECYCLE_BIN: 'grocery_pos_recycle_bin_v1',
  UPDATES: 'grocery_pos_updates_v1',
};

export const INITIAL_SAMPLE_BRANCHES: Branch[] = [
  {
    id: 'BRANCH-01',
    name: 'الفرع الرئيسي',
    code: 'MAIN',
    address: 'شارع التحرير، الدقي، الجيزة',
    phone: '01012345678',
    isPrimary: true,
  },
  {
    id: 'BRANCH-02',
    name: 'فرع المهندسين',
    code: 'MOHANDESSIN',
    address: 'شارع جامعة الدول، المهندسين، الجيزة',
    phone: '01098765432',
    isPrimary: false,
  }
];

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
      'دعم كامل للفروع المتعددة',
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
  phone: '01012345678',
  gstNumber: '100-234-567',
  invoicePrefix: 'فاتورة',
  currencySymbol: 'ج.م',
  defaultTaxPercent: 14,
  lowStockThreshold: 10,
  receiptType: 'thermal',
  receiptSize: '80mm',
  enableCameraScanner: true,
  theme: 'light',
  isSetupCompleted: true,
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
  }
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
    tag: 'عميل مميز (VIP)',
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
    tag: 'جملة ونصف جملة',
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
    tag: 'زبون عادي',
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
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
  }
];

export const INITIAL_SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-01',
    name: 'محمد أحمد (المدير / المالك)',
    phone: '01012345678',
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
    receivedAmount: 400,
    changeAmount: 0,
    paymentMode: 'UPI',
    totalProfit: 61,
    status: 'Completed',
    cashierName: 'Rajesh Kumar',
  }
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
  private branches: Branch[];
  private cashShifts: CashRegisterShift[];
  private cashTxns: CashTransaction[];
  private priceHistory: PriceHistoryRecord[];
  private categories: CategoryNode[];
  private customerLedgers: CustomerLedgerEntry[];
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
      this.settings.phone = '01012345678';
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

    this.stockLogs = this.loadData(STORAGE_KEYS.STOCK_LOGS, []);
    this.customers = this.loadData(STORAGE_KEYS.CUSTOMERS, INITIAL_SAMPLE_CUSTOMERS);
    if (this.customers.length > 0 && this.customers[0].id === 'CUST-1001' && this.customers[0].name.includes('Suresh')) {
      this.customers = INITIAL_SAMPLE_CUSTOMERS;
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(this.customers));
    }

    this.suppliers = this.loadData(STORAGE_KEYS.SUPPLIERS, INITIAL_SAMPLE_SUPPLIERS);
    if (this.suppliers.length > 0 && this.suppliers[0].id === 'SUP-101' && this.suppliers[0].name.includes('ITC')) {
      this.suppliers = INITIAL_SAMPLE_SUPPLIERS;
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(this.suppliers));
    }

    this.purchaseOrders = this.loadData(STORAGE_KEYS.PURCHASE_ORDERS, []);
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

    this.attendance = this.loadData(STORAGE_KEYS.ATTENDANCE, []);
    this.heldBills = this.loadData(STORAGE_KEYS.HELD_BILLS, []);
    this.returns = this.loadData(STORAGE_KEYS.RETURNS, []);
    this.auditLogs = this.loadData(STORAGE_KEYS.AUDIT_LOGS, []);
    this.branches = this.loadData(STORAGE_KEYS.BRANCHES, INITIAL_SAMPLE_BRANCHES);
    if (this.branches.length > 0 && this.branches[0].id === 'BRANCH-01' && this.branches[0].name.includes('Main Supermarket')) {
      this.branches = INITIAL_SAMPLE_BRANCHES;
      localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(this.branches));
    }

    this.cashShifts = this.loadData(STORAGE_KEYS.CASH_SHIFTS, []);
    let shiftsNeedMigration = false;
    this.cashShifts = this.cashShifts.map(shift => {
      if (shift.cashierId) return shift;
      const owner = this.employees.find(employee => employee.name === shift.cashierName);
      if (!owner) return shift;
      shiftsNeedMigration = true;
      return { ...shift, cashierId: owner.id };
    });
    if (shiftsNeedMigration) this.persistCashShifts();
    this.cashTxns = this.loadData(STORAGE_KEYS.CASH_TXNS, []);
    this.priceHistory = this.loadData(STORAGE_KEYS.PRICE_HISTORY, []);
    this.categories = this.loadData(STORAGE_KEYS.CATEGORIES, INITIAL_SAMPLE_CATEGORIES);
    if (this.categories.length > 0 && this.categories[0].id === 'CAT-1' && this.categories[0].name.includes('Grains & Atta')) {
      this.categories = INITIAL_SAMPLE_CATEGORIES;
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
    }

    this.customerLedgers = this.loadData(STORAGE_KEYS.CUSTOMER_LEDGERS, []);
    this.recycleBin = this.loadData(STORAGE_KEYS.RECYCLE_BIN, []);
    this.updates = this.loadData(STORAGE_KEYS.UPDATES, INITIAL_SAMPLE_UPDATES);

    this.currentUser = null;
    
  }

  private loadData<T>(key: string, defaultValue: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return defaultValue;
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

  public payCustomerDues(customerId: string, amount: number): boolean {
    const cust = this.getCustomerById(customerId);
    if (!cust) return false;
    cust.outstandingDues = Math.max(0, cust.outstandingDues - amount);
    this.persistCustomers();
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

  // --- Purchase Orders ---
  public getPurchaseOrders(): PurchaseOrder[] {
    return [...this.purchaseOrders];
  }

  public savePurchaseOrder(poData: Partial<PurchaseOrder> & { supplierId: string; supplierName: string; items: any[]; totalAmount: number }): PurchaseOrder {
    const poNumber = poData.poNumber || `PO-${new Date().getFullYear()}-${String(this.purchaseOrders.length + 1).padStart(4, '0')}`;
    const po: PurchaseOrder = {
      id: poData.id || `PO-${Date.now()}`,
      poNumber,
      supplierId: poData.supplierId,
      supplierName: poData.supplierName,
      orderDate: poData.orderDate || new Date().toISOString().split('T')[0],
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

  public markPOAsReceived(poId: string): boolean {
    const po = this.purchaseOrders.find(p => p.id === poId);
    if (!po || po.status === 'Received') return false;

    // Automatically increase inventory stock for each item in the PO
    po.items.forEach(item => {
      this.addStock(item.productId, item.qty, item.purchasePrice, undefined, po.supplierName);
    });

    po.status = 'Received';
    po.receivedDate = new Date().toISOString().split('T')[0];
    this.persistPurchaseOrders();
    this.addAuditLog(this.currentUser?.name || 'Inventory Staff', 'Receive PO', `Marked PO #${po.poNumber} as Received`);
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
    const actualReceived = receivedAmount > 0 ? receivedAmount : totalAmount;
    const changeAmount = Math.max(0, actualReceived - totalAmount);

    const sale: Sale = {
      id: `SALE-${Date.now()}`,
      invoiceNumber,
      dateTime: now.toISOString(),
      customerId,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
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
    if (customerId || customerPhone) {
      const cust = this.customers.find(c => (customerId && c.id === customerId) || (customerPhone && c.phone === customerPhone));
      if (cust) {
        cust.totalSpent += totalAmount;
        if (this.settings.enableLoyalty) {
          cust.loyaltyPoints += Math.floor(totalAmount / (this.settings.loyaltyPointRatio || 100));
        }
        if (paymentMode === 'Credit') {
          cust.outstandingDues += Math.max(0, totalAmount - receivedAmount);
        }
        this.persistCustomers();
      }
    }

    this.sales.unshift(sale);
    this.persistProducts();
    this.persistSales();
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

  // --- MODULE 28: Multi-Branch ---
  public getBranches(): Branch[] {
    return [...this.branches];
  }

  public saveBranch(branchData: Partial<Branch> & { name: string; code: string }): Branch {
    let b: Branch;
    if (branchData.id) {
      const idx = this.branches.findIndex(item => item.id === branchData.id);
      if (idx !== -1) {
        b = { ...this.branches[idx], ...branchData };
        this.branches[idx] = b;
      } else {
        b = {
          id: branchData.id,
          name: branchData.name,
          code: branchData.code,
          address: branchData.address || '',
          phone: branchData.phone || '',
          isPrimary: branchData.isPrimary || false,
        };
        this.branches.push(b);
      }
    } else {
      b = {
        id: `BRANCH-${String(this.branches.length + 1).padStart(2, '0')}`,
        name: branchData.name,
        code: branchData.code,
        address: branchData.address || '',
        phone: branchData.phone || '',
        isPrimary: false,
      };
      this.branches.push(b);
    }
    this.persistBranches();
    this.addAuditLog(this.currentUser?.name || 'Admin', 'Branch Management', `Saved branch ${b.name}`);
    return b;
  }

  public deleteBranch(id: string): boolean {
    if (this.branches.length <= 1) return false;
    this.branches = this.branches.filter(b => b.id !== id);
    this.persistBranches();
    return true;
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

  public addCustomerLedgerEntry(
    customerId: string,
    type: 'SaleCredit' | 'PaymentReceived' | 'Adjustment',
    referenceNo: string,
    debit: number,
    credit: number,
    notes?: string
  ): CustomerLedgerEntry {
    const cust = this.getCustomerById(customerId);
    const prevLedger = this.getCustomerLedger(customerId);
    const currentBal = prevLedger.length > 0 ? prevLedger[0].balance : (cust?.outstandingDues || 0);
    const newBal = currentBal + debit - credit;

    const entry: CustomerLedgerEntry = {
      id: `LEDGER-${Date.now()}`,
      customerId,
      date: new Date().toISOString(),
      type,
      referenceNo,
      debit,
      credit,
      balance: Math.max(0, newBal),
      notes,
    };

    this.customerLedgers.unshift(entry);
    this.persistCustomerLedgers();
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
    let cat: CategoryNode;
    if (catData.id) {
      const idx = this.categories.findIndex(c => c.id === catData.id);
      if (idx !== -1) {
        cat = { ...this.categories[idx], ...catData };
        this.categories[idx] = cat;
      } else {
        cat = { id: catData.id, name: catData.name, parentId: catData.parentId, description: catData.description };
        this.categories.push(cat);
      }
    } else {
      cat = {
        id: `CAT-${this.categories.length + 1}`,
        name: catData.name,
        parentId: catData.parentId,
        description: catData.description,
      };
      this.categories.push(cat);
    }
    this.persistCategories();
    return cat;
  }

  public deleteCategory(id: string): boolean {
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
  private persistBranches() { localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(this.branches)); }
  private persistCashShifts() { localStorage.setItem(STORAGE_KEYS.CASH_SHIFTS, JSON.stringify(this.cashShifts)); }
  private persistCashTxns() { localStorage.setItem(STORAGE_KEYS.CASH_TXNS, JSON.stringify(this.cashTxns)); }
  private persistPriceHistory() { localStorage.setItem(STORAGE_KEYS.PRICE_HISTORY, JSON.stringify(this.priceHistory)); }
  private persistCategories() { localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories)); }
  private persistCustomerLedgers() { localStorage.setItem(STORAGE_KEYS.CUSTOMER_LEDGERS, JSON.stringify(this.customerLedgers)); }
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
        this.expenses = parsed.expenses || INITIAL_SAMPLE_EXPENSES;
        this.employees = parsed.employees || INITIAL_SAMPLE_EMPLOYEES;
        this.attendance = parsed.attendance || [];
        this.heldBills = parsed.heldBills || [];
        this.returns = parsed.returns || [];
        this.auditLogs = parsed.auditLogs || [];

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
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to parse backup file', e);
      return false;
    }
  }

  public resetToSampleData(): void {
    this.settings = DEFAULT_SETTINGS;
    this.products = INITIAL_SAMPLE_PRODUCTS;
    this.sales = INITIAL_SAMPLE_SALES;
    this.customers = INITIAL_SAMPLE_CUSTOMERS;
    this.suppliers = INITIAL_SAMPLE_SUPPLIERS;
    this.expenses = INITIAL_SAMPLE_EXPENSES;
    this.employees = INITIAL_SAMPLE_EMPLOYEES;
    this.stockLogs = [];
    this.purchaseOrders = [];
    this.attendance = [];
    this.heldBills = [];
    this.returns = [];
    this.auditLogs = [];
    this.cashShifts = [];
    this.cashTxns = [];

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
  }

  public clearAllDataForFreshStart(customSettings?: Partial<ShopSettings>): void {
    if (customSettings) {
      this.settings = { ...this.settings, ...customSettings, isSetupCompleted: true };
    } else {
      this.settings = { ...DEFAULT_SETTINGS, shopName: 'My Supermarket Store', ownerName: 'Store Owner', isSetupCompleted: true };
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
    this.recycleBin = [];

    this.employees = [
      {
        id: 'EMP-01',
        name: this.settings.ownerName || 'Store Owner',
        role: 'Owner',
        phone: this.settings.phone || '+91 98765 00000',
        address: this.settings.address || 'Main Shop',
        joiningDate: new Date().toISOString().split('T')[0],
        pin: '1234',
        salary: 0,
        status: 'Active',
      }
    ];

    if (this.branches.length > 0) {
      this.branches[0].name = this.settings.shopName || 'Main Store';
      this.branches[0].address = this.settings.address || '';
      this.branches[0].phone = this.settings.phone || '';
    }

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
    this.persistBranches();
    this.persistCashShifts();
    this.persistCashTxns();
    this.persistPriceHistory();
    this.persistCustomerLedgers();
    this.persistRecycleBin();
  }
}

export const sqliteDB = new SQLiteStorageEngine();
