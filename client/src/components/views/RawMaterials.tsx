import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import AddMaterialModal from '../inventory/AddMaterialModal'
import { useRawMaterials } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import type { RawMaterial } from '../../types/api'
import AsyncState from '../ui/AsyncState'
import ConfirmDialog from '../ui/ConfirmDialog'
import Toast from '../ui/Toast'
import EditRawMaterialModal from './EditRawMaterialModal'
import RawMaterialProductCard from './RawMaterialProductCard'
import RestockModal from './RestockModal'
import UseStockModal from './UseStockModal'

interface RawMaterialsProps {
  searchQuery: string
}

function groupKey(item: RawMaterial) {
  return [item.name, item.brand ?? '', item.styleNumber ?? ''].join('::')
}

function RawMaterials({ searchQuery }: RawMaterialsProps) {
  const { data: rawMaterials, loading, error, refetch, mutate } = useRawMaterials()
  const query = searchQuery.trim().toLowerCase()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [restockingItems, setRestockingItems] = useState<RawMaterial[] | null>(null)
  const [usingItems, setUsingItems] = useState<RawMaterial[] | null>(null)
  const [pendingDeleteItems, setPendingDeleteItems] = useState<RawMaterial[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!rawMaterials) return []
    if (!query) return rawMaterials
    return rawMaterials.filter((item) =>
      [item.name, item.sku, item.brand, item.color, item.size, item.category.name]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)),
    )
  }, [rawMaterials, query])

  const productGroups = useMemo(() => {
    const groups = new Map<string, RawMaterial[]>()
    for (const item of filtered) {
      const key = groupKey(item)
      const existing = groups.get(key)
      if (existing) existing.push(item)
      else groups.set(key, [item])
    }
    return [...groups.values()]
  }, [filtered])

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 3200)
  }

  const handleAddSuccess = (message: string, createdItems: RawMaterial[]) => {
    setAddModalOpen(false)
    // Reflect the new variants immediately, then reconcile with the server in the background.
    mutate((prev) => {
      const existing = prev ?? []
      return [...existing, ...createdItems].sort((a, b) => a.name.localeCompare(b.name))
    })
    refetch()
    showToast(message)
  }

  const handleEditSuccess = (message: string) => {
    setEditingMaterial(null)
    refetch()
    showToast(message)
  }

  const handleRestockSuccess = (message: string, updatedItems: RawMaterial[]) => {
    setRestockingItems(null)
    // updatedItems may include brand-new variants (from adding a size that didn't
    // exist yet), not just adjustments to items already in the list.
    mutate((prev) => {
      const existing = prev ?? []
      const updatedById = new Map(updatedItems.map((item) => [item.id, item]))
      const merged = existing.map((item) => updatedById.get(item.id) ?? item)
      const newOnes = updatedItems.filter((item) => !existing.some((e) => e.id === item.id))
      return [...merged, ...newOnes].sort((a, b) => a.name.localeCompare(b.name))
    })
    refetch()
    showToast(message)
  }

  const handleUseSuccess = (message: string, updatedItems: RawMaterial[]) => {
    setUsingItems(null)
    mutate((prev) => {
      const existing = prev ?? []
      const updatedById = new Map(updatedItems.map((item) => [item.id, item]))
      return existing.map((item) => updatedById.get(item.id) ?? item)
    })
    refetch()
    showToast(message)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteItems) return
    const items = pendingDeleteItems
    setDeleting(true)
    try {
      const ids = items.map((item) => item.id)
      await api.post('/raw-materials/delete-batch', { ids })
      mutate((prev) => (prev ?? []).filter((item) => !ids.includes(item.id)))
      refetch()
      showToast(
        items.length > 1
          ? `Deleted ${items.length} variants of ${items[0]!.name}.`
          : `Deleted ${items[0]!.name}.`,
      )
      setPendingDeleteItems(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Raw Materials</h2>
          <p className="mt-1 text-sm text-slate-500">
            Blanks, inks, packaging, and tapes across the shop.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="size-4" />
          Add Raw Material
        </button>
      </div>

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading raw materials..." />
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {productGroups.map((group) => (
            <RawMaterialProductCard
              key={group[0]!.id}
              items={group}
              onEdit={setEditingMaterial}
              onRestock={setRestockingItems}
              onUse={setUsingItems}
              onDeleteRequest={setPendingDeleteItems}
            />
          ))}
          {productGroups.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
              {searchQuery
                ? `No raw materials match "${searchQuery}".`
                : 'No raw materials yet.'}
            </p>
          )}
        </div>
      )}

      {addModalOpen && (
        <AddMaterialModal onClose={() => setAddModalOpen(false)} onSuccess={handleAddSuccess} />
      )}

      {editingMaterial && (
        <EditRawMaterialModal
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {restockingItems && (
        <RestockModal
          items={restockingItems}
          onClose={() => setRestockingItems(null)}
          onSuccess={handleRestockSuccess}
        />
      )}

      {usingItems && (
        <UseStockModal
          items={usingItems}
          onClose={() => setUsingItems(null)}
          onSuccess={handleUseSuccess}
        />
      )}

      {pendingDeleteItems && (
        <ConfirmDialog
          title={`Delete "${pendingDeleteItems[0]!.name}"?`}
          message={
            pendingDeleteItems.length > 1
              ? `This will permanently remove all ${pendingDeleteItems.length} variants (${pendingDeleteItems.reduce((sum, item) => sum + item.quantity, 0)} ${pendingDeleteItems[0]!.unit ?? 'units'} total). This cannot be undone.`
              : 'This cannot be undone.'
          }
          confirmLabel="Delete"
          tone="danger"
          confirming={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteItems(null)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default RawMaterials
