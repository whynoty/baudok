# CLAUDE.md — BauDok Project Context

## Project Overview
BauDok is a multi-tenant construction documentation SaaS for German Handwerksbetriebe.
Workers describe their daily work in plain language; Claude AI (claude-sonnet-4-6) transforms
it into formal German Bautagesberichte (construction daily reports).

Supported languages: DE (primary), EN, ES, IT, PT.

## Monorepo Layout
- `/backend` — Django 4.2 + DRF Python application
- `/frontend` — React 18 + TypeScript + Vite SPA

## Stack
- Backend: Django + DRF + SimpleJWT + Celery + Redis + PostgreSQL
- Frontend: React 18 + TypeScript + Vite + Zustand + TanStack Query + react-i18next
- AI: Anthropic SDK (`claude-sonnet-4-6`)
- PDF: WeasyPrint (HTML/CSS templates in `/backend/templates/reports/`)
- Exports: pandas (CSV), openpyxl (Excel)
- Push Notifications: pywebpush + py-vapid (VAPID keys in env)
- Charts: Recharts (analytics dashboard)

## Key Architecture Rules

### Security
- JWT authentication only (SimpleJWT) — no session cookies
- Store JWT access token in memory (Zustand + sessionStorage), refresh token in httpOnly cookie
- All DB queries MUST be tenant-scoped: always filter by `company` or via `request.user.company`
- UUIDs as PKs on ALL models — never expose sequential integers in URLs
- Cross-tenant access must return 404, never 403

### AI Integration
- Claude API response is always JSON; parse with `apps/ai/parsers.py`
- System prompt instructs formal German output regardless of input language
- `build_catalog_hint()` in `apps/ai/prompts.py` appends company catalog to system prompt
- Retry once on parse failure; return 422 to frontend on second failure
- Always record `ai_tokens_used` per report

