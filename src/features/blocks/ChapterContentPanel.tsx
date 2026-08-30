import { zodResolver } from '@hookform/resolvers/zod'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, TouchEventHandler } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { BlockMath } from 'react-katex'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go'
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from 'sonner'
import 'katex/dist/katex.min.css'
import { z } from 'zod'
import { createContentBlock, deleteBlockAttachment, deleteContentBlock, getChapterBlocks, reorderContentBlocks, toggleContentBlockResolved, updateContentBlock, uploadBlockAttachment } from '../../api/contentBlocks'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'
import { removeFormDraft, useFormDraft } from '../../hooks/useFormDraft'
import type { DraftStatus } from '../../hooks/useFormDraft'
import type { AttachmentResponse, ContentBlockRequest, ContentBlockResponse, HeadingLevel, StepListBlockRequest } from '../../types/contentBlock'

SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('go', go)
SyntaxHighlighter.registerLanguage('html', markup)
SyntaxHighlighter.registerLanguage('java', java)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('xml', markup)
SyntaxHighlighter.registerLanguage('yaml', yaml)

const noteSchema = z.object({
  content: z.string().trim().min(1, 'El contenido no puede estar vacío.'),
})
const stepListSchema = z.object({
  stepStyle: z.enum(['NUMERIC', 'ALPHABETIC', 'BULLETED']),
  steps: z
    .array(
      z.object({
        text: z.string().trim().min(1, 'El elemento no puede estar vacío.'),
      }),
    )
    .min(1, 'Agrega al menos un paso.'),
})
const codeLanguages = ['javascript', 'typescript', 'java', 'python', 'go', 'json', 'sql', 'bash', 'html', 'css', 'xml', 'yaml'] as const
const codeSchema = z.object({
  codeLanguage: z.enum(codeLanguages),
  content: z.string().trim().min(1, 'El código no puede estar vacío.'),
  description: z.string().trim().max(2000, 'La descripción no puede superar los 2000 caracteres.'),
})
const mathSchema = z.object({
  content: z.string().trim().min(1, 'La expresión LaTeX no puede estar vacía.'),
  description: z.string().trim().max(2000, 'La descripción no puede superar los 2000 caracteres.'),
})
const exerciseSchema = z.object({
  content: z.string().trim().min(1, 'El ejercicio no puede estar vacío.'),
  description: z.string().trim().max(2000, 'La descripción no puede superar los 2000 caracteres.'),
})
const descriptionSchema = z.object({
  description: z.string().trim().max(2000, 'La descripción no puede superar los 2000 caracteres.'),
})
const questionAnswerSchema = z.object({
  question: z.string().trim().min(1, 'La pregunta no puede estar vacía.'),
  answer: z.string().trim().min(1, 'La respuesta no puede estar vacía.'),
})
const maxImageSizeBytes = 5 * 1024 * 1024

type NoteFormValues = z.infer<typeof noteSchema>
type StepListFormValues = z.infer<typeof stepListSchema>
type CodeFormValues = z.infer<typeof codeSchema>
type MathFormValues = z.infer<typeof mathSchema>
type ExerciseFormValues = z.infer<typeof exerciseSchema>
type DescriptionFormValues = z.infer<typeof descriptionSchema>
type QuestionAnswerFormValues = z.infer<typeof questionAnswerSchema>
type ComposerMode = 'NOTE' | 'TITLE' | 'SUBTITLE' | 'STEP_LIST' | 'CODE' | 'MATH' | 'EXERCISE' | 'QUESTION_ANSWER' | 'IMAGE'

interface StepListEditorProps {
  draftKey: string
  initialStepList: StepListBlockRequest
  isPending: boolean
  onCancel: () => void
  onSubmit: (stepList: StepListBlockRequest) => void
}

interface CreateBlockVariables {
  files?: File[]
  request: ContentBlockRequest
}

function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLFormElement>, onCancel?: () => void): void {
  if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 's' || event.key === 'Enter')) {
    event.preventDefault()
    event.currentTarget.requestSubmit()
    return
  }
  if (event.key === 'Escape' && onCancel) {
    event.preventDefault()
    onCancel()
  }
}

function DraftIndicator({ status }: { status: DraftStatus }) {
  const label = status === 'restored' ? 'Borrador recuperado' : status === 'saving' ? 'Guardando borrador...' : status === 'saved' ? 'Borrador guardado' : 'Autoguardado activo'
  return <p className="text-xs text-slate-500" role="status">{label} · Ctrl/Cmd + S o Ctrl/Cmd + Enter para guardar</p>
}

function composerDraftKey(chapterId: string, orderIndex: number, mode: ComposerMode): string {
  return `marginalia:draft:${chapterId}:insert:${orderIndex}:${mode}`
}

function editDraftKey(chapterId: string, blockId: string): string {
  return `marginalia:draft:${chapterId}:block:${blockId}`
}

function requestComposerMode(request: ContentBlockRequest): ComposerMode {
  if (request.type === 'HEADING') return request.headingLevel === 'TITLE' ? 'TITLE' : 'SUBTITLE'
  return request.type
}

function toNoteRequest(content: string, orderIndex: number): ContentBlockRequest {
  return {
    type: 'NOTE',
    content,
    answer: null,
    description: null,
    headingLevel: null,
    codeLanguage: null,
    orderIndex,
    stepList: null,
  }
}

function toHeadingRequest(content: string, headingLevel: HeadingLevel, orderIndex: number): ContentBlockRequest {
  return {
    type: 'HEADING',
    content,
    answer: null,
    description: null,
    headingLevel,
    codeLanguage: null,
    orderIndex,
    stepList: null,
  }
}

function toStepListRequest(stepList: StepListBlockRequest, orderIndex: number): ContentBlockRequest {
  return {
    type: 'STEP_LIST',
    content: null,
    answer: null,
    description: null,
    headingLevel: null,
    codeLanguage: null,
    orderIndex,
    stepList,
  }
}

function toCodeRequest(content: string, codeLanguage: string, description: string, orderIndex: number): ContentBlockRequest {
  return { type: 'CODE', content, answer: null, description: description || null, headingLevel: null, codeLanguage, orderIndex, stepList: null }
}

function toMathRequest(content: string, description: string, orderIndex: number): ContentBlockRequest {
  return {
    type: 'MATH',
    content,
    answer: null,
    description: description || null,
    headingLevel: null,
    codeLanguage: null,
    orderIndex,
    stepList: null,
  }
}

function toExerciseRequest(content: string, description: string, orderIndex: number): ContentBlockRequest {
  return {
    type: 'EXERCISE',
    content,
    answer: null,
    description: description || null,
    headingLevel: null,
    codeLanguage: null,
    orderIndex,
    stepList: null,
  }
}

function toQuestionAnswerRequest(question: string, answer: string, orderIndex: number): ContentBlockRequest {
  return {
    type: 'QUESTION_ANSWER',
    content: question,
    answer,
    description: null,
    headingLevel: null,
    codeLanguage: null,
    orderIndex,
    stepList: null,
  }
}

function toImageRequest(description: string, orderIndex: number): ContentBlockRequest {
  return {
    type: 'IMAGE',
    content: null,
    answer: null,
    description: description || null,
    headingLevel: null,
    codeLanguage: null,
    orderIndex,
    stepList: null,
  }
}

