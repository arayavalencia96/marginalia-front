import { zodResolver } from '@hookform/resolvers/zod'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useMemo, useState, type TouchEventHandler } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { createChapter, deleteChapter, getBookChapters, updateChapter } from '../../api/chapters'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'
import type { ChapterRequest, ChapterResponse } from '../../types/chapter'

const ChapterContentPanel = lazy(() => import('../blocks/ChapterContentPanel').then(({ ChapterContentPanel }) => ({ default: ChapterContentPanel })))
const ChapterPagePreview = lazy(() => import('../blocks/ChapterPagePreview').then(({ ChapterPagePreview }) => ({ default: ChapterPagePreview })))

const chapterTitleSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.').max(255, 'El título no puede superar los 255 caracteres.'),
})

type ChapterTitleFormValues = z.infer<typeof chapterTitleSchema>

interface ChapterTreeProps {
  activeMenuChapterId: string | undefined
  chaptersByParentId: Map<string | null, ChapterResponse[]>
  editingChapterId: string | undefined
  expandedChapterIds: Set<string>
  isDragging: boolean
  onCancelEdit: () => void
  onDelete: (chapter: ChapterResponse) => void
  onEdit: (chapter: ChapterResponse) => void
  menuPosition: { left: number; top: number } | undefined
  onOpenMenu: (chapterId: string, anchor: HTMLElement) => void
  onSelect: (chapterId: string) => void
  onStartSubChapter: (chapterId: string) => void
  onToggle: (chapterId: string) => void
  onUpdate: (chapter: ChapterResponse, title: string) => void
  parentChapterId: string | null
  selectedChapterId: string | undefined
}

interface ReorderChaptersMutation {
  changedChapters: ChapterResponse[]
  nextChapters: ChapterResponse[]
}

function containerId(parentChapterId: string | null): string {
  return `container:${parentChapterId ?? 'root'}`
}

function groupChaptersByParent(chapters: ChapterResponse[]): Map<string | null, ChapterResponse[]> {
  const chaptersByParentId = new Map<string | null, ChapterResponse[]>()
  const chapterIds = new Set(chapters.map((chapter) => chapter.id))

  for (const chapter of chapters) {
    const parentChapterId = chapter.parentChapterId && chapterIds.has(chapter.parentChapterId)
      ? chapter.parentChapterId
      : null
    const siblings = chaptersByParentId.get(parentChapterId) ?? []
    siblings.push(chapter)
    chaptersByParentId.set(parentChapterId, siblings)
  }

  for (const siblings of chaptersByParentId.values()) {
    siblings.sort((first, second) => first.orderIndex - second.orderIndex)
  }

  return chaptersByParentId
}

function DropAsChildZone({ chapterId }: { chapterId: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `inside:${chapterId}`,
    data: { parentChapterId: chapterId, type: 'inside' },
  })

  return (
    <div
      className={`ml-9 mt-1 rounded border border-dashed px-2 py-1 text-xs ${isOver ? 'border-slate-700 bg-slate-100 text-slate-900' : 'border-slate-300 text-slate-500'}`}
      ref={setNodeRef}
    >
      Soltar para convertir en subcapítulo
    </div>
  )
}