### Async Jobs
- Celery + Redis for PDF generation, email delivery, Web Push — never inline in views
- PDF generation: first request returns 202 + polling URL if not cached
- Daily reminder Celery Beat task: `apps.notifications.tasks.send_daily_reminders` (hourly cron, fires based on user's `reminder_time`)
- Supervisor alert: `send_supervisor_alert.delay(report_id)` called after `transaction.atomic()` in `GenerateReportView`

### Offline / PWA
- Vite PWA plugin (Workbox `generateSW` strategy) in `frontend/vite.config.ts`
- Push event handlers in `frontend/public/sw-notifications.js` (loaded via `importScripts`)
- Offline draft queue: Zustand `offlineStore` + localStorage; synced via `useSyncDrafts` on reconnect
- `OfflineBanner` in AppShell shows yellow alert when offline, green on reconnect

## Role Model
- `worker`: CRUD own reports + own defects only; no catalog write; sees company-wide templates
- `supervisor`: read all company reports/defects, mark reviewed, create share links, export analytics, sign as supervisor
- `company_admin`: full access + user management + company settings

## Data Models

### Core (accounts app)
- **Company**: id (UUID), name, slug, logo, address, tax_id, preferred_language, is_active
- **User**: id (UUID), company (FK), email, first_name, last_name, role, trade, preferred_language, phone

### Reports app
- **Project**: id, company, name, address, project_number, client_name, start/end_date
- **DailyReport**: id, company, project, created_by, reviewed_by, report_date, status [draft|generated|reviewed|sent], weather, temperature, raw_input_text, structured_data (JSON), pdf_file, ai_model_used, ai_tokens_used
- **ReportEntry**: id, report, category [work_performed|materials_used|equipment|personnel|obstacle|safety|note], position, content, duration_hours, quantity
- **ReportPhoto**: id, report, image, caption, lat, lng, taken_at, position
- **ReportTemplate**: id, company, created_by, name, trade, description, raw_input_template, is_company_wide, usage_count
- **SignatureRecord**: id, report, signer, signer_name, signer_role [worker|supervisor], signature_image (base64 PNG), signed_at, ip_address — unique_together (report, signer_role)
- **ShareLink**: id, report, created_by, token (secrets.token_urlsafe), expires_at, note, is_active, accessed_count
- **MaterialItem**: id, company, name, unit, unit_cost, category, is_active — unique_together (company, name)
- **EquipmentItem**: id, company, name, equipment_type, daily_rate, is_active — unique_together (company, name)
- **SiteDefect**: id, company, project, report, reported_by, assigned_to, title, description, status [open|in_progress|resolved|accepted], priority [low|medium|high], location, resolved_at, photos
- **DefectPhoto**: id, defect, image, caption, uploaded_at
- **EmailDelivery**: id, report, sent_by, recipient_email, sent_at, status, error_message

### Notifications app
- **PushSubscription**: id, user, endpoint (unique), p256dh, auth, user_agent, is_active
- **NotificationPreference**: OneToOne(user), daily_reminder, reminder_time, supervisor_alerts, push_enabled, email_fallback

## API Endpoints (`/api/v1/`)

All endpoints require JWT unless marked Public.

```
POST   /auth/login/                                  Public
POST   /auth/refresh/                                Public
GET    /auth/me/                                     JWT
GET    /notifications/vapid-public-key/              JWT
POST   /notifications/subscribe/                     JWT
DELETE /notifications/subscribe/                     JWT
GET    /notifications/preferences/                   JWT
PATCH  /notifications/preferences/                   JWT
GET    /projects/                                    JWT
POST   /projects/                                    supervisor+
GET    /reports/                                     JWT (role-filtered)
POST   /reports/                                     JWT
GET    /reports/{id}/                                JWT
PATCH  /reports/{id}/                                JWT + ownership/role
POST   /reports/{id}/review/                         supervisor+
GET    /reports/{id}/pdf/                            JWT
GET    /reports/{id}/export/csv/                     supervisor+
GET    /reports/{id}/export/excel/                   supervisor+
POST   /reports/{id}/send-email/                     JWT
GET/POST  /reports/{id}/photos/                      JWT
GET/POST  /reports/{id}/signatures/                  JWT
GET/POST  /reports/{report_id}/share/                supervisor+
DELETE    /reports/{report_id}/share/{link_id}/      supervisor+
GET    /public/share/{token}/                        Public (client portal)
POST   /ai/generate/                                 JWT
POST   /ai/regenerate/{id}/                          JWT + ownership
GET    /weather/                                     JWT
GET    /analytics/                                   supervisor+
GET    /templates/                                   JWT
POST   /templates/                                   JWT
POST   /templates/{id}/use/                          JWT
POST   /templates/from_report/                       JWT
GET    /catalog/materials/                           JWT
POST   /catalog/materials/                           supervisor+
PATCH  /catalog/materials/{id}/                      supervisor+
DELETE /catalog/materials/{id}/                      supervisor+ (soft delete)
POST   /catalog/materials/import/                    supervisor+ (CSV multipart)
GET    /catalog/equipment/                           JWT
POST   /catalog/equipment/                           supervisor+
PATCH  /catalog/equipment/{id}/                      supervisor+
DELETE /catalog/equipment/{id}/                      supervisor+
GET    /defects/                                     JWT (role-filtered)
POST   /defects/                                     JWT
GET    /defects/{id}/                                JWT
PATCH  /defects/{id}/                                JWT + ownership/role
DELETE /defects/{id}/                                JWT + ownership/role
GET    /defects/export/pdf/                          supervisor+
GET/POST  /defects/{defect_id}/photos/               JWT
DELETE    /defects/{defect_id}/photos/{photo_id}/    JWT
GET    /admin-panel/users/                           company_admin
POST   /admin-panel/users/                           company_admin
PATCH  /admin-panel/users/{id}/                      company_admin
DELETE /admin-panel/users/{id}/                      company_admin
GET    /export/reports/                              supervisor+
```

## Frontend Pages

| Route | Page | Roles |
|-------|------|-------|
| `/login` | LoginPage | Public |
| `/dashboard` | DashboardPage | All |
| `/reports/new` | NewReportPage | All (TemplatePicker + WeatherWidget) |
| `/reports/:id` | ReportDetailPage | All (SignaturePad + ShareLinkManager for sup+) |
| `/reports` | ReportHistoryPage | All |
| `/analytics` | AnalyticsDashboardPage | supervisor+ |
| `/defects` | DefectListPage | All |
| `/defects/:id` | DefectDetailPage | All |
| `/share/:token` | PublicReportPage | Public (no auth) |
| `/profile/notifications` | NotificationSettingsPage | All |
| `/admin/users` | UserManagementPage | company_admin |
| `/admin/templates` | TemplateManagementPage | supervisor+ |
| `/admin/catalog` | CatalogManagementPage | supervisor+ |

## Running Locally
```bash
# Start dependencies
docker-compose up db redis

# Backend
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env  # fill in values
python manage.py migrate
python manage.py runserver

# Celery worker (separate terminal)
cd backend
celery -A config worker -l info

# Celery beat (separate terminal — for daily reminders)
cd backend
celery -A config beat -l info

# Frontend
cd frontend
npm install
npm run dev
```

## Running Tests
```bash
# Backend (target: 80% coverage)
cd backend && pytest --cov=apps --cov-report=term-missing

# Frontend (target: 70% coverage)
cd frontend && npm run test

# Integration tests (requires real DB)
cd backend && pytest tests/integration/ -v
```

## Environment Variables
See `.env.example` in project root.

Required:
- `ANTHROPIC_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`
- `EMAIL_HOST_*` — SMTP for email delivery
- `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_CLAIMS_EMAIL` — Web Push

Generate VAPID keys: `pip install py-vapid && vapid --gen`

## Code Conventions
- Backend: Black formatting, isort imports, flake8 linting
- Frontend: ESLint + Prettier, strict TypeScript (`noImplicitAny: true`, no `any`)
- API versioning: `/api/v1/` prefix always
- All DRF serializers include company-level permission check
- Fixtures in `conftest.py`, one test file per app view file
- Python 3.9 compat: use `Optional[X]` not `X | Y` union syntax

## What NOT to Do
- Never call Claude API synchronously on a request where user waits > 5s
- Never return another company's data — every queryset filtered by `company=request.user.company`
- Never store `ANTHROPIC_API_KEY` or VAPID keys in version control
- Never use `any` type in TypeScript
- Never skip migrations — always run `makemigrations` before `migrate`
- Cross-tenant access must return 404, never 403
- `send_supervisor_alert.delay()` must be called OUTSIDE `transaction.atomic()` blocks
