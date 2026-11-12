/**
 * Main Application Shell for Offline Grocery Shop Management Software (Desktop POS)
 */

import React, { useState, useEffect } from 'react';
import {
  TabType,
  ShopSettings,
  Product,
  Sale,
  CartItem,
  DashboardMetrics,
  Employee,
  Customer,
  CategoryNode,
} from './types';
import { sqliteDB } from './db/sqliteStorage';
import { canAccessTab, canManageCashShifts, getDefaultTab } from './utils/permissions';

// Components
import { NavbarHeader } from './components/NavbarHeader';
import { Sidebar } from './components/Sidebar';
import { FirstTimeSetupModal } from './components/FirstTimeSetupModal';
import { DashboardView } from './components/DashboardView';
import { POSBillingView } from './components/POSBillingView';
import { ProductManagementView } from './components/ProductManagementView';
import { CategoryManagementView } from './components/CategoryManagementView';
import type { ProductExcelImportRow, ProductExcelImportResult } from './components/ProductExcelImportModal';
import { SalesHistoryView } from './components/SalesHistoryView';
import { ReportsView } from './components/ReportsView';
import { BarcodeGeneratorView } from './components/BarcodeGeneratorView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { InvoiceModal } from './components/InvoiceModal';
import { CameraScannerModal } from './components/CameraScannerModal';

// Enterprise Commercial Modules
import { CustomerManagementView } from './components/CustomerManagementView';
import { SupplierManagementView } from './components/SupplierManagementView';
import { PurchaseOrderView } from './components/PurchaseOrderView';
import { ExpenseManagementView } from './components/ExpenseManagementView';
import { EmployeeManagementView } from './components/EmployeeManagementView';
import { AttendanceView } from './components/AttendanceView';
import { InventoryIntelligenceView } from './components/InventoryIntelligenceView';
import { ReturnsExchangesView } from './components/ReturnsExchangesView';
import { AuditLogsView } from './components/AuditLogsView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { PinLockModal } from './components/PinLockModal';
import { LoginView } from './components/LoginView';
import { LabelDesignerModal } from './components/LabelDesignerModal';

// Modules 28-50 Advanced Enterprise Views
import { CashRegisterView } from './components/CashRegisterView';
import { SmartReorderView } from './components/SmartReorderView';
import { RecycleBinView } from './components/RecycleBinView';
import { HealthMonitorView } from './components/HealthMonitorView';
import { PriceHistoryView } from './components/PriceHistoryView';