function SortableChapterNode({ chapter, props }: { chapter: ChapterResponse; props: ChapterTreeProps }) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: chapter.id })
  const { onTouchStart, ...mouseListeners } = listeners ?? {}
  const touchListener = onTouchStart as TouchEventHandler<HTMLDivElement> | undefined
  const renameForm = useForm<ChapterTitleFormValues>({ resolver: zodResolver(chapterTitleSchema) })
  const hasChildren = (props.chaptersByParentId.get(chapter.id)?.length ?? 0) > 0
  const isEditing = props.editingChapterId === chapter.id
  const isExpanded = props.expandedChapterIds.has(chapter.id)
  const isMenuOpen = props.activeMenuChapterId === chapter.id
  const isSelected = props.selectedChapterId === chapter.id

  useEffect(() => {
    if (isEditing) renameForm.reset({ title: chapter.title })
  }, [chapter.title, isEditing, renameForm])

  return (
    <li
      className={isDragging ? 'rounded-lg bg-amber-50/70 ring-2 ring-inset ring-amber-400' : ''}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div
        className={`flex min-w-0 items-center gap-1 ${isDragging ? 'opacity-20' : ''}`}
        onTouchStart={touchListener}
        onContextMenu={(event) => {
          event.preventDefault()
          props.onOpenMenu(chapter.id, event.currentTarget)
        }}
      >
        <button
          aria-label={`Reordenar ${chapter.title}`}
          className="grid size-7 shrink-0 cursor-grab place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900 active:cursor-grabbing"
          disabled={isEditing}
          type="button"
          {...attributes}
          {...mouseListeners}
        >
          ⠿
        </button>
        {hasChildren ? (
          <button
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Contraer ${chapter.title}` : `Expandir ${chapter.title}`}
            className="grid size-7 shrink-0 place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => props.onToggle(chapter.id)}
            type="button"
          >
            <span aria-hidden="true">{isExpanded ? '⌄' : '›'}</span>
          </button>
        ) : <span className="size-7 shrink-0" />}

        {isEditing ? (
          <form className="flex min-w-0 flex-1 items-center gap-1" onSubmit={renameForm.handleSubmit((values) => props.onUpdate(chapter, values.title))}>
            <input autoFocus className="min-w-0 flex-1 rounded border border-slate-400 px-2 py-1 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300" aria-label={`Renombrar ${chapter.title}`} {...renameForm.register('title')} />
            <button className="rounded px-1.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100" type="submit">Guardar</button>
            <button className="rounded px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-100" onClick={props.onCancelEdit} type="button">Cancelar</button>
          </form>
        ) : (
          <button
            aria-label={chapter.title}
            className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm transition ${isSelected ? 'bg-slate-900 font-medium text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'}`}
            onClick={() => props.onSelect(chapter.id)}
            title={chapter.title}
            type="button"
          >
            <span className="block break-words sm:truncate">{chapter.title}</span>
          </button>
        )}

        {!isEditing && (
          <div className="relative">
            <button aria-expanded={isMenuOpen} aria-label={`Acciones para ${chapter.title}`} className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={(event) => props.onOpenMenu(chapter.id, event.currentTarget)} type="button">⋯</button>
            {isMenuOpen && props.menuPosition && createPortal(
              <div className="fixed z-[70] w-40 rounded-md border border-slate-200 bg-white py-1 shadow-xl" style={{ left: props.menuPosition.left, top: props.menuPosition.top }}>
                <button className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100" onClick={() => props.onStartSubChapter(chapter.id)} type="button">Agregar subcapítulo</button>
                <button className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100" onClick={() => props.onEdit(chapter)} type="button">Renombrar</button>
                <button className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50" onClick={() => props.onDelete(chapter)} type="button">Eliminar</button>
              </div>,
              document.body,
            )}
          </div>
        )}
      </div>
      {isEditing && renameForm.formState.errors.title && <p className="ml-16 mt-1 text-xs text-red-600">{renameForm.formState.errors.title.message}</p>}
      {props.isDragging && <DropAsChildZone chapterId={chapter.id} />}
      {hasChildren && isExpanded && <ChapterTree {...props} parentChapterId={chapter.id} />}
    </li>
  )
}

