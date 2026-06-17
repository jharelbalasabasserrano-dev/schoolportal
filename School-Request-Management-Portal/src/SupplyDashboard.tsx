import { CheckCircle2, Clock, Layers3, PackageCheck, Plus, Search, X, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { PortalRequest, Status, StockMovement, SupplierInfo, SupplyCategory, SupplyItem } from './portalData'
import { formatShortDate, getCounts, getSupplyItems } from './portalHelpers'
import { MetricCard, StatusPill } from './portalComponents'
import StatusBreakdownPanel from './StatusBreakdownPanel'

export function SupplyOfficeView({ activeView, categories, currentUserName, inventory, onInventoryChange, suppliers, onSuppliersChange, stockMovements, onStockMovementAdd, onReview, requests }: { activeView: string; categories: SupplyCategory[]; currentUserName: string; inventory: SupplyItem[]; onInventoryChange: (inventory: SupplyItem[]) => void; suppliers: SupplierInfo[]; onSuppliersChange: (suppliers: SupplierInfo[]) => void; stockMovements: StockMovement[]; onStockMovementAdd: (movements: StockMovement[]) => void; onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All')
  const [query, setQuery] = useState('')
  const supplyRequests = requests.filter((request) => ['Supply Request', 'Inventory Request'].includes(request.kind))
  const filtered = supplyRequests.filter((request) => {
    const itemText = getSupplyItems(request).map((item) => item.label).join(' ')
    const byStatus = statusFilter === 'All' || request.status === statusFilter
    const byQuery = `${request.id} ${request.owner} ${request.title} ${request.remarks} ${itemText}`.toLowerCase().includes(query.toLowerCase())
    return byStatus && byQuery
  })
  const counts = getCounts(supplyRequests)
  const total = supplyRequests.length

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending" value={counts.Pending} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Approved" value={counts.Approved} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Rejected" value={counts.Rejected} icon={XCircle} tone="bg-red-100 text-red-800" />
        <MetricCard label="Total" value={total} icon={PackageCheck} tone="bg-stone-100 text-stone-700" />
      </section>

      {activeView === 'Overview' && (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
            <h2 className="mb-5 text-2xl font-bold">Recent supply requests</h2>
            <div className="space-y-3">
              {supplyRequests.slice(0, 3).map((request) => (
                <button key={request.id} onClick={() => onReview(request)} className="flex w-full items-center gap-4 rounded-md border border-[#e7e1db] p-4 text-left hover:bg-stone-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold"><span className="font-mono font-normal">{request.id}</span> {request.owner}</p>
                    <p className="truncate text-slate-600">{getSupplyItems(request).map((item) => `${item.label} x${item.quantity}`).join(', ')}</p>
                  </div>
                  <span className="text-slate-500">{formatShortDate(request.date)}</span>
                  <StatusPill status={request.status} />
                </button>
              ))}
            </div>
          </div>
          <StatusBreakdownPanel counts={counts} total={total} />
        </section>
      )}

      {activeView === 'Supply Requests' && (
        <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
          <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Supply requests</h2>
              <p className="mt-2 text-xl text-slate-600">Approve supply and inventory requests from employees.</p>
            </div>
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, items..." className="h-14 w-full rounded-md border border-[#e7e1db] bg-stone-50 pl-12 pr-4 text-lg outline-none focus:border-[#228b22] xl:w-[390px]" />
            </label>
          </div>
          <div className="mb-6 flex flex-wrap">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-full border px-5 py-2 ${statusFilter === status ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-[#228b22]' : 'border-[#e7e1db] hover:bg-stone-50'}`}>{status}</button>
            ))}
          </div>
          <SupplyRequestsTable onReview={onReview} requests={filtered} />
        </section>
      )}

      {activeView === 'Inventory' && (
        <InventoryView categories={categories} currentUserName={currentUserName} inventory={inventory} onInventoryChange={onInventoryChange} suppliers={suppliers} onStockMovementAdd={onStockMovementAdd} />
      )}

      {activeView === 'Categories' && (
        <CategoriesView categories={categories} inventory={inventory} />
      )}

      {activeView === 'Stock Movements' && (
        <StockMovementsView stockMovements={stockMovements} />
      )}

      {activeView === 'Suppliers' && (
        <SuppliersView suppliers={suppliers} onSuppliersChange={onSuppliersChange} />
      )}

      {activeView === 'Reports' && (
        <AnalyticsView inventory={inventory} stockMovements={stockMovements} supplyRequests={supplyRequests} />
      )}
    </div>
  )
}

function SupplyRequestsTable({ onReview, requests }: { onReview: (request: PortalRequest) => void; requests: PortalRequest[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left">
        <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
          <tr>
            <th className="px-7 py-5">ID</th>
            <th className="px-7 py-5">Requester</th>
            <th className="px-7 py-5">Items</th>
            <th className="px-7 py-5">Purpose</th>
            <th className="px-7 py-5">Submitted</th>
            <th className="px-7 py-5">Status</th>
            <th className="px-7 py-5 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee9e4]">
          {requests.map((request) => (
            <tr key={request.id}>
              <td className="px-7 py-5 font-mono">{request.id}</td>
              <td className="px-7 py-5 text-xl font-semibold">{request.owner}</td>
              <td className="px-7 py-5">
                <div className="flex flex-wrap gap-2">
                  {getSupplyItems(request).map((item) => (
                    <span key={item.label} className="rounded-full bg-stone-100 px-3 py-1">{item.label} x{item.quantity}</span>
                  ))}
                </div>
              </td>
              <td className="max-w-[360px] truncate px-7 py-5 text-xl text-slate-600">{request.remarks}</td>
              <td className="px-7 py-5 text-slate-600">{formatShortDate(request.date)}</td>
              <td className="px-7 py-5"><StatusPill status={request.status} /></td>
              <td className="px-7 py-5 text-right">
                <button onClick={() => onReview(request)} className="font-semibold text-[#228b22]">Review</button>
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={7} className="px-7 py-10 text-center text-slate-500">No supply requests match this view.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function InventoryView({ categories, currentUserName, inventory, onInventoryChange, onStockMovementAdd }: { categories: SupplyCategory[]; currentUserName: string; inventory: SupplyItem[]; onInventoryChange: (inventory: SupplyItem[]) => void; suppliers: SupplierInfo[]; onStockMovementAdd: (movements: StockMovement[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState<number>(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SupplyItem | null>(null)
  const [stockChangeQty, setStockChangeQty] = useState(0)
  const [stockChangeReason, setStockChangeReason] = useState('')
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: 'piece', quantity: 0, minThreshold: 10, location: '', cost: 0, supplier: '' })

  const getStockStatus = (item: SupplyItem) => {
    if (item.quantity === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' }
    if (item.quantity <= item.minThreshold) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-800' }
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-800' }
  }

  const handleUpdateQty = (id: string) => {
    const updated = inventory.map((item) => item.id === id ? { ...item, quantity: editQty } : item)
    onInventoryChange(updated)
    setEditingId(null)
  }

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category) return
    const id = `INV-${Date.now()}`
    onInventoryChange([...inventory, { id, ...newItem }])
    setNewItem({ name: '', category: '', unit: 'piece', quantity: 0, minThreshold: 10, location: '', cost: 0, supplier: '' })
    setShowAddModal(false)
  }

  const inStock = inventory.filter((item) => item.quantity > 0).length
  const lowStock = inventory.filter((item) => item.quantity > 0 && item.quantity <= item.minThreshold).length
  const outOfStock = inventory.filter((item) => item.quantity === 0).length

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-3 xl:grid-cols-3">
        <MetricCard label="In Stock" value={inStock} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-800" />
        <MetricCard label="Low Stock" value={lowStock} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Out of Stock" value={outOfStock} icon={XCircle} tone="bg-red-100 text-red-800" />
      </section>

      <section className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Supply Inventory</h2>
            <p className="mt-2 text-xl text-slate-600">Monitor and manage current stock levels.</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 font-bold text-white hover:from-orange-600 hover:to-red-600 shadow-lg transition-all hover:shadow-xl hover:scale-105">
            <Plus size={20} />
            Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 text-xs font-bold uppercase tracking-widest text-slate-700 border-b-2 border-slate-200">
              <tr>
                <th className="px-7 py-5">Item Name</th>
                <th className="px-7 py-5">Category</th>
                <th className="px-7 py-5">Quantity</th>
                <th className="px-7 py-5">Unit</th>
                <th className="px-7 py-5">Min. Threshold</th>
                <th className="px-7 py-5">Location</th>
                <th className="px-7 py-5">Status</th>
                <th className="px-7 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee9e4]">
              {inventory.map((item) => {
                const status = getStockStatus(item)
                return (
                  <tr key={item.id}>
                    <td className="px-7 py-5 text-xl font-semibold">{item.name}</td>
                    <td className="px-7 py-5"><span className="rounded-full bg-stone-100 px-3 py-1 text-sm">{item.category}</span></td>
                    <td className="px-7 py-5">
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          value={editQty}
                          onChange={(e) => setEditQty(Math.max(0, Number(e.target.value)))}
                          className="h-10 w-20 rounded border border-[#e7e1db] px-2 outline-none focus:border-[#228b22]"
                        />
                      ) : (
                        <span className="font-mono font-semibold text-lg">{item.quantity}</span>
                      )}
                    </td>
                    <td className="px-7 py-5 text-slate-600">{item.unit}</td>
                    <td className="px-7 py-5 text-slate-600">{item.minThreshold}</td>
                    <td className="px-7 py-5 text-slate-600">{item.location}</td>
                    <td className="px-7 py-5">
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-7 py-5 text-right">
                      {editingId === item.id ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleUpdateQty(item.id)} className="font-semibold text-emerald-600 hover:text-emerald-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="font-semibold text-slate-400 hover:text-slate-600">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setSelectedItem(item)} className="font-semibold text-[#228b22]">Edit</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl bg-gradient-to-br from-white to-slate-50 p-10 shadow-2xl border border-white/20">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold">{selectedItem.name}</h2>
                <p className="mt-1 text-slate-600">{selectedItem.category} • {selectedItem.sku || 'No SKU'}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-500 hover:text-slate-700">
                <X size={28} />
              </button>
            </div>

            <div className="mb-8 grid grid-cols-4 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-5 border border-blue-200">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Current Stock</p>
                <p className="mt-2 text-3xl font-black text-blue-900">{selectedItem.quantity}</p>
                <p className="text-xs text-blue-600 mt-1">{selectedItem.unit}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 p-5 border border-orange-200">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Min Stock Level</p>
                <p className="mt-2 text-3xl font-black text-orange-900">{selectedItem.minThreshold}</p>
                <p className="text-xs text-orange-600 mt-1">{selectedItem.unit}</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-5 border border-purple-200">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Status</p>
                <p className="mt-2">
                  {selectedItem.quantity === 0 ? (
                    <span className="inline-block rounded-full bg-red-200 px-3 py-1 text-xs font-bold text-red-900">Out of Stock</span>
                  ) : selectedItem.quantity <= selectedItem.minThreshold ? (
                    <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">Low Stock</span>
                  ) : (
                    <span className="inline-block rounded-full bg-emerald-200 px-3 py-1 text-xs font-bold text-emerald-900">In Stock</span>
                  )}
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-5 border border-indigo-200">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Location</p>
                <p className="mt-2 text-lg font-black text-indigo-900">{selectedItem.location}</p>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4 border-t border-[#e7e1db] pt-8">
              <div>
                <p className="text-sm font-semibold text-slate-600">Unit Cost</p>
                <p className="mt-1 text-2xl font-bold">₱{selectedItem.cost || 0}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Supplier</p>
                <p className="mt-1 text-lg">{selectedItem.supplier || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Total Value</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">₱{(selectedItem.cost || 0) * selectedItem.quantity}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Expiry Date</p>
                <p className="mt-1 text-lg">{selectedItem.expiryDate || 'No expiry'}</p>
              </div>
            </div>

            <div className="mb-8 border-t border-[#e7e1db] pt-8">
              <p className="mb-4 text-sm font-semibold text-slate-700">Stock Adjustment</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={stockChangeQty}
                    onChange={(e) => setStockChangeQty(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded border border-[#e7e1db] px-3 py-2 text-center outline-none focus:border-[#228b22]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-600">Reason</label>
                  <input
                    value={stockChangeReason}
                    onChange={(e) => setStockChangeReason(e.target.value)}
                    placeholder="e.g., Restock"
                    className="w-full rounded border border-[#e7e1db] px-3 py-2 outline-none focus:border-[#228b22]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => {
                      const newQty = selectedItem.quantity + stockChangeQty
                      onInventoryChange(inventory.map((item) => item.id === selectedItem.id ? { ...item, quantity: newQty } : item))
                      onStockMovementAdd && onStockMovementAdd([{
                        id: `SM-${Date.now()}`,
                        itemId: selectedItem.id,
                        itemName: selectedItem.name,
                        type: 'Stock In',
                        quantity: stockChangeQty,
                        reason: stockChangeReason || 'Stock In',
                        performedBy: currentUserName,
                        date: new Date().toLocaleString(),
                        previousQty: selectedItem.quantity,
                        newQty,
                      }])
                      setSelectedItem({ ...selectedItem, quantity: newQty })
                      setStockChangeQty(0)
                      setStockChangeReason('')
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-bold text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                  >
                    <CheckCircle2 className="mb-1 inline mr-2" size={18} />
                    Stock In
                  </button>
                  <button
                    onClick={() => {
                      if (selectedItem.quantity < stockChangeQty) {
                        alert('Cannot remove more than available stock')
                        return
                      }
                      const newQty = selectedItem.quantity - stockChangeQty
                      onInventoryChange(inventory.map((item) => item.id === selectedItem.id ? { ...item, quantity: newQty } : item))
                      onStockMovementAdd && onStockMovementAdd([{
                        id: `SM-${Date.now()}`,
                        itemId: selectedItem.id,
                        itemName: selectedItem.name,
                        type: 'Stock Out',
                        quantity: stockChangeQty,
                        reason: stockChangeReason || 'Stock Out',
                        performedBy: currentUserName,
                        date: new Date().toLocaleString(),
                        previousQty: selectedItem.quantity,
                        newQty,
                      }])
                      setSelectedItem({ ...selectedItem, quantity: newQty })
                      setStockChangeQty(0)
                      setStockChangeReason('')
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 py-3 font-bold text-white hover:from-red-600 hover:to-pink-600 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
                  >
                    <XCircle className="mb-1 inline mr-2" size={18} />
                    Stock Out
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedItem(null)} className="flex-1 rounded-md border border-[#e7e1db] px-4 py-2 font-semibold hover:bg-stone-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-7 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Add New Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <label>
                <p className="mb-2 font-semibold">Item Name *</p>
                <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g., Bond Paper" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Category *</p>
                <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]">
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <p className="mb-2 font-semibold">Unit</p>
                  <select value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]">
                    <option>piece</option>
                    <option>box</option>
                    <option>ream</option>
                    <option>pack</option>
                    <option>cartridge</option>
                  </select>
                </label>
                <label>
                  <p className="mb-2 font-semibold">Initial Qty</p>
                  <input type="number" min="0" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(0, Number(e.target.value)) })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]" />
                </label>
              </div>
              <label>
                <p className="mb-2 font-semibold">Min Stock Alert</p>
                <input type="number" min="0" value={newItem.minThreshold} onChange={(e) => setNewItem({ ...newItem, minThreshold: Math.max(0, Number(e.target.value)) })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Storage Location</p>
                <input value={newItem.location} onChange={(e) => setNewItem({ ...newItem, location: e.target.value })} placeholder="e.g., Shelf A1" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]" />
              </label>
              <div className="flex gap-3 pt-4">
                <button onClick={handleAddItem} className="flex-1 rounded-md bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600">Add Item</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border border-[#e7e1db] px-4 py-2 font-semibold hover:bg-stone-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CategoriesView({ categories, inventory }: { categories: SupplyCategory[]; inventory: SupplyItem[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Categories</h2>
        <p className="mt-2 text-xl text-slate-600">Organize your inventory by category</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const itemsInCat = inventory.filter((item) => item.category === category.name)
          const lowStockCount = itemsInCat.filter((item) => item.quantity > 0 && item.quantity <= item.minThreshold).length
          return (
            <div key={category.id} className="rounded-lg border border-[#e7e1db] bg-white p-7">
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-xl font-bold">{category.name}</h3>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-slate-600">{itemsInCat.length} items</span>
              </div>
              {lowStockCount > 0 && (
                <div className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  <span className="font-semibold">{lowStockCount}</span> items low on stock
                </div>
              )}
              <div className="space-y-2">
                {itemsInCat.map((item) => {
                  const color = item.quantity === 0 ? 'text-red-600' : item.quantity <= item.minThreshold ? 'text-amber-600' : 'text-emerald-600'
                  return (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.name}</span>
                      <span className={`font-semibold ${color}`}>{item.quantity} {item.unit}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StockMovementsView({ stockMovements }: { stockMovements: StockMovement[] }) {
  const [typeFilter, setTypeFilter] = useState<'All' | 'Stock In' | 'Stock Out'>('All')

  const filtered = typeFilter === 'All' ? stockMovements : stockMovements.filter((move) => move.type === typeFilter)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Stock Movements</h2>
        <p className="mt-2 text-xl text-slate-600">Complete history of all stock transactions</p>
      </div>

      <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="mb-6 flex flex-wrap gap-3">
          {(['All', 'Stock In', 'Stock Out'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-full border px-5 py-2 ${typeFilter === type ? 'border-[#4cbb17] bg-[#4cbb17]/10 text-[#228b22]' : 'border-[#e7e1db] hover:bg-stone-50'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-stone-50 text-sm uppercase tracking-[.12em] text-slate-600">
              <tr>
                <th className="px-7 py-5">Type</th>
                <th className="px-7 py-5">Item</th>
                <th className="px-7 py-5">Quantity</th>
                <th className="px-7 py-5">Reason</th>
                <th className="px-7 py-5">Performed By</th>
                <th className="px-7 py-5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eee9e4]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-7 py-10 text-center text-slate-500">No stock movements to display.</td>
                </tr>
              ) : (
                filtered.map((move) => (
                  <tr key={move.id}>
                    <td className="px-7 py-5">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${move.type === 'Stock In' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {move.type === 'Stock In' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {move.type}
                      </span>
                    </td>
                    <td className="px-7 py-5 font-semibold">{move.itemName}</td>
                    <td className="px-7 py-5">{move.quantity} {move.itemId}</td>
                    <td className="px-7 py-5 text-slate-600">{move.reason}</td>
                    <td className="px-7 py-5">{move.performedBy}</td>
                    <td className="px-7 py-5 text-slate-600">{move.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SuppliersView({ suppliers, onSuppliersChange }: { suppliers: SupplierInfo[]; onSuppliersChange: (suppliers: SupplierInfo[]) => void }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', email: '', leadTime: 3 })

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAddSupplier = () => {
    if (!newSupplier.name || !newSupplier.email) return
    onSuppliersChange([...suppliers, { id: `SUP-${Date.now()}`, ...newSupplier }])
    setNewSupplier({ name: '', contact: '', email: '', leadTime: 3 })
    setShowAddModal(false)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Suppliers</h2>
        <p className="mt-2 text-xl text-slate-600">Manage your supply chain partners and contacts.</p>
      </div>

      <div className="rounded-lg border border-[#e7e1db] bg-white p-7">
        <div className="mb-6 flex items-center justify-between">
          <label className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search suppliers..." className="w-full rounded-md border border-[#e7e1db] bg-stone-50 py-2 pl-12 pr-4 outline-none focus:border-[#228b22]" />
          </label>
          <button onClick={() => setShowAddModal(true)} className="ml-4 flex h-10 items-center gap-2 rounded-md bg-orange-500 px-5 font-semibold text-white hover:bg-orange-600">
            <Plus size={18} />
            Add Supplier
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((supplier) => (
            <div key={supplier.id} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-7 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-black text-slate-900">{supplier.name}</h3>
                <span className="text-2xl">🤝</span>
              </div>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 text-slate-700"><span className="text-lg">📞</span> {supplier.contact}</p>
                <p className="flex items-center gap-2 text-slate-700"><span className="text-lg">📧</span> {supplier.email}</p>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold uppercase text-slate-500">Lead Time</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">{supplier.leadTime} days</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-7 shadow-lg">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Add Supplier</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <label>
                <p className="mb-2 font-semibold">Supplier Name *</p>
                <input value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} placeholder="Supplier name" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Contact Number</p>
                <input value={newSupplier.contact} onChange={(e) => setNewSupplier({ ...newSupplier, contact: e.target.value })} placeholder="e.g., +63-2-8234-5678" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Email *</p>
                <input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} placeholder="supplier@example.com" className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]" />
              </label>
              <label>
                <p className="mb-2 font-semibold">Lead Time (days)</p>
                <input type="number" min="1" value={newSupplier.leadTime} onChange={(e) => setNewSupplier({ ...newSupplier, leadTime: Math.max(1, Number(e.target.value)) })} className="w-full rounded border border-[#e7e1db] px-4 py-2 outline-none focus:border-[#228b22]" />
              </label>
              <div className="flex gap-3 pt-4">
                <button onClick={handleAddSupplier} className="flex-1 rounded-md bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600">Add Supplier</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-md border border-[#e7e1db] px-4 py-2 font-semibold hover:bg-stone-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsView({ inventory, stockMovements, supplyRequests }: { inventory: SupplyItem[]; stockMovements: StockMovement[]; supplyRequests: PortalRequest[] }) {
  const totalValue = inventory.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0)
  const avgTurnover = stockMovements.length > 0 ? (stockMovements.filter((m) => m.type === 'Stock Out').length / stockMovements.length * 100).toFixed(1) : '0'
  const lowStockItems = inventory.filter((item) => item.quantity > 0 && item.quantity <= item.minThreshold).length
  const stockOutItems = inventory.filter((item) => item.quantity === 0).length

  const topMovedItems = inventory
    .map((item) => ({
      name: item.name,
      movements: stockMovements.filter((m) => m.itemId === item.id).length,
    }))
    .sort((a, b) => b.movements - a.movements)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Analytics & Reports</h2>
        <p className="mt-2 text-xl text-slate-600">Inventory insights and performance metrics.</p>
      </div>

      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Inventory Value" value={`₱${totalValue.toLocaleString()}`} icon={PackageCheck} tone="bg-blue-100 text-blue-800" />
        <MetricCard label="Stock Turnover" value={`${avgTurnover}%`} icon={Layers3} tone="bg-green-100 text-green-800" />
        <MetricCard label="Low Stock Items" value={lowStockItems} icon={Clock} tone="bg-amber-100 text-amber-800" />
        <MetricCard label="Out of Stock" value={stockOutItems} icon={XCircle} tone="bg-red-100 text-red-800" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg hover:shadow-xl transition-all">
          <h2 className="mb-8 text-2xl font-bold text-slate-900">📊 Top Moved Items</h2>
          <div className="space-y-4">
            {topMovedItems.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-50 to-transparent hover:from-orange-100 transition-all">
                <div className="flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-md">{idx + 1}</span>
                  <span className="font-semibold text-slate-900">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">{item.movements} moves</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg hover:shadow-xl transition-all">
          <h2 className="mb-8 text-2xl font-bold text-slate-900">📋 Supply Requests</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all">
              <span className="font-semibold text-slate-700">Total Requests</span>
              <span className="text-2xl font-black text-slate-900 bg-white px-4 py-2 rounded-lg">{supplyRequests.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-100 hover:bg-amber-200 transition-all">
              <span className="font-semibold text-amber-900">Pending</span>
              <span className="text-lg font-bold text-amber-900 bg-white px-3 py-1 rounded">{supplyRequests.filter((r) => r.status === 'Pending').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 transition-all">
              <span className="font-semibold text-emerald-900">Approved</span>
              <span className="text-lg font-bold text-emerald-900 bg-white px-3 py-1 rounded">{supplyRequests.filter((r) => r.status === 'Approved').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-100 hover:bg-blue-200 transition-all">
              <span className="font-semibold text-blue-900">Completed</span>
              <span className="text-lg font-bold text-blue-900 bg-white px-3 py-1 rounded">{supplyRequests.filter((r) => r.status === 'Completed').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export default SupplyOfficeView
