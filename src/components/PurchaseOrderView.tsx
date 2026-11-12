import React, { useState } from 'react';
import { PurchaseOrder, ShopSettings } from '../types';
import { sqliteDB } from '../db/sqliteStorage';
import { AlertCircle, FileCheck, PackageCheck, Plus, Printer, X } from 'lucide-react';

interface PurchaseOrderViewProps {
  settings: ShopSettings;
  onDataChanged?: () => void;
}

type PaymentMode = 'Cash' | 'UPI' | 'Bank' | 'Card';

export const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({ settings, onDataChanged }) => {
  const [, setRevision] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [selectedPOForPrint, setSelectedPOForPrint] = useState<PurchaseOrder | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrder['items']>([]);
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [receiptItems, setReceiptItems] = useState<Record<string, { qty: number; purchasePrice: number }>>({});

  const suppliers = sqliteDB.getSuppliers();
  const products = sqliteDB.getProducts();
  const purchaseOrders = sqliteDB.getPurchaseOrders();
  const refresh = () => setRevision(value => value + 1);
  const currency = settings.currencySymbol || 'ج.م';

  const addItem = (productId: string) => {
    const product = products.find(candidate => candidate.id === productId);
    if (!product) return;
    setPoItems(current => {
      const existing = current.find(item => item.productId === product.id);
      if (existing) {
        return current.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...current, {
        productId: product.id,
        productName: product.name,
        qty: 1,
        purchasePrice: product.purchasePrice,
      }];
    });
  };

  const handleCreateOrder = (event: React.FormEvent) => {
    event.preventDefault();
    const supplier = suppliers.find(candidate => candidate.id === supplierId);
    if (!supplier || !invoiceNumber.trim() || !poItems.length) {
      alert('اختر مورداً وأدخل رقم الفاتورة وأضف أصنافاً.');
      return;
    }

    try {
      sqliteDB.createPurchaseOrderInvoice({
        supplierId: supplier.id,
        supplierName: supplier.companyName || supplier.name,
        items: poItems,
        totalAmount: poItems.reduce((sum, item) => sum + item.qty * item.purchasePrice, 0),
        invoiceNumber,
        paidAmount: Number(paidAmount || 0),
        paymentMode,
        notes,
      });
      setShowCreateModal(false);
      setPoItems([]);
      setNotes('');
      setInvoiceNumber('');
      setPaidAmount('0');
      refresh();
      onDataChanged?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر حفظ فاتورة المورد واستلام الأصناف.');
    }
  };

  const handleReceiveInvoice = (event: React.FormEvent) => {
    event.preventDefault();
    if (!receivingOrder) return;
    try {
      const received = sqliteDB.receivePurchaseOrder(
        receivingOrder.id,
        invoiceNumber,
        Object.entries(receiptItems)
          .filter(([, item]) => item.qty > 0)
          .map(([productId, item]) => ({ productId, ...item })),
        Number(paidAmount || 0),
        paymentMode,
      );
      if (!received) {
        alert('تعذر تسجيل الفاتورة. قد يكون الطلب مسجلاً بالفعل أو غير صالح.');
        return;
      }
      setReceivingOrder(null);
      setInvoiceNumber('');
      setPaidAmount('0');
      refresh();
      onDataChanged?.();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'تعذر تسجيل فاتورة المورد.');
    }
  };

  const statusLabel: Record<PurchaseOrder['status'], string> = {
    Draft: 'مسودة',
    Ordered: 'بانتظار التوريد',
    'Partially Received': 'استلام جزئي',
    Received: 'تم تسجيل الفاتورة والاستلام',
    Cancelled: 'ملغي',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-emerald-600" />
            أوامر الشراء وفواتير الموردين
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            احفظ فاتورة المورد لتسجيلها وتحديث المخزون ورصيد المورد مباشرةً.
          </p>
        </div>
        <button
          onClick={() => {
            setSupplierId(suppliers[0]?.id || '');
            setPoItems([]);
            setNotes('');
            setInvoiceNumber('');
            setPaidAmount('0');
            setShowCreateModal(true);
          }}
          disabled={!suppliers.length}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          فاتورة مشتريات جديدة
        </button>
      </header>

      {!suppliers.length && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          أضف مورداً من دليل الموردين قبل إنشاء أمر شراء.
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 border-b border-slate-200 dark:border-slate-700 text-[10px]">
                <th className="py-3 px-4">رقم الأمر / فاتورة المورد</th>
                <th className="py-3 px-4">المورد</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">الأصناف</th>
                <th className="py-3 px-4 text-left">قيمة الطلب</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
              {!purchaseOrders.length ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-400">لا توجد أوامر شراء حتى الآن.</td></tr>
              ) : purchaseOrders.map(order => (
                <tr key={order.id}>
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold">{order.poNumber}</div>
                    {(order.invoiceNumbers?.length || order.invoiceNumber) && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        فواتير: {(order.invoiceNumbers || [order.invoiceNumber]).filter(Boolean).join('، ')}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">{order.supplierName}</td>
                  <td className="py-3 px-4 font-mono">{order.receivedDate || order.orderDate}</td>
                  <td className="py-3 px-4">
                    {order.items.length} صنف
                    <div className="text-[10px] text-slate-500">
                      استلام {(order.items.reduce((sum, item) => sum + (item.receivedQty || 0), 0))}/
                      {order.items.reduce((sum, item) => sum + item.qty, 0)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-left font-bold">{order.totalAmount.toLocaleString()} {currency}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${order.status === 'Received' ? 'bg-emerald-100 text-emerald-800' :
                        order.status === 'Ordered' || order.status === 'Partially Received' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                      {statusLabel[order.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {(order.status === 'Ordered' || order.status === 'Partially Received') && (
                        <button
                          onClick={() => {
                            setReceivingOrder(order);
                            setInvoiceNumber('');
                            setPaidAmount('0');
                            setReceiptItems(Object.fromEntries(order.items.map(item => [
                              item.productId,
                              { qty: 0, purchasePrice: item.purchasePrice },
                            ])));
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                        >
                          تسجيل استلام المتبقي
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPOForPrint(order)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        title="طباعة أمر الشراء"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-3 sm:p-6">
          <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-xl">
            <form onSubmit={handleCreateOrder} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 sm:p-8 space-y-6 text-xs">
              <div className="flex items-start justify-between border-b border-dashed border-slate-300 dark:border-slate-600 pb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold">فاتورة مشتريات</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{settings.shopName || 'فاتورة مورد'}</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">تسجيل الفاتورة يضيف الأصناف المستلمة إلى المخزون تلقائياً.</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="إغلاق">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block mb-1.5 font-bold">المورد</span>
                  <select required value={supplierId} onChange={event => setSupplierId(event.target.value)} className="w-full p-2.5 rounded-lg border bg-white dark:bg-slate-900">
                    {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.companyName || supplier.name} ({supplier.name})</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block mb-1.5 font-bold">رقم فاتورة المورد</span>
                  <input required value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} placeholder="أدخل رقم الفاتورة" className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-900" />
                </label>
                <div className="sm:col-span-2 flex justify-between text-slate-500 dark:text-slate-400">
                  <span>التاريخ</span>
                  <span className="font-mono">{new Date().toLocaleDateString('ar-EG')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <label className="block flex-1">
                  <span className="block mb-1.5 font-bold">إضافة صنف للفاتورة</span>
                  <select value="" onChange={event => event.target.value && addItem(event.target.value)} className="w-full p-2.5 rounded-lg border bg-white dark:bg-slate-900">
                    <option value="">اختر منتجاً</option>
                    {products.map(product => <option key={product.id} value={product.id}>{product.name} — المخزون {product.quantity}</option>)}
                  </select>
                </label>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full min-w-[620px] text-right">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500">
                    <tr>
                      <th className="p-3">الصنف</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">سعر الوحدة</th>
                      <th className="p-3 text-left">الإجمالي</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {poItems.length ? poItems.map(item => (
                      <tr key={item.productId}>
                        <td className="p-3 font-semibold">{item.productName}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={item.qty}
                            aria-label={`كمية ${item.productName}`}
                            onChange={event => setPoItems(current => current.map(currentItem =>
                              currentItem.productId === item.productId ? { ...currentItem, qty: Number(event.target.value) } : currentItem
                            ))}
                            className="w-20 p-2 border rounded-lg text-center bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.purchasePrice}
                            aria-label={`سعر شراء ${item.productName}`}
                            onChange={event => setPoItems(current => current.map(currentItem =>
                              currentItem.productId === item.productId ? { ...currentItem, purchasePrice: Number(event.target.value) } : currentItem
                            ))}
                            className="w-28 p-2 border rounded-lg text-center bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="p-3 text-left font-bold">{(item.qty * item.purchasePrice).toLocaleString()} {currency}</td>
                        <td className="p-3 text-center">
                          <button type="button" onClick={() => setPoItems(current => current.filter(currentItem => currentItem.productId !== item.productId))} className="text-slate-400 hover:text-red-600" aria-label={`حذف ${item.productName}`}>
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">أضف الأصناف التي وصلت من المورد لإظهارها في الفاتورة.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block">
                    <span className="block mb-1.5 font-bold">المبلغ المدفوع الآن</span>
                    <input type="number" min={0} step="0.01" value={paidAmount} onChange={event => setPaidAmount(event.target.value)} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-900" />
                  </label>
                  {Number(paidAmount) > 0 && (
                    <label className="block">
                      <span className="block mb-1.5 font-bold">طريقة السداد</span>
                      <select value={paymentMode} onChange={event => setPaymentMode(event.target.value as PaymentMode)} className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-900">
                        <option value="Cash">نقداً</option><option value="UPI">محفظة / تحويل فوري</option><option value="Bank">تحويل بنكي</option><option value="Card">بطاقة</option>
                      </select>
                    </label>
                  )}
                  <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="ملاحظات (اختياري)" className="w-full p-2.5 border rounded-lg bg-white dark:bg-slate-900" />
                </div>
                <div className="sm:mr-auto w-full sm:max-w-xs space-y-2 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
                  <div className="flex justify-between"><span>إجمالي الفاتورة</span><strong>{poItems.reduce((sum, item) => sum + item.qty * item.purchasePrice, 0).toLocaleString()} {currency}</strong></div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><span>المدفوع</span><strong>{(Number(paidAmount) || 0).toLocaleString()} {currency}</strong></div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-600 pt-2 font-bold"><span>المتبقي للمورد</span><strong>{Math.max(0, poItems.reduce((sum, item) => sum + item.qty * item.purchasePrice, 0) - (Number(paidAmount) || 0)).toLocaleString()} {currency}</strong></div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-[10px] text-slate-500">عند الحفظ، سيتم تسجيل الفاتورة واستلام كامل الكميات وإضافتها للمخزون.</p>
                <button type="submit" disabled={!poItems.length} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50">
                  حفظ الفاتورة واستلام الأصناف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receivingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><PackageCheck className="w-5 h-5 text-emerald-600" />تسجيل فاتورة واستلام البضاعة</h3>
              <button onClick={() => setReceivingOrder(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500">أدخل الكميات التي وصلت فعلياً ورقم فاتورتها. لن يضاف للمخزون أو رصيد المورد إلا ما تم استلامه وتسجيله في الفاتورة.</p>
            <div className="text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div>أمر الشراء: <strong>{receivingOrder.poNumber}</strong></div>
              <div>المورد: <strong>{receivingOrder.supplierName}</strong></div>
            </div>
            <form onSubmit={handleReceiveInvoice} className="space-y-3 text-xs">
              <div className="grid grid-cols-[1fr_80px_100px] gap-2 text-[10px] font-bold text-slate-500 border-b pb-2">
                <span>الصنف والكمية المتبقية</span><span>المستلم</span><span>سعر الوحدة</span>
              </div>
              <div className="space-y-2">
                {receivingOrder.items.map(item => {
                  const remaining = item.qty - (item.receivedQty || 0);
                  const receiptItem = receiptItems[item.productId] || { qty: 0, purchasePrice: item.purchasePrice };
                  return (
                    <div key={item.productId} className="grid grid-cols-[1fr_80px_100px] gap-2 items-center border-b pb-2">
                      <div>
                        <div className="font-semibold">{item.productName}</div>
                        <div className="text-[10px] text-slate-500">متبقي {remaining} من {item.qty}</div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        step={1}
                        value={receiptItem.qty}
                        aria-label={`الكمية المستلمة من ${item.productName}`}
                        onChange={event => setReceiptItems(current => ({
                          ...current,
                          [item.productId]: { ...receiptItem, qty: Number(event.target.value) },
                        }))}
                        className="p-2 border rounded-lg text-center"
                      />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={receiptItem.purchasePrice}
                        aria-label={`سعر شراء ${item.productName}`}
                        onChange={event => setReceiptItems(current => ({
                          ...current,
                          [item.productId]: { ...receiptItem, purchasePrice: Number(event.target.value) },
                        }))}
                        className="p-2 border rounded-lg text-center"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="text-left font-bold">
                إجمالي الفاتورة: {Object.values(receiptItems).reduce((sum, item) => sum + item.qty * item.purchasePrice, 0).toLocaleString()} {currency}
              </div>
              <label className="block">
                <span className="block mb-1 font-semibold">رقم فاتورة المورد *</span>
                <input required value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} className="w-full p-2 border rounded-lg" />
              </label>
              <label className="block">
                <span className="block mb-1 font-semibold">المبلغ المدفوع الآن</span>
                <input type="number" min={0} step="0.01" value={paidAmount} onChange={event => setPaidAmount(event.target.value)} className="w-full p-2 border rounded-lg" />
              </label>
              {Number(paidAmount) > 0 && (
                <label className="block">
                  <span className="block mb-1 font-semibold">طريقة السداد</span>
                  <select value={paymentMode} onChange={event => setPaymentMode(event.target.value as PaymentMode)} className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900">
                    <option value="Cash">نقداً</option><option value="UPI">محفظة / تحويل فوري</option><option value="Bank">تحويل بنكي</option><option value="Card">بطاقة</option>
                  </select>
                </label>
              )}
              <button type="submit" className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">
                تسجيل الفاتورة وإضافة المخزون
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedPOForPrint && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 text-slate-800 shadow-xl">
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold">{settings.shopName}</h3>
                <p className="text-xs text-slate-500">أمر شراء {selectedPOForPrint.poNumber}</p>
              </div>
              <button onClick={() => setSelectedPOForPrint(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs">المورد: <strong>{selectedPOForPrint.supplierName}</strong></p>
            <p className="text-xs">التاريخ: {selectedPOForPrint.orderDate}</p>
            {(selectedPOForPrint.invoiceNumbers?.length || selectedPOForPrint.invoiceNumber) && (
              <p className="text-xs">فواتير المورد: {(selectedPOForPrint.invoiceNumbers || [selectedPOForPrint.invoiceNumber]).filter(Boolean).join('، ')}</p>
            )}
            <table className="w-full text-right text-xs">
              <tbody>{selectedPOForPrint.items.map(item => (
                <tr key={item.productId} className="border-t">
                  <td className="py-2">{item.productName}</td>
                  <td className="py-2 text-center">{item.qty}</td>
                  <td className="py-2 text-left">{(item.qty * item.purchasePrice).toLocaleString()} {currency}</td>
                </tr>
              ))}</tbody>
            </table>
            <div className="text-left font-bold">الإجمالي: {selectedPOForPrint.totalAmount.toLocaleString()} {currency}</div>
            <button onClick={() => window.print()} className="w-full bg-emerald-600 text-white rounded-lg py-2">طباعة</button>
          </div>
        </div>
      )}
    </div>
  );
};
