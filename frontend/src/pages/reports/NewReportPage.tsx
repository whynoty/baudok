import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { aiApi } from '../../api/ai'
import { reportsApi } from '../../api/reports'
import { useProjects } from '../../hooks/useProjects'
import { useOfflineStore } from '../../store/offlineStore'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { Button, Input, Select, Textarea, Spinner } from '../../components/ui'
import { VoiceInput } from '../../components/reports/VoiceInput'
import { GeneratedPreview } from '../../components/reports/GeneratedPreview'
import { PhotoUploader } from '../../components/reports/PhotoUploader'
import TemplatePicker from '../../components/reports/TemplatePicker'
import { WeatherWidget } from '../../components/reports/WeatherWidget'
import type { DailyReport, ReportPhoto } from '../../api/types'

export default function NewReportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: projectsData } = useProjects({ is_active: true })
  const { addDraft } = useOfflineStore()
  const isOnline = useOnlineStatus()

  const today = new Date().toISOString().split('T')[0]
  const [reportDate, setReportDate] = useState(today)
  const [projectId, setProjectId] = useState('')
  const [weather, setWeather] = useState('')
  const [temperature, setTemperature] = useState('')
  const [rawInput, setRawInput] = useState('')
  const [generatedReport, setGeneratedReport] = useState<DailyReport | null>(null)
  const [generateError, setGenerateError] = useState('')
  const [savedReport, setSavedReport] = useState<DailyReport | null>(null)
  const [reportPhotos, setReportPhotos] = useState<ReportPhoto[]>([])
  const [offlineSaved, setOfflineSaved] = useState(false)

  const generateMutation = useMutation({
    mutationFn: () =>
      aiApi
        .generate({
          raw_input: rawInput,
          project_id: projectId || undefined,
          report_date: reportDate,
          weather: weather || undefined,
          temperature: temperature && !Number.isNaN(Number(temperature)) ? Number(temperature) : undefined,
        })
        .then((r) => r.data.report),
    onSuccess: (report) => {
      setGeneratedReport(report)
      setGenerateError('')
    },
    onError: () => {
      setGenerateError(t('report.generateError'))
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!generatedReport) return Promise.reject(new Error('No report'))
      return reportsApi
        .update(generatedReport.id, { status: 'generated' })
        .then((r) => r.data)
    },
    onSuccess: (saved) => {
      setSavedReport(saved)
    },
  })

  const handleGenerate = () => {
    if (!isOnline) {
      const selectedProject = projectsData?.results.find((p) => p.id === projectId) ?? null
      addDraft({
        reportDate,
        projectId: projectId || null,
        projectName: selectedProject?.name ?? null,
        weather,
        temperature: temperature ? Number(temperature) : null,
        rawInput,
      })
      setOfflineSaved(true)
      return
    }
    generateMutation.mutate()
  }

  const handleRegenerate = () => {
    setGeneratedReport(null)
    generateMutation.mutate()
  }

  const projectOptions = [
    { value: '', label: t('report.noProject') },
    ...(projectsData?.results ?? []).map((p) => ({ value: p.id, label: p.name })),
  ]

  return (
    <div style={{ maxWidth: '720px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ margin: 0 }}>{t('report.new')}</h1>
        <TemplatePicker onSelect={(tpl) => setRawInput(tpl.raw_input_template)} />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <WeatherWidget
          date={reportDate}
          onWeatherFetched={(description, temperatureString) => {
            setWeather(description)
            setTemperature(temperatureString)
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <Input
          label={t('report.date')}
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
        />
        <Select
          label={t('report.project')}
          options={projectOptions}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Input
            label={t('report.weather')}
            type="text"
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Input
            label={t('report.temperature')}
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <VoiceInput
          onTranscript={(text) => setRawInput(text)}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Textarea
          label={t('report.rawInput')}
          placeholder={t('report.rawInputPlaceholder')}
          rows={6}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
        />
      </div>

      {generateError && (
        <div
          role="alert"
          style={{
            padding: '10px 12px',
            background: '#f8d7da',
            border: '1px solid #f5c2c7',
            borderRadius: 'var(--radius)',
            color: 'var(--color-error)',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {generateError}
        </div>
      )}

      {offlineSaved && (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 6,
            padding: 12,
            marginBottom: 16,
          }}
        >
          {t('offline.savedLocally')}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              marginLeft: 12,
              background: '#1a6b3c',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            {t('nav.dashboard')}
          </button>
        </div>
      )}

      {!offlineSaved && generateMutation.isPending ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '20px',
            background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius)',
            marginBottom: '16px',
          }}
        >
          <Spinner size={20} />
          <span>{t('report.generating')}</span>
        </div>
      ) : !offlineSaved ? (
        <Button
          onClick={handleGenerate}
          disabled={!rawInput.trim()}
          type="button"
        >
          {t('report.generate')}
        </Button>
      ) : null}

      {generatedReport && !generateMutation.isPending && !savedReport && (
        <GeneratedPreview
          report={generatedReport}
          onSave={() => saveMutation.mutate()}
          onRegenerate={handleRegenerate}
          isSaving={saveMutation.isPending}
        />
      )}

      {savedReport && (
        <div style={{ marginTop: '32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <h2 style={{ margin: 0 }}>{t('report.photos.title')}</h2>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {t('report.photos.addLater')}
            </span>
          </div>
          <PhotoUploader
            reportId={savedReport.id}
            photos={reportPhotos}
            onPhotosChange={setReportPhotos}
          />
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="button" onClick={() => navigate(`/reports/${savedReport.id}`)}>
              {t('report.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
