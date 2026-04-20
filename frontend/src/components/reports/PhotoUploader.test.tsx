import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import type { ReactNode } from 'react'
import i18n from '../../i18n/index'
import { PhotoUploader } from './PhotoUploader'
import { reportsApi } from '../../api/reports'
import type { ReportPhoto } from '../../api/types'

vi.mock('../../api/reports', () => ({
  reportsApi: {
    uploadPhoto: vi.fn(),
    updatePhoto: vi.fn(),
    deletePhoto: vi.fn(),
  },
}))

const mockUploadPhoto = vi.mocked(reportsApi.uploadPhoto)
const mockUpdatePhoto = vi.mocked(reportsApi.updatePhoto)
const mockDeletePhoto = vi.mocked(reportsApi.deletePhoto)

const createMockPhoto = (overrides: Partial<ReportPhoto> = {}): ReportPhoto => ({
  id: 'photo-uuid-1',
  image: '/media/reports/photos/2026/04/test.jpg',
  image_url: 'http://localhost:8000/media/reports/photos/2026/04/test.jpg',
  caption: 'Baustelle EG',
  taken_at: '2026-04-21T10:30:00Z',
  latitude: '52.520008',
  longitude: '13.404954',
  position: 0,
  created_at: '2026-04-21T17:00:00Z',
  ...overrides,
})

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}

function renderUploader(
  props: Partial<React.ComponentProps<typeof PhotoUploader>> = {}
) {
  const defaults = {
    reportId: 'report-uuid-1',
    photos: [] as ReportPhoto[],
    onPhotosChange: vi.fn(),
    readOnly: false,
  }
  return render(<PhotoUploader {...defaults} {...props} />, { wrapper: Wrapper })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PhotoUploader', () => {
  describe('GIVEN readOnly=false', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show dropzone with correct aria-label', () => {
        renderUploader({ photos: [] })

        // t('report.photos.dropzone') key — the aria-label is set to the same i18n key
        const dropzone = screen.getByRole('button', { name: /foto|dropzone|hinzufügen|photo/i })
        expect(dropzone).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN 20 photos', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show max-reached text and disable dropzone', () => {
        const twentyPhotos = Array.from({ length: 20 }, (_, i) =>
          createMockPhoto({ id: `photo-${i}`, position: i })
        )

        renderUploader({ photos: twentyPhotos })

        // t('report.photos.maxReached') — rendered inside the dropzone when full
        expect(screen.getByText(/maxReached|maximum|max|voll|erreicht/i)).toBeInTheDocument()

        const dropzone = screen.getByRole('button')
        expect(dropzone).toHaveStyle({ pointerEvents: 'none' })
      })
    })
  })

  describe('GIVEN 18 photos', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show remaining-slots warning', () => {
        const eighteenPhotos = Array.from({ length: 18 }, (_, i) =>
          createMockPhoto({ id: `photo-${i}`, position: i })
        )

        renderUploader({ photos: eighteenPhotos })

        // Component renders: `${MAX_PHOTOS - photos.length} ${t('report.photos.title').toLowerCase()} verbleibend`
        // That is "2 ... verbleibend"
        expect(screen.getByText(/verbleibend/i)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN delete button clicked AND window.confirm returns true', () => {
    describe('WHEN confirmed', () => {
      it('SHOULD call reportsApi.deletePhoto and remove photo', async () => {
        const photo = createMockPhoto()
        const onPhotosChange = vi.fn()
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        // deletePhoto returns AxiosResponse<void>; cast to keep TypeScript happy
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockDeletePhoto.mockResolvedValue(undefined as any)

        renderUploader({ photos: [photo], onPhotosChange })

        const deleteBtn = screen.getByRole('button', { name: /delete|löschen|entfernen/i })
        await userEvent.click(deleteBtn)

        await waitFor(() => {
          expect(mockDeletePhoto).toHaveBeenCalledWith('report-uuid-1', photo.id)
        })
        expect(onPhotosChange).toHaveBeenCalledWith([])
      })
    })
  })

  describe('GIVEN delete button clicked AND window.confirm returns false', () => {
    describe('WHEN dismissed', () => {
      it('SHOULD NOT call reportsApi.deletePhoto', async () => {
        const photo = createMockPhoto()
        vi.spyOn(window, 'confirm').mockReturnValue(false)

        renderUploader({ photos: [photo] })

        const deleteBtn = screen.getByRole('button', { name: /delete|löschen|entfernen/i })
        await userEvent.click(deleteBtn)

        expect(mockDeletePhoto).not.toHaveBeenCalled()
      })
    })
  })

  describe('GIVEN readOnly=true', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show no dropzone and no delete buttons', () => {
        const photo = createMockPhoto()

        renderUploader({ photos: [photo], readOnly: true })

        // No role="button" dropzone
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
        // No delete button
        expect(screen.queryByRole('button', { name: /delete|löschen|entfernen/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('GIVEN a file is dropped', () => {
    describe('WHEN upload completes', () => {
      it('SHOULD call reportsApi.uploadPhoto and append returned photo', async () => {
        const returnedPhoto = createMockPhoto({ id: 'photo-new' })
        const onPhotosChange = vi.fn()

        // compressImage uses Image and canvas — stub URL.createObjectURL
        const mockObjectUrl = 'blob:http://localhost/fake'
        vi.stubGlobal('URL', {
          createObjectURL: vi.fn().mockReturnValue(mockObjectUrl),
          revokeObjectURL: vi.fn(),
        })

        mockUploadPhoto.mockResolvedValue({ data: returnedPhoto } as Awaited<ReturnType<typeof reportsApi.uploadPhoto>>)

        renderUploader({ photos: [], onPhotosChange })

        const dropzone = screen.getByRole('button')
        const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' })

        // File is under MAX_SIZE_MB so compressImage resolves immediately
        await act(async () => {
          fireEvent.drop(dropzone, {
            dataTransfer: { files: [file] },
          })
        })

        await waitFor(() => {
          expect(mockUploadPhoto).toHaveBeenCalledWith(
            'report-uuid-1',
            expect.any(FormData),
          )
        })

        expect(onPhotosChange).toHaveBeenCalledWith([returnedPhoto])

        vi.unstubAllGlobals()
      })
    })
  })

  describe('GIVEN caption input changed', () => {
    describe('WHEN 1000ms passes', () => {
      it('SHOULD call reportsApi.updatePhoto', async () => {
        vi.useFakeTimers()

        const photo = createMockPhoto({ caption: 'Alt' })
        const updatedPhoto = createMockPhoto({ caption: 'Neu' })
        const onPhotosChange = vi.fn()
        mockUpdatePhoto.mockResolvedValue({ data: updatedPhoto } as Awaited<ReturnType<typeof reportsApi.updatePhoto>>)

        renderUploader({ photos: [photo], onPhotosChange })

        const captionInput = screen.getByRole('textbox', { name: /caption|beschriftung/i })
        fireEvent.change(captionInput, { target: { value: 'Neu' } })

        // Debounce timer is 1000ms
        await act(async () => {
          vi.advanceTimersByTime(1000)
        })

        await waitFor(() => {
          expect(mockUpdatePhoto).toHaveBeenCalledWith(
            'report-uuid-1',
            photo.id,
            { caption: 'Neu' },
          )
        })

        vi.useRealTimers()
      })
    })
  })
})