function StepListEditor({ draftKey, initialStepList, isPending, onCancel, onSubmit }: StepListEditorProps) {
  const form = useForm<StepListFormValues>({
    resolver: zodResolver(stepListSchema),
    defaultValues: {
      stepStyle: initialStepList.stepStyle,
      steps: initialStepList.steps.map((text) => ({ text })),
    },
  })
  const { fields, append, move, remove } = useFieldArray({
    control: form.control,
    name: 'steps',
  })
  const selectedStyle = form.watch('stepStyle')
  const draftStatus = useFormDraft(form, draftKey)

  return (
    <form className="space-y-4" noValidate onKeyDown={(event) => handleEditorKeyDown(event, onCancel)} onSubmit={form.handleSubmit(({ stepStyle, steps }) => onSubmit({ stepStyle, steps: steps.map((step) => step.text) }))}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="step-style">
          Estilo de lista
        </label>
        <select className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="step-style" {...form.register('stepStyle')}>
          <option value="NUMERIC">Numérico</option>
          <option value="ALPHABETIC">Alfabético</option>
          <option value="BULLETED">Con viñetas</option>
        </select>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Elementos</p>
        {fields.map((field, index) => (
          <div className="flex items-start gap-2" key={field.id}>
            <span className="w-6 pt-2 text-right text-sm text-slate-500">{selectedStyle === 'BULLETED' ? '•' : selectedStyle === 'ALPHABETIC' ? `${String.fromCharCode(65 + index)}.` : `${index + 1}.`}</span>
            <div className="min-w-0 flex-1">
              <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" aria-label={`Elemento ${index + 1}`} {...form.register(`steps.${index}.text`)} />
              {form.formState.errors.steps?.[index]?.text && <p className="mt-1 text-xs text-red-600">{form.formState.errors.steps[index].text.message}</p>}
            </div>
            <button aria-label={`Subir elemento ${index + 1}`} className="rounded px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:text-slate-300" disabled={index === 0 || isPending} onClick={() => move(index, index - 1)} type="button">
              ↑
            </button>
            <button aria-label={`Bajar elemento ${index + 1}`} className="rounded px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:text-slate-300" disabled={index === fields.length - 1 || isPending} onClick={() => move(index, index + 1)} type="button">
              ↓
            </button>
            <button aria-label={`Eliminar elemento ${index + 1}`} className="rounded px-2 py-2 text-sm text-red-700 hover:bg-red-50 disabled:text-red-300" disabled={isPending} onClick={() => remove(index)} type="button">
              ×
            </button>
          </div>
        ))}
        {form.formState.errors.steps?.root && <p className="text-sm text-red-600">{form.formState.errors.steps.root.message}</p>}
        <button className="text-sm font-semibold text-slate-700 underline hover:text-slate-950" disabled={isPending} onClick={() => append({ text: '' })} type="button">
          Agregar elemento
        </button>
      </div>
      <DraftIndicator status={draftStatus} />
      <div className="flex justify-end gap-3">
        <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">
          {isPending ? 'Guardando...' : 'Guardar lista'}
        </button>
      </div>
    </form>
  )
}

