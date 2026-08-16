import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { createBook, getBooks } from '../../api/books'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorMessage } from '../../lib/getApiErrorMessage'
import { bookTopics, type BookRequest, type BookResponse, type BookTopic } from '../../types/book'

const booksQueryKey = ['books'] as const

const topicLabels: Record<BookTopic, string> = {
  PROGRAMMING: 'Programación',
  MATH: 'Matemática',
  SCIENCE: 'Ciencia',
  HISTORY: 'Historia',
  OTHER: 'Otro',
}

const bookSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio.').max(255, 'El título no puede superar los 255 caracteres.'),
  author: z.string().trim().min(1, 'El autor es obligatorio.').max(255, 'El autor no puede superar los 255 caracteres.'),
  topic: z.enum(bookTopics, { message: 'Selecciona un tema.' }),
})

type BookFormValues = z.infer<typeof bookSchema>

interface CreateBookContext {
  previousBooks: BookResponse[] | undefined
  temporaryId: string
}

export function BooksListPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: { topic: 'OTHER' },
  })

  const booksQuery = useQuery({
    queryKey: booksQueryKey,
    queryFn: getBooks,
  })

  const createBookMutation = useMutation<BookResponse, Error, BookRequest, CreateBookContext>({
    mutationFn: createBook,
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: booksQueryKey })
      const previousBooks = queryClient.getQueryData<BookResponse[]>(booksQueryKey)
      const temporaryId = crypto.randomUUID()
      const optimisticBook: BookResponse = {
        ...request,
        id: temporaryId,
        userId: user?.id ?? '',
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<BookResponse[]>(booksQueryKey, (books = []) => [optimisticBook, ...books])
      return { previousBooks, temporaryId }
    },
    onError: (_error, _request, context) => {
      queryClient.setQueryData(booksQueryKey, context?.previousBooks)
    },
    onSuccess: (createdBook, _request, context) => {
      queryClient.setQueryData<BookResponse[]>(booksQueryKey, (books = []) =>
        books.map((book) => (book.id === context.temporaryId ? createdBook : book)),
      )
      closeCreateModal()
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: booksQueryKey }),
  })

  function closeCreateModal(): void {
    setIsCreateModalOpen(false)
    reset({ title: '', author: '', topic: 'OTHER' })
  }

  const onSubmit = (values: BookFormValues): void => {
    createBookMutation.mutate(values)
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Mis libros</h1>
          <p className="mt-2 text-sm text-slate-600">Organiza tus anotaciones por libro y tema.</p>
        </div>
        <button
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          onClick={() => setIsCreateModalOpen(true)}
          type="button"
        >
          Nuevo libro
        </button>
      </div>

      {booksQuery.isPending && <p className="mt-10 text-sm text-slate-600">Cargando libros...</p>}

      {booksQuery.isError && (
        <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <p>{getApiErrorMessage(booksQuery.error)}</p>
          <button className="mt-3 font-semibold underline" onClick={() => booksQuery.refetch()} type="button">
            Reintentar
          </button>
        </div>
      )}

      {booksQuery.data && booksQuery.data.length === 0 && (
        <section className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Todavía no tienes libros</h2>
          <p className="mt-2 text-sm text-slate-600">Crea el primero para empezar a organizar tus apuntes.</p>
        </section>
      )}

      {booksQuery.data && booksQuery.data.length > 0 && (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Lista de libros">
          {booksQuery.data.map((book) => (
            <Link
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400"
              key={book.id}
              to={`/books/${book.id}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{topicLabels[book.topic]}</p>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{book.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{book.author}</p>
            </Link>
          ))}
        </section>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation">
          <section
            aria-labelledby="create-book-title"
            aria-modal="true"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900" id="create-book-title">
                  Nuevo libro
                </h2>
                <p className="mt-1 text-sm text-slate-600">Agrega los datos básicos para comenzar.</p>
              </div>
              <button
                aria-label="Cerrar"
                className="text-2xl leading-none text-slate-500 hover:text-slate-900"
                disabled={createBookMutation.isPending}
                onClick={closeCreateModal}
                type="button"
              >
                ×
              </button>
            </div>

            <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="book-title">
                  Título
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  id="book-title"
                  aria-invalid={Boolean(errors.title)}
                  {...register('title')}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="book-author">
                  Autor
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  id="book-author"
                  aria-invalid={Boolean(errors.author)}
                  {...register('author')}
                />
                {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="book-topic">
                  Tema
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  id="book-topic"
                  aria-invalid={Boolean(errors.topic)}
                  {...register('topic')}
                >
                  {bookTopics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topicLabels[topic]}
                    </option>
                  ))}
                </select>
                {errors.topic && <p className="mt-1 text-sm text-red-600">{errors.topic.message}</p>}
              </div>

              {createBookMutation.isError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {getApiErrorMessage(createBookMutation.error)}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:text-slate-400"
                  disabled={createBookMutation.isPending}
                  onClick={closeCreateModal}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={createBookMutation.isPending}
                  type="submit"
                >
                  {createBookMutation.isPending ? 'Creando...' : 'Crear libro'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
