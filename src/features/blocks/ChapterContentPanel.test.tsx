import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import type { ContentBlockResponse } from '../../types/contentBlock'
import { ChapterContentPanel } from './ChapterContentPanel'

vi.mock('@dnd-kit/core', () => ({
  closestCenter: vi.fn(),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (event: { active: { id: string }; over: { id: string } }) => void }) => (
    <div>
      <button onClick={() => onDragEnd({ active: { id: 'note-1' }, over: { id: 'code-1' } })} type="button">Simular reordenamiento de anotaciones</button>
      {children}
    </div>
  ),
  MouseSensor: class MouseSensor {},
  TouchSensor: class TouchSensor {},
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

const chapterId = 'chapter-1'

function block(type: ContentBlockResponse['type']): ContentBlockResponse {
  return {
    id: `${type.toLowerCase()}-1`,
    chapterId,
    type,
    content: type === 'CODE' ? 'const answer = 42' : type === 'MATH' ? 'x^2' : `${type} content`,
    answer: type === 'QUESTION_ANSWER' ? 'The answer' : null,
    description: null,
    headingLevel: type === 'HEADING' ? 'TITLE' : null,
    codeLanguage: type === 'CODE' ? 'typescript' : null,
    resolved: false,
    orderIndex: 0,
    stepList: type === 'STEP_LIST' ? { stepStyle: 'NUMERIC', steps: ['First step'] } : null,
    attachments: [],
  }
}

function renderContentPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><ChapterContentPanel chapterId={chapterId} /></QueryClientProvider>)
}

