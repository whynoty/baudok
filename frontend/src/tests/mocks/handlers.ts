import { http, HttpResponse } from 'msw'
import type { AnalyticsData, NotificationPreference, SignatureRecord, ShareLink, PublicReport } from '../../api/types'

export const mockAnalytics: AnalyticsData = {
  reports_by_day: [
    { date: '2026-04-20', count: 2 },
    { date: '2026-04-21', count: 3 },
  ],
  hours_by_project: [
    { project_id: 'proj-uuid-1', project_name: 'Projekt Alpha', total_hours: 24.0 },
    { project_id: 'proj-uuid-2', project_name: 'Projekt Beta', total_hours: 16.5 },
  ],
  materials_by_project: [
    { project_id: 'proj-uuid-1', project_name: 'Projekt Alpha', entries: 8 },
    { project_id: 'proj-uuid-2', project_name: 'Projekt Beta', entries: 4 },
  ],
  top_workers: [
    { worker_id: 'worker-uuid-1', worker_name: 'Hans Müller', report_count: 12, total_hours: 96.0 },
    { worker_id: 'worker-uuid-2', worker_name: 'Anna Schmidt', report_count: 8, total_hours: 64.0 },
  ],
  submission_rate: { on_time: 18, total: 20, percentage: 90.0 },
}

export const mockUser = {
  id: 'user-uuid-1',
  email: 'worker@test.de',
  first_name: 'Hans',
  last_name: 'Müller',
  role: 'worker' as const,
  trade: 'Elektriker',
  preferred_language: 'de' as const,
  phone: '',
  company: { id: 'company-uuid-1', name: 'Test GmbH', slug: 'test-gmbh' },
}

export const mockReport = {
  id: 'report-uuid-1',
  project: null,
  created_by: mockUser,
  reviewed_by: null,
  report_date: '2026-04-21',
  status: 'generated' as const,
  weather: 'sonnig',
  temperature: 18,
  raw_input_text: 'Heute Leitungen verlegt',
  structured_data: {
    work_performed: [
      { description: 'Elektroleitungen verlegt', duration_hours: 8.0, location: 'EG' },
    ],
    materials_used: [],
    equipment: [],
    personnel: [],
    obstacles: [],
    safety_notes: [],
    general_notes: [],
    summary: 'Elektroarbeiten abgeschlossen.',
  },
  ai_tokens_used: 300,
  created_at: '2026-04-21T17:00:00Z',
  updated_at: '2026-04-21T17:00:00Z',
  entries: [
    {
      id: 'entry-uuid-1',
      category: 'work_performed' as const,
      position: 0,
      content: 'Elektroleitungen verlegt',
      duration_hours: '8.00',
      quantity: '',
    },
  ],
}

export const mockTemplates = [
  {
    id: 'tpl-uuid-1',
    name: 'Elektro Standardtag',
    trade: 'Elektriker',
    description: '',
    raw_input_template: 'Heute Leitungen verlegt',
    is_company_wide: true,
    usage_count: 5,
    created_by_name: 'Admin',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'tpl-uuid-2',
    name: 'Sanitär Basis',
    trade: 'Sanitär',
    description: 'Basis-Vorlage',
    raw_input_template: 'Rohre verlegt',
    is_company_wide: false,
    usage_count: 2,
    created_by_name: 'Hans',
    created_at: '2026-04-02T00:00:00Z',
    updated_at: '2026-04-02T00:00:00Z',
  },
]

export const mockWeather = {
  description: 'Sonnig',
  temperature_max: 20,
  temperature_min: 10,
  unit: '°C',
}

export const mockShareLink: ShareLink = {
  id: 'share-uuid-1',
  token: 'abc123token',
  url: '/share/abc123token',
  expires_at: '2026-05-21T00:00:00Z',
  note: 'Für Bauherr',
  is_active: true,
  accessed_count: 5,
}

export const mockPublicReport: PublicReport = {
  report_date: '2026-04-21',
  project_name: 'Baustelle Nord',
  weather: 'Sonnig',
  temperature: '18°C',
  worker_name: 'Max Mustermann',
  company_name: 'Bau GmbH',
  entries: [
    { category: 'work_performed', content: 'Leitungen verlegt', duration_hours: 6.0 },
  ],
  share_expires_at: '2026-05-21T00:00:00Z',
}

export const mockNotificationPrefs: NotificationPreference = {
  daily_reminder: true,
  reminder_time: '17:00:00',
  supervisor_alerts: false,
  push_enabled: false,
  email_fallback: true,
}

