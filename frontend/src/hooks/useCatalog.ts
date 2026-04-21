import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '../api/catalog'
import type { MaterialPayload, EquipmentPayload } from '../api/catalog'

export function useMaterials(search?: string, category?: string) {
  return useQuery({
    queryKey: ['materials', search, category],
    queryFn: () =>
      catalogApi.listMaterials({ search, category }).then((r) => r.data),
  })
}

export function useEquipment(search?: string) {
  return useQuery({
    queryKey: ['equipment', search],
    queryFn: () => catalogApi.listEquipment({ search }).then((r) => r.data),
  })
}

export function useCreateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MaterialPayload) =>
      catalogApi.createMaterial(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
    },
  })
}

export function useUpdateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MaterialPayload> }) =>
      catalogApi.updateMaterial(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
    },
  })
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteMaterial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
    },
  })
}

export function useCreateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EquipmentPayload) =>
      catalogApi.createEquipment(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
    },
  })
}

export function useUpdateEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquipmentPayload> }) =>
      catalogApi.updateEquipment(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
    },
  })
}

export function useDeleteEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogApi.deleteEquipment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
    },
  })
}

export function useImportMaterialsCsv() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) =>
      catalogApi.importMaterialsCsv(file).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials'] })
    },
  })
}
