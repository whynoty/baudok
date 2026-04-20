export type UserRole = 'company_admin' | 'supervisor' | 'worker'
export type Language = 'de' | 'en' | 'es' | 'it' | 'pt'
export type ReportStatus = 'draft' | 'generated' | 'reviewed' | 'sent'
export type EntryCategory = 'work_performed' | 'materials_used' | 'equipment' | 'personnel' | 'obstacle' | 'safety' | 'note'

export interface Company {
  id: string
  name: string
  slug: string
  address: string
  tax_id: string
  preferred_language: Language
  logo: string | null
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  trade: string
  preferred_language: Language
  phone: string
  company: Pick<Company, 'id' | 'name' | 'slug'>
}

export interface Project {
  id: string
  name: string
  address: string
  project_number: string
  client_name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

export interface ReportEntry {
  id: string
  category: EntryCategory
  position: number
  content: string
  duration_hours: string | null
  quantity: string
}

export interface ReportPhoto {
  id: string
  image: string
  image_url: string
  caption: string
  taken_at: string | null
  latitude: string | null
  longitude: string | null
  position: number
  created_at: string
}

export interface DailyReport {
  id: string
  project: Project | null
  created_by: User
  reviewed_by: User | null
  report_date: string
  status: ReportStatus
  weather: string
  temperature: number | null
  raw_input_text: string
  structured_data: Record<string, unknown>
  ai_tokens_used: number
  created_at: string
  updated_at: string
  entries?: ReportEntry[]
  photos?: ReportPhoto[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface AdminStats {
  total_reports: number
  reports_this_month: number
  active_workers: number
  pending_review: number
}

export interface LoginResponse {
  access: string
  refresh: string
}

export interface GenerateReportPayload {
  raw_input: string
  project_id?: string
  report_date: string
  weather?: string
  temperature?: number
}

export interface ReportTemplate {
  id: string
  name: string
  trade: string
  description: string
  raw_input_template: string
  is_company_wide: boolean
  usage_count: number
  created_by_name: string | null
  created_at: string
  updated_at: string
}