describe('ChapterContentPanel editors', () => {
  beforeEach(() => localStorage.clear())

  it.each([
    ['NOTE', 'Editar nota', 'Guardar cambios', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.clear(screen.getByLabelText('Editar nota'))
      await user.type(screen.getByLabelText('Editar nota'), 'Updated note')
    }],
    ['STEP_LIST', 'Elemento 1', 'Guardar lista', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.clear(screen.getByLabelText('Elemento 1'))
      await user.type(screen.getByLabelText('Elemento 1'), 'Updated step')
      await user.selectOptions(screen.getByLabelText('Estilo de lista'), 'ALPHABETIC')
    }],
    ['CODE', 'Código', 'Guardar código', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.clear(screen.getByLabelText('Código'))
      await user.type(screen.getByLabelText('Código'), 'console.log("updated")')
      await user.selectOptions(screen.getByLabelText('Lenguaje'), 'javascript')
    }],
    ['MATH', 'Fuente LaTeX', 'Guardar fórmula', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.clear(screen.getByLabelText('Fuente LaTeX'))
      await user.type(screen.getByLabelText('Fuente LaTeX'), 'a+b')
    }],
    ['EXERCISE', 'Ejercicio', 'Guardar ejercicio', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.clear(screen.getByLabelText('Ejercicio'))
      await user.type(screen.getByLabelText('Ejercicio'), 'Updated exercise')
    }],
  ] as const)('updates and deletes a %s block through its editor', async (type, _inputLabel, saveLabel, edit) => {
    let blocks = [block(type)]
    let updateBody: unknown
    let deletedBlockId: string | undefined
    server.use(
      http.get(`*/api/chapters/${chapterId}/blocks`, () => HttpResponse.json(blocks)),
      http.put('*/api/blocks/:id', async ({ request }) => {
        const requestBody = await request.json() as Partial<ContentBlockResponse>
        updateBody = requestBody
        blocks = [{ ...blocks[0], ...requestBody }]
        return HttpResponse.json(blocks[0])
      }),
      http.delete('*/api/blocks/:id', ({ params }) => {
        deletedBlockId = String(params.id)
        blocks = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderContentPanel()

    await screen.findByRole('button', { name: 'Editar' })
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    await edit(user)
    await user.click(screen.getByRole('button', { name: saveLabel }))
    await waitFor(() => expect(updateBody).toMatchObject({ type }))

    await screen.findByRole('button', { name: 'Eliminar' })
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar bloque' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(deletedBlockId).toBe(`${type.toLowerCase()}-1`))
  })

  it('creates every content block type through its editor with MSW handlers', async () => {
    let blocks: ContentBlockResponse[] = []
    const createRequests: Array<{ type: string }> = []
    let deletedImageBlockId: string | undefined
    let imageUploadReceived = false
    server.use(
      http.get(`*/api/chapters/${chapterId}/blocks`, () => HttpResponse.json(blocks)),
      http.post(`*/api/chapters/${chapterId}/blocks`, async ({ request }) => {
        const requestBody = await request.json() as Omit<ContentBlockResponse, 'id' | 'chapterId' | 'resolved' | 'attachments'>
        createRequests.push({ type: requestBody.type })
        const created = { ...requestBody, id: `block-${requestBody.type}-${createRequests.length}`, chapterId, resolved: false, attachments: [] }
        blocks = [...blocks, created]
        return HttpResponse.json(created, { status: 201 })
      }),
      http.post('*/api/blocks/:blockId/attachments', async ({ request }) => {
        const formData = await request.formData()
        imageUploadReceived = formData.has('file')
        return HttpResponse.json({ id: 'attachment-new', contentBlockId: 'block-IMAGE', url: 'https://images.example/new.png', sizeBytes: 3, createdAt: '2026-08-29T00:00:00Z' }, { status: 201 })
      }),
      http.delete('*/api/blocks/:id', ({ params }) => {
        deletedImageBlockId = String(params.id)
        blocks = blocks.filter((current) => current.id !== deletedImageBlockId)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderContentPanel()
    await screen.findByLabelText('Nueva nota')
    await user.type(screen.getByLabelText('Nueva nota'), 'A note')
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }))

    await user.click(screen.getByRole('button', { name: 'Título' }))
    await user.type(screen.getByLabelText('Nuevo título'), 'A title')
    await user.click(screen.getByRole('button', { name: 'Guardar título' }))

    await user.click(screen.getByRole('button', { name: 'Subtítulo' }))
    await user.type(screen.getByLabelText('Nuevo subtítulo'), 'A subtitle')
    await user.click(screen.getByRole('button', { name: 'Guardar subtítulo' }))

    await user.click(screen.getByRole('button', { name: 'Lista' }))
    await user.type(screen.getByLabelText('Elemento 1'), 'A step')
    await user.click(screen.getByRole('button', { name: 'Guardar lista' }))

    await user.click(screen.getByRole('button', { name: 'Código' }))
    await user.type(screen.getByLabelText('Código'), 'const value = 1')
    await user.click(screen.getByRole('button', { name: 'Guardar código' }))

    await user.click(screen.getByRole('button', { name: 'Fórmula' }))
    await user.type(screen.getByLabelText('Fuente LaTeX'), 'x^2')
    await user.click(screen.getByRole('button', { name: 'Guardar fórmula' }))

    await user.click(screen.getByRole('button', { name: 'Ejercicio' }))
    await user.type(screen.getByLabelText('Ejercicio'), 'Solve this')
    await user.click(screen.getByRole('button', { name: 'Guardar ejercicio' }))

    await user.click(screen.getByRole('button', { name: 'Pregunta' }))
    await user.type(screen.getByLabelText('Pregunta'), 'A question?')
    await user.type(screen.getByLabelText('Respuesta'), 'An answer')
    await user.click(screen.getByRole('button', { name: 'Guardar pregunta' }))

    await user.click(screen.getByRole('button', { name: 'Imagen' }))
    expect(screen.getByLabelText('Descripción de la imagen (opcional)')).toBeInTheDocument()
    const imageFile = new File(['png'], 'chart.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Seleccionar imágenes'), imageFile)
    expect(screen.getByText('chart.png')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar imagen' }))
    await waitFor(() => expect(createRequests.map((request) => request.type)).toEqual(['NOTE', 'HEADING', 'HEADING', 'STEP_LIST', 'CODE', 'MATH', 'EXERCISE', 'QUESTION_ANSWER', 'IMAGE']))
    await waitFor(() => expect(imageUploadReceived).toBe(true))

    await user.click(screen.getAllByRole('button', { name: 'Eliminar' }).at(-1)!)
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar bloque' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(deletedImageBlockId).toBe('block-IMAGE-9'))
  }, 10_000)

  it('restores a local draft and saves it with Ctrl+S', async () => {
    const draftKey = `marginalia:draft:${chapterId}:insert:0:NOTE`
    localStorage.setItem(draftKey, JSON.stringify({ content: 'Recovered note' }))
    let createdContent: string | null | undefined
    server.use(
      http.get(`*/api/chapters/${chapterId}/blocks`, () => HttpResponse.json([])),
      http.post(`*/api/chapters/${chapterId}/blocks`, async ({ request }) => {
        const requestBody = await request.json() as ContentBlockResponse
        createdContent = requestBody.content
        return HttpResponse.json({ ...requestBody, id: 'note-1', chapterId, resolved: false, attachments: [] }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderContentPanel()

    const editor = await screen.findByLabelText('Nueva nota')
    await waitFor(() => expect(editor).toHaveValue('Recovered note'))
    await user.click(editor)
    await user.keyboard('{Control>}s{/Control}')

    await waitFor(() => expect(createdContent).toBe('Recovered note'))
    expect(localStorage.getItem(draftKey)).toBeNull()
  })

  it('hides answers during review and allows previewing and deleting images', async () => {
    const question = block('QUESTION_ANSWER')
    const image = {
      ...block('IMAGE'),
      id: 'image-1',
      orderIndex: 1,
      attachments: [{ id: 'attachment-1', contentBlockId: 'image-1', url: 'https://images.example/chart.png', sizeBytes: 100, createdAt: '2026-08-29T00:00:00Z' }],
    }
    let imageDeleted = false
    server.use(
      http.get(`*/api/chapters/${chapterId}/blocks`, () => HttpResponse.json([question, imageDeleted ? { ...image, attachments: [] } : image])),
      http.delete('*/api/blocks/image-1/attachments/attachment-1', () => {
        imageDeleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderContentPanel()

    await screen.findByText('The answer')
    await user.click(screen.getByRole('button', { name: 'Iniciar repaso' }))
    expect(screen.queryByText('The answer')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mostrar respuesta' }))
    expect(screen.getByText('The answer')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ampliar imagen 1' }))
    expect(screen.getByRole('dialog', { name: 'Vista ampliada de la imagen' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Vista ampliada de la imagen' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Eliminar imagen 1' }))
    expect(screen.getByRole('dialog', { name: 'Eliminar imagen' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Eliminar imagen' }))
    await waitFor(() => expect(imageDeleted).toBe(true))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ampliar imagen 1' })).not.toBeInTheDocument())
  })

  it('persists annotation order after dragging a block', async () => {
    const note = block('NOTE')
    const code = { ...block('CODE'), orderIndex: 1 }
    let orderRequest: unknown
    server.use(
      http.get(`*/api/chapters/${chapterId}/blocks`, () => HttpResponse.json([note, code])),
      http.put(`*/api/chapters/${chapterId}/blocks/order`, async ({ request }) => {
        orderRequest = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderContentPanel()

    await screen.findByText('NOTE content')
    await user.click(screen.getByRole('button', { name: 'Simular reordenamiento de anotaciones' }))

    await waitFor(() => expect(orderRequest).toEqual([
      { blockId: 'code-1', orderIndex: 0 },
      { blockId: 'note-1', orderIndex: 1 },
    ]))
  })
})
