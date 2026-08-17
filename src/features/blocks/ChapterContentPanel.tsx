import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { BlockMath } from 'react-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'
import { z } from 'zod'
import { createContentBlock, deleteContentBlock, getChapterBlocks, toggleContentBlockResolved, updateContentBlock, uploadBlockAttachment } from '../../api/contentBlocks'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'
import type { AttachmentResponse, ContentBlockRequest, ContentBlockResponse, StepListBlockRequest } from '../../types/contentBlock'

const noteSchema = z.object({ content: z.string().trim().min(1, 'La nota no puede estar vacía.') })
const stepListSchema = z.object({
  stepStyle: z.enum(['NUMERIC', 'ALPHABETIC']),
  steps: z.array(z.object({ text: z.string().trim().min(1, 'El paso no puede estar vacío.') })).min(1, 'Agrega al menos un paso.'),
})
const codeLanguages = ['javascript', 'typescript', 'java', 'python', 'go', 'json', 'sql', 'bash', 'html', 'css', 'xml', 'yaml'] as const
const codeSchema = z.object({
  codeLanguage: z.enum(codeLanguages),
  content: z.string().trim().min(1, 'El código no puede estar vacío.'),
})
const mathSchema = z.object({ content: z.string().trim().min(1, 'La expresión LaTeX no puede estar vacía.') })
const maxImageSizeBytes = 5 * 1024 * 1024

type NoteFormValues = z.infer<typeof noteSchema>
type StepListFormValues = z.infer<typeof stepListSchema>
type CodeFormValues = z.infer<typeof codeSchema>
type MathFormValues = z.infer<typeof mathSchema>

interface StepListEditorProps {
  initialStepList: StepListBlockRequest
  isPending: boolean
  onCancel: () => void
  onSubmit: (stepList: StepListBlockRequest) => void
}

function toNoteRequest(content: string, orderIndex: number): ContentBlockRequest {
  return { type: 'NOTE', content, codeLanguage: null, orderIndex, stepList: null }
}

function toStepListRequest(stepList: StepListBlockRequest, orderIndex: number): ContentBlockRequest {
  return { type: 'STEP_LIST', content: null, codeLanguage: null, orderIndex, stepList }
}

function toCodeRequest(content: string, codeLanguage: string, orderIndex: number): ContentBlockRequest {
  return { type: 'CODE', content, codeLanguage, orderIndex, stepList: null }
}

function toMathRequest(content: string, orderIndex: number): ContentBlockRequest {
  return { type: 'MATH', content, codeLanguage: null, orderIndex, stepList: null }
}

function toExerciseRequest(content: string, orderIndex: number): ContentBlockRequest {
  return { type: 'EXERCISE', content, codeLanguage: null, orderIndex, stepList: null }
}

function toImageRequest(orderIndex: number): ContentBlockRequest {
  return { type: 'IMAGE', content: null, codeLanguage: null, orderIndex, stepList: null }
}

function StepListEditor({ initialStepList, isPending, onCancel, onSubmit }: StepListEditorProps) {
  const form = useForm<StepListFormValues>({
    resolver: zodResolver(stepListSchema),
    defaultValues: {
      stepStyle: initialStepList.stepStyle,
      steps: initialStepList.steps.map((text) => ({ text })),
    },
  })
  const { fields, append, move, remove } = useFieldArray({ control: form.control, name: 'steps' })

  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(({ stepStyle, steps }) => onSubmit({ stepStyle, steps: steps.map((step) => step.text) }))}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="step-style">Estilo de lista</label>
        <select className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="step-style" {...form.register('stepStyle')}>
          <option value="NUMERIC">Numérico</option>
          <option value="ALPHABETIC">Alfabético</option>
        </select>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Pasos</p>
        {fields.map((field, index) => (
          <div className="flex items-start gap-2" key={field.id}>
            <span className="pt-2 text-sm text-slate-500">{index + 1}.</span>
            <div className="min-w-0 flex-1">
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" aria-label={`Paso ${index + 1}`} {...form.register(`steps.${index}.text`)} />
              {form.formState.errors.steps?.[index]?.text && <p className="mt-1 text-xs text-red-600">{form.formState.errors.steps[index].text.message}</p>}
            </div>
            <button aria-label={`Subir paso ${index + 1}`} className="rounded px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:text-slate-300" disabled={index === 0 || isPending} onClick={() => move(index, index - 1)} type="button">↑</button>
            <button aria-label={`Bajar paso ${index + 1}`} className="rounded px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:text-slate-300" disabled={index === fields.length - 1 || isPending} onClick={() => move(index, index + 1)} type="button">↓</button>
            <button aria-label={`Eliminar paso ${index + 1}`} className="rounded px-2 py-2 text-sm text-red-700 hover:bg-red-50 disabled:text-red-300" disabled={isPending} onClick={() => remove(index)} type="button">×</button>
          </div>
        ))}
        {form.formState.errors.steps?.root && <p className="text-sm text-red-600">{form.formState.errors.steps.root.message}</p>}
        <button className="text-sm font-semibold text-slate-700 underline hover:text-slate-950" disabled={isPending} onClick={() => append({ text: '' })} type="button">Agregar paso</button>
      </div>
      <div className="flex justify-end gap-3"><button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">Cancelar</button><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar lista'}</button></div>
    </form>
  )
}

