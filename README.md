# BauDok — Bautagesberichte leicht gemacht

BauDok hilft Handwerkern und Bauarbeitern, ihre tägliche Dokumentation schnell und professionell zu erledigen. Einfach den Arbeitstag beschreiben — BauDok erstellt automatisch einen formellen Bautagesbericht.

**Sprachen:** Deutsch (Standard), Englisch, Spanisch, Italienisch, Portugiesisch

---

## Features

- **Sprach- & Texteingabe** — Arbeitstag in eigenen Worten beschreiben
- **KI-gestützte Berichte** — Claude AI strukturiert die Eingabe in formelle Berichte
- **Mehrere Exportformate** — PDF, CSV, Excel, E-Mail-Versand
- **Mehrbenutzer-Betrieb** — Unternehmensadmin, Vorgesetzte, Mitarbeiter
- **Dashboard** — Berichtshistorie, Filter, Teamübersicht
- **Mehrsprachig** — DE, EN, ES, IT, PT

---

## Quick Start (Docker)

```bash
git clone <repo>
cd baudok
cp .env.example .env
# .env bearbeiten: ANTHROPIC_API_KEY, SECRET_KEY setzen

docker-compose up
```

Frontend: http://localhost:5173  
Backend API: http://localhost:8000/api/v1/

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Celery Worker
```bash
cd backend
celery -A config worker -l info
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
├── backend/          Django + DRF + Celery
│   ├── apps/accounts/    Multi-tenant auth (Company, User, roles)
│   ├── apps/reports/     Reports, entries, projects, exports
│   ├── apps/ai/          Claude API integration
│   └── apps/notifications/ Email delivery
└── frontend/         React 18 + TypeScript + Vite
    ├── src/pages/        Login, Dashboard, NewReport, History, Admin
    ├── src/components/   UI primitives, layout, reports, admin
    └── src/hooks/        useAuth, useVoiceInput, useReports
```

**Auth:** JWT (SimpleJWT) — access token in memory, refresh in httpOnly cookie  
**AI:** claude-sonnet-4-6 — plain German input → formal Bautagesbericht (JSON)  
**PDF:** WeasyPrint (async via Celery)  
**Queue:** Redis + Celery  

See [CLAUDE.md](CLAUDE.md) for full developer context.

---

## Environment Variables

See `.env.example`. Required variables:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `ANTHROPIC_API_KEY` | Claude API key |
| `EMAIL_HOST_*` | SMTP settings for email delivery |

---

## License

MIT
