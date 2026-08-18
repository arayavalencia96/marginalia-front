import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getApiErrorMessage } from './getApiErrorMessage'

interface MutationToastMeta extends Record<string, unknown> {
  pendingMessage?: string
  successMessage?: string
}

/**
 * Shared TanStack Query client used to cache and coordinate API requests.
 */
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onMutate: (_variables, mutation) => {
      const meta = mutation.meta as MutationToastMeta | undefined
      if (meta?.pendingMessage) toast.info(meta.pendingMessage)
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      const meta = mutation.meta as MutationToastMeta | undefined
      if (meta?.successMessage) toast.success(meta.successMessage)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  }),
})
