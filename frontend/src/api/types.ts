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

export interface WeatherData {
  description: string
  temperature_max: number
  temperature_min: number
  unit: string
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

export interface ReportsByDay {
  date: string
  count: number
}

export interface HoursByProject {
  project_id: string | null
  project_name: string
  total_hours: number
}

export interface MaterialsByProject {
  project_id: string | null
  project_name: string
  entries: number
}

export interface TopWorker {
  worker_id: string
  worker_name: string
  report_count: number
  total_hours: number
}

export interface SubmissionRate {
  on_time: number
  total: number
  percentage: number
}

export interface AnalyticsData {
  reports_by_day: ReportsByDay[]
  hours_by_project: HoursByProject[]
  materials_by_project: MaterialsByProject[]
  top_workers: TopWorker[]
  submission_rate: SubmissionRate
}

export interface SignatureRecord {
  id: string
  signer_name: string
  signer_role: 'worker' | 'supervisor'
  signed_at: string
  signature_image: string
  ip_address: string | null
}

export interface ShareLink {
  id: string
  token: string
  url: string
  expires_at: string
  note: string
  is_active: boolean
  accessed_count: number
}

export interface PublicReportEntry {
  category: string
  content: string
  duration_hours: number | null
}

export interface PublicReport {
  report_date: string
  project_name: string
  weather: string
  temperature: string
  worker_name: string
  company_name: string
  entries: PublicReportEntry[]
  share_expires_at: string
}

export interface NotificationPreference {
  daily_reminder: boolean
  reminder_time: string       // "HH:MM:SS"
  supervisor_alerts: boolean
  push_enabled: boolean
  email_fallback: boolean
}
