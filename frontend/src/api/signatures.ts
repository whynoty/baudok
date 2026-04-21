import apiClient from './client'
import type { SignatureRecord } from './types'

export async function listSignatures(reportId: string): Promise<SignatureRecord[]> {
  const response = await apiClient.get<{ data: SignatureRecord[] }>(
    `/reports/${reportId}/signatures/`
  )
  return response.data.data
}

export async function createSignature(
  reportId: string,
  signatureImage: string
): Promise<SignatureRecord> {
  const response = await apiClient.post<{ data: SignatureRecord }>(
    `/reports/${reportId}/signatures/`,
    { signature_image: signatureImage }
  )
  return response.data.data
}
