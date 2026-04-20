import { http, HttpResponse } from 'msw'

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

export const handlers = [
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
]
