import { useQuery } from '@tanstack/react-query'
import { BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import { getChapterBlocks } from '../../api/contentBlocks'
import type { ContentBlockResponse } from '../../types/contentBlock'

function PreviewBlock({ block }: { block: ContentBlockResponse }) {
  if (block.type === 'HEADING') {
    return block.headingLevel === 'TITLE'
      ? <h3 className="mt-5 text-base font-bold leading-tight">{block.content}</h3>
      : <h4 className="mt-4 text-sm font-bold leading-tight">{block.content}</h4>
  }
  if (block.type === 'NOTE') return <p className="whitespace-pre-wrap text-[10px] leading-[1.55]">{block.content}</p>
  if (block.type === 'STEP_LIST') {
    const List = block.stepList?.stepStyle === 'BULLETED' ? 'ul' : 'ol'
    return (
      <List className="ml-4 space-y-1 text-[10px] leading-[1.5]" style={{ listStyleType: block.stepList?.stepStyle === 'BULLETED' ? 'disc' : block.stepList?.stepStyle === 'ALPHABETIC' ? 'upper-alpha' : 'decimal' }}>
        {block.stepList?.steps.map((step, index) => <li key={`${block.id}-${index}`}>{step}</li>)}
      </List>
    )
  }
  if (block.type === 'CODE') {
    return (
      <div>
        {block.description && <p className="mb-2 whitespace-pre-wrap text-[10px] leading-[1.5]">{block.description}</p>}
        <p className="mb-1 text-[7px] font-bold uppercase tracking-wide text-slate-500">{block.codeLanguage ?? 'text'}</p>
        <pre className="overflow-hidden rounded bg-slate-900 p-2 text-[8px] leading-[1.45] text-slate-100"><code>{block.content}</code></pre>
      </div>
    )
  }
  if (block.type === 'MATH') {
    return (
      <div>
        {block.description && <p className="mb-2 whitespace-pre-wrap text-[10px] leading-[1.5]">{block.description}</p>}
        <div className="overflow-hidden rounded bg-slate-50 px-2 py-1 text-[10px]"><BlockMath math={block.content ?? ''} /></div>
      </div>
    )
  }
  if (block.type === 'EXERCISE') {
    return (
      <div>
        {block.description && <p className="mb-2 whitespace-pre-wrap text-[10px] leading-[1.5]">{block.description}</p>}
        <p className="whitespace-pre-wrap text-[10px] leading-[1.5]"><span aria-hidden="true">{block.resolved ? '☑' : '☐'}</span> {block.content}</p>
      </div>
    )
  }
  if (block.type === 'QUESTION_ANSWER') {
    return (
      <div className="rounded border border-slate-200 p-2">
        <p className="text-[7px] font-bold uppercase tracking-wide text-slate-500">Pregunta</p>
        <p className="mt-1 whitespace-pre-wrap text-[10px] font-bold leading-[1.5]">{block.content}</p>
        <p className="mt-2 text-[7px] font-bold uppercase tracking-wide text-slate-500">Respuesta</p>
        <p className="mt-1 whitespace-pre-wrap text-[10px] leading-[1.5]">{block.answer}</p>
      </div>
    )
  }
  if (block.type === 'IMAGE') {
    return (
      <div>
        {block.description && <p className="mb-2 whitespace-pre-wrap text-[10px] leading-[1.5]">{block.description}</p>}
        <div className={`grid gap-2 ${block.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {block.attachments.map((attachment, index) => <img alt={`Imagen ${index + 1} de la vista previa`} className="mx-auto max-h-40 max-w-full object-contain" key={attachment.id} src={attachment.url} />)}
        </div>
      </div>
    )
  }
  return null
}

export function ChapterPagePreview({ chapterId, chapterTitle }: { chapterId: string; chapterTitle: string }) {
  const blocksQuery = useQuery({
    queryKey: ['chapters', chapterId, 'blocks'],
    queryFn: () => getChapterBlocks(chapterId),
  })
  const blocks = [...(blocksQuery.data ?? [])].sort((first, second) => first.orderIndex - second.orderIndex)

  return (
    <aside className="pdf-preview-panel self-start xl:sticky xl:top-24" aria-label="Vista previa del capítulo en PDF">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Vista previa PDF</h2>
          <p className="mt-0.5 text-xs text-slate-500">Capítulo seleccionado</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">A4</span>
      </div>
      <div className="pdf-preview-paper mx-auto w-full overflow-hidden bg-white text-slate-900 shadow-xl" role="document">
        <header className="border-b border-slate-200 pb-3">
          <p className="text-[7px] font-bold uppercase tracking-[0.18em] text-slate-500">Marginalia</p>
          <h3 className="mt-2 break-words font-serif text-lg font-bold leading-tight">{chapterTitle}</h3>
        </header>
        <div className="mt-4 space-y-3">
          {blocksQuery.isPending && <p className="text-[10px] text-slate-500">Preparando vista previa...</p>}
          {blocksQuery.isError && <p className="text-[10px] text-red-700">No se pudo generar la vista previa.</p>}
          {!blocksQuery.isPending && !blocksQuery.isError && blocks.length === 0 && <p className="text-[10px] italic text-slate-500">Este capítulo todavía no tiene anotaciones.</p>}
          {blocks.map((block) => <PreviewBlock block={block} key={block.id} />)}
        </div>
      </div>
    </aside>
  )
}
