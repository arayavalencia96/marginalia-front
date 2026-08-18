import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import type { ContentBlockResponse } from '../../types/contentBlock'
import { ChapterContentPanel } from './ChapterContentPanel'

const chapterId = 'chapter-1'

function block(type: ContentBlockResponse['type']): ContentBlockResponse {
  return {
    id: `${type.toLowerCase()}-1`,
    chapterId,
    type,
    content: type === 'CODE' ? 'const answer = 42' : type === 'MATH' ? 'x^2' : `${type} content`,
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
  it.each([
    ['NOTE', 'Editar nota', 'Guardar cambios', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.clear(screen.getByLabelText('Editar nota'))
      await user.type(screen.getByLabelText('Editar nota'), 'Updated note')
    }],
    ['STEP_LIST', 'Paso 1', 'Guardar lista', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.clear(screen.getByLabelText('Paso 1'))
      await user.type(screen.getByLabelText('Paso 1'), 'Updated step')
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
    ['EXERCISE', 'Editar ejercicio', 'Guardar cambios', async (user: ReturnType<typeof userEvent.setup>) => {
      await user.clear(screen.getByLabelText('Editar ejercicio'))
      await user.type(screen.getByLabelText('Editar ejercicio'), 'Updated exercise')
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
    server.use(
      http.get(`*/api/chapters/${chapterId}/blocks`, () => HttpResponse.json(blocks)),
      http.post(`*/api/chapters/${chapterId}/blocks`, async ({ request }) => {
        const requestBody = await request.json() as Omit<ContentBlockResponse, 'id' | 'chapterId' | 'resolved' | 'attachments'>
        createRequests.push({ type: requestBody.type })
        const created = { ...requestBody, id: `block-${requestBody.type}`, chapterId, resolved: false, attachments: [] }
        blocks = [...blocks, created]
        return HttpResponse.json(created, { status: 201 })
      }),
      http.delete('*/api/blocks/:id', ({ params }) => {
        deletedImageBlockId = String(params.id)
        blocks = blocks.filter((current) => current.id !== deletedImageBlockId)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderContentPanel()
    await screen.findByText('Este capítulo todavía no tiene bloques.')

    await user.click(screen.getByRole('button', { name: 'Agregar nota' }))
    await user.type(screen.getByLabelText('Nueva nota'), 'A note')
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }))

    await user.click(screen.getByRole('button', { name: 'Agregar lista' }))
    await user.type(screen.getByLabelText('Paso 1'), 'A step')
    await user.click(screen.getByRole('button', { name: 'Guardar lista' }))

    await user.click(screen.getByRole('button', { name: 'Agregar código' }))
    await user.type(screen.getByLabelText('Código'), 'const value = 1')
    await user.click(screen.getByRole('button', { name: 'Guardar código' }))

    await user.click(screen.getByRole('button', { name: 'Agregar fórmula' }))
    await user.type(screen.getByLabelText('Fuente LaTeX'), 'x^2')
    await user.click(screen.getByRole('button', { name: 'Guardar fórmula' }))

    await user.click(screen.getByRole('button', { name: 'Agregar ejercicio' }))
    await user.type(screen.getByLabelText('Nuevo ejercicio'), 'Solve this')
    await user.click(screen.getByRole('button', { name: 'Guardar ejercicio' }))

    await user.click(screen.getByRole('button', { name: 'Agregar imagen' }))
    await waitFor(() => expect(createRequests.map((request) => request.type)).toEqual(['NOTE', 'STEP_LIST', 'CODE', 'MATH', 'EXERCISE', 'IMAGE']))
    expect(await screen.findByLabelText('Seleccionar imagen')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Eliminar' }).at(-1)!)
    const dialog = await screen.findByRole('dialog', { name: 'Eliminar bloque' })
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(deletedImageBlockId).toBe('block-IMAGE'))
  })
})