import { Store, Phone, MapPin, FileText, CheckCircle } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<ShopSettings>(() => sqliteDB.getSettings());
  const [products, setProducts] = useState<Product[]>(() => sqliteDB.getProducts());
  const [categories, setCategories] = useState<CategoryNode[]>(() => sqliteDB.getCategories());
  const [customers, setCustomers] = useState<Customer[]>(() => sqliteDB.getCustomers());
  const [sales, setSales] = useState<Sale[]>(() => sqliteDB.getSales());

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => sqliteDB.getCurrentUser());

  // Modals
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Sale | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [productForBarcodeLabel, setProductForBarcodeLabel] = useState<Product | null>(null);

  // Enterprise Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState(false);
  const [isLabelDesignerOpen, setIsLabelDesignerOpen] = useState(false);
  const [settingsResetModal, setSettingsResetModal] = useState<'clear' | 'sample' | null>(null);
  const [settingsMasterKey, setSettingsMasterKey] = useState('');
  const [settingsResetError, setSettingsResetError] = useState<string | null>(null);
  const [isVerifyingSettingsReset, setIsVerifyingSettingsReset] = useState(false);
  const [settingsToast, setSettingsToast] = useState<string | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);

  // Keyboard Shortcuts (Ctrl+K for Search, F2 for POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        if (currentUser && canAccessTab(currentUser.role, 'pos') && sqliteDB.getCurrentCashShift(currentUser.id)) {
          setActiveTab('pos');
          setAccessMessage(null);
        } else if (currentUser && canAccessTab(currentUser.role, 'cash_register')) {
          setActiveTab('cash_register');
          setAccessMessage('يجب فتح شفت للمستخدم الحالي قبل بدء البيع.');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  // Enforce light theme always, independent of OS settings
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Refresh local memory state from SQLite storage
  const refreshAllState = () => {
    setSettings(sqliteDB.getSettings());
    setProducts(sqliteDB.getProducts());
    setCategories(sqliteDB.getCategories());
    setCustomers(sqliteDB.getCustomers());
    setSales(sqliteDB.getSales());
  };

  useEffect(() => {
    if (activeTab === 'pos') {
      setCustomers(sqliteDB.getCustomers());
    }
  }, [activeTab]);

  // --- Handlers ---
  const handleUpdateSettings = (newSettings: Partial<ShopSettings>) => {
    const updated = sqliteDB.saveSettings(newSettings);
    setSettings(updated);
  };

  const handleLogin = (employee: Employee) => {
    sqliteDB.setCurrentUser(employee);
    setCurrentUser(employee);
    setActiveTab(getDefaultTab(employee.role));
    setAccessMessage(null);
  };

  const handleLogout = () => {
    if (sqliteDB.getCurrentCashShift(currentUser?.id)) {
      setActiveTab('cash_register');
      setAccessMessage('أغلق شفتك الحالي قبل تسجيل الخروج.');
      return;
    }
    sqliteDB.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleNavigate = (tab: TabType) => {
    if (!currentUser || !canAccessTab(currentUser.role, tab)) {
      setAccessMessage('لا تملك صلاحية الوصول إلى هذه الصفحة.');
      return;
    }
    if (tab === 'pos' && !sqliteDB.getCurrentCashShift(currentUser.id)) {
      setActiveTab('cash_register');
      setAccessMessage('يجب فتح شفت للمستخدم الحالي قبل بدء البيع.');
      return;
    }
    setAccessMessage(null);
    setActiveTab(tab);
  };

  useEffect(() => {
    if (currentUser && !canAccessTab(currentUser.role, activeTab)) {
      setActiveTab(getDefaultTab(currentUser.role));
    }
  }, [currentUser, activeTab]);

  const handleSaveProduct = (productData: Partial<Product> & { name: string; barcode: string; purchasePrice: number; sellingPrice: number; quantity: number }) => {
    sqliteDB.saveProduct(productData);
    refreshAllState();
  };

  const handleSaveCategory = (categoryData: Partial<CategoryNode> & { name: string }) => {
    sqliteDB.saveCategory(categoryData);
    setCategories(sqliteDB.getCategories());
    setProducts(sqliteDB.getProducts());
  };

  const handleDeleteCategory = (id: string) => {
    const deleted = sqliteDB.deleteCategory(id);
    setCategories(sqliteDB.getCategories());
    return deleted;
  };

  const handleSaveCustomer = (customerData: { name: string; phone: string }): Customer => {
    const normalizedPhone = customerData.phone.replace(/\D/g, '');
    const existingCustomer = sqliteDB.getCustomers().find(
      customer => customer.phone.replace(/\D/g, '') === normalizedPhone,
    );
    const customer = existingCustomer || sqliteDB.saveCustomer(customerData);
    setCustomers(sqliteDB.getCustomers());
    return customer;
  };

  const handleImportProducts = (rows: ProductExcelImportRow[]): ProductExcelImportResult => {
    const failedRows: number[] = [];
    const seenBarcodes = new Set(products.map(product => product.barcode).filter(Boolean));
    let imported = 0;

    rows.forEach(({ rowNumber, product }) => {
      try {
        if (product.barcode && seenBarcodes.has(product.barcode)) {
          throw new Error(`Duplicate barcode "${product.barcode}".`);
        }
        sqliteDB.saveProduct(product);
        if (product.barcode) seenBarcodes.add(product.barcode);
        imported += 1;
      } catch (error) {
        console.error(`Failed to import product from spreadsheet row ${rowNumber}`, error);
        failedRows.push(rowNumber);
      }
    });

    refreshAllState();
    return { imported, failedRows };
  };

  const handleDeleteProduct = (id: string) => {
    sqliteDB.deleteProduct(id);
    refreshAllState();
  };

  const handleRecordSale = (
    cartItems: CartItem[],
    customerName: string,
    customerPhone: string,
    paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit',
    receivedAmount: number,
    discountAmount: number,
    taxPercent: number,
    customerId?: string
  ): Sale => {
    const sale = sqliteDB.recordSale(
      cartItems,
      customerName,
      customerPhone,
      paymentMode,
      receivedAmount,
      discountAmount,
      taxPercent,
      '',
      customerId,
    );

    refreshAllState();

    // Automatically trigger Invoice Print Modal
    setSelectedInvoiceForModal(sale);
    setIsInvoiceModalOpen(true);

    return sale;
  };

  const handleCancelSale = (saleId: string) => {
    sqliteDB.cancelSale(saleId);
    refreshAllState();
  };

  const handleExportBackup = () => {
    try {
      const backupJsonStr = sqliteDB.exportBackupJSON();
      const blob = new Blob([backupJsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grocery_pos_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 500);
    } catch (err) {
      console.error('Backup export failed:', err);
    }
  };

  const handleImportBackup = (jsonContent: string): boolean => {
    const ok = sqliteDB.importBackupJSON(jsonContent);
    if (ok) {
      refreshAllState();
    }
    return ok;
  };

  const verifyMasterKey = async (masterKey: string): Promise<{ configured: boolean; authorized: boolean }> => {
    if (window.electronAPI) {
      return window.electronAPI.verifyMasterKey(masterKey);
    }

    const response = await fetch('/__verify-master-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ masterKey }),
    });
    if (!response.ok) {
      throw new Error('Master key verification failed.');
    }

    const result: unknown = await response.json();
    if (
      typeof result !== 'object'
      || result === null
      || !('configured' in result)
      || typeof result.configured !== 'boolean'
      || !('authorized' in result)
      || typeof result.authorized !== 'boolean'
    ) {
      throw new Error('Invalid master key verification response.');
    }

    return { configured: result.configured, authorized: result.authorized };
  };

  const handleResetToSampleData = async (masterKey: string) => {
    const verification = await verifyMasterKey(masterKey);
    if (!verification.configured || !verification.authorized) {
      return verification;
    }

    sqliteDB.resetToSampleData();
    sqliteDB.setCurrentUser(null);
    setCurrentUser(null);
    refreshAllState();
    return verification;
  };

  const handleAuthorizedClearAllData = async (masterKey: string) => {
    const verification = await verifyMasterKey(masterKey);
    if (verification.configured && verification.authorized) {
      handleClearAllDataForFreshStart();
    }
    return verification;
  };

  const handleClearAllDataForFreshStart = (customSettings?: Partial<ShopSettings>) => {
    sqliteDB.clearAllDataForFreshStart(customSettings);
    sqliteDB.setCurrentUser(null);
    setCurrentUser(null);
    refreshAllState();
  };

  const handleCompleteFirstTimeSetup = (
    newSettings: Partial<ShopSettings>,
    rootPin: string,
    dataMode: 'clean' | 'sample',
  ) => {
    sqliteDB.completeFirstTimeSetup(newSettings, rootPin, dataMode);
    sqliteDB.setCurrentUser(null);
    setCurrentUser(null);
    refreshAllState();
  };

  const handleViewInvoice = (sale: Sale) => {
    setSelectedInvoiceForModal(sale);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenBarcodeGeneratorForProduct = (product: Product) => {
    setProductForBarcodeLabel(product);
    handleNavigate('barcodes');
  };

  const metrics: DashboardMetrics = sqliteDB.getMetrics();
  const lowStockProducts = products.filter(p => p.quantity <= (p.minStockLevel || settings.lowStockThreshold));

  if (!currentUser) {
    if (!settings.isSetupCompleted) {
      return (
        <FirstTimeSetupModal
          isOpen
          onComplete={handleCompleteFirstTimeSetup}
          initialSettings={settings}
        />
      );
    }
    return <LoginView settings={settings} onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 flex flex-col font-sans select-none antialiased">

      {/* Top Application Navbar Titlebar */}
      <NavbarHeader
        settings={settings}
        onNavigate={handleNavigate}
        activeTab={activeTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onLockTerminal={() => setIsTerminalLocked(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
        canOpenPOS={canAccessTab(currentUser.role, 'pos')}
      />

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          lowStockCount={metrics.lowStockCount}
          role={currentUser.role}
        />

        {/* Main Content Workspace View */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {canAccessTab(currentUser.role, activeTab) ? (
            <>
              {accessMessage && (
                <div role="alert" className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                  {accessMessage}
                </div>
              )}
              {activeTab === 'dashboard' && (
                <DashboardView
                  metrics={metrics}
                  recentSales={sales}
                  lowStockProducts={lowStockProducts}
                  settings={settings}
                  onNavigate={handleNavigate}
                  onViewInvoice={handleViewInvoice}
                  onQuickAddProduct={() => handleNavigate('products')}
                  role={currentUser.role}
                />
              )}

              {activeTab === 'pos' && (
                <POSBillingView
                  products={products}
                  customers={customers}
                  settings={settings}
                  onSaveCustomer={handleSaveCustomer}
                  onRecordSale={handleRecordSale}
                  onOpenCameraScanner={() => setIsCameraScannerOpen(true)}
                  scannedBarcode={scannedBarcode}
                  onClearScannedBarcode={() => setScannedBarcode(null)}
                />
              )}

              {activeTab === 'customers' && (
                <CustomerManagementView
                  settings={settings}
                  onSelectCustomerForPOS={(cust) => {
                    handleNavigate('pos');
                  }}
                />
              )}

              {activeTab === 'cash_register' && (
                <CashRegisterView currentUser={currentUser} />
              )}

              {activeTab === 'smart_reorder' && (
                <SmartReorderView />
              )}

              {activeTab === 'recycle_bin' && (
                <RecycleBinView />
              )}

              {activeTab === 'health_monitor' && (
                <HealthMonitorView />
              )}

              {activeTab === 'price_history' && (
                <PriceHistoryView />
              )}

              {activeTab === 'suppliers' && (
                <SupplierManagementView
                  settings={settings}
                />
              )}

              {activeTab === 'purchase_orders' && (
                <PurchaseOrderView
                  settings={settings}
                  onDataChanged={refreshAllState}
                />
              )}

              {activeTab === 'expenses' && (
                <ExpenseManagementView
                  settings={settings}
                />
              )}

              {activeTab === 'employees' && (
                <EmployeeManagementView
                  settings={settings}
                  onCurrentUserChange={handleLogin}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceView
                  settings={settings}
                />
              )}

              {activeTab === 'inventory_intel' && (
                <InventoryIntelligenceView
                  settings={settings}
                />
              )}

              {activeTab === 'returns' && (
                <ReturnsExchangesView
                  settings={settings}
                  onViewInvoice={handleViewInvoice}
                  onReturnProcessed={refreshAllState}
                />
              )}

              {activeTab === 'audit_logs' && (
                <AuditLogsView
                  settings={settings}
                />
              )}

              {activeTab === 'products' && (
                <ProductManagementView
                  products={products}
                  categories={categories}
                  settings={settings}
                  onSaveProduct={handleSaveProduct}
                  onImportProducts={handleImportProducts}
                  onDeleteProduct={handleDeleteProduct}
                  onOpenBarcodeGenerator={handleOpenBarcodeGeneratorForProduct}
                  onManageCategories={() => handleNavigate('categories')}
                />
              )}

              {activeTab === 'categories' && (
                <CategoryManagementView
                  categories={categories}
                  products={products}
                  onSaveCategory={handleSaveCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === 'sales_history' && (
                <SalesHistoryView
                  sales={sales}
                  settings={settings}
                  onViewInvoice={handleViewInvoice}
                  onCancelSale={handleCancelSale}
                  canCancelSales={canManageCashShifts(currentUser.role)}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  sales={sales}
                  products={products}
                  settings={settings}
                />
              )}

              {activeTab === 'barcodes' && (
                <BarcodeGeneratorView
                  products={products}
                  selectedProductForLabel={productForBarcodeLabel}
                  settings={settings}
                />
              )}

              {activeTab === 'backup' && (
                <BackupRestoreView
                  onExportBackup={handleExportBackup}
                  onImportBackup={handleImportBackup}
                  onResetToSampleData={handleResetToSampleData}
                  onClearAllData={handleAuthorizedClearAllData}
                />
              )}

              {activeTab === 'settings' && (
                <div className="p-6 max-w-3xl mx-auto space-y-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-3">
                      بيانات المحل وإعدادات الفاتورة
                    </h2>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold mb-1">اسم المحل / الماركت</label>
                        <input
                          type="text"
                          value={settings.shopName}
                          onChange={e => handleUpdateSettings({ shopName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">اسم المالك / المدير</label>
                        <input
                          type="text"
                          value={settings.ownerName}
                          onChange={e => handleUpdateSettings({ ownerName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">رقم الهاتف / الموبايل</label>
                        <input
                          type="text"
                          value={settings.phone}
                          onChange={e => handleUpdateSettings({ phone: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">الرقم الضريبي / السجل التجاري</label>
                        <input
                          type="text"
                          value={settings.gstNumber || ''}
                          onChange={e => handleUpdateSettings({ gstNumber: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block font-semibold mb-1">عنوان المحل</label>
                        <input
                          type="text"
                          value={settings.address}
                          onChange={e => handleUpdateSettings({ address: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">تنبيه الحد الأدنى للنواقص بالمخزن</label>
                        <input
                          type="number"
                          value={settings.lowStockThreshold}
                          onChange={e => handleUpdateSettings({ lowStockThreshold: parseInt(e.target.value) || 10 })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">نسبة ضريبة القيمة المضافة الافتراضية (%)</label>
                        <input
                          type="number"
                          value={settings.defaultTaxPercent}
                          onChange={e => handleUpdateSettings({ defaultTaxPercent: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl font-mono"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>يتم حفظ جميع الإعدادات تلقائياً في قاعدة بيانات SQLite المحلية على جهازك.</span>
                    </div>
                  </div>

                  {/* Fresh Start Store Deployment Card */}
                  {/* <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  تهيئة النظام والبدء من جديد
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  إذا كنت تقوم بتشغيل هذا البرنامج لمتجر جديد، يمكنك مسح جميع البيانات التجريبية (المنتجات، سجل المبيعات، العملاء، المصروفات) لتبدأ بإدخال بضاعة محلك ومخزنك الحقيقية.
                </p>

                {settingsToast && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 animate-fadeIn">
                    {settingsToast}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsMasterKey('');
                      setSettingsResetError(null);
                      setSettingsResetModal('clear');
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    مسح البيانات التجريبية والبدء بمتجر فارغ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsMasterKey('');
                      setSettingsResetError(null);
                      setSettingsResetModal('sample');
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    إعادة تحميل الأصناف والبيانات التجريبية
                  </button>
                </div>
              </div> */}
                </div>
              )}
            </>
          ) : (
            <div role="alert" className="m-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              لا تملك صلاحية الوصول إلى هذه الصفحة.
            </div>
          )}
        </main>
      </div>

      {/* Settings Reset Confirmation Modal */}
      {settingsResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {settingsResetModal === 'clear' ? 'مسح جميع البيانات التجريبية والبدء من جديد؟' : 'إعادة تحميل المنتجات التجريبية؟'}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {settingsResetModal === 'clear'
                ? 'هل أنت متأكد من رغبتك في مسح كافة البيانات التجريبية؟ سيتم حذف جميع الأصناف التجريبية، وفواتير المبيعات، والعملاء، والمصروفات لتتمكن من البدء بإدخال بضاعة متجرك الحقيقية من الصفر.'
                : 'هل أنت متأكد من رغبتك في إعادة تحميل البضاعة والبيانات التجريبية الافتراضية للسوبر ماركت (زيت، سكر، أرز، شاي العروسة، إلخ)؟'}
            </p>

            <div className="space-y-2">
              <label htmlFor="settings-reset-master-key" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                المفتاح الرئيسي
              </label>
              <input
                id="settings-reset-master-key"
                type="password"
                value={settingsMasterKey}
                onChange={event => {
                  setSettingsMasterKey(event.target.value);
                  setSettingsResetError(null);
                }}
                maxLength={256}
                autoComplete="current-password"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm"
                aria-invalid={Boolean(settingsResetError)}
                aria-describedby={settingsResetError ? 'settings-reset-master-key-error' : undefined}
              />
              {settingsResetError && (
                <p id="settings-reset-master-key-error" role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                  {settingsResetError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSettingsResetModal(null);
                  setSettingsMasterKey('');
                  setSettingsResetError(null);
                }}
                disabled={isVerifyingSettingsReset}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isVerifyingSettingsReset}
                onClick={async () => {
                  if (!settingsMasterKey) {
                    setSettingsResetError('يرجى إدخال المفتاح الرئيسي.');
                    return;
                  }

                  setIsVerifyingSettingsReset(true);
                  setSettingsResetError(null);
                  try {
                    const verification = settingsResetModal === 'clear'
                      ? await handleAuthorizedClearAllData(settingsMasterKey)
                      : await handleResetToSampleData(settingsMasterKey);
                    if (!verification.configured) {
                      setSettingsResetError('لم يتم إعداد مفتاح صالح. تحقق من ملف .env وتشغيل خادم Vite أو تطبيق Electron.');
                      return;
                    }
                    if (!verification.authorized) {
                      setSettingsResetError('المفتاح الرئيسي غير صحيح.');
                      return;
                    }

                    setSettingsToast(settingsResetModal === 'clear'
                      ? 'تم مسح البيانات التجريبية بنجاح! يمكنك الآن بدء إدخال بضاعة محلك الفعلية.'
                      : 'تمت استعادة الأصناف والبيانات التجريبية بنجاح.');
                    setSettingsResetModal(null);
                    setSettingsMasterKey('');
                    setTimeout(() => setSettingsToast(null), 4000);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    setSettingsResetError(`تعذر إكمال العملية: ${message}`);
                  } finally {
                    setIsVerifyingSettingsReset(false);
                  }
                }}
                className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer ${settingsResetModal === 'clear' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-900'
                  }`}
              >
                {isVerifyingSettingsReset ? 'جارٍ التحقق...' : settingsResetModal === 'clear' ? 'نعم، مسح والبدء بنظام فارغ' : 'نعم، استرجاع البيانات التجريبية'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Label Designer Studio Modal */}
      {isLabelDesignerOpen && (
        <LabelDesignerModal
          settings={settings}
          onClose={() => setIsLabelDesignerOpen(false)}
        />
      )}

      {/* Global Search Modal */}
      {isSearchOpen && (
        <GlobalSearchModal
          settings={settings}
          role={currentUser.role}
          onClose={() => setIsSearchOpen(false)}
          onNavigate={handleNavigate}
        />
      )}

      {/* Terminal PIN Lock Screen */}
      {isTerminalLocked && (
        <PinLockModal
          onUnlock={(employee) => {
            handleLogin(employee);
            setIsTerminalLocked(false);
          }}
        />
      )}

      {/* First Time Setup Wizard Modal */}
      <FirstTimeSetupModal
        isOpen={!settings.isSetupCompleted}
        onComplete={handleCompleteFirstTimeSetup}
        initialSettings={settings}
      />

      {/* Invoice Modal for Thermal / A4 Print */}
      <InvoiceModal
        sale={selectedInvoiceForModal}
        settings={settings}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      {/* Webcam Camera Barcode Reader Modal */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(barcode) => {
          setScannedBarcode(barcode);
        }}
      />

    </div>
  );
}
