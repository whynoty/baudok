# BauDok — Bautagesberichte leicht gemacht

BauDok hilft Handwerkern und Bauarbeitern, ihre tägliche Dokumentation schnell und professionell zu erledigen. Einfach den Arbeitstag beschreiben — BauDok erstellt automatisch einen formellen Bautagesbericht.

**Sprachen:** Deutsch (Standard), Englisch, Spanisch, Italienisch, Portugiesisch

---

## Features

### Kernfunktionen
- **Sprach- & Texteingabe** — Arbeitstag in eigenen Worten beschreiben (Spracheingabe via Web Speech API)
- **KI-gestützte Berichte** — Claude AI (claude-sonnet-4-6) strukturiert die Eingabe in formelle Bautagesberichte
- **Mehrere Exportformate** — PDF (WeasyPrint), CSV, Excel, E-Mail-Versand
- **Mehrbenutzer-Betrieb** — Unternehmensadmin, Vorgesetzte, Mitarbeiter
- **Dashboard** — Berichtshistorie, Filter, Teamübersicht
- **Mehrsprachig** — DE, EN, ES, IT, PT

### Erweiterte Features

| # | Feature | Beschreibung |
|---|---------|-------------|
| 1 | **Foto-Anhänge** | Baustellenfotos mit GPS-Koordinaten, Beschriftungen und Lightbox; Thumbnails im PDF eingebettet |
| 2 | **PWA + Offline-Modus** | Service Worker (Workbox), Berichte offline erstellen und bei Wiederverbindung synchronisieren |
| 3 | **Berichtsvorlagen** | Wiederverwendbare Vorlagen (Vorlagen) pro Unternehmen/Gewerk; Nutzungszähler; Verwaltungsseite für Admins |
| 4 | **Wetter-Autofill** | Standort-basierte Wetterermittlung via Open-Meteo API (kein API-Key nötig); automatische Befüllung von Wetter und Temperatur |
| 5 | **Analyse-Dashboard** | Recharts-Diagramme: Berichte/Tag, Stunden/Projekt, Materialien/Projekt, Top-Mitarbeiter, Einreichungsquote |
| 6 | **Digitale Unterschrift** | Canvas-basiertes Unterschriftenpad (Pointer Events); Worker- und Vorgesetzter-Unterschrift; in PDF eingebettet |
| 7 | **Kundenportal** | Teilbare Links mit Ablaufzeit für Auftraggeber; öffentliche Leseansicht ohne Login; Zugriffsstatistik |
| 8 | **Push-Benachrichtigungen** | Web Push via pywebpush/VAPID; tägliche Erinnerungen (Celery Beat); Supervisor-Alerts bei neuen Berichten; E-Mail-Fallback |
| 9 | **Material- & Gerätekatalog** | Unternehmensweiter Katalog mit Autocomplete in der Berichtsvorschau; CSV-Import; KI nutzt Katalognamen automatisch |
| 10 | **Mängelverfolgung** | SiteDefect-Modell mit Status-Workflow (offen → in Bearbeitung → behoben → abgenommen); Foto-Anhänge; Mängelprotokoll-PDF |

---

## Quick Start (Docker)

```bash
git clone https://github.com/whynoty/baudok.git
cd baudok
cp .env.example .env
# .env bearbeiten: ANTHROPIC_API_KEY, SECRET_KEY, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY setzen

docker-compose up
```

Frontend: http://localhost:5173  
Backend API: http://localhost:8000/api/v1/

---

## Local Development

### Prerequisites
- Python 3.9+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Celery Worker + Beat
```bash
cd backend
celery -A config worker -l info          # async jobs (PDF, email, push)
celery -A config beat -l info            # scheduled tasks (daily reminders)
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Tests

```bash
# Backend (80% coverage target)
cd backend
pytest --cov=apps --cov-report=term-missing

# Frontend (70% coverage target)
cd frontend
npm run test

