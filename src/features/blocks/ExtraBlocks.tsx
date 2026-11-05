import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useFormDraft } from '../../hooks/useFormDraft'

import type { ExtraBlockType } from './extraBlockTypes'
const tableSchema = z.array(z.array(z.string()).min(1).max(20)).min(1).max(100).refine((rows) => rows.every((row) => row.length === rows[0].length))
const todoSchema = z.array(z.object({ text: z.string(), checked: z.boolean() })).min(1).max(100)
type TodoItem = z.infer<typeof todoSchema>[number]
function parseTable(content: string): string[][] {
  try { return tableSchema.parse(JSON.parse(content)) } catch { return Array.from({ length: 3 }, () => ['', '', '']) }
}
function parseTodos(content: string): TodoItem[] {
  try { return todoSchema.parse(JSON.parse(content)) } catch { return [{ text: '', checked: false }] }
}
interface ExtraBlockEditorProps {
  type: ExtraBlockType
  draftKey: string
  initialContent?: string
  isPending: boolean
  onCancel: () => void
  onSubmit: (content: string) => void
}
export function ExtraBlockEditor({ type, draftKey, initialContent = '', isPending, onCancel, onSubmit }: ExtraBlockEditorProps) {
  const form = useForm({ defaultValues: { text: initialContent, rows: parseTable(initialContent), todos: parseTodos(initialContent) } })
  const status = useFormDraft(form, draftKey)
  const rows = form.watch('rows')
  const todos = form.watch('todos')
  const resize = (height: number, width: number) => form.setValue('rows', Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => rows[r]?.[c] ?? '')))
  return <form className="space-y-4" onKeyDown={(event) => {
    if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'Enter')) { event.preventDefault(); event.currentTarget.requestSubmit() }
    if (event.key === 'Escape') onCancel()
  }} onSubmit={form.handleSubmit((values) => {
    if (type === 'TABLE') onSubmit(JSON.stringify(values.rows))
    else if (type === 'TODO_LIST') {
      if (values.todos.some((item) => !item.text.trim())) { form.setError('root', { message: 'Completa todas las tareas.' }); return }
      onSubmit(JSON.stringify(values.todos))
    } else if (type === 'DIVIDER') onSubmit('')
    else if (values.text.trim()) onSubmit(values.text.trim())
    else form.setError('root', { message: 'Escribe un texto.' })
  })}>
    {type === 'TABLE' ? <>
      <div className="flex flex-wrap gap-4">
        <label>Filas <input aria-label="Filas" type="number" min={1} max={100} value={rows.length} onChange={(e) => { const value = Number(e.target.value); if (value >= 1 && value <= 100) resize(value, rows[0].length) }} className="w-16 rounded border p-1" /></label>
        <label>Columnas <input aria-label="Columnas" type="number" min={1} max={20} value={rows[0].length} onChange={(e) => { const value = Number(e.target.value); if (value >= 1 && value <= 20) resize(rows.length, value) }} className="w-16 rounded border p-1" /></label>
      </div>
      <div className="table-editor relative pr-9 pb-9">
        <div className="overflow-x-auto"><table className="w-full border-collapse"><tbody>{rows.map((row, r) => <tr key={r}>{row.map((_, c) => <td className="min-w-28 border border-slate-300" key={c}><textarea aria-label={`Fila ${r + 1}, columna ${c + 1}`} className="min-h-12 w-full resize-y bg-transparent p-2" {...form.register(`rows.${r}.${c}`)} /></td>)}</tr>)}</tbody></table></div>
        <button className="table-add absolute right-0 top-0 h-[calc(100%-2.25rem)] w-8 rounded bg-slate-100 text-slate-800" aria-label="Agregar columna" type="button" disabled={isPending || rows[0].length >= 20} onClick={() => resize(rows.length, rows[0].length + 1)}>+</button>
        <button className="table-add absolute bottom-0 left-0 h-8 w-[calc(100%-2.25rem)] rounded bg-slate-100 text-slate-800" aria-label="Agregar fila" type="button" disabled={isPending || rows.length >= 100} onClick={() => resize(rows.length + 1, rows[0].length)}>+</button>
      </div>
    </> : type === 'TODO_LIST' ? <div className="space-y-2">{todos.map((_, index) => <div className="flex items-center gap-2" key={index}>
      <input type="checkbox" aria-label={`Completar tarea ${index + 1}`} {...form.register(`todos.${index}.checked`)} />
      <input aria-label={`Tarea ${index + 1}`} className="min-w-0 flex-1 rounded border p-2" {...form.register(`todos.${index}.text`)} />
      <button type="button" disabled={isPending || todos.length === 1} aria-label={`Eliminar tarea ${index + 1}`} onClick={() => form.setValue('todos', todos.filter((_, i) => i !== index))}>×</button>
    </div>)}<button type="button" disabled={isPending || todos.length >= 100} onClick={() => form.setValue('todos', [...todos, { text: '', checked: false }])}>+ Agregar tarea</button></div>
      : type === 'DIVIDER' ? <hr className="my-6 border-slate-300" /> : <textarea aria-label={type === 'QUOTE' ? 'Cita' : 'Callout'} className="min-h-28 w-full rounded border p-3" {...form.register('text')} />}
    {form.formState.errors.root && <p role="alert" className="text-red-700">{form.formState.errors.root.message}</p>}
    <p className="text-xs text-slate-500">{status === 'restored' ? 'Borrador recuperado' : 'Autoguardado activo'}</p>
    <div className="flex justify-end gap-3"><button type="button" disabled={isPending} onClick={onCancel}>Cancelar</button><button className="rounded bg-slate-900 px-3 py-2 text-white" disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar bloque'}</button></div>
  </form>
}
export function ExtraBlockView({ type, content, onChange, disabled = false }: { type: ExtraBlockType; content: string; onChange?: (content: string) => void; disabled?: boolean }) {
  if (type === 'DIVIDER') return <hr className="my-5 border-slate-300" />
  if (type === 'CALLOUT') return <aside className="reading-callout">
    <svg aria-hidden="true" className="reading-callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4M9 15c0-1-1-2-2-3a7 7 0 1 1 10 0c-1 1-2 2-2 3H9Z" />
    </svg>
    <p className="min-w-0 whitespace-pre-wrap">{content}</p>
  </aside>
  if (type === 'QUOTE') return <blockquote className="reading-quote whitespace-pre-wrap">{content}</blockquote>
  if (type === 'TABLE') {
    const rows = parseTable(content)
    return <div className={`table-editor relative ${onChange ? 'pb-9 pr-9' : ''}`}>
      <div className="overflow-x-auto"><table className="w-full border-collapse"><tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className="min-w-24 whitespace-pre-wrap border border-slate-300 p-2">{cell}</td>)}</tr>)}</tbody></table></div>
      {onChange && <>
        <button aria-label="Agregar columna" title="Agregar columna" className="table-add absolute right-0 top-0 h-[calc(100%-2.25rem)] w-8 rounded bg-slate-100 text-slate-800" disabled={disabled || rows[0].length >= 20} type="button" onClick={() => onChange(JSON.stringify(rows.map((row) => [...row, ''])))}>+</button>
        <button aria-label="Agregar fila" title="Agregar fila" className="table-add absolute bottom-0 left-0 h-8 w-[calc(100%-2.25rem)] rounded bg-slate-100 text-slate-800" disabled={disabled || rows.length >= 100} type="button" onClick={() => onChange(JSON.stringify([...rows, rows[0].map(() => '')]))}>+</button>
      </>}
    </div>
  }
  const todos = parseTodos(content)
  return <ul className="space-y-2">{todos.map((item, index) => <li key={index}><label className="flex items-start gap-3"><input className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" type="checkbox" checked={item.checked} disabled={disabled || !onChange} onChange={() => onChange?.(JSON.stringify(todos.map((task, i) => i === index ? { ...task, checked: !task.checked } : task)))} /><span className={`whitespace-pre-wrap ${item.checked ? 'text-slate-500 line-through' : ''}`}>{item.text}</span></label></li>)}</ul>
}
