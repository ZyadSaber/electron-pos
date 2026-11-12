import React, { useMemo, useState } from 'react';
import { ArrowRight, Edit3, Layers, Package, Plus, Tags, Trash2, X } from 'lucide-react';
import { CategoryNode, Product, TabType } from '../types';

interface CategoryManagementViewProps {
  categories: CategoryNode[];
  products: Product[];
  onSaveCategory: (category: Partial<CategoryNode> & { name: string }) => void;
  onDeleteCategory: (id: string) => boolean;
  onNavigate: (tab: TabType) => void;
}

export const CategoryManagementView: React.FC<CategoryManagementViewProps> = ({
  categories,
  products,
  onSaveCategory,
  onDeleteCategory,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');

  const descendants = useMemo(() => {
    if (!editing) return new Set<string>();
    const result = new Set<string>([editing.id]);
    let hasNewDescendant = true;
    while (hasNewDescendant) {
      hasNewDescendant = false;
      categories.forEach(category => {
        if (category.parentId && result.has(category.parentId) && !result.has(category.id)) {
          result.add(category.id);
          hasNewDescendant = true;
        }
      });
    }
    return result;
  }, [categories, editing]);

  const filteredCategories = categories.filter(category =>
    `${category.name} ${category.description || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const getUsageCount = (category: CategoryNode) => products.filter(product =>
    product.parentCategoryId === category.id || product.category === category.name
  ).length;

  const resetForm = () => {
    setEditing(null);
    setName('');
    setParentId('');
    setDescription('');
  };

  const editCategory = (category: CategoryNode) => {
    setEditing(category);
    setName(category.name);
    setParentId(category.parentId || '');
    setDescription(category.description || '');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      onSaveCategory({
        id: editing?.id,
        name,
        parentId: parentId || undefined,
        description: description.trim() || undefined,
      });
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر حفظ التصنيف.');
    }
  };

  const handleDelete = (category: CategoryNode) => {
    const productCount = getUsageCount(category);
    const childCount = categories.filter(item => item.parentId === category.id).length;
    if (productCount || childCount) {
      alert('لا يمكن حذف هذا التصنيف قبل نقل المنتجات والتصنيفات الفرعية المرتبطة به.');
      return;
    }
    if (!confirm(`هل تريد حذف التصنيف "${category.name}"؟`)) return;
    if (!onDeleteCategory(category.id)) {
      alert('تعذر حذف التصنيف. تأكد من عدم ارتباط منتجات أو تصنيفات فرعية به.');
    }
    if (editing?.id === category.id) resetForm();
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <header className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Tags className="w-6 h-6 text-emerald-600" />
            إدارة تصنيفات المنتجات
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            أنشئ التصنيفات المستخدمة في تعريف المنتجات، ورتبها ضمن تصنيفات رئيسية.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          العودة إلى المنتجات
        </button>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row gap-3 justify-between sm:items-center border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm">التصنيفات الحالية</h3>
              <span className="text-[10px] text-slate-400">({categories.length})</span>
            </div>
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="ابحث عن تصنيف..."
              className="w-full sm:w-64 p-2 rounded-lg border bg-slate-50 dark:bg-slate-900 text-xs"
            />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredCategories.length ? filteredCategories.map(category => {
              const parent = categories.find(item => item.id === category.parentId);
              const usageCount = getUsageCount(category);
              const childCount = categories.filter(item => item.parentId === category.id).length;
              return (
                <article key={category.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{category.name}</h4>
                      {parent && <span className="text-[10px] text-slate-500">ضمن {parent.name}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{category.description || 'لا يوجد وصف'}</p>
                    <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" />{usageCount} منتج</span>
                      <span>{childCount} تصنيف فرعي</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => editCategory(category)}
                      title="تعديل التصنيف"
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      title={usageCount || childCount ? 'انقل المنتجات والتصنيفات الفرعية أولاً' : 'حذف التصنيف'}
                      disabled={usageCount > 0 || childCount > 0}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            }) : (
              <div className="p-10 text-center text-xs text-slate-400">
                {categories.length ? 'لا توجد تصنيفات تطابق البحث.' : 'لا توجد تصنيفات بعد. أضف أول تصنيف من النموذج.'}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              {editing ? <Edit3 className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
              {editing ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
            </h3>
            {editing && (
              <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="إلغاء التعديل">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="block mb-1.5 text-xs font-semibold">اسم التصنيف *</span>
              <input
                required
                maxLength={80}
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="مثال: مشروبات"
                className="w-full p-2.5 rounded-lg border bg-white dark:bg-slate-900 text-xs"
              />
            </label>
            <label className="block">
              <span className="block mb-1.5 text-xs font-semibold">التصنيف الرئيسي</span>
              <select value={parentId} onChange={event => setParentId(event.target.value)} className="w-full p-2.5 rounded-lg border bg-white dark:bg-slate-900 text-xs">
                <option value="">بدون تصنيف رئيسي</option>
                {categories.filter(category => !descendants.has(category.id)).map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block mb-1.5 text-xs font-semibold">الوصف</span>
              <textarea
                rows={4}
                maxLength={300}
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="وصف مختصر للتصنيف (اختياري)"
                className="w-full p-2.5 rounded-lg border bg-white dark:bg-slate-900 text-xs resize-y"
              />
            </label>
            <button type="submit" className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold">
              {editing ? 'حفظ التعديلات' : 'إضافة التصنيف'}
            </button>
          </form>
          <p className="mt-4 text-[10px] text-slate-500 leading-relaxed">
            لا يمكن حذف تصنيف مستخدم في منتجات أو يحتوي على تصنيفات فرعية. تعديل الاسم يحدّث تصنيف المنتجات المرتبطة به.
          </p>
        </section>
      </div>
    </div>
  );
};