function ChapterTree(props: ChapterTreeProps) {
  const chapters = props.chaptersByParentId.get(props.parentChapterId) ?? []
  const { isOver, setNodeRef } = useDroppable({
    id: containerId(props.parentChapterId),
    data: { parentChapterId: props.parentChapterId, type: 'container' },
  })

  return (
    <SortableContext items={chapters.map((chapter) => chapter.id)} strategy={verticalListSortingStrategy}>
      <ul
        className={`${props.parentChapterId ? 'ml-8 border-l border-slate-200 pl-2' : 'space-y-1'} ${isOver ? 'rounded bg-slate-50' : ''}`}
        ref={setNodeRef}
      >
        {chapters.map((chapter) => <SortableChapterNode chapter={chapter} key={chapter.id} props={props} />)}
        {props.isDragging && chapters.length === 0 && <li className="ml-2 rounded border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500">Soltar aquí</li>}
      </ul>
    </SortableContext>
  )
}

export function BookDetailPage() {
  const { bookId } = useParams()
  const queryClient = useQueryClient()
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 350, tolerance: 8 } }),
  )
  const [activeMenuChapterId, setActiveMenuChapterId] = useState<string>()
  const [activeMenuPosition, setActiveMenuPosition] = useState<{ left: number; top: number }>()
  const [createParentChapterId, setCreateParentChapterId] = useState<string | null | undefined>()
  const [draggedChapterId, setDraggedChapterId] = useState<string>()
  const [editingChapterId, setEditingChapterId] = useState<string>()
  const [expandedChapterIds, setExpandedChapterIds] = useState<Set<string>>(new Set())
  const [selectedChapterId, setSelectedChapterId] = useState<string>()
  const [chapterToDelete, setChapterToDelete] = useState<ChapterResponse>()
  const createForm = useForm<ChapterTitleFormValues>({ resolver: zodResolver(chapterTitleSchema) })
  const chaptersQueryKey = ['books', bookId, 'chapters'] as const
  const chaptersQuery = useQuery({ queryKey: chaptersQueryKey, queryFn: () => getBookChapters(bookId ?? ''), enabled: Boolean(bookId) })
  const chaptersByParentId = useMemo(() => groupChaptersByParent(chaptersQuery.data ?? []), [chaptersQuery.data])

  useEffect(() => {
    const rootChapterIds = (chaptersByParentId.get(null) ?? []).map((chapter) => chapter.id)
    setExpandedChapterIds((current) => new Set([...current, ...rootChapterIds]))
  }, [chaptersByParentId])

  const invalidateChapters = (): Promise<unknown> => queryClient.invalidateQueries({ queryKey: chaptersQueryKey })
  const createChapterMutation = useMutation({
    mutationFn: ({ parentChapterId, title }: { parentChapterId: string | null; title: string }) => {
      const siblings = chaptersByParentId.get(parentChapterId) ?? []
      const orderIndex = siblings.reduce((highest, chapter) => Math.max(highest, chapter.orderIndex), -1) + 1
      return createChapter(bookId ?? '', { title, parentChapterId, orderIndex })
    },
    meta: { successMessage: 'Sección creada correctamente.' },
    onSuccess: (chapter) => {
      if (chapter.parentChapterId) setExpandedChapterIds((current) => new Set([...current, chapter.parentChapterId as string]))
      closeCreateChapter()
    },
    onSettled: invalidateChapters,
  })
  const updateChapterMutation = useMutation({
    mutationFn: ({ chapter, title }: { chapter: ChapterResponse; title: string }) => updateChapter(chapter.id, { title, parentChapterId: chapter.parentChapterId, orderIndex: chapter.orderIndex } satisfies ChapterRequest),
    meta: { successMessage: 'Sección actualizada correctamente.' },
    onSuccess: () => setEditingChapterId(undefined),
    onSettled: invalidateChapters,
  })
  const deleteChapterMutation = useMutation({
    mutationFn: deleteChapter,
    meta: { successMessage: 'Sección eliminada correctamente.' },
    onSuccess: (_response, chapterId) => {
      if (selectedChapterId === chapterId) setSelectedChapterId(undefined)
      setChapterToDelete(undefined)
      setActiveMenuChapterId(undefined)
    },
    onSettled: invalidateChapters,
  })
  const reorderChapterMutation = useMutation({
    mutationFn: ({ changedChapters }: ReorderChaptersMutation) => Promise.all(changedChapters.map((chapter) => updateChapter(chapter.id, {
      title: chapter.title,
      parentChapterId: chapter.parentChapterId,
      orderIndex: chapter.orderIndex,
    }))),
    meta: { successMessage: 'Orden de las secciones actualizado.' },
    onMutate: async ({ nextChapters }) => {
      await queryClient.cancelQueries({ queryKey: chaptersQueryKey })
      const previousChapters = queryClient.getQueryData<ChapterResponse[]>(chaptersQueryKey)
      queryClient.setQueryData(chaptersQueryKey, nextChapters)
      return { previousChapters }
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(chaptersQueryKey, context?.previousChapters),
    onSettled: invalidateChapters,
  })

  function closeCreateChapter(): void {
    setCreateParentChapterId(undefined)
    createForm.reset()
  }

  function openCreateChapter(parentChapterId: string | null): void {
    setActiveMenuChapterId(undefined)
    createForm.reset({ title: '' })
    setCreateParentChapterId(parentChapterId)
  }

  function toggleChapter(chapterId: string): void {
    setExpandedChapterIds((current) => {
      const next = new Set(current)
      if (next.has(chapterId)) next.delete(chapterId)
      else next.add(chapterId)
      return next
    })
  }

  function toggleChapterMenu(chapterId: string, anchor: HTMLElement): void {
    if (activeMenuChapterId === chapterId) {
      setActiveMenuChapterId(undefined)
      setActiveMenuPosition(undefined)
      return
    }
    const bounds = anchor.getBoundingClientRect()
    setActiveMenuChapterId(chapterId)
    setActiveMenuPosition({
      left: Math.max(8, Math.min(window.innerWidth - 168, bounds.right - 160)),
      top: Math.min(window.innerHeight - 132, bounds.bottom + 4),
    })
  }

  function isDescendant(candidateParentId: string | null, chapterId: string, chapters: ChapterResponse[]): boolean {
    let currentParentId = candidateParentId
    while (currentParentId) {
      if (currentParentId === chapterId) return true
      currentParentId = chapters.find((chapter) => chapter.id === currentParentId)?.parentChapterId ?? null
    }
    return false
  }

  function handleDragEnd(event: DragEndEvent): void {
    setDraggedChapterId(undefined)
    const chapters = chaptersQuery.data ?? []
    const draggedChapter = chapters.find((chapter) => chapter.id === event.active.id)
    if (!draggedChapter || !event.over) return

    const overId = String(event.over.id)
    let targetParentId: string | null
    let targetIndex: number | undefined
    if (overId.startsWith('inside:')) {
      targetParentId = overId.slice('inside:'.length)
    } else if (overId.startsWith('container:')) {
      const parentId = overId.slice('container:'.length)
      targetParentId = parentId === 'root' ? null : parentId
    } else {
      const overChapter = chapters.find((chapter) => chapter.id === overId)
      if (!overChapter) return
      targetParentId = overChapter.parentChapterId
      targetIndex = 0
    }
    if (isDescendant(targetParentId, draggedChapter.id, chapters)) return

    const remainingChapters = chapters.filter((chapter) => chapter.id !== draggedChapter.id)
    const sourceSiblings = remainingChapters.filter((chapter) => chapter.parentChapterId === draggedChapter.parentChapterId)
    const destinationSiblings = draggedChapter.parentChapterId === targetParentId
      ? sourceSiblings
      : remainingChapters.filter((chapter) => chapter.parentChapterId === targetParentId)

    if (targetIndex === undefined) {
      targetIndex = destinationSiblings.length
    } else {
      const overIndex = destinationSiblings.findIndex((chapter) => chapter.id === overId)
      targetIndex = overIndex === -1 ? destinationSiblings.length : overIndex
    }
    destinationSiblings.splice(targetIndex, 0, { ...draggedChapter, parentChapterId: targetParentId })

    const updatedChapters = new Map<string, ChapterResponse>()
    const normalize = (siblings: ChapterResponse[], parentChapterId: string | null): void => {
      siblings.forEach((chapter, orderIndex) => updatedChapters.set(chapter.id, { ...chapter, parentChapterId, orderIndex }))
    }
    normalize(sourceSiblings, draggedChapter.parentChapterId)
    normalize(destinationSiblings, targetParentId)

    const nextChapters = chapters.map((chapter) => updatedChapters.get(chapter.id) ?? chapter)
    const changedChapters = nextChapters.filter((chapter) => {
      const previousChapter = chapters.find((current) => current.id === chapter.id)
      return previousChapter?.orderIndex !== chapter.orderIndex || previousChapter.parentChapterId !== chapter.parentChapterId
    })
    if (changedChapters.length > 0) reorderChapterMutation.mutate({ changedChapters, nextChapters })
  }

  if (!bookId) return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">El identificador del libro no es válido.</p></main>

  const createParentTitle = createParentChapterId ? chaptersQuery.data?.find((chapter) => chapter.id === createParentChapterId)?.title : undefined
  const selectedChapter = chaptersQuery.data?.find((chapter) => chapter.id === selectedChapterId)
  const draggedChapter = chaptersQuery.data?.find((chapter) => chapter.id === draggedChapterId)
  const treeProps: Omit<ChapterTreeProps, 'parentChapterId'> = {
    activeMenuChapterId,
    chaptersByParentId,
    editingChapterId,
    expandedChapterIds,
    isDragging: Boolean(draggedChapterId),
    menuPosition: activeMenuPosition,
    onCancelEdit: () => setEditingChapterId(undefined),
    onDelete: (chapter) => { setActiveMenuChapterId(undefined); setChapterToDelete(chapter) },
    onEdit: (chapter) => { setActiveMenuChapterId(undefined); setEditingChapterId(chapter.id) },
    onOpenMenu: toggleChapterMenu,
    onSelect: setSelectedChapterId,
    onStartSubChapter: openCreateChapter,
    onToggle: toggleChapter,
    onUpdate: (chapter, title) => updateChapterMutation.mutate({ chapter, title }),
    selectedChapterId,
  }

  return (
    <main className="book-detail-page mx-auto min-h-screen max-w-[1800px] px-4 py-10 sm:px-6">
      <Link className="text-sm font-medium text-slate-700 underline hover:text-slate-950" to="/books">← Volver a mis libros</Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-semibold tracking-tight text-slate-900">Capítulos</h1><p className="mt-2 text-sm text-slate-600">Arrastra desde ⠿ para reordenar o soltar dentro de un capítulo.</p></div>
        <button className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700" onClick={() => openCreateChapter(null)} type="button">Agregar capítulo</button>
      </div>
      <div className="mt-8 grid min-h-96 items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(32rem,1fr)_22rem]">
        <aside className="chapter-sidebar rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Árbol de capítulos">
          <h2 className="px-2 pb-3 text-sm font-semibold text-slate-900">Índice</h2>
          {chaptersQuery.isPending && <p className="px-2 text-sm text-slate-600">Cargando capítulos...</p>}
          {chaptersQuery.isError && <div className="px-2 text-sm text-red-700" role="alert"><p>{getApiErrorMessage(chaptersQuery.error)}</p><button className="mt-3 font-semibold underline" onClick={() => chaptersQuery.refetch()} type="button">Reintentar</button></div>}
          {chaptersQuery.data && chaptersQuery.data.length === 0 && <p className="px-2 text-sm text-slate-600">Este libro todavía no tiene capítulos.</p>}
          {reorderChapterMutation.isError && <p className="mx-2 mb-3 rounded bg-red-50 px-2 py-1 text-xs text-red-700" role="alert">{getApiErrorMessage(reorderChapterMutation.error)}</p>}
          {chaptersQuery.data && chaptersQuery.data.length > 0 && (
            <DndContext collisionDetection={closestCenter} onDragCancel={() => setDraggedChapterId(undefined)} onDragEnd={handleDragEnd} onDragStart={(event) => setDraggedChapterId(String(event.active.id))} sensors={sensors}>
              <ChapterTree {...treeProps} parentChapterId={null} />
              <DragOverlay dropAnimation={null}>
                {draggedChapter ? (
                  <div className="pointer-events-none flex w-64 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border-2 border-amber-500 bg-white px-3 py-3 text-slate-900 shadow-2xl">
                    <span aria-hidden="true" className="text-lg text-amber-700">⠿</span>
                    <div className="min-w-0">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-amber-700">Moviendo capítulo</p>
                      <p className="truncate text-sm font-semibold">{draggedChapter.title}</p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </aside>
        {selectedChapterId && selectedChapter
          ? <Suspense fallback={<section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Cargando contenido...</section>}><ChapterContentPanel chapterId={selectedChapterId} chapterTitle={selectedChapter.title} /></Suspense>
          : <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">Selecciona un capítulo del índice para ver su contenido.</section>}
        {selectedChapterId && selectedChapter && <Suspense fallback={<aside className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 lg:col-start-2 xl:col-start-auto">Preparando vista previa...</aside>}><ChapterPagePreview chapterId={selectedChapterId} chapterTitle={selectedChapter.title} /></Suspense>}
      </div>

      {createParentChapterId !== undefined && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation"><section aria-labelledby="create-chapter-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog"><h2 className="text-xl font-semibold text-slate-900" id="create-chapter-title">{createParentChapterId ? 'Agregar subcapítulo' : 'Agregar capítulo'}</h2>{createParentTitle && <p className="mt-1 text-sm text-slate-600">Dentro de: {createParentTitle}</p>}<form className="mt-6 space-y-4" noValidate onSubmit={createForm.handleSubmit(({ title }) => createChapterMutation.mutate({ title, parentChapterId: createParentChapterId }))}><div><label className="block text-sm font-medium text-slate-700" htmlFor="chapter-title">Título</label><input autoFocus className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200" id="chapter-title" aria-invalid={Boolean(createForm.formState.errors.title)} {...createForm.register('title')} />{createForm.formState.errors.title && <p className="mt-1 text-sm text-red-600">{createForm.formState.errors.title.message}</p>}</div>{createChapterMutation.isError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(createChapterMutation.error)}</p>}<div className="flex justify-end gap-3"><button className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={createChapterMutation.isPending} onClick={closeCreateChapter} type="button">Cancelar</button><button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-400" disabled={createChapterMutation.isPending} type="submit">{createChapterMutation.isPending ? 'Creando...' : 'Crear'}</button></div></form></section></div>}

      {chapterToDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation"><section aria-labelledby="delete-chapter-title" aria-modal="true" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog"><h2 className="text-xl font-semibold text-slate-900" id="delete-chapter-title">Eliminar capítulo</h2><p className="mt-3 text-sm text-slate-600">¿Seguro que quieres eliminar “{chapterToDelete.title}”? Esta acción no se puede deshacer.</p>{deleteChapterMutation.isError && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{getApiErrorMessage(deleteChapterMutation.error)}</p>}<div className="mt-6 flex justify-end gap-3"><button className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" disabled={deleteChapterMutation.isPending} onClick={() => setChapterToDelete(undefined)} type="button">Cancelar</button><button className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:bg-red-400" disabled={deleteChapterMutation.isPending} onClick={() => deleteChapterMutation.mutate(chapterToDelete.id)} type="button">{deleteChapterMutation.isPending ? 'Eliminando...' : 'Eliminar'}</button></div></section></div>}
    </main>
  )
}