function CodeEditor({ draftKey, initialCodeLanguage, initialContent, initialDescription, isPending, onCancel, onSubmit }: { draftKey: string; initialCodeLanguage: CodeFormValues['codeLanguage']; initialContent: string; initialDescription: string; isPending: boolean; onCancel: () => void; onSubmit: (values: CodeFormValues) => void }) {
  const form = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      codeLanguage: initialCodeLanguage,
      content: initialContent,
      description: initialDescription,
    },
  })
  const draftStatus = useFormDraft(form, draftKey)

  return (
    <form className="space-y-4" noValidate onKeyDown={(event) => handleEditorKeyDown(event, onCancel)} onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="code-description">
          Descripción <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="code-description" placeholder="Explica el contexto o propósito del código..." aria-invalid={Boolean(form.formState.errors.description)} {...form.register('description')} />
        {form.formState.errors.description && <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="code-language">
          Lenguaje
        </label>
        <select className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="code-language" {...form.register('codeLanguage')}>
          {codeLanguages.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="code-content">
          Código
        </label>
        <textarea className="mt-1 min-h-52 w-full rounded-md border border-slate-300 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-300" id="code-content" spellCheck={false} aria-invalid={Boolean(form.formState.errors.content)} {...form.register('content')} />
        {form.formState.errors.content && <p className="mt-1 text-sm text-red-600">{form.formState.errors.content.message}</p>}
      </div>
      <DraftIndicator status={draftStatus} />
      <div className="flex justify-end gap-3">
        <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">
          {isPending ? 'Guardando...' : 'Guardar código'}
        </button>
      </div>
    </form>
  )
}

function MathEditor({ draftKey, initialContent, initialDescription, isPending, onCancel, onSubmit }: { draftKey: string; initialContent: string; initialDescription: string; isPending: boolean; onCancel: () => void; onSubmit: (values: MathFormValues) => void }) {
  const form = useForm<MathFormValues>({
    resolver: zodResolver(mathSchema),
    defaultValues: { content: initialContent, description: initialDescription },
  })
  const latexSource = form.watch('content')
  const draftStatus = useFormDraft(form, draftKey)

  return (
    <form className="space-y-4" noValidate onKeyDown={(event) => handleEditorKeyDown(event, onCancel)} onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="math-description">
          Descripción <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="math-description" placeholder="Explica qué representa la fórmula..." aria-invalid={Boolean(form.formState.errors.description)} {...form.register('description')} />
        {form.formState.errors.description && <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="math-source">
            Fuente LaTeX
          </label>
          <textarea autoFocus className="mt-1 min-h-36 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="math-source" placeholder="\\frac{a}{b}" spellCheck={false} aria-invalid={Boolean(form.formState.errors.content)} {...form.register('content')} />
          {form.formState.errors.content && <p className="mt-1 text-sm text-red-600">{form.formState.errors.content.message}</p>}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">Vista previa</p>
          <div className="mt-1 flex min-h-36 items-center overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-4 text-slate-900">{latexSource ? <BlockMath math={latexSource} /> : <span className="text-sm text-slate-500">La vista previa aparecerá aquí.</span>}</div>
        </div>
      </div>
      <DraftIndicator status={draftStatus} />
      <div className="flex justify-end gap-3">
        <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">
          {isPending ? 'Guardando...' : 'Guardar fórmula'}
        </button>
      </div>
    </form>
  )
}

function ExerciseEditor({ draftKey, initialContent, initialDescription, isPending, onCancel, onSubmit }: { draftKey: string; initialContent: string; initialDescription: string; isPending: boolean; onCancel: () => void; onSubmit: (values: ExerciseFormValues) => void }) {
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: { content: initialContent, description: initialDescription },
  })
  const draftStatus = useFormDraft(form, draftKey)

  return (
    <form className="space-y-4" noValidate onKeyDown={(event) => handleEditorKeyDown(event, onCancel)} onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="exercise-description">
          Descripción <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="exercise-description" placeholder="Agrega contexto o indicaciones..." aria-invalid={Boolean(form.formState.errors.description)} {...form.register('description')} />
        {form.formState.errors.description && <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="exercise-content">Ejercicio</label>
        <textarea autoFocus className="mt-1 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="exercise-content" aria-invalid={Boolean(form.formState.errors.content)} {...form.register('content')} />
        {form.formState.errors.content && <p className="mt-1 text-sm text-red-600">{form.formState.errors.content.message}</p>}
      </div>
      <DraftIndicator status={draftStatus} />
      <div className="flex justify-end gap-3">
        <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">Cancelar</button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar ejercicio'}</button>
      </div>
    </form>
  )
}

function QuestionAnswerEditor({ draftKey, initialAnswer, initialQuestion, isPending, onCancel, onSubmit }: { draftKey: string; initialAnswer: string; initialQuestion: string; isPending: boolean; onCancel: () => void; onSubmit: (values: QuestionAnswerFormValues) => void }) {
  const form = useForm<QuestionAnswerFormValues>({
    resolver: zodResolver(questionAnswerSchema),
    defaultValues: { question: initialQuestion, answer: initialAnswer },
  })
  const draftStatus = useFormDraft(form, draftKey)

  return (
    <form className="space-y-4" noValidate onKeyDown={(event) => handleEditorKeyDown(event, onCancel)} onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="question-content">Pregunta</label>
        <textarea autoFocus className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="question-content" aria-invalid={Boolean(form.formState.errors.question)} {...form.register('question')} />
        {form.formState.errors.question && <p className="mt-1 text-sm text-red-600">{form.formState.errors.question.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="answer-content">Respuesta</label>
        <textarea className="mt-1 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="answer-content" aria-invalid={Boolean(form.formState.errors.answer)} {...form.register('answer')} />
        {form.formState.errors.answer && <p className="mt-1 text-sm text-red-600">{form.formState.errors.answer.message}</p>}
      </div>
      <DraftIndicator status={draftStatus} />
      <div className="flex justify-end gap-3">
        <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">Cancelar</button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar pregunta'}</button>
      </div>
    </form>
  )
}

function DescriptionEditor({ draftKey, initialDescription, isPending, label, onCancel, onSubmit }: { draftKey: string; initialDescription: string; isPending: boolean; label: string; onCancel: () => void; onSubmit: (description: string) => void }) {
  const form = useForm<DescriptionFormValues>({
    resolver: zodResolver(descriptionSchema),
    defaultValues: { description: initialDescription },
  })
  const draftStatus = useFormDraft(form, draftKey)

  return (
    <form className="space-y-4" noValidate onKeyDown={(event) => handleEditorKeyDown(event, onCancel)} onSubmit={form.handleSubmit(({ description }) => onSubmit(description))}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="block-description">{label}</label>
        <textarea autoFocus className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="block-description" placeholder="Agrega contexto para este contenido..." aria-invalid={Boolean(form.formState.errors.description)} {...form.register('description')} />
        {form.formState.errors.description && <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>}
      </div>
      <DraftIndicator status={draftStatus} />
      <div className="flex justify-end gap-3">
        <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">Cancelar</button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar descripción'}</button>
      </div>
    </form>
  )
}

function ImageComposer({ chapterId, isPending, onCancel, onSubmit, orderIndex }: { chapterId: string; isPending: boolean; onCancel: () => void; onSubmit: (description: string, files: File[]) => void; orderIndex: number }) {
  const form = useForm<DescriptionFormValues>({
    resolver: zodResolver(descriptionSchema),
    defaultValues: { description: '' },
  })
  const draftStatus = useFormDraft(form, composerDraftKey(chapterId, orderIndex, 'IMAGE'))
  const [files, setFiles] = useState<File[]>([])
  const [validationError, setValidationError] = useState<string>()
  const inputId = `new-images-${chapterId}-${orderIndex}`

  function selectFiles(fileList: FileList | null): void {
    const selectedFiles = Array.from(fileList ?? [])
    const invalidType = selectedFiles.find((file) => !file.type.toLowerCase().startsWith('image/'))
    const oversizedFile = selectedFiles.find((file) => file.size > maxImageSizeBytes)
    if (invalidType) {
      setValidationError(`"${invalidType.name}" no es un archivo de imagen válido.`)
      return
    }
    if (oversizedFile) {
      setValidationError(`"${oversizedFile.name}" supera el límite de 5 MB.`)
      return
    }
    setValidationError(undefined)
    setFiles(selectedFiles)
  }

  return (
    <form className="space-y-4" noValidate onKeyDown={(event) => handleEditorKeyDown(event, onCancel)} onSubmit={form.handleSubmit(({ description }) => onSubmit(description, files))}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="new-image-description">Descripción de la imagen (opcional)</label>
        <textarea autoFocus className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="new-image-description" placeholder="Agrega contexto para estas imágenes..." aria-invalid={Boolean(form.formState.errors.description)} {...form.register('description')} />
        {form.formState.errors.description && <p className="mt-1 text-sm text-red-600">{form.formState.errors.description.message}</p>}
      </div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
        <label className="inline-flex cursor-pointer items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 has-[:disabled]:cursor-wait has-[:disabled]:bg-slate-400" htmlFor={inputId}>
          Seleccionar imágenes
          <input accept="image/*" className="sr-only" disabled={isPending} id={inputId} multiple onChange={(event) => selectFiles(event.target.files)} type="file" />
        </label>
        <p className="mt-2 text-xs text-slate-500">Puedes seleccionar varias imágenes. Máximo 5 MB por archivo.</p>
        {files.length > 0 && <p className="mt-2 break-words text-sm font-medium text-slate-700">{files.length === 1 ? files[0].name : `${files.length} imágenes seleccionadas`}</p>}
      </div>
      {validationError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{validationError}</p>}
      <DraftIndicator status={draftStatus} />
      <div className="flex justify-end gap-3">
        <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">Cancelar</button>
        <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">{isPending ? 'Guardando...' : 'Guardar imagen'}</button>
      </div>
    </form>
  )
}

function BlockDescription({ description }: { description: string | null | undefined }) {
  if (!description) return null
  return <p className="mb-4 whitespace-pre-wrap text-base leading-7 text-slate-700">{description}</p>
}

function ImageBlock({ attachments, blockId, deleteError, deletingAttachmentId, errorMessage, isUploading, onDelete, progress, onUpload }: { attachments: AttachmentResponse[]; blockId: string; deleteError: unknown; deletingAttachmentId: string | undefined; errorMessage: string | undefined; isUploading: boolean; onDelete: (attachment: AttachmentResponse) => Promise<void>; progress: number | undefined; onUpload: (files: File[]) => void }) {
  const [validationError, setValidationError] = useState<string>()
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentResponse>()
  const [attachmentToDelete, setAttachmentToDelete] = useState<AttachmentResponse>()

  useEffect(() => {
    if (!previewAttachment) return
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setPreviewAttachment(undefined)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [previewAttachment])

  function selectFiles(fileList: FileList | null): void {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return

    const invalidType = files.find((file) => !file.type.toLowerCase().startsWith('image/'))
    if (invalidType) {
      setValidationError(`"${invalidType.name}" no es un archivo de imagen válido.`)
      toast.warning('Selecciona únicamente archivos de imagen.')
      return
    }

    const oversizedFile = files.find((file) => file.size > maxImageSizeBytes)
    if (oversizedFile) {
      setValidationError(`"${oversizedFile.name}" supera el límite de 5 MB.`)
      toast.warning('Una de las imágenes supera el límite de 5 MB.')
      return
    }

    setValidationError(undefined)
    onUpload(files)
  }

  async function confirmDelete(): Promise<void> {
    if (!attachmentToDelete) return
    try {
      await onDelete(attachmentToDelete)
      if (previewAttachment?.id === attachmentToDelete.id) setPreviewAttachment(undefined)
      setAttachmentToDelete(undefined)
    } catch {
      return
    }
  }

  return (
    <div>
      {attachments.length > 0 && (
        <div className={`grid justify-items-center gap-4 ${attachments.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {attachments.map((attachment, index) => (
            <div className="group/image relative flex w-full justify-center rounded-lg bg-white/60 p-2 transition hover:bg-white" key={attachment.id}>
              <button aria-label={`Ampliar imagen ${index + 1}`} className="flex w-full justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-slate-500" onClick={() => setPreviewAttachment(attachment)} type="button">
                <img alt={`Imagen adjunta ${index + 1}`} className="max-h-80 max-w-full rounded-md border border-slate-200 object-contain shadow-sm transition group-hover/image:scale-[1.01]" src={attachment.url} />
              </button>
              <button
                aria-label={`Eliminar imagen ${index + 1}`}
                className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-red-200 bg-white text-red-700 opacity-90 shadow-md transition hover:scale-105 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-wait disabled:opacity-50"
                disabled={deletingAttachmentId !== undefined}
                onClick={() => setAttachmentToDelete(attachment)}
                title="Eliminar imagen"
                type="button"
              >
                <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M4 7h16" />
                  <path d="M9 7V4h6v3" />
                  <path d="m7 7 1 13h8l1-13" />
                  <path d="M10 11v5M14 11v5" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={attachments.length > 0 ? 'mt-4 flex flex-col items-center' : 'rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center'}>
        <label className="inline-flex cursor-pointer items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 has-[:disabled]:cursor-wait has-[:disabled]:bg-slate-400" htmlFor={`image-${blockId}`}>
          {attachments.length > 0 ? 'Agregar más imágenes' : 'Seleccionar imágenes'}
          <input accept="image/*" className="sr-only" disabled={isUploading} id={`image-${blockId}`} multiple onChange={(event) => {
            selectFiles(event.target.files)
            event.target.value = ''
          }} type="file" />
        </label>
        <p className="mt-2 text-xs text-slate-500">Puedes seleccionar varias imágenes. Máximo 5 MB por archivo.</p>
      </div>

      {isUploading && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Subiendo imágenes...</span>
            <span>{progress ?? 0}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded bg-slate-200">
            <div className="h-full bg-slate-900 transition-all" style={{ width: `${progress ?? 0}%` }} />
          </div>
        </div>
      )}
      {validationError && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {validationError}
        </p>
      )}
      {errorMessage && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      {previewAttachment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewAttachment(undefined)
        }} role="presentation">
          <section aria-label="Vista ampliada de la imagen" aria-modal="true" className="relative flex max-h-full max-w-6xl items-center justify-center" role="dialog">
            <button aria-label="Cerrar vista ampliada" className="absolute right-0 top-0 z-10 grid size-10 -translate-y-3 translate-x-3 place-items-center rounded-full bg-white text-2xl leading-none text-slate-900 shadow-lg hover:bg-slate-100" onClick={() => setPreviewAttachment(undefined)} type="button">×</button>
            <img alt="Imagen adjunta ampliada" className="max-h-[90vh] max-w-[92vw] rounded-lg bg-white object-contain shadow-2xl" src={previewAttachment.url} />
          </section>
        </div>
      )}

      {attachmentToDelete && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" role="presentation">
          <section aria-labelledby="delete-image-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" role="dialog">
            <h3 className="text-xl font-semibold text-slate-900" id="delete-image-title">Eliminar imagen</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">¿Seguro que quieres eliminar esta imagen? También dejará de aparecer en la vista previa y en el PDF.</p>
            <img alt="Imagen que se eliminará" className="mx-auto mt-4 max-h-48 max-w-full rounded-lg border border-slate-200 object-contain" src={attachmentToDelete.url} />
            {Boolean(deleteError) && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(deleteError)}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={deletingAttachmentId !== undefined} onClick={() => setAttachmentToDelete(undefined)} type="button">Cancelar</button>
              <button className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-wait disabled:bg-red-400" disabled={deletingAttachmentId !== undefined} onClick={() => void confirmDelete()} type="button">{deletingAttachmentId ? 'Eliminando...' : 'Eliminar imagen'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function TextBlockEditor({ draftKey, error, initialContent, inputClassName, inputLabel, isPending, onCancel, onSubmit, placeholder, submitLabel }: { draftKey: string; error?: unknown; initialContent: string; inputClassName: string; inputLabel: string; isPending: boolean; onCancel?: () => void; onSubmit: (content: string) => void; placeholder?: string; submitLabel: string }) {
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { content: initialContent },
  })
  const draftStatus = useFormDraft(form, draftKey)

  return (
    <form noValidate onKeyDown={(event) => handleEditorKeyDown(event, onCancel)} onSubmit={form.handleSubmit(({ content }) => onSubmit(content))}>
      <textarea autoFocus className={inputClassName} placeholder={placeholder} aria-label={inputLabel} aria-invalid={Boolean(form.formState.errors.content)} {...form.register('content')} />
      {form.formState.errors.content && <p className="mt-1 text-sm text-red-600">{form.formState.errors.content.message}</p>}
      {Boolean(error) && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(error)}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <DraftIndicator status={draftStatus} />
        <div className="flex gap-3">
          {onCancel && <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={isPending} onClick={onCancel} type="button">Cancelar</button>}
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={isPending} type="submit">
            {isPending ? 'Guardando...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

function BlockComposer({ chapterId, error, isPending, onResetError, onSubmit, orderIndex }: { chapterId: string; error: unknown; isPending: boolean; onResetError: () => void; onSubmit: (request: ContentBlockRequest, files?: File[]) => void; orderIndex: number }) {
  const [blockType, setBlockType] = useState<ComposerMode>('NOTE')

  function selectBlockType(type: ComposerMode): void {
    onResetError()
    setBlockType(type)
  }

  function textRequest(content: string): ContentBlockRequest {
    if (blockType === 'TITLE') return toHeadingRequest(content, 'TITLE', orderIndex)
    if (blockType === 'SUBTITLE') return toHeadingRequest(content, 'SUBTITLE', orderIndex)
    return toNoteRequest(content, orderIndex)
  }

  const toolClass = (type: ComposerMode): string => `rounded-md px-3 py-1.5 text-xs font-semibold transition ${blockType === type ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
  const isTextBlock = blockType === 'NOTE' || blockType === 'TITLE' || blockType === 'SUBTITLE'

  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-100 pb-3" aria-label="Tipos de contenido">
        <button className={toolClass('NOTE')} onClick={() => selectBlockType('NOTE')} type="button">
          Texto
        </button>
        <button className={toolClass('TITLE')} onClick={() => selectBlockType('TITLE')} type="button">
          Título
        </button>
        <button className={toolClass('SUBTITLE')} onClick={() => selectBlockType('SUBTITLE')} type="button">
          Subtítulo
        </button>
        <button className={toolClass('STEP_LIST')} onClick={() => selectBlockType('STEP_LIST')} type="button">
          Lista
        </button>
        <button className={toolClass('CODE')} onClick={() => selectBlockType('CODE')} type="button">
          Código
        </button>
        <button className={toolClass('MATH')} onClick={() => selectBlockType('MATH')} type="button">
          Fórmula
        </button>
        <button className={toolClass('EXERCISE')} onClick={() => selectBlockType('EXERCISE')} type="button">
          Ejercicio
        </button>
        <button className={toolClass('QUESTION_ANSWER')} onClick={() => selectBlockType('QUESTION_ANSWER')} type="button">
          Pregunta
        </button>
        <button className={toolClass('IMAGE')} onClick={() => selectBlockType('IMAGE')} type="button">
          Imagen
        </button>
      </div>

      {isTextBlock && (
        <TextBlockEditor
          draftKey={composerDraftKey(chapterId, orderIndex, blockType)}
          initialContent=""
          inputClassName={`w-full resize-y border-0 bg-transparent px-1 py-2 text-slate-900 outline-none placeholder:text-slate-400 ${blockType === 'TITLE' ? 'min-h-24 text-2xl font-semibold' : blockType === 'SUBTITLE' ? 'min-h-24 text-xl font-semibold' : 'min-h-32 text-base leading-7'}`}
          inputLabel={blockType === 'TITLE' ? 'Nuevo título' : blockType === 'SUBTITLE' ? 'Nuevo subtítulo' : 'Nueva nota'}
          isPending={isPending}
          onSubmit={(content) => onSubmit(textRequest(content))}
          placeholder={blockType === 'TITLE' ? 'Escribe un título...' : blockType === 'SUBTITLE' ? 'Escribe un subtítulo...' : 'Escribe tus notas aquí...'}
          submitLabel={blockType === 'TITLE' ? 'Guardar título' : blockType === 'SUBTITLE' ? 'Guardar subtítulo' : 'Guardar nota'}
        />
      )}

      {blockType === 'STEP_LIST' && <StepListEditor draftKey={composerDraftKey(chapterId, orderIndex, blockType)} initialStepList={{ stepStyle: 'BULLETED', steps: [''] }} isPending={isPending} onCancel={() => selectBlockType('NOTE')} onSubmit={(stepList) => onSubmit(toStepListRequest(stepList, orderIndex))} />}
      {blockType === 'CODE' && <CodeEditor draftKey={composerDraftKey(chapterId, orderIndex, blockType)} initialCodeLanguage="javascript" initialContent="" initialDescription="" isPending={isPending} onCancel={() => selectBlockType('NOTE')} onSubmit={({ content, codeLanguage, description }) => onSubmit(toCodeRequest(content, codeLanguage, description, orderIndex))} />}
      {blockType === 'MATH' && <MathEditor draftKey={composerDraftKey(chapterId, orderIndex, blockType)} initialContent="" initialDescription="" isPending={isPending} onCancel={() => selectBlockType('NOTE')} onSubmit={({ content, description }) => onSubmit(toMathRequest(content, description, orderIndex))} />}
      {blockType === 'EXERCISE' && <ExerciseEditor draftKey={composerDraftKey(chapterId, orderIndex, blockType)} initialContent="" initialDescription="" isPending={isPending} onCancel={() => selectBlockType('NOTE')} onSubmit={({ content, description }) => onSubmit(toExerciseRequest(content, description, orderIndex))} />}
      {blockType === 'QUESTION_ANSWER' && <QuestionAnswerEditor draftKey={composerDraftKey(chapterId, orderIndex, blockType)} initialAnswer="" initialQuestion="" isPending={isPending} onCancel={() => selectBlockType('NOTE')} onSubmit={({ question, answer }) => onSubmit(toQuestionAnswerRequest(question, answer, orderIndex))} />}
      {blockType === 'IMAGE' && <ImageComposer chapterId={chapterId} isPending={isPending} onCancel={() => selectBlockType('NOTE')} onSubmit={(description, files) => onSubmit(toImageRequest(description, orderIndex), files)} orderIndex={orderIndex} />}
      {Boolean(error) && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {getApiErrorMessage(error)}
        </p>
      )}
    </div>
  )
}

function InsertionDivider({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="group/insert flex h-8 items-center">
      <div className="h-px flex-1 bg-transparent transition group-hover/insert:bg-slate-200" />
      <button aria-label="Insertar contenido aquí" className="insertion-button mx-2 grid size-7 place-items-center rounded-full border border-transparent text-lg leading-none text-slate-400 opacity-0 transition hover:border-slate-300 hover:bg-white hover:text-slate-700 focus-visible:opacity-100 group-hover/insert:border-slate-200 group-hover/insert:opacity-100 group-hover/insert:text-slate-500" onClick={onInsert} type="button">
        +
      </button>
      <div className="h-px flex-1 bg-transparent transition group-hover/insert:bg-slate-200" />
    </div>
  )
}

const blockTypeLabels: Record<ContentBlockResponse['type'], string> = {
  NOTE: 'Texto',
  HEADING: 'Título',
  STEP_LIST: 'Lista',
  CODE: 'Código',
  MATH: 'Fórmula',
  EXERCISE: 'Ejercicio',
  QUESTION_ANSWER: 'Pregunta',
  IMAGE: 'Imágenes',
}

function blockDragPreview(block: ContentBlockResponse): string {
  if (block.type === 'STEP_LIST') return block.stepList?.steps.join(' · ') ?? 'Lista sin elementos'
  if (block.type === 'IMAGE') return block.description || `${block.attachments.length} ${block.attachments.length === 1 ? 'imagen' : 'imágenes'}`
  return block.content || block.description || block.answer || 'Bloque de contenido'
}

function ContentBlockDragOverlay({ block }: { block: ContentBlockResponse }) {
  return (
    <div className="pointer-events-none w-72 max-w-[calc(100vw-2rem)] rounded-xl border-2 border-amber-500 bg-white px-4 py-3 text-slate-900 shadow-2xl sm:w-80">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
        <span aria-hidden="true" className="text-base leading-none">⠿</span>
        {blockTypeLabels[block.type]}
      </div>
      <p className="mt-2 max-h-16 overflow-hidden whitespace-pre-line break-words text-sm leading-5">{blockDragPreview(block)}</p>
    </div>
  )
}

function SortableContentBlock({ blockId, children, disabled }: { blockId: string; children: ReactNode; disabled: boolean }) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: blockId, disabled })
  const { onTouchStart, ...mouseListeners } = listeners ?? {}
  const touchListener = onTouchStart as TouchEventHandler<HTMLDivElement> | undefined
  return (
    <div
      className={`group/sortable relative rounded-lg pl-5 transition-shadow ${isDragging ? 'bg-amber-50/70 ring-2 ring-inset ring-amber-400' : ''}`}
      onTouchStart={touchListener}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        aria-label="Reordenar anotación"
        className="absolute left-0 top-4 z-10 grid size-6 cursor-grab place-items-center rounded-md border border-slate-300 bg-white text-slate-500 opacity-0 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:cursor-grabbing active:bg-amber-50 active:text-amber-800 group-hover/sortable:opacity-100 disabled:cursor-default disabled:opacity-0"
        disabled={disabled}
        type="button"
        {...attributes}
        {...mouseListeners}
      >
        <svg aria-hidden="true" className="h-4 w-3" fill="currentColor" viewBox="0 0 12 16">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>
      <div className={isDragging ? 'opacity-20' : ''}>{children}</div>
    </div>
  )
}

export function ChapterContentPanel({ chapterId, chapterTitle = 'Notas del capítulo' }: { chapterId: string; chapterTitle?: string }) {
  const queryClient = useQueryClient()
  const blockSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
  )
  const composerEndRef = useRef<HTMLDivElement>(null)
  const scrolledChapterIdRef = useRef<string | undefined>(undefined)
  const [insertionOrderIndex, setInsertionOrderIndex] = useState<number>()
  const [editingBlockId, setEditingBlockId] = useState<string>()
  const [draggedBlockId, setDraggedBlockId] = useState<string>()
  const [reviewMode, setReviewMode] = useState(false)
  const [revealedAnswerIds, setRevealedAnswerIds] = useState<Set<string>>(() => new Set())
  const [blockToDelete, setBlockToDelete] = useState<ContentBlockResponse>()
  const [attachmentsByBlockId, setAttachmentsByBlockId] = useState<Record<string, AttachmentResponse[]>>({})
  const [uploadErrorsByBlockId, setUploadErrorsByBlockId] = useState<Record<string, string>>({})
  const [uploadProgressByBlockId, setUploadProgressByBlockId] = useState<Record<string, number>>({})
  const blocksQueryKey = ['chapters', chapterId, 'blocks'] as const
  const blocksQuery = useQuery({
    queryKey: blocksQueryKey,
    queryFn: () => getChapterBlocks(chapterId),
  })
  const invalidateBlocks = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: blocksQueryKey })

  useEffect(() => {
    setInsertionOrderIndex(undefined)
    setEditingBlockId(undefined)
    setDraggedBlockId(undefined)
    setReviewMode(false)
    setRevealedAnswerIds(new Set())
  }, [chapterId])

  useEffect(() => {
    if (!blocksQuery.data || insertionOrderIndex !== undefined) return
    const nextOrderIndex = blocksQuery.data.reduce((highest, block) => Math.max(highest, block.orderIndex), -1) + 1
    setInsertionOrderIndex(nextOrderIndex)
  }, [blocksQuery.data, insertionOrderIndex])

  const createBlockMutation = useMutation({
    mutationFn: async ({ files = [], request }: CreateBlockVariables) => {
      const createdBlock = await createContentBlock(chapterId, request)
      if (files.length === 0) return createdBlock

      const attachments: AttachmentResponse[] = []
      try {
        for (const [index, file] of files.entries()) {
          const attachment = await uploadBlockAttachment(createdBlock.id, file, (fileProgress) => {
            const batchProgress = Math.round(((index * 100) + fileProgress) / files.length)
            setUploadProgressByBlockId((current) => ({ ...current, [createdBlock.id]: batchProgress }))
          })
          attachments.push(attachment)
        }
        return { ...createdBlock, attachments }
      } catch (uploadError) {
        setUploadErrorsByBlockId((current) => ({ ...current, [createdBlock.id]: getApiErrorMessage(uploadError) }))
        toast.error(getApiErrorMessage(uploadError))
        return { ...createdBlock, attachments }
      } finally {
        setUploadProgressByBlockId((current) => {
          const remainingUploads = { ...current }
          delete remainingUploads[createdBlock.id]
          return remainingUploads
        })
      }
    },
    meta: { successMessage: 'Contenido agregado correctamente.' },
    onSuccess: (createdBlock, { request }) => {
      removeFormDraft(composerDraftKey(chapterId, request.orderIndex, requestComposerMode(request)))
      queryClient.setQueryData<ContentBlockResponse[]>(blocksQueryKey, (blocks = []) => [...blocks.map((block) => (block.orderIndex >= request.orderIndex ? { ...block, orderIndex: block.orderIndex + 1 } : block)), createdBlock])
      setInsertionOrderIndex(request.orderIndex + 1)
    },
    onSettled: invalidateBlocks,
  })
  const updateBlockMutation = useMutation({
    mutationFn: ({ blockId, request }: { blockId: string; request: ContentBlockRequest }) => updateContentBlock(blockId, request),
    meta: { successMessage: 'Contenido actualizado correctamente.' },
    onSuccess: (_updatedBlock, { blockId }) => {
      removeFormDraft(editDraftKey(chapterId, blockId))
      setEditingBlockId(undefined)
    },
    onSettled: invalidateBlocks,
  })
  const deleteBlockMutation = useMutation({
    mutationFn: deleteContentBlock,
    meta: { successMessage: 'Contenido eliminado correctamente.' },
    onSuccess: () => setBlockToDelete(undefined),
    onSettled: invalidateBlocks,
  })
  const toggleExerciseMutation = useMutation({
    mutationFn: toggleContentBlockResolved,
    meta: { successMessage: 'Estado del ejercicio actualizado.' },
    onMutate: async (blockId) => {
      await queryClient.cancelQueries({ queryKey: blocksQueryKey })
      const previousBlocks = queryClient.getQueryData<ContentBlockResponse[]>(blocksQueryKey)
      queryClient.setQueryData<ContentBlockResponse[]>(blocksQueryKey, (blocks = []) => blocks.map((block) => (block.id === blockId ? { ...block, resolved: !block.resolved } : block)))
      return { previousBlocks }
    },
    onError: (_error, _blockId, context) => queryClient.setQueryData(blocksQueryKey, context?.previousBlocks),
    onSettled: invalidateBlocks,
  })
  const reorderBlocksMutation = useMutation({
    mutationFn: (blocks: ContentBlockResponse[]) => reorderContentBlocks(chapterId, blocks.map((block, orderIndex) => ({ blockId: block.id, orderIndex }))),
    meta: { successMessage: 'Orden de las anotaciones actualizado.' },
    onMutate: async (blocks) => {
      await queryClient.cancelQueries({ queryKey: blocksQueryKey })
      const previousBlocks = queryClient.getQueryData<ContentBlockResponse[]>(blocksQueryKey)
      queryClient.setQueryData(blocksQueryKey, blocks.map((block, orderIndex) => ({ ...block, orderIndex })))
      return { previousBlocks }
    },
    onError: (_error, _blocks, context) => queryClient.setQueryData(blocksQueryKey, context?.previousBlocks),
    onSettled: invalidateBlocks,
  })
  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ blockId, files }: { blockId: string; files: File[] }) => {
      const uploadedAttachments: AttachmentResponse[] = []
      for (const [index, file] of files.entries()) {
        const attachment = await uploadBlockAttachment(blockId, file, (fileProgress) => {
          const batchProgress = Math.round(((index * 100) + fileProgress) / files.length)
          setUploadProgressByBlockId((current) => ({ ...current, [blockId]: batchProgress }))
        })
        uploadedAttachments.push(attachment)
      }
      return uploadedAttachments
    },
    meta: { successMessage: 'Imágenes subidas correctamente.' },
    onMutate: ({ blockId }) => {
      setUploadErrorsByBlockId((current) => ({ ...current, [blockId]: '' }))
      setUploadProgressByBlockId((current) => ({ ...current, [blockId]: 0 }))
    },
    onSuccess: (attachments) =>
      setAttachmentsByBlockId((current) => ({
        ...current,
        [attachments[0].contentBlockId]: [...(current[attachments[0].contentBlockId] ?? []), ...attachments],
      })),
    onError: (error, { blockId }) =>
      setUploadErrorsByBlockId((current) => ({
        ...current,
        [blockId]: getApiErrorMessage(error),
      })),
    onSettled: (_data, _error, { blockId }) => {
      void invalidateBlocks()
      setUploadProgressByBlockId((current) => {
        const remainingUploads = { ...current }
        delete remainingUploads[blockId]
        return remainingUploads
      })
    },
  })
  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ blockId, attachmentId }: { blockId: string; attachmentId: string }) => deleteBlockAttachment(blockId, attachmentId),
    meta: { successMessage: 'Imagen eliminada correctamente.' },
    onSuccess: (_data, { blockId, attachmentId }) => {
      setAttachmentsByBlockId((current) => ({
        ...current,
        [blockId]: (current[blockId] ?? []).filter((attachment) => attachment.id !== attachmentId),
      }))
      queryClient.setQueryData<ContentBlockResponse[]>(blocksQueryKey, (blocks = []) => blocks.map((block) => block.id === blockId
        ? { ...block, attachments: block.attachments.filter((attachment) => attachment.id !== attachmentId) }
        : block))
    },
    onSettled: invalidateBlocks,
  })

  function startEditing(block: ContentBlockResponse): void {
    setEditingBlockId(block.id)
  }

  function startInsertion(orderIndex: number): void {
    createBlockMutation.reset()
    setEditingBlockId(undefined)
    setInsertionOrderIndex(orderIndex)
  }

  function toggleReviewMode(): void {
    setReviewMode((current) => !current)
    setRevealedAnswerIds(new Set())
  }

  function toggleAnswer(blockId: string): void {
    setRevealedAnswerIds((current) => {
      const next = new Set(current)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }

  function handleBlockDragEnd(event: DragEndEvent): void {
    if (!event.over || event.active.id === event.over.id) return
    const blocks = [...(blocksQuery.data ?? [])].sort((first, second) => first.orderIndex - second.orderIndex)
    const previousIndex = blocks.findIndex((block) => block.id === event.active.id)
    const nextIndex = blocks.findIndex((block) => block.id === event.over?.id)
    if (previousIndex === -1 || nextIndex === -1) return
    reorderBlocksMutation.mutate(arrayMove(blocks, previousIndex, nextIndex))
  }

  function renderInsertionPoint(orderIndex: number): ReactNode {
    return insertionOrderIndex === orderIndex ? <BlockComposer chapterId={chapterId} error={createBlockMutation.error} isPending={createBlockMutation.isPending} key={`${chapterId}:${orderIndex}`} onResetError={createBlockMutation.reset} onSubmit={(request, files) => createBlockMutation.mutate({ files, request })} orderIndex={orderIndex} /> : <InsertionDivider onInsert={() => startInsertion(orderIndex)} />
  }

  function renderBlock(block: ContentBlockResponse): ReactNode {
    const isEditing = editingBlockId === block.id
    const blockClassName = 'document-block group rounded-lg px-3 py-4 transition hover:bg-white/60'

    if (block.type === 'NOTE')
      return (
        <article className={blockClassName}>
          {isEditing ? (
            <TextBlockEditor
              draftKey={editDraftKey(chapterId, block.id)}
              error={updateBlockMutation.error}
              initialContent={block.content ?? ''}
              inputClassName="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              inputLabel="Editar nota"
              isPending={updateBlockMutation.isPending}
              onCancel={() => setEditingBlockId(undefined)}
              onSubmit={(content) => updateBlockMutation.mutate({ blockId: block.id, request: toNoteRequest(content, block.orderIndex) })}
              submitLabel="Guardar cambios"
            />
          ) : (
            <>
              <p className="whitespace-pre-wrap text-base leading-7 text-slate-800">{block.content}</p>
              <BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} />
            </>
          )}
        </article>
      )

    if (block.type === 'HEADING') {
      const headingLevel = block.headingLevel ?? 'SUBTITLE'
      const HeadingTag = headingLevel === 'TITLE' ? 'h3' : 'h4'
      return (
        <article className={blockClassName}>
          {isEditing ? (
            <TextBlockEditor
              draftKey={editDraftKey(chapterId, block.id)}
              error={updateBlockMutation.error}
              initialContent={block.content ?? ''}
              inputClassName={`w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200 ${headingLevel === 'TITLE' ? 'min-h-24 text-2xl font-semibold' : 'min-h-20 text-xl font-semibold'}`}
              inputLabel={headingLevel === 'TITLE' ? 'Editar título' : 'Editar subtítulo'}
              isPending={updateBlockMutation.isPending}
              onCancel={() => setEditingBlockId(undefined)}
              onSubmit={(content) => updateBlockMutation.mutate({ blockId: block.id, request: toHeadingRequest(content, headingLevel, block.orderIndex) })}
              submitLabel="Guardar cambios"
            />
          ) : (
            <>
              <HeadingTag className={headingLevel === 'TITLE' ? 'text-2xl font-semibold leading-tight text-slate-900' : 'text-xl font-semibold leading-snug text-slate-800'}>{block.content}</HeadingTag>
              <BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} />
            </>
          )}
        </article>
      )
    }

    if (block.type === 'STEP_LIST') {
      const stepList = block.stepList ?? {
        stepStyle: 'NUMERIC' as const,
        steps: [],
      }
      const ListTag = stepList.stepStyle === 'BULLETED' ? 'ul' : 'ol'
      return (
        <article className={blockClassName}>
          {isEditing ? (
            <StepListEditor
              draftKey={editDraftKey(chapterId, block.id)}
              initialStepList={stepList}
              isPending={updateBlockMutation.isPending}
              onCancel={() => setEditingBlockId(undefined)}
              onSubmit={(updatedStepList) =>
                updateBlockMutation.mutate({
                  blockId: block.id,
                  request: toStepListRequest(updatedStepList, block.orderIndex),
                })
              }
            />
          ) : (
            <>
              <ListTag
                className="ml-5 space-y-2 text-base leading-7 text-slate-800"
                style={{
                  listStyleType: stepList.stepStyle === 'BULLETED' ? 'disc' : stepList.stepStyle === 'ALPHABETIC' ? 'upper-alpha' : 'decimal',
                }}
              >
                {stepList.steps.map((step, index) => (
                  <li className="pl-1" key={`${block.id}-${index}`}>
                    {step}
                  </li>
                ))}
              </ListTag>
              <BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} />
            </>
          )}
        </article>
      )
    }

    if (block.type === 'CODE') {
      const codeLanguage = codeLanguages.includes(block.codeLanguage as CodeFormValues['codeLanguage']) ? (block.codeLanguage as CodeFormValues['codeLanguage']) : 'javascript'
      return (
        <article className={blockClassName}>
          {isEditing ? (
            <CodeEditor
              draftKey={editDraftKey(chapterId, block.id)}
              initialCodeLanguage={codeLanguage}
              initialContent={block.content ?? ''}
              initialDescription={block.description ?? ''}
              isPending={updateBlockMutation.isPending}
              onCancel={() => setEditingBlockId(undefined)}
              onSubmit={({ content, codeLanguage: updatedCodeLanguage, description }) =>
                updateBlockMutation.mutate({
                  blockId: block.id,
                  request: toCodeRequest(content, updatedCodeLanguage, description, block.orderIndex),
                })
              }
            />
          ) : (
            <>
              <BlockDescription description={block.description} />
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{block.codeLanguage ?? 'text'}</p>
              <SyntaxHighlighter
                language={block.codeLanguage ?? 'text'}
                style={oneDark}
                customStyle={{
                  borderRadius: '0.375rem',
                  margin: 0,
                  padding: '1rem',
                }}
                showLineNumbers
              >
                {block.content ?? ''}
              </SyntaxHighlighter>
              <BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} />
            </>
          )}
        </article>
      )
    }

    if (block.type === 'MATH')
      return (
        <article className={blockClassName}>
          {isEditing ? (
            <MathEditor
              draftKey={editDraftKey(chapterId, block.id)}
              initialContent={block.content ?? ''}
              initialDescription={block.description ?? ''}
              isPending={updateBlockMutation.isPending}
              onCancel={() => setEditingBlockId(undefined)}
              onSubmit={({ content, description }) =>
                updateBlockMutation.mutate({
                  blockId: block.id,
                  request: toMathRequest(content, description, block.orderIndex),
                })
              }
            />
          ) : (
            <>
              <BlockDescription description={block.description} />
              <div className="overflow-x-auto rounded-md bg-white/70 p-4 text-slate-900">
                <BlockMath math={block.content ?? ''} />
              </div>
              <BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} />
            </>
          )}
        </article>
      )

    if (block.type === 'EXERCISE')
      return (
        <article className={blockClassName}>
          {isEditing ? (
            <ExerciseEditor
              draftKey={editDraftKey(chapterId, block.id)}
              initialContent={block.content ?? ''}
              initialDescription={block.description ?? ''}
              isPending={updateBlockMutation.isPending}
              onCancel={() => setEditingBlockId(undefined)}
              onSubmit={({ content, description }) =>
                updateBlockMutation.mutate({
                  blockId: block.id,
                  request: toExerciseRequest(content, description, block.orderIndex),
                })
              }
            />
          ) : (
            <>
              <BlockDescription description={block.description} />
              <label className="flex cursor-pointer items-start gap-3">
                <input className="mt-1 size-4 accent-slate-900" checked={block.resolved} disabled={toggleExerciseMutation.isPending} onChange={() => toggleExerciseMutation.mutate(block.id)} type="checkbox" />
                <span className={`whitespace-pre-wrap text-base leading-7 ${block.resolved ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{block.content}</span>
              </label>
              {toggleExerciseMutation.isError && (
                <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {getApiErrorMessage(toggleExerciseMutation.error)}
                </p>
              )}
              <BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} />
            </>
          )}
        </article>
      )

    if (block.type === 'QUESTION_ANSWER') {
      const answerIsVisible = !reviewMode || revealedAnswerIds.has(block.id)
      return (
        <article className={blockClassName}>
          {isEditing ? (
            <QuestionAnswerEditor
              draftKey={editDraftKey(chapterId, block.id)}
              initialAnswer={block.answer ?? ''}
              initialQuestion={block.content ?? ''}
              isPending={updateBlockMutation.isPending}
              onCancel={() => setEditingBlockId(undefined)}
              onSubmit={({ question, answer }) =>
                updateBlockMutation.mutate({
                  blockId: block.id,
                  request: toQuestionAnswerRequest(question, answer, block.orderIndex),
                })
              }
            />
          ) : (
            <>
              <div className="question-answer-card rounded-lg border p-4">
                <p className="question-answer-label text-xs font-semibold uppercase tracking-wide">Pregunta</p>
                <p className="question-answer-question mt-2 whitespace-pre-wrap text-lg font-semibold leading-7">{block.content}</p>
                {answerIsVisible ? (
                  <div className="question-answer-response mt-4 border-l-4 pl-4">
                    <p className="question-answer-label text-xs font-semibold uppercase tracking-wide">Respuesta</p>
                    <p className="question-answer-text mt-2 whitespace-pre-wrap text-base leading-7">{block.answer}</p>
                    {reviewMode && <button className="question-answer-action mt-3 text-sm font-semibold underline" onClick={() => toggleAnswer(block.id)} type="button">Ocultar respuesta</button>}
                  </div>
                ) : (
                  <button className="question-answer-reveal mt-4 rounded-md border px-4 py-2 text-sm font-semibold" onClick={() => toggleAnswer(block.id)} type="button">Mostrar respuesta</button>
                )}
              </div>
              <BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} />
            </>
          )}
        </article>
      )
    }

    if (block.type === 'IMAGE') {
      const attachments = [...block.attachments, ...(attachmentsByBlockId[block.id] ?? [])].filter((attachment, index, allAttachments) => allAttachments.findIndex((current) => current.id === attachment.id) === index)
      return (
        <article className={blockClassName}>
          {isEditing ? (
            <DescriptionEditor
              draftKey={editDraftKey(chapterId, block.id)}
              initialDescription={block.description ?? ''}
              isPending={updateBlockMutation.isPending}
              label="Descripción de la imagen (opcional)"
              onCancel={() => setEditingBlockId(undefined)}
              onSubmit={(description) =>
                updateBlockMutation.mutate({
                  blockId: block.id,
                  request: toImageRequest(description, block.orderIndex),
                })
              }
            />
          ) : (
            <>
              <BlockDescription description={block.description} />
              <ImageBlock
                attachments={attachments}
                blockId={block.id}
                deleteError={deleteAttachmentMutation.variables?.blockId === block.id ? deleteAttachmentMutation.error : undefined}
                deletingAttachmentId={deleteAttachmentMutation.isPending && deleteAttachmentMutation.variables?.blockId === block.id ? deleteAttachmentMutation.variables.attachmentId : undefined}
                errorMessage={uploadErrorsByBlockId[block.id]}
                isUploading={uploadProgressByBlockId[block.id] !== undefined}
                onDelete={(attachment) => deleteAttachmentMutation.mutateAsync({ blockId: block.id, attachmentId: attachment.id })}
                onUpload={(files) => uploadAttachmentMutation.mutate({ blockId: block.id, files })}
                progress={uploadProgressByBlockId[block.id]}
              />
              <BlockActions onDelete={() => setBlockToDelete(block)} onEdit={() => startEditing(block)} />
            </>
          )}
        </article>
      )
    }

    return <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">[unsupported block type]</div>
  }

  const orderedBlocks = [...(blocksQuery.data ?? [])].sort((first, second) => first.orderIndex - second.orderIndex)
  const draggedBlock = orderedBlocks.find((block) => block.id === draggedBlockId)
  const endOrderIndex = orderedBlocks.reduce((highest, block) => Math.max(highest, block.orderIndex), -1) + 1
  const questionCount = orderedBlocks.filter((block) => block.type === 'QUESTION_ANSWER').length
  const revealedAnswerCount = orderedBlocks.filter((block) => block.type === 'QUESTION_ANSWER' && revealedAnswerIds.has(block.id)).length

  useEffect(() => {
    if (!blocksQuery.data || insertionOrderIndex === undefined || scrolledChapterIdRef.current === chapterId) return
    scrolledChapterIdRef.current = chapterId
    const frameId = window.requestAnimationFrame(() => composerEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }))
    return () => window.cancelAnimationFrame(frameId)
  }, [blocksQuery.data, chapterId, insertionOrderIndex])

  return (
    <section className="reading-panel rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-5">
        <div>
          <h2 className="break-words text-xl font-semibold text-slate-900">{chapterTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">Escribe libremente y usa el botón + para insertar contenido en cualquier posición.</p>
        </div>
        {questionCount > 0 && <button aria-pressed={reviewMode} className={`rounded-md px-4 py-2 text-sm font-semibold transition ${reviewMode ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} onClick={toggleReviewMode} type="button">{reviewMode ? 'Salir del repaso' : 'Iniciar repaso'}</button>}
      </header>

      {reviewMode && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status"><span className="font-semibold">Modo de repaso activo.</span> Respuestas reveladas: {revealedAnswerCount} de {questionCount}.</div>}
      {reorderBlocksMutation.isError && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(reorderBlocksMutation.error)}</p>}

      {blocksQuery.isPending && <p className="mt-6 text-sm text-slate-600">Cargando contenido...</p>}
      {blocksQuery.isError && (
        <div className="mt-6 rounded bg-red-50 p-3 text-sm text-red-700" role="alert">
          <p>{getApiErrorMessage(blocksQuery.error)}</p>
          <button className="mt-2 font-semibold underline" onClick={() => blocksQuery.refetch()} type="button">
            Reintentar
          </button>
        </div>
      )}
      {!blocksQuery.isPending && !blocksQuery.isError && (
        <div className="mt-3">
          <DndContext
            collisionDetection={closestCenter}
            onDragCancel={() => setDraggedBlockId(undefined)}
            onDragEnd={(event) => {
              setDraggedBlockId(undefined)
              handleBlockDragEnd(event)
            }}
            onDragStart={(event) => setDraggedBlockId(String(event.active.id))}
            sensors={blockSensors}
          >
            <SortableContext items={orderedBlocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              {orderedBlocks.map((block) => (
                <div key={block.id}>
                  {renderInsertionPoint(block.orderIndex)}
                  <SortableContentBlock blockId={block.id} disabled={editingBlockId !== undefined || reorderBlocksMutation.isPending}>{renderBlock(block)}</SortableContentBlock>
                </div>
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={null}>{draggedBlock ? <ContentBlockDragOverlay block={draggedBlock} /> : null}</DragOverlay>
          </DndContext>
          <div id={`chapter-composer-${chapterId}`} ref={composerEndRef}>{renderInsertionPoint(endOrderIndex)}</div>
        </div>
      )}

      {blockToDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
          <section aria-labelledby="delete-block-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog">
            <h3 className="text-xl font-semibold text-slate-900" id="delete-block-title">
              Eliminar bloque
            </h3>
            <p className="mt-3 text-sm text-slate-600">¿Seguro que quieres eliminar este bloque? Esta acción no se puede deshacer.</p>
            {deleteBlockMutation.isError && (
              <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {getApiErrorMessage(deleteBlockMutation.error)}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={deleteBlockMutation.isPending} onClick={() => setBlockToDelete(undefined)} type="button">
                Cancelar
              </button>
              <button className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:bg-red-400" disabled={deleteBlockMutation.isPending} onClick={() => deleteBlockMutation.mutate(blockToDelete.id)} type="button">
                {deleteBlockMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function BlockActions({ onDelete, onEdit }: { onDelete: () => void; onEdit: () => void }) {
  return (
    <div className="mt-4 flex justify-end gap-3">
      <button className="text-sm font-semibold text-slate-700 underline hover:text-slate-950" onClick={onEdit} type="button">
        Editar
      </button>
      <button className="text-sm font-semibold text-red-700 underline hover:text-red-900" onClick={onDelete} type="button">
        Eliminar
      </button>
    </div>
  )
}
