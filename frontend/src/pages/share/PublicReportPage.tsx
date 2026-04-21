import { useParams } from 'react-router-dom'
import { usePublicReport } from '../../hooks/useShare'
import { Spinner } from '../../components/ui'

const CATEGORY_LABELS: Record<string, string> = {
  work_performed: 'Ausgeführte Arbeiten',
  materials_used: 'Verwendetes Material',
  equipment: 'Geräte / Maschinen',
  personnel: 'Personal',
  obstacle: 'Behinderungen / Probleme',
  safety: 'Sicherheit',
  note: 'Sonstige Notizen',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>()
  const { data: report, isLoading, isError } = usePublicReport(token ?? '')

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spinner size={40} />
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '24px',
        }}
      >
        <p
          style={{
            fontSize: '16px',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            maxWidth: '400px',
          }}
        >
          Dieser Link ist nicht mehr gültig oder wurde deaktiviert.
        </p>
      </div>
    )
  }

  const groupedEntries = report.entries.reduce<Record<string, typeof report.entries>>(
    (acc, entry) => {
      const key = entry.category
      if (!acc[key]) acc[key] = []
      acc[key].push(entry)
      return acc
    },
    {}
  )

  return (
    <div
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '40px 24px 80px',
        fontFamily: 'system-ui, sans-serif',
        color: 'var(--color-text, #1a1a1a)',
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: '32px', borderBottom: '2px solid #e5e7eb', paddingBottom: '24px' }}>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px',
          }}
        >
          {report.company_name}
        </p>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px' }}>
          Bautagesbericht
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '8px 24px',
            fontSize: '14px',
          }}
        >
          <div>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Datum: </span>
            {formatDate(report.report_date)}
          </div>
          <div>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Projekt: </span>
            {report.project_name}
          </div>
          <div>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>Mitarbeiter: </span>
            {report.worker_name}
          </div>
          {report.weather && (
            <div>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>Wetter: </span>
              {report.weather}
            </div>
          )}
          {report.temperature && (
            <div>
              <span style={{ color: '#6b7280', fontWeight: 500 }}>Temperatur: </span>
              {report.temperature}
            </div>
          )}
        </div>
      </header>

      {/* Entries grouped by category */}
      <main>
        {Object.entries(groupedEntries).map(([category, entries]) => (
          <section key={category} style={{ marginBottom: '28px' }}>
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#374151',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '6px',
                marginBottom: '12px',
              }}
            >
              {CATEGORY_LABELS[category] ?? category}
            </h2>
            {entries.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: '0 0 4px' }}>{entry.content}</p>
                {entry.duration_hours !== null && (
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Stunden: {entry.duration_hours}
                  </span>
                )}
              </div>
            ))}
          </section>
        ))}

        {report.entries.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Keine Einträge vorhanden.</p>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: '48px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '12px',
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Erstellt mit BauDok · Gültig bis {formatDate(report.share_expires_at)}
      </footer>
    </div>
  )
}
