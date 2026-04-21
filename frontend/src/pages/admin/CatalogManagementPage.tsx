import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useMaterials,
  useEquipment,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  useImportMaterialsCsv,
} from '../../hooks/useCatalog'
import { Button, Input, Modal, Spinner } from '../../components/ui'
import type { MaterialItem, EquipmentItem } from '../../api/types'

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error'
}

let toastCounter = 0

function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  function addToast(text: string, type: ToastMessage['type'] = 'success') {
    const id = ++toastCounter
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  return { toasts, addToast }
}

// ─── Material form state ──────────────────────────────────────────────────────

interface MaterialFormState {
  name: string
  unit: string
  unit_cost: string
  category: string
}

const emptyMaterialForm = (): MaterialFormState => ({
  name: '',
  unit: '',
  unit_cost: '',
  category: '',
})

function materialFromItem(item: MaterialItem): MaterialFormState {
  return {
    name: item.name,
    unit: item.unit,
    unit_cost: item.unit_cost ?? '',
    category: item.category,
  }
}

// ─── Equipment form state ─────────────────────────────────────────────────────

interface EquipmentFormState {
  name: string
  equipment_type: string
  daily_rate: string
}

const emptyEquipmentForm = (): EquipmentFormState => ({
  name: '',
  equipment_type: '',
  daily_rate: '',
})