function CodeEditor({
  initialCodeLanguage,
  initialContent,
  isPending,
  onCancel,
  onSubmit,
}: {
  initialCodeLanguage: CodeFormValues['codeLanguage']
  initialContent: string
  isPending: boolean
  onCancel: () => void
  onSubmit: (values: CodeFormValues) => void
}) {
  const form = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { codeLanguage: initialCodeLanguage, content: initialContent },
  })

  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="code-language">Lenguaje</label>
        <select className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="code-language" {...form.register('codeLanguage')}>
          {codeLanguages.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="code-content">Código</label>
        <textarea className="mt-1 min-h-52 w-full rounded-md border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-300" id="code-content" spellCheck={false} aria-invalid={Boolean(form.formState.errors.content)} {...form.register('content')} />
        {form.formState.errors.content && <p className="mt-1 text-sm text-red-600">{form.formState.errors.content.message}</p>}
      </div>
      <div className="flex justify-end gap-3"><button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">Cancelar</button><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar código'}</button></div>
    </form>
  )
}

function MathEditor({
  initialContent,
  isPending,
  onCancel,
  onSubmit,
}: {
  initialContent: string
  isPending: boolean
  onCancel: () => void
  onSubmit: (content: string) => void
}) {
  const form = useForm<MathFormValues>({ resolver: zodResolver(mathSchema), defaultValues: { content: initialContent } })
  const latexSource = form.watch('content')

  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(({ content }) => onSubmit(content))}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="math-source">Fuente LaTeX</label>
          <textarea autoFocus className="mt-1 min-h-36 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="math-source" placeholder="\\frac{a}{b}" spellCheck={false} aria-invalid={Boolean(form.formState.errors.content)} {...form.register('content')} />
          {form.formState.errors.content && <p className="mt-1 text-sm text-red-600">{form.formState.errors.content.message}</p>}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">Vista previa</p>
          <div className="mt-1 flex min-h-36 items-center overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-900">
            {latexSource ? <BlockMath math={latexSource} /> : <span className="text-sm text-slate-500">La vista previa aparecerá aquí.</span>}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3"><button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">Cancelar</button><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar fórmula'}</button></div>
    </form>
  )
}

function ImageBlock({
  attachments,
  blockId,
  errorMessage,
  isUploading,
  progress,
  onUpload,
}: {
  attachments: AttachmentResponse[]
  blockId: string
  errorMessage: string | undefined
  isUploading: boolean
  progress: number | undefined
  onUpload: (file: File) => void
}) {
  const [validationError, setValidationError] = useState<string>()

  function selectFile(file: File | undefined): void {
    if (!file) return
    if (!file.type.toLowerCase().startsWith('image/')) {
      setValidationError('Solo se permiten archivos de imagen.')
      return
    }
    if (file.size > maxImageSizeBytes) {
      setValidationError('La imagen no puede superar los 5 MB.')
      return
    }
    setValidationError(undefined)
    onUpload(file)
  }

  return (
    <div>
      {attachments.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">{attachments.map((attachment) => <img alt="Imagen adjunta" className="max-h-96 w-auto rounded-md border border-slate-200 object-contain" key={attachment.id} src={attachment.url} />)}</div> : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <label className="block text-sm font-medium text-slate-700" htmlFor={`image-${blockId}`}>Seleccionar imagen</label>
          <input accept="image/*" className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700" disabled={isUploading} id={`image-${blockId}`} onChange={(event) => selectFile(event.target.files?.[0])} type="file" />
          <p className="mt-2 text-xs text-slate-500">Solo imágenes de hasta 5 MB.</p>
        </div>
      )}
      {isUploading && <div className="mt-3"><div className="flex justify-between text-xs text-slate-600"><span>Subiendo imagen...</span><span>{progress ?? 0}%</span></div><div className="mt-1 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-slate-900 transition-all" style={{ width: `${progress ?? 0}%` }} /></div></div>}
      {validationError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{validationError}</p>}
      {errorMessage && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{errorMessage}</p>}
    </div>
  )
}

