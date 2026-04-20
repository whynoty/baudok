import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import type { ReactNode } from 'react'
import i18n from '../../i18n/index'
import { PhotoGrid } from './PhotoGrid'
import type { ReportPhoto } from '../../api/types'

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

function renderGrid(photos: ReportPhoto[]) {
  return render(<PhotoGrid photos={photos} />, { wrapper: Wrapper })
}

beforeEach(() => {
  // Modal uses createPortal to document.body — jsdom handles this natively
})

describe('PhotoGrid', () => {
  describe('GIVEN empty photos array', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show empty-state text', () => {
        renderGrid([])

        // t('report.photos.empty')
        expect(screen.getByText(/empty|keine fotos|no photo/i)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN 3 photos', () => {
    describe('WHEN rendered', () => {
      it('SHOULD render 3 thumbnail elements', () => {
        const photos = [
          createMockPhoto({ id: 'p1', caption: 'Photo 1', position: 0 }),
          createMockPhoto({ id: 'p2', caption: 'Photo 2', position: 1 }),
          createMockPhoto({ id: 'p3', caption: 'Photo 3', position: 2 }),
        ]

        renderGrid(photos)

        // Each thumbnail is a role="button"
        const thumbs = screen.getAllByRole('button')
        expect(thumbs).toHaveLength(3)
      })
    })
  })

  describe('GIVEN photo with latitude and longitude', () => {
    describe('WHEN rendered', () => {
      it('SHOULD show GPS badge', () => {
        const photo = createMockPhoto({ latitude: '52.520008', longitude: '13.404954' })

        renderGrid([photo])

        // t('report.photos.gps')
        expect(screen.getByText(/gps/i)).toBeInTheDocument()
      })
    })
  })

  describe('GIVEN photo with latitude=null', () => {
    describe('WHEN rendered', () => {
      it('SHOULD NOT show GPS badge', () => {
        const photo = createMockPhoto({ latitude: null, longitude: null })

        renderGrid([photo])

        expect(screen.queryByText(/gps/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('GIVEN thumbnail clicked', () => {
    describe('WHEN lightbox opens', () => {
      it('SHOULD show correct photo image_url in img src', async () => {
        const user = userEvent.setup()
        const photo = createMockPhoto({
          image_url: 'http://localhost:8000/media/reports/photos/2026/04/test.jpg',
          caption: 'Baustelle EG',
        })

        renderGrid([photo])

        const thumb = screen.getByRole('button', { name: /Baustelle EG/i })
        await user.click(thumb)

        // Modal renders via portal to document.body
        const dialog = screen.getByRole('dialog')
        const lightboxImg = within(dialog).getByRole('img')
        expect(lightboxImg).toHaveAttribute('src', photo.image_url)
      })
    })
  })

  describe('GIVEN lightbox open at index 0', () => {
    describe('WHEN next button clicked', () => {
      it('SHOULD show second photo', async () => {
        const user = userEvent.setup()
        const photos = [
          createMockPhoto({ id: 'p1', caption: 'First', image_url: 'http://localhost:8000/first.jpg', position: 0 }),
          createMockPhoto({ id: 'p2', caption: 'Second', image_url: 'http://localhost:8000/second.jpg', position: 1 }),
        ]

        renderGrid(photos)

        // Open first photo
        await user.click(screen.getByRole('button', { name: /First/i }))

        const dialog = screen.getByRole('dialog')
        const [, nextBtn] = within(dialog).getAllByRole('button')
        await user.click(nextBtn)

        const lightboxImg = within(dialog).getByRole('img')
        expect(lightboxImg).toHaveAttribute('src', photos[1].image_url)
      })
    })
  })

  describe('GIVEN lightbox open at index 0', () => {
    describe('WHEN prev button clicked', () => {
      it('SHOULD wrap to last photo', async () => {
        const user = userEvent.setup()
        const photos = [
          createMockPhoto({ id: 'p1', caption: 'First', image_url: 'http://localhost:8000/first.jpg', position: 0 }),
          createMockPhoto({ id: 'p2', caption: 'Second', image_url: 'http://localhost:8000/second.jpg', position: 1 }),
          createMockPhoto({ id: 'p3', caption: 'Third', image_url: 'http://localhost:8000/third.jpg', position: 2 }),
        ]

        renderGrid(photos)

        // Open first photo
        await user.click(screen.getByRole('button', { name: /First/i }))

        const dialog = screen.getByRole('dialog')
        const [prevBtn] = within(dialog).getAllByRole('button')
        await user.click(prevBtn)

        // Wraps: (0 - 1 + 3) % 3 = 2 → last photo
        const lightboxImg = within(dialog).getByRole('img')
        expect(lightboxImg).toHaveAttribute('src', photos[2].image_url)
      })
    })
  })

  describe('GIVEN single photo', () => {
    describe('WHEN lightbox opens', () => {
      it('SHOULD NOT render prev/next buttons', async () => {
        const user = userEvent.setup()
        const photo = createMockPhoto({ caption: 'Solo' })

        renderGrid([photo])

        await user.click(screen.getByRole('button', { name: /Solo/i }))

        // Footer with nav buttons only renders when photos.length > 1
        const dialog = screen.getByRole('dialog')
        expect(within(dialog).queryByRole('button')).not.toBeInTheDocument()
      })
    })
  })
})
