import apiClient from './client'
import type { MaterialItem, EquipmentItem, CsvImportResult } from './types'

export interface MaterialParams {
  search?: string
  category?: string
}

export interface EquipmentParams {
  search?: string
}

export interface MaterialPayload {
  name: string
  unit: string
  unit_cost?: string | null
  category: string
}

export interface EquipmentPayload {
  name: string
  equipment_type: string
  daily_rate?: string | null
}

export const catalogApi = {
  // Materials
  listMaterials: (params?: MaterialParams) =>
    apiClient.get<MaterialItem[]>('/catalog/materials/', { params }),

  getMaterial: (id: string) =>
    apiClient.get<MaterialItem>(`/catalog/materials/${id}/`),

  createMaterial: (data: MaterialPayload) =>
    apiClient.post<MaterialItem>('/catalog/materials/', data),

  updateMaterial: (id: string, data: Partial<MaterialPayload>) =>
    apiClient.patch<MaterialItem>(`/catalog/materials/${id}/`, data),

  deleteMaterial: (id: string) =>
    apiClient.delete(`/catalog/materials/${id}/`),

  importMaterialsCsv: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<CsvImportResult>('/catalog/materials/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Equipment
  listEquipment: (params?: EquipmentParams) =>
    apiClient.get<EquipmentItem[]>('/catalog/equipment/', { params }),

  createEquipment: (data: EquipmentPayload) =>
    apiClient.post<EquipmentItem>('/catalog/equipment/', data),

  updateEquipment: (id: string, data: Partial<EquipmentPayload>) =>
    apiClient.patch<EquipmentItem>(`/catalog/equipment/${id}/`, data),

  deleteEquipment: (id: string) =>
    apiClient.delete(`/catalog/equipment/${id}/`),
}