export function ChapterContentPanel({ chapterId }: { chapterId: string }) {
  const queryClient = useQueryClient()
  const [createBlockType, setCreateBlockType] = useState<'NOTE' | 'STEP_LIST' | 'CODE' | 'MATH' | 'EXERCISE'>()
  const [editingBlockId, setEditingBlockId] = useState<string>()
  const [blockToDelete, setBlockToDelete] = useState<ContentBlockResponse>()
  const [attachmentsByBlockId, setAttachmentsByBlockId] = useState<Record<string, AttachmentResponse[]>>({})
  const [uploadErrorsByBlockId, setUploadErrorsByBlockId] = useState<Record<string, string>>({})
  const [uploadProgressByBlockId, setUploadProgressByBlockId] = useState<Record<string, number>>({})
  const createNoteForm = useForm<NoteFormValues>({ resolver: zodResolver(noteSchema) })
  const editNoteForm = useForm<NoteFormValues>({ resolver: zodResolver(noteSchema) })
  const blocksQueryKey = ['chapters', chapterId, 'blocks'] as const
  const blocksQuery = useQuery({ queryKey: blocksQueryKey, queryFn: () => getChapterBlocks(chapterId) })
  const nextOrderIndex = (): number => (blocksQuery.data ?? []).reduce((highest, block) => Math.max(highest, block.orderIndex), -1) + 1
  const invalidateBlocks = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: blocksQueryKey })

  const createBlockMutation = useMutation({
    mutationFn: (request: ContentBlockRequest) => createContentBlock(chapterId, request),
    onSuccess: () => { createNoteForm.reset(); setCreateBlockType(undefined) },
    onSettled: invalidateBlocks,
  })
  const updateBlockMutation = useMutation({
    mutationFn: ({ blockId, request }: { blockId: string; request: ContentBlockRequest }) => updateContentBlock(blockId, request),
    onSuccess: () => setEditingBlockId(undefined),
    onSettled: invalidateBlocks,
  })
  const deleteBlockMutation = useMutation({ mutationFn: deleteContentBlock, onSuccess: () => setBlockToDelete(undefined), onSettled: invalidateBlocks })
  const toggleExerciseMutation = useMutation({
    mutationFn: toggleContentBlockResolved,
    onMutate: async (blockId) => {
      await queryClient.cancelQueries({ queryKey: blocksQueryKey })
      const previousBlocks = queryClient.getQueryData<ContentBlockResponse[]>(blocksQueryKey)
      queryClient.setQueryData<ContentBlockResponse[]>(blocksQueryKey, (blocks = []) => blocks.map((block) => block.id === blockId ? { ...block, resolved: !block.resolved } : block))
      return { previousBlocks }
    },
    onError: (_error, _blockId, context) => queryClient.setQueryData(blocksQueryKey, context?.previousBlocks),
    onSettled: invalidateBlocks,
  })
  const uploadAttachmentMutation = useMutation({
    mutationFn: ({ blockId, file }: { blockId: string; file: File }) => uploadBlockAttachment(
      blockId,
      file,
      (progress) => setUploadProgressByBlockId((current) => ({ ...current, [blockId]: progress })),
    ),
    onMutate: ({ blockId }) => {
      setUploadErrorsByBlockId((current) => ({ ...current, [blockId]: '' }))
      setUploadProgressByBlockId((current) => ({ ...current, [blockId]: 0 }))
    },
    onSuccess: (attachment) => setAttachmentsByBlockId((current) => ({
      ...current,
      [attachment.contentBlockId]: [...(current[attachment.contentBlockId] ?? []), attachment],
    })),
    onError: (error, { blockId }) => setUploadErrorsByBlockId((current) => ({ ...current, [blockId]: getApiErrorMessage(error) })),
    onSettled: (_data, _error, { blockId }) => setUploadProgressByBlockId((current) => {
      const remainingUploads = { ...current }
      delete remainingUploads[blockId]
      return remainingUploads
    }),
  })

  function startEditing(block: ContentBlockResponse): void {
    if (block.type === 'NOTE' || block.type === 'EXERCISE') editNoteForm.reset({ content: block.content ?? '' })
    setEditingBlockId(block.id)
  }

  const orderedBlocks = [...(blocksQuery.data ?? [])].sort((first, second) => first.orderIndex - second.orderIndex)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-slate-900">Contenido</h2><p className="mt-1 text-sm text-slate-600">Agrega y edita bloques para este capítulo.</p></div>
        <div className="flex flex-wrap gap-2"><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setCreateBlockType('STEP_LIST')} type="button">Agregar lista</button><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setCreateBlockType('CODE')} type="button">Agregar código</button><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setCreateBlockType('MATH')} type="button">Agregar fórmula</button><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setCreateBlockType('EXERCISE')} type="button">Agregar ejercicio</button><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" disabled={createBlockMutation.isPending} onClick={() => createBlockMutation.mutate(toImageRequest(nextOrderIndex()))} type="button">Agregar imagen</button><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700" onClick={() => setCreateBlockType('NOTE')} type="button">Agregar nota</button></div>
      </div>

      {createBlockType === 'NOTE' && <form className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4" noValidate onSubmit={createNoteForm.handleSubmit(({ content }) => createBlockMutation.mutate(toNoteRequest(content, nextOrderIndex())))}><label className="block text-sm font-medium text-slate-700" htmlFor="new-note">Nueva nota</label><textarea autoFocus className="mt-1 min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="new-note" aria-invalid={Boolean(createNoteForm.formState.errors.content)} {...createNoteForm.register('content')} />{createNoteForm.formState.errors.content && <p className="mt-1 text-sm text-red-600">{createNoteForm.formState.errors.content.message}</p>}{createBlockMutation.isError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(createBlockMutation.error)}</p>}<div className="mt-3 flex justify-end gap-3"><button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200" disabled={createBlockMutation.isPending} onClick={() => { createNoteForm.reset(); setCreateBlockType(undefined) }} type="button">Cancelar</button><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={createBlockMutation.isPending} type="submit">{createBlockMutation.isPending ? 'Guardando...' : 'Guardar nota'}</button></div></form>}

      {createBlockType === 'STEP_LIST' && <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="mb-4 text-sm font-semibold text-slate-900">Nueva lista de pasos</h3><StepListEditor initialStepList={{ stepStyle: 'NUMERIC', steps: [''] }} isPending={createBlockMutation.isPending} onCancel={() => setCreateBlockType(undefined)} onSubmit={(stepList) => createBlockMutation.mutate(toStepListRequest(stepList, nextOrderIndex()))} />{createBlockMutation.isError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(createBlockMutation.error)}</p>}</div>}

      {createBlockType === 'CODE' && <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="mb-4 text-sm font-semibold text-slate-900">Nuevo bloque de código</h3><CodeEditor initialCodeLanguage="javascript" initialContent="" isPending={createBlockMutation.isPending} onCancel={() => setCreateBlockType(undefined)} onSubmit={({ content, codeLanguage }) => createBlockMutation.mutate(toCodeRequest(content, codeLanguage, nextOrderIndex()))} />{createBlockMutation.isError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(createBlockMutation.error)}</p>}</div>}

      {createBlockType === 'MATH' && <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="mb-4 text-sm font-semibold text-slate-900">Nueva fórmula</h3><MathEditor initialContent="" isPending={createBlockMutation.isPending} onCancel={() => setCreateBlockType(undefined)} onSubmit={(content) => createBlockMutation.mutate(toMathRequest(content, nextOrderIndex()))} />{createBlockMutation.isError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(createBlockMutation.error)}</p>}</div>}

      {createBlockType === 'EXERCISE' && <form className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4" noValidate onSubmit={createNoteForm.handleSubmit(({ content }) => createBlockMutation.mutate(toExerciseRequest(content, nextOrderIndex())))}><label className="block text-sm font-medium text-slate-700" htmlFor="new-exercise">Nuevo ejercicio</label><textarea autoFocus className="mt-1 min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="new-exercise" aria-invalid={Boolean(createNoteForm.formState.errors.content)} {...createNoteForm.register('content')} />{createNoteForm.formState.errors.content && <p className="mt-1 text-sm text-red-600">{createNoteForm.formState.errors.content.message}</p>}{createBlockMutation.isError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(createBlockMutation.error)}</p>}<div className="mt-3 flex justify-end gap-3"><button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200" disabled={createBlockMutation.isPending} onClick={() => { createNoteForm.reset(); setCreateBlockType(undefined) }} type="button">Cancelar</button><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={createBlockMutation.isPending} type="submit">{createBlockMutation.isPending ? 'Guardando...' : 'Guardar ejercicio'}</button></div></form>}

      {blocksQuery.isPending && <p className="mt-6 text-sm text-slate-600">Cargando contenido...</p>}
      {blocksQuery.isError && <div className="mt-6 rounded bg-red-50 p-3 text-sm text-red-700" role="alert"><p>{getApiErrorMessage(blocksQuery.error)}</p><button className="mt-2 font-semibold underline" onClick={() => blocksQuery.refetch()} type="button">Reintentar</button></div>}
      {!blocksQuery.isPending && !blocksQuery.isError && orderedBlocks.length === 0 && <p className="mt-6 text-sm text-slate-600">Este capítulo todavía no tiene bloques.</p>}

      <div className="mt-6 space-y-4">
        {orderedBlocks.map((block) => {
          const isEditing = editingBlockId === block.id
          if (block.type === 'NOTE') return <article className="rounded-lg border border-slate-200 p-4" key={block.id}>{isEditing ? <form noValidate onSubmit={editNoteForm.handleSubmit(({ content }) => updateBlockMutation.mutate({ blockId: block.id, request: toNoteRequest(content, block.orderIndex) }))}><textarea autoFocus className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" aria-label="Editar nota" aria-invalid={Boolean(editNoteForm.formState.errors.content)} {...editNoteForm.register('content')} />{editNoteForm.formState.errors.content && <p className="mt-1 text-sm text-red-600">{editNoteForm.formState.errors.content.message}</p>}{updateBlockMutation.isError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(updateBlockMutation.error)}</p>}<div className="mt-3 flex justify-end gap-3"><button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={updateBlockMutation.isPending} onClick={() => setEditingBlockId(undefined)} type="button">Cancelar</button><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={updateBlockMutation.isPending} type="submit">{updateBlockMutation.isPending ? 'Guardando...' : 'Guardar cambios'}</button></div></form> : <><p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{block.content}</p><BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} /></>}</article>

          if (block.type === 'STEP_LIST') {
            const stepList = block.stepList ?? { stepStyle: 'NUMERIC' as const, steps: [] }
            return <article className="rounded-lg border border-slate-200 p-4" key={block.id}>{isEditing ? <StepListEditor initialStepList={stepList} isPending={updateBlockMutation.isPending} onCancel={() => setEditingBlockId(undefined)} onSubmit={(updatedStepList) => updateBlockMutation.mutate({ blockId: block.id, request: toStepListRequest(updatedStepList, block.orderIndex) })} /> : <><ol className="ml-5 space-y-2 text-sm leading-6 text-slate-800" style={{ listStyleType: stepList.stepStyle === 'ALPHABETIC' ? 'upper-alpha' : 'decimal' }}>{stepList.steps.map((step, index) => <li className="pl-1" key={`${block.id}-${index}`}>{step}</li>)}</ol><BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} /></>}</article>
          }

          if (block.type === 'CODE') {
            const codeLanguage = codeLanguages.includes(block.codeLanguage as CodeFormValues['codeLanguage'])
              ? block.codeLanguage as CodeFormValues['codeLanguage']
              : 'javascript'
            return <article className="rounded-lg border border-slate-200 p-4" key={block.id}>{isEditing ? <CodeEditor initialCodeLanguage={codeLanguage} initialContent={block.content ?? ''} isPending={updateBlockMutation.isPending} onCancel={() => setEditingBlockId(undefined)} onSubmit={({ content, codeLanguage: updatedCodeLanguage }) => updateBlockMutation.mutate({ blockId: block.id, request: toCodeRequest(content, updatedCodeLanguage, block.orderIndex) })} /> : <><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{block.codeLanguage ?? 'text'}</p><SyntaxHighlighter language={block.codeLanguage ?? 'text'} style={oneDark} customStyle={{ borderRadius: '0.375rem', margin: 0, padding: '1rem' }} showLineNumbers>{block.content ?? ''}</SyntaxHighlighter><BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} /></>}</article>
          }

          if (block.type === 'MATH') return <article className="rounded-lg border border-slate-200 p-4" key={block.id}>{isEditing ? <MathEditor initialContent={block.content ?? ''} isPending={updateBlockMutation.isPending} onCancel={() => setEditingBlockId(undefined)} onSubmit={(content) => updateBlockMutation.mutate({ blockId: block.id, request: toMathRequest(content, block.orderIndex) })} /> : <><div className="overflow-x-auto rounded-md bg-slate-50 p-4 text-slate-900"><BlockMath math={block.content ?? ''} /></div><BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} /></>}</article>

          if (block.type === 'EXERCISE') return <article className="rounded-lg border border-slate-200 p-4" key={block.id}>{isEditing ? <form noValidate onSubmit={editNoteForm.handleSubmit(({ content }) => updateBlockMutation.mutate({ blockId: block.id, request: toExerciseRequest(content, block.orderIndex) }))}><textarea autoFocus className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" aria-label="Editar ejercicio" aria-invalid={Boolean(editNoteForm.formState.errors.content)} {...editNoteForm.register('content')} />{editNoteForm.formState.errors.content && <p className="mt-1 text-sm text-red-600">{editNoteForm.formState.errors.content.message}</p>}{updateBlockMutation.isError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(updateBlockMutation.error)}</p>}<div className="mt-3 flex justify-end gap-3"><button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={updateBlockMutation.isPending} onClick={() => setEditingBlockId(undefined)} type="button">Cancelar</button><button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={updateBlockMutation.isPending} type="submit">{updateBlockMutation.isPending ? 'Guardando...' : 'Guardar cambios'}</button></div></form> : <><label className="flex cursor-pointer items-start gap-3"><input className="mt-1 size-4 accent-slate-900" checked={block.resolved} disabled={toggleExerciseMutation.isPending} onChange={() => toggleExerciseMutation.mutate(block.id)} type="checkbox" /><span className={`whitespace-pre-wrap text-sm leading-6 ${block.resolved ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{block.content}</span></label>{toggleExerciseMutation.isError && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(toggleExerciseMutation.error)}</p>}<BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} /></>}</article>

          if (block.type === 'IMAGE') {
            const attachments = [...block.attachments, ...(attachmentsByBlockId[block.id] ?? [])]
              .filter((attachment, index, allAttachments) => allAttachments.findIndex((current) => current.id === attachment.id) === index)
            return <article className="rounded-lg border border-slate-200 p-4" key={block.id}><ImageBlock attachments={attachments} blockId={block.id} errorMessage={uploadErrorsByBlockId[block.id]} isUploading={uploadProgressByBlockId[block.id] !== undefined} onUpload={(file) => uploadAttachmentMutation.mutate({ blockId: block.id, file })} progress={uploadProgressByBlockId[block.id]} /><div className="mt-4 flex justify-end"><button className="text-sm font-semibold text-red-700 underline hover:text-red-900" onClick={() => setBlockToDelete(block)} type="button">Eliminar</button></div></article>
          }

          return <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500" key={block.id}>[unsupported block type]</div>
        })}
      </div>

      {blockToDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation"><section aria-labelledby="delete-block-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog"><h3 className="text-xl font-semibold text-slate-900" id="delete-block-title">Eliminar bloque</h3><p className="mt-3 text-sm text-slate-600">¿Seguro que quieres eliminar este bloque? Esta acción no se puede deshacer.</p>{deleteBlockMutation.isError && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(deleteBlockMutation.error)}</p>}<div className="mt-6 flex justify-end gap-3"><button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={deleteBlockMutation.isPending} onClick={() => setBlockToDelete(undefined)} type="button">Cancelar</button><button className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:bg-red-400" disabled={deleteBlockMutation.isPending} onClick={() => deleteBlockMutation.mutate(blockToDelete.id)} type="button">{deleteBlockMutation.isPending ? 'Eliminando...' : 'Eliminar'}</button></div></section></div>}
    </section>
  )
}

function BlockActions({ onDelete, onEdit }: { onDelete: () => void; onEdit: () => void }) {
  return <div className="mt-4 flex justify-end gap-3"><button className="text-sm font-semibold text-slate-700 underline hover:text-slate-950" onClick={onEdit} type="button">Editar</button><button className="text-sm font-semibold text-red-700 underline hover:text-red-900" onClick={onDelete} type="button">Eliminar</button></div>
}
