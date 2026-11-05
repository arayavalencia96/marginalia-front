import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtraBlockEditor, ExtraBlockView } from './ExtraBlocks'

describe('reading blocks', () => {
  beforeEach(() => localStorage.clear())
  it('starts at 3 by 3 and preserves cells when adding rows and columns', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    render(<ExtraBlockEditor type="TABLE" draftKey="table" isPending={false} onCancel={vi.fn()} onSubmit={save} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(9)
    await user.type(screen.getByLabelText('Fila 1, columna 1'), 'Capital')
    await user.click(screen.getByRole('button', { name: 'Agregar columna' }))
    await user.click(screen.getByRole('button', { name: 'Agregar fila' }))
    expect(screen.getAllByRole('textbox')).toHaveLength(16)
    await user.click(screen.getByRole('button', { name: 'Guardar bloque' }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    const rows: string[][] = JSON.parse(save.mock.calls[0][0] as string)
    expect(rows).toHaveLength(4)
    expect(rows[0]).toEqual(['Capital', '', '', ''])
  })
  it('persists the checked state of a task without changing other tasks', async () => {
    const save = vi.fn()
    const tasks = [{ text: 'Leer', checked: false }, { text: 'Practicar', checked: true }]
    render(<ExtraBlockView type="TODO_LIST" content={JSON.stringify(tasks)} onChange={save} />)
    await userEvent.click(screen.getAllByRole('checkbox')[0])
    expect(JSON.parse(save.mock.calls[0][0] as string)).toEqual([{ text: 'Leer', checked: true }, tasks[1]])
  })
})