export const mockSignature: SignatureRecord = {
  id: 'sig-uuid-1',
  signer_name: 'Hans Müller',
  signer_role: 'worker',
  signed_at: '2026-04-21T17:00:00Z',
  signature_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  ip_address: null,
}

export const handlers = [
  http.get('*/analytics/', () => HttpResponse.json(mockAnalytics)),
  http.get('*/weather/', () => HttpResponse.json(mockWeather)),
  http.post('*/auth/login/', () =>
    HttpResponse.json({ access: 'mock-access-token', refresh: 'mock-refresh-token' })
  ),
  http.get('*/auth/me/', () => HttpResponse.json(mockUser)),
  http.post('*/auth/logout/', () => HttpResponse.json({})),
  http.get('*/reports/', () =>
    HttpResponse.json({ count: 1, next: null, previous: null, results: [mockReport] })
  ),
  http.get('*/reports/:id/', () => HttpResponse.json(mockReport)),
  http.patch('*/reports/:id/', () => HttpResponse.json(mockReport)),
  http.get('*/projects/', () =>
    HttpResponse.json({ count: 0, next: null, previous: null, results: [] })
  ),
  http.post('*/ai/generate/', () =>
    HttpResponse.json({ report: mockReport }, { status: 201 })
  ),
  http.get('*/admin-panel/stats/', () =>
    HttpResponse.json({
      total_reports: 5,
      reports_this_month: 3,
      active_workers: 4,
      pending_review: 1,
    })
  ),
  http.get('*/admin-panel/users/', () => HttpResponse.json([mockUser])),
  http.get('*/templates/', () =>
    HttpResponse.json({
      count: 2,
      next: null,
      previous: null,
      results: mockTemplates,
    })
  ),
  // from_report must be registered before the generic :id handlers
  http.post('*/templates/from_report/', () =>
    HttpResponse.json(
      {
        id: 'tpl-uuid-3',
        name: 'Neue Vorlage',
        trade: '',
        description: '',
        raw_input_template: 'x',
        is_company_wide: false,
        usage_count: 0,
        created_by_name: null,
        created_at: '2026-04-21T00:00:00Z',
        updated_at: '2026-04-21T00:00:00Z',
      },
      { status: 201 }
    )
  ),
  http.post('*/templates/', () =>
    HttpResponse.json(
      { ...mockTemplates[0], id: 'tpl-uuid-new' },
      { status: 201 }
    )
  ),
  http.post('*/templates/:id/use/', () =>
    HttpResponse.json({ ...mockTemplates[0], usage_count: 6 })
  ),
  http.patch('*/templates/:id/', ({ params }) =>
    HttpResponse.json({ ...mockTemplates[0], id: params.id as string })
  ),
  http.delete('*/templates/:id/', () => new HttpResponse(null, { status: 204 })),
  http.get('*/admin-panel/company/', () =>
    HttpResponse.json({
      id: 'company-uuid-1',
      name: 'Test GmbH',
      slug: 'test-gmbh',
      address: 'Teststraße 1',
      tax_id: '123',
      preferred_language: 'de',
      logo: null,
    })
  ),
  http.get('*/reports/*/share/', () => HttpResponse.json([mockShareLink])),
  http.post('*/reports/*/share/', () => HttpResponse.json(mockShareLink, { status: 201 })),
  http.delete('*/reports/*/share/*/', () => new HttpResponse(null, { status: 204 })),
  http.get('*/public/share/*/', () => HttpResponse.json(mockPublicReport)),
  http.get('*/notifications/vapid-public-key/', () =>
    HttpResponse.json({ public_key: 'test-key' })
  ),
  http.post('*/notifications/subscribe/', () => new HttpResponse(null, { status: 201 })),
  http.delete('*/notifications/subscribe/', () => new HttpResponse(null, { status: 204 })),
  http.get('*/notifications/preferences/', () => HttpResponse.json(mockNotificationPrefs)),
  http.patch('*/notifications/preferences/', async ({ request }) => {
    const body = await request.json() as Partial<NotificationPreference>
    return HttpResponse.json({ ...mockNotificationPrefs, ...body })
  }),
  http.get('*/reports/*/signatures/', () => HttpResponse.json({ data: [] })),
  http.post('*/reports/*/signatures/', () =>
    HttpResponse.json({ data: mockSignature }, { status: 201 })
  ),
]