# Integration tests
cd backend
pytest tests/integration/ -v
```

---

## Architecture

```
baudok/
├── backend/                    Django 4.2 + DRF + Celery
│   ├── apps/accounts/          Multi-tenant auth (Company, User, roles)
│   ├── apps/reports/           Reports, entries, projects, exports
│   │   ├── views_weather.py    Open-Meteo weather proxy
│   │   ├── views_analytics.py  Aggregation endpoint for dashboards
│   │   ├── views_signatures.py Digital signature endpoints
│   │   ├── views_share.py      Client portal shareable links
│   │   ├── views_catalog.py    Material & equipment catalog
│   │   └── views_defects.py    Defect tracking (Mängelprotokoll)
│   ├── apps/ai/                Claude API integration + catalog hints
│   └── apps/notifications/     Push (pywebpush) + email delivery
├── frontend/                   React 18 + TypeScript + Vite
│   ├── src/pages/
│   │   ├── auth/               Login
│   │   ├── dashboard/          DashboardPage (stats + offline drafts)
│   │   ├── reports/            NewReportPage, ReportDetailPage, ReportHistoryPage
│   │   ├── analytics/          AnalyticsDashboardPage
│   │   ├── defects/            DefectListPage, DefectDetailPage
│   │   ├── share/              PublicReportPage (no-auth client portal)
│   │   ├── profile/            NotificationSettingsPage
│   │   └── admin/              UserManagement, TemplateManagement, CatalogManagement
│   ├── src/components/
│   │   ├── ui/                 Button, Input, Textarea, Select, Modal, Badge, Spinner, Card
│   │   ├── layout/             AppShell, Sidebar, TopBar, OfflineBanner
│   │   ├── reports/            VoiceInput, GeneratedPreview, PhotoUploader, PhotoGrid,
│   │   │                       TemplatePicker, SaveAsTemplateButton, WeatherWidget,
│   │   │                       SignaturePad, SignatureDisplay, ShareLinkManager,
│   │   │                       MaterialAutocomplete
│   │   └── defects/            DefectFormModal
│   └── src/hooks/              useAuth, useVoiceInput, useReports, useProjects,
│                               useTemplates, useWeather, useAnalytics, useSignatures,
│                               useShare, useNotifications, useCatalog, useDefects,
│                               useOnlineStatus, useSyncDrafts
└── public/
    ├── sw-notifications.js     Service worker push event handler
    └── locales/{de,en,es,it,pt}/  i18n translation files
```

**Auth:** JWT (SimpleJWT) — access token in memory (Zustand), refresh in httpOnly cookie  
**AI:** claude-sonnet-4-6 — plain input → formal German Bautagesbericht (JSON) + company catalog hints  
**PDF:** WeasyPrint — daily reports, Mängelprotokoll, async via Celery  
**Queue:** Redis + Celery (PDF generation, email, Web Push, daily reminders)  
**Offline:** Vite PWA plugin (Workbox) + IndexedDB-backed draft queue  

See [CLAUDE.md](CLAUDE.md) for full developer context.

---

## API Endpoints (`/api/v1/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login/` | Public | JWT login |
| POST | `/auth/refresh/` | Public | Token refresh |
| GET/PATCH | `/auth/me/` | JWT | Own profile |
| GET/POST | `/projects/` | supervisor+ | List/create projects |
| GET/POST | `/reports/` | JWT | Reports CRUD |
| POST | `/ai/generate/` | JWT | Generate report from raw text |
| GET | `/reports/{id}/pdf/` | JWT | Download PDF |
| GET | `/reports/{id}/export/csv/` | supervisor+ | CSV export |
| GET | `/reports/{id}/export/excel/` | supervisor+ | Excel export |
| POST | `/reports/{id}/send-email/` | JWT | Queue email delivery |
| GET/POST | `/reports/{id}/photos/` | JWT | Photo attachments |
| GET/POST | `/reports/{id}/signatures/` | JWT | Digital signatures |
| GET/POST | `/reports/{report_id}/share/` | supervisor+ | Share links |
| GET | `/public/share/{token}/` | Public | Client portal view |
| GET | `/templates/` | JWT | Report templates |
| GET | `/weather/` | JWT | Weather auto-fill (Open-Meteo proxy) |
| GET | `/analytics/` | supervisor+ | Dashboard analytics |
| GET/POST | `/catalog/materials/` | JWT | Material catalog |
| POST | `/catalog/materials/import/` | supervisor+ | CSV import |
| GET/POST | `/catalog/equipment/` | JWT | Equipment catalog |
| GET/POST | `/defects/` | JWT | Defect tracking |
| GET | `/defects/export/pdf/` | supervisor+ | Mängelprotokoll PDF |
| GET/POST | `/notifications/subscribe/` | JWT | Web Push subscription |
| GET/PATCH | `/notifications/preferences/` | JWT | Notification settings |

---

## Environment Variables

See `.env.example`. Required variables:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | Claude API key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_CLAIMS_EMAIL` | Contact email for VAPID claims |
| `EMAIL_HOST_*` | SMTP settings for email delivery |

Generate VAPID keys: `pip install py-vapid && vapid --gen`

---

## License

MIT