function equipmentFromItem(item: EquipmentItem): EquipmentFormState {
  return {
    name: item.name,
    equipment_type: item.equipment_type,
    daily_rate: item.daily_rate ?? '',
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CatalogManagementPage() {
  const { t } = useTranslation()
  const { toasts, addToast } = useToasts()

  // ── Material state ──────────────────────────────────────────────────────────
  const [materialSearch, setMaterialSearch] = useState('')
  const [materialModalOpen, setMaterialModalOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(null)
  const [materialForm, setMaterialForm] = useState<MaterialFormState>(emptyMaterialForm())
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null)

  // ── Equipment state ─────────────────────────────────────────────────────────
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null)
  const [equipmentForm, setEquipmentForm] = useState<EquipmentFormState>(emptyEquipmentForm())
  const [deleteEquipmentId, setDeleteEquipmentId] = useState<string | null>(null)

  // ── CSV import ──────────────────────────────────────────────────────────────
  const csvInputRef = useRef<HTMLInputElement>(null)

  // ── Queries & mutations ─────────────────────────────────────────────────────
  const { data: materials = [], isLoading: materialsLoading } = useMaterials(
    materialSearch || undefined
  )
  const { data: equipmentList = [], isLoading: equipmentLoading } = useEquipment(
    equipmentSearch || undefined
  )

  const createMaterial = useCreateMaterial()
  const updateMaterial = useUpdateMaterial()
  const deleteMaterial = useDeleteMaterial()
  const createEquipment = useCreateEquipment()
  const updateEquipment = useUpdateEquipment()
  const deleteEquipment = useDeleteEquipment()
  const importCsv = useImportMaterialsCsv()

  // ── Material handlers ───────────────────────────────────────────────────────
  const openCreateMaterial = () => {
    setEditingMaterial(null)
    setMaterialForm(emptyMaterialForm())
    setMaterialModalOpen(true)
  }

  const openEditMaterial = (item: MaterialItem) => {
    setEditingMaterial(item)
    setMaterialForm(materialFromItem(item))
    setMaterialModalOpen(true)
  }

  const closeMaterialModal = () => {
    setMaterialModalOpen(false)
    setEditingMaterial(null)
    setMaterialForm(emptyMaterialForm())
  }

  const handleMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: materialForm.name,
      unit: materialForm.unit,
      unit_cost: materialForm.unit_cost || null,
      category: materialForm.category,
    }
    try {
      if (editingMaterial) {
        await updateMaterial.mutateAsync({ id: editingMaterial.id, data: payload })
      } else {
        await createMaterial.mutateAsync(payload)
      }
      closeMaterialModal()
    } catch {
      addToast(t('common.error'), 'error')
    }
  }

  const handleDeleteMaterial = async () => {
    if (!deleteMaterialId) return
    try {
      await deleteMaterial.mutateAsync(deleteMaterialId)
      setDeleteMaterialId(null)
    } catch {
      addToast(t('common.error'), 'error')
    }
  }

  // ── Equipment handlers ──────────────────────────────────────────────────────
  const openCreateEquipment = () => {
    setEditingEquipment(null)
    setEquipmentForm(emptyEquipmentForm())
    setEquipmentModalOpen(true)
  }

  const openEditEquipment = (item: EquipmentItem) => {
    setEditingEquipment(item)
    setEquipmentForm(equipmentFromItem(item))
    setEquipmentModalOpen(true)
  }

  const closeEquipmentModal = () => {
    setEquipmentModalOpen(false)
    setEditingEquipment(null)
    setEquipmentForm(emptyEquipmentForm())
  }

  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: equipmentForm.name,
      equipment_type: equipmentForm.equipment_type,
      daily_rate: equipmentForm.daily_rate || null,
    }
    try {
      if (editingEquipment) {
        await updateEquipment.mutateAsync({ id: editingEquipment.id, data: payload })
      } else {
        await createEquipment.mutateAsync(payload)
      }
      closeEquipmentModal()
    } catch {
      addToast(t('common.error'), 'error')
    }
  }

  const handleDeleteEquipment = async () => {
    if (!deleteEquipmentId) return
    try {
      await deleteEquipment.mutateAsync(deleteEquipmentId)
      setDeleteEquipmentId(null)
    } catch {
      addToast(t('common.error'), 'error')
    }
  }

  // ── CSV import handler ──────────────────────────────────────────────────────
  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await importCsv.mutateAsync(file)
      addToast(
        t('catalog.importSuccess', {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
        }),
        'success'
      )
    } catch {
      addToast(t('common.error'), 'error')
    } finally {
      // Reset file input so the same file can be re-selected
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
  }

  const isMaterialPending = createMaterial.isPending || updateMaterial.isPending
  const isEquipmentPending = createEquipment.isPending || updateEquipment.isPending

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      {/* Toast notifications */}
      <div
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              background: toast.type === 'error' ? 'var(--color-error)' : 'var(--color-primary)',
              color: '#fff',
              fontSize: '14px',
              boxShadow: 'var(--shadow-md)',
              maxWidth: '360px',
            }}
          >
            {toast.text}
          </div>
        ))}
      </div>

      <h1 style={{ marginBottom: '32px', fontSize: '24px', fontWeight: 700 }}>
        {t('catalog.title')}
      </h1>

      {/* ── Materials section ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '48px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('catalog.materials')}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={t('catalog.search')}
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              style={{
                padding: '7px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '14px',
                outline: 'none',
                width: '180px',
              }}
            />
            {/* Hidden CSV file input */}
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleCsvFileChange}
              aria-label={t('catalog.importCsv')}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => csvInputRef.current?.click()}
              loading={importCsv.isPending}
              type="button"
            >
              {t('catalog.importCsv')}
            </Button>
            <Button variant="primary" size="sm" onClick={openCreateMaterial} type="button">
              {t('catalog.addMaterial')}
            </Button>
          </div>
        </div>

        {materialsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Spinner size={32} />
          </div>
        ) : materials.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '16px 0' }}>
            {t('catalog.empty')}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <Th>{t('catalog.name')}</Th>
                  <Th>{t('catalog.unit')}</Th>
                  <Th>{t('catalog.category')}</Th>
                  <Th>{t('catalog.unitCost')}</Th>
                  <Th style={{ textAlign: 'right' }}>{t('common.edit')}</Th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <Td>{item.name}</Td>
                    <Td>{item.unit}</Td>
                    <Td>{item.category}</Td>
                    <Td>{item.unit_cost ?? '—'}</Td>
                    <Td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditMaterial(item)}
                          type="button"
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteMaterialId(item.id)}
                          type="button"
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Equipment section ──────────────────────────────────────────────────── */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('catalog.equipment')}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder={t('catalog.search')}
              value={equipmentSearch}
              onChange={(e) => setEquipmentSearch(e.target.value)}
              style={{
                padding: '7px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '14px',
                outline: 'none',
                width: '180px',
              }}
            />
            <Button variant="primary" size="sm" onClick={openCreateEquipment} type="button">
              {t('catalog.addEquipment')}
            </Button>
          </div>
        </div>

        {equipmentLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
            <Spinner size={32} />
          </div>
        ) : equipmentList.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', padding: '16px 0' }}>
            {t('catalog.empty')}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <Th>{t('catalog.name')}</Th>
                  <Th>{t('catalog.type')}</Th>
                  <Th>{t('catalog.dailyRate')}</Th>
                  <Th style={{ textAlign: 'right' }}>{t('common.edit')}</Th>
                </tr>
              </thead>
              <tbody>
                {equipmentList.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <Td>{item.name}</Td>
                    <Td>{item.equipment_type}</Td>
                    <Td>{item.daily_rate ?? '—'}</Td>
                    <Td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditEquipment(item)}
                          type="button"
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteEquipmentId(item.id)}
                          type="button"
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Material modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={materialModalOpen}
        onClose={closeMaterialModal}
        title={editingMaterial ? t('common.edit') : t('catalog.addMaterial')}
        footer={
          <>
            <Button variant="secondary" onClick={closeMaterialModal} type="button">
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              form="material-form"
              type="submit"
              loading={isMaterialPending}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="material-form" onSubmit={handleMaterialSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label={t('catalog.name')}
              value={materialForm.name}
              onChange={(e) => setMaterialForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label={t('catalog.unit')}
              value={materialForm.unit}
              onChange={(e) => setMaterialForm((p) => ({ ...p, unit: e.target.value }))}
            />
            <Input
              label={t('catalog.unitCost')}
              type="number"
              step="0.01"
              min="0"
              value={materialForm.unit_cost}
              onChange={(e) => setMaterialForm((p) => ({ ...p, unit_cost: e.target.value }))}
            />
            <Input
              label={t('catalog.category')}
              value={materialForm.category}
              onChange={(e) => setMaterialForm((p) => ({ ...p, category: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* ── Equipment modal ────────────────────────────────────────────────────── */}
      <Modal
        isOpen={equipmentModalOpen}
        onClose={closeEquipmentModal}
        title={editingEquipment ? t('common.edit') : t('catalog.addEquipment')}
        footer={
          <>
            <Button variant="secondary" onClick={closeEquipmentModal} type="button">
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              form="equipment-form"
              type="submit"
              loading={isEquipmentPending}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form id="equipment-form" onSubmit={handleEquipmentSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label={t('catalog.name')}
              value={equipmentForm.name}
              onChange={(e) => setEquipmentForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label={t('catalog.type')}
              value={equipmentForm.equipment_type}
              onChange={(e) => setEquipmentForm((p) => ({ ...p, equipment_type: e.target.value }))}
            />
            <Input
              label={t('catalog.dailyRate')}
              type="number"
              step="0.01"
              min="0"
              value={equipmentForm.daily_rate}
              onChange={(e) => setEquipmentForm((p) => ({ ...p, daily_rate: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* ── Delete material confirmation ───────────────────────────────────────── */}
      <Modal
        isOpen={deleteMaterialId !== null}
        onClose={() => setDeleteMaterialId(null)}
        title={t('catalog.confirmDelete')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteMaterialId(null)}
              type="button"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteMaterial}
              loading={deleteMaterial.isPending}
              type="button"
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '14px' }}>{t('catalog.confirmDelete')}</p>
      </Modal>

      {/* ── Delete equipment confirmation ──────────────────────────────────────── */}
      <Modal
        isOpen={deleteEquipmentId !== null}
        onClose={() => setDeleteEquipmentId(null)}
        title={t('catalog.confirmDelete')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteEquipmentId(null)}
              type="button"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteEquipment}
              loading={deleteEquipment.isPending}
              type="button"
            >
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '14px' }}>{t('catalog.confirmDelete')}</p>
      </Modal>
    </div>
  )
}

// ── Small table helpers ────────────────────────────────────────────────────────

function Th({
  children,
  style,
}: {
  children?: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '8px 12px',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  style,
}: {
  children?: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <td
      style={{
        padding: '10px 12px',
        color: 'var(--color-text)',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {children}
    </td>
  )
}
