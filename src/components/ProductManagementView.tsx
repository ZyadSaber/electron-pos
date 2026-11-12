import React, { useState } from 'react';
import { CategoryNode, Product, ShopSettings } from '../types';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Barcode, 
  AlertTriangle, 
  Filter, 
  X, 
  Check, 
  Calendar, 
  DollarSign, 
  Truck, 
  Tag,
  Sparkles,
  FileSpreadsheet,
  Tags,
} from 'lucide-react';
import {
  ProductExcelImportModal,
} from './ProductExcelImportModal';
import type { ProductExcelImportRow, ProductExcelImportResult } from './ProductExcelImportModal';

interface ProductManagementViewProps {
  products: Product[];
  categories: CategoryNode[];
  settings: ShopSettings;
  onSaveProduct: (productData: Partial<Product> & { name: string; barcode: string; purchasePrice: number; sellingPrice: number; quantity: number }) => void;
  onImportProducts: (rows: ProductExcelImportRow[]) => ProductExcelImportResult;
  onDeleteProduct: (id: string) => void;
  onOpenBarcodeGenerator: (product: Product) => void;
  onManageCategories: () => void;
}

export const ProductManagementView: React.FC<ProductManagementViewProps> = ({
  products,
  categories: savedCategories,
  settings,
  onSaveProduct,
  onImportProducts,
  onDeleteProduct,
  onOpenBarcodeGenerator,
  onManageCategories,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out' | 'expiring'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    barcode: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    supplierName: '',
    expiryDate: '',
    unit: 'pcs',
  });

  const currency = settings.currencySymbol || 'ج.م';

  const categoryOptions = Array.from(new Set([
    ...savedCategories.map(category => category.name),
    ...products.map(product => product.category).filter(Boolean),
  ]));
  const categories = ['الكل', ...categoryOptions];

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: categoryOptions[0] || '',
      barcode: `${Math.floor(6220000000000 + Math.random() * 90000000000)}`,
      purchasePrice: '',
      sellingPrice: '',
      quantity: '',
      supplierName: '',
      expiryDate: '',
      unit: 'قطعة',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      barcode: product.barcode,
      purchasePrice: product.purchasePrice.toString(),
      sellingPrice: product.sellingPrice.toString(),
      quantity: product.quantity.toString(),
      supplierName: product.supplierName || '',
      expiryDate: product.expiryDate || '',
      unit: product.unit || 'قطعة',
    });
    setIsModalOpen(true);
  };

  const handleGenerateBarcode = () => {
    const randomBarcode = `${Math.floor(6220000000000 + Math.random() * 90000000000)}`;
    setFormData(prev => ({ ...prev, barcode: randomBarcode }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.barcode || !formData.purchasePrice || !formData.sellingPrice || !formData.quantity) {
      alert('يرجى ملء جميع الحقول الإلزامية للمنتج.');
      return;
    }

    onSaveProduct({
      id: editingProduct ? editingProduct.id : undefined,
      name: formData.name,
      category: formData.category,
      parentCategoryId: savedCategories.find(category => category.name === formData.category)?.id
        || (editingProduct?.category === formData.category ? editingProduct.parentCategoryId : undefined),
      barcode: formData.barcode,
      purchasePrice: parseFloat(formData.purchasePrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      quantity: parseInt(formData.quantity),
      supplierName: formData.supplierName,
      expiryDate: formData.expiryDate || undefined,
      unit: formData.unit,
    });

    setIsModalOpen(false);
  };

  // Filtered list
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'الكل' || p.category === selectedCategory;
    
    let matchesFilter = true;
    if (filterType === 'low') {
      matchesFilter = p.quantity > 0 && p.quantity <= (p.minStockLevel || settings.lowStockThreshold);
    } else if (filterType === 'out') {
      matchesFilter = p.quantity <= 0;
    } else if (filterType === 'expiring') {
      if (!p.expiryDate) matchesFilter = false;
      else {
        const exp = new Date(p.expiryDate).getTime();
        matchesFilter = exp <= (Date.now() + 30 * 24 * 3600 * 1000);
      }
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q);

    return matchesCategory && matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            إدارة المخزن والمنتجات ({products.length} صنف مسجل)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            إدارة أسعار الشراء والبيع، الأرصدة المتوفرة، الباركود، الموردين وتواريخ الصلاحية.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onManageCategories}
            className="px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <Tags className="w-4 h-4" />
            <span>إدارة التصنيفات</span>
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 bg-white dark:bg-slate-700 border border-emerald-600 text-emerald-700 dark:text-emerald-300 rounded-xl font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>استيراد من Excel</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-md hover:shadow-emerald-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الباركود، أو المورد..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              جميع الأصناف ({products.length})
            </button>

            <button
              onClick={() => setFilterType('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                filterType === 'low'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              نواقص وقرب النفاد
            </button>

            <button
              onClick={() => setFilterType('out')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                filterType === 'out'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              نفد من المخزن
            </button>

            <button
              onClick={() => setFilterType('expiring')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                filterType === 'expiring'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              }`}
            >
              قرب انتهاء الصلاحية
            </button>
          </div>

        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-700/60 scrollbar-none">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold ml-1">القسم:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <th className="p-3.5">الكود / الباركود</th>
                <th className="p-3.5">اسم الصنف</th>
                <th className="p-3.5">القسم</th>
                <th className="p-3.5 text-left">سعر الشراء</th>
                <th className="p-3.5 text-left">سعر البيع</th>
                <th className="p-3.5 text-left">هامش الربح %</th>
                <th className="p-3.5 text-center">الرصيد المتاح</th>
                <th className="p-3.5">المورد</th>
                <th className="p-3.5 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    لم يتم العثور على أي منتج يطابق معايير البحث.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const marginPercent = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100) : 0;
                  const isLow = p.quantity <= (p.minStockLevel || settings.lowStockThreshold);
                  const isOut = p.quantity <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-3.5">
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">{p.id}</div>
                        <div className="font-mono text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          {p.barcode}
                        </div>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-100 max-w-xs">
                        {p.name}
                        {p.expiryDate && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal mt-0.5">
                            صلاحية: {p.expiryDate}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                          {p.category}
                        </span>
                      </td>

                      <td className="p-3.5 text-left font-mono text-slate-600 dark:text-slate-400">
                        {p.purchasePrice} {currency}
                      </td>

                      <td className="p-3.5 text-left font-mono font-bold text-slate-900 dark:text-slate-100">
                        {p.sellingPrice} {currency}
                      </td>

                      <td className="p-3.5 text-left font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        +{marginPercent}%
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                          isOut
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {p.quantity} {p.unit || 'قطعة'}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                        {p.supplierName || 'عام'}
                      </td>

                      <td className="p-3.5 text-left">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenBarcodeGenerator(p)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                            title="طباعة ملصق الباركود"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition cursor-pointer"
                            title="تعديل الصنف"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف الصنف "${p.name}"؟`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 rounded-lg transition cursor-pointer"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isImportModalOpen && (
        <ProductExcelImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={onImportProducts}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150 my-auto text-right">
            
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                {editingProduct ? 'تعديل بيانات الصنف' : 'إضافة منتج جديد للمخزن'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: زيت ذرة عافية 800 مل"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    القسم / التصنيف *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">اختر تصنيفاً</option>
                    {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <button type="button" onClick={onManageCategories} className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline">
                    إدارة التصنيفات أو إضافة تصنيف جديد
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نوع وحدة القياس
                  </label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs outline-none"
                  >
                    <option value="قطعة">قطعة (pcs)</option>
                    <option value="علبة">علبة / باكت</option>
                    <option value="كجم">كيلوجرام (كجم)</option>
                    <option value="جم">جرام (جم)</option>
                    <option value="لتر">لتر (L)</option>
                    <option value="مل">مليلتر (مل)</option>
                    <option value="كيس">كيس</option>
                    <option value="كرتونة">كرتونة</option>
                    <option value="شيكارة">شيكارة</option>
                  </select>
                </div>
              </div>

              {/* Barcode Field with Auto Generator */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>رقم الباركود الدولي *</span>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-emerald-600 hover:underline font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> توليد باركود تلقائي
                  </button>
                </label>
                <input
                  type="text"
                  required
                  placeholder="امسح الباركود بجهاز القارئ أو اضغط توليد تلقائي"
                  value={formData.barcode}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    سعر الشراء ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="100"
                    value={formData.purchasePrice}
                    onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    سعر البيع ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="125"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الكمية المتاحة *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="50"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المورد أو الشركة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: شركة جهينة"
                    value={formData.supplierName}
                    onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ انتهاء الصلاحية
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  حفظ الصنف
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
