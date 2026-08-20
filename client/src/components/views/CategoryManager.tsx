import { Loader2, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useCategories } from '../../hooks/useInventory'
import { api } from '../../lib/api'
import { categoryColor } from '../../lib/categoryColor'
import { invalidInputClass } from '../../lib/formValidation'
import AsyncState from '../ui/AsyncState'
import Toast from '../ui/Toast'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
const inputClassInvalid = `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:bg-slate-950 dark:text-slate-100 ${invalidInputClass}`

function CategoryManager() {
  const { data: categories, loading, error, refetch } = useCategories()

  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(null), 2600)
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setAttempted(true)
      setFormError('Fill in the highlighted fields before saving.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await api.post('/categories', {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setName('')
      setDescription('')
      setAttempted(false)
      setFormOpen(false)
      refetch()
      showToast('Category created.')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create category.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, categoryName: string) => {
    if (!window.confirm(`Delete "${categoryName}"? This cannot be undone.`)) return

    setDeletingId(id)
    try {
      await api.del(`/categories/${id}`)
      refetch()
      showToast(`Deleted "${categoryName}".`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete category.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Category Manager</h2>
          <p className="mt-1 text-sm text-slate-500">
            Organize how raw materials, screens, and stock are grouped.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {formOpen ? <X className="size-4" /> : <Plus className="size-4" />}
          {formOpen ? 'Cancel' : 'New Category'}
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-500" htmlFor="category-name">
                Name
              </label>
              <input
                id="category-name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Heat Transfer Vinyl"
                className={attempted && !name.trim() ? inputClassInvalid : inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500" htmlFor="category-description">
                Description (optional)
              </label>
              <input
                id="category-description"
                type="text"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What lives in this category?"
                className={inputClass}
              />
            </div>
          </div>
          {formError && <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create Category
          </button>
        </form>
      )}

      {(loading || error) && (
        <AsyncState loading={loading} error={error} loadingLabel="Loading categories..." />
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(categories ?? []).map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <span className={`size-3 shrink-0 rounded-full ${categoryColor(category.name).solid}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {category.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {category.description ?? 'No description'}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 tabular-nums dark:bg-slate-800 dark:text-slate-300">
                {category._count?.rawMaterials ?? 0}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(category.id, category.name)}
                disabled={deletingId === category.id}
                aria-label={`Delete ${category.name}`}
                className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600 disabled:cursor-wait dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                {deletingId === category.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </div>
          ))}
          {categories?.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">
              No categories yet. Create one to get started.
            </p>
          )}
        </div>
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default CategoryManager
