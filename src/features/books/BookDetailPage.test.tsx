import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import { BookDetailPage } from './BookDetailPage'

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (event: { active: { id: string }; over: { id: string } }) => void }) => (
    <div>
      <button onClick={() => onDragEnd({ active: { id: 'chapter-b' }, over: { id: 'chapter-a' } })} type="button">Simular reordenamiento</button>
      {children}
    </div>
  ),
  MouseSensor: class MouseSensor {},
  TouchSensor: class TouchSensor {},
  useDroppable: () => ({ isOver: false, setNodeRef: () => undefined }),
  useSensor: () => ({}),
  useSensors: () => [],
}))

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: <T,>(items: T[], from: number, to: number): T[] => {
    const reordered = [...items]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    return reordered
  },
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => undefined, transform: null, transition: undefined }),
  verticalListSortingStrategy: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({ CSS: { Translate: { toString: () => undefined } } }))

function renderBookDetailPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={['/books/book-1']}>
      <QueryClientProvider client={queryClient}>
        <Routes><Route path="/books/:bookId" element={<BookDetailPage />} /></Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('BookDetailPage chapter tree', () => {
  it('renders nested chapters and persists reordered sibling indexes', async () => {
    const updates: Array<{ id: string; body: unknown }> = []
    server.use(
      http.get('*/api/books/book-1/chapters', () => HttpResponse.json([
        { id: 'chapter-a', bookId: 'book-1', title: 'Primer capítulo', parentChapterId: null, orderIndex: 0 },
        { id: 'chapter-b', bookId: 'book-1', title: 'Segundo capítulo', parentChapterId: null, orderIndex: 1 },
        { id: 'chapter-c', bookId: 'book-1', title: 'Subcapítulo', parentChapterId: 'chapter-a', orderIndex: 0 },
      ])),
      http.put('*/api/chapters/:id', async ({ params, request }) => {
        updates.push({ id: String(params.id), body: await request.json() })
        return HttpResponse.json({ id: params.id, bookId: 'book-1', title: 'updated', parentChapterId: null, orderIndex: 0 })
      }),
    )

    renderBookDetailPage()

    expect(await screen.findByText('Primer capítulo')).toBeInTheDocument()
    expect(screen.getByText('Segundo capítulo')).toBeInTheDocument()
    expect(screen.getByText('Subcapítulo')).toBeInTheDocument()

    await screen.findByRole('button', { name: 'Simular reordenamiento' }).then((button) => button.click())

    await waitFor(() => expect(updates).toHaveLength(2))
    expect(updates).toEqual(expect.arrayContaining([
      { id: 'chapter-a', body: { title: 'Primer capítulo', parentChapterId: null, orderIndex: 1 } },
      { id: 'chapter-b', body: { title: 'Segundo capítulo', parentChapterId: null, orderIndex: 0 } },
    ]))
  })

  it('shows the selected chapter title, PDF preview and unclipped action menu', async () => {
    const longTitle = 'Un capítulo con un nombre suficientemente largo para necesitar ayuda visual'
    server.use(
      http.get('*/api/books/book-1/chapters', () => HttpResponse.json([
        { id: 'chapter-long', bookId: 'book-1', title: longTitle, parentChapterId: null, orderIndex: 0 },
      ])),
      http.get('*/api/chapters/chapter-long/blocks', () => HttpResponse.json([])),
    )
    renderBookDetailPage()

    const chapterButton = await screen.findByRole('button', { name: longTitle })
    expect(chapterButton).toHaveAttribute('title', longTitle)
    chapterButton.click()

    await waitFor(() => expect(screen.getAllByRole('heading', { name: longTitle })).toHaveLength(2), { timeout: 5_000 })
    expect(screen.getByRole('complementary', { name: 'Vista previa del capítulo en PDF' })).toBeInTheDocument()

    screen.getByRole('button', { name: `Acciones para ${longTitle}` }).click()
    expect(await screen.findByRole('button', { name: 'Agregar subcapítulo' })).toBeInTheDocument()
  })
})
