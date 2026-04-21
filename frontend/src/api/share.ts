import axios from 'axios'
import apiClient from './client'
import type { ShareLink, PublicReport } from './types'

export async function listShareLinks(reportId: string): Promise<ShareLink[]> {
  const response = await apiClient.get<ShareLink[]>(`/reports/${reportId}/share/`)
  return response.data
}

export async function createShareLink(
  reportId: string,
  expiresDays: number,
  note: string
): Promise<ShareLink> {
  const response = await apiClient.post<ShareLink>(`/reports/${reportId}/share/`, {
    expires_days: expiresDays,
    note,
  })
  return response.data
}

export async function deleteShareLink(reportId: string, linkId: string): Promise<void> {
  await apiClient.delete(`/reports/${reportId}/share/${linkId}/`)
}

export async function getPublicReport(token: string): Promise<PublicReport> {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
  const response = await axios.get<PublicReport>(
    `${baseUrl}/api/v1/public/share/${token}/`
  )
  return response.data
}
