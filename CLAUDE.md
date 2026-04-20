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

## Key Architecture Rules

### Security
- JWT authentication only (SimpleJWT) — no session cookies
- Store JWT access token in memory (Zustand), refresh token in httpOnly cookie
- All DB queries MUST be tenant-scoped: always filter by `company` or via `request.user.company`
- UUIDs as PKs on ALL models — never expose sequential integers in URLs
- Cross-tenant access must return 404, never 403

### AI Integration
- Claude API response is always JSON; parse with `apps/ai/parsers.py`
- System prompt instructs formal German output regardless of input language
- Retry once on parse failure; return 422 to frontend on second failure
- Always record `ai_tokens_used` per report

### Async Jobs
- Celery + Redis for PDF generation and email delivery — never inline these in views
- PDF generation: first request returns 202 + polling URL if not cached

## Role Model
- `worker`: CRUD own reports only
- `supervisor`: read all company reports, mark reviewed
- `company_admin`: full access + user management + company settings

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
Required: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `EMAIL_HOST_*`

## Code Conventions
- Backend: Black formatting, isort imports, flake8 linting
- Frontend: ESLint + Prettier, strict TypeScript (`noImplicitAny: true`, no `any`)
- API versioning: `/api/v1/` prefix always
- All DRF serializers include company-level permission check
- Fixtures in `conftest.py`, one test file per app view file

## What NOT to Do
- Never call Claude API synchronously on a request where user waits > 5s
- Never return another company's data — every queryset filtered by `company=request.user.company`
- Never store `ANTHROPIC_API_KEY` in version control
- Never use `any` type in TypeScript
- Never skip migrations — always run `makemigrations` before `migrate`
