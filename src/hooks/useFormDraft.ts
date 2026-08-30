import { useEffect, useState } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

export type DraftStatus = 'idle' | 'restored' | 'saving' | 'saved'

export function useFormDraft<T extends FieldValues>(form: UseFormReturn<T>, storageKey: string): DraftStatus {
  const [status, setStatus] = useState<DraftStatus>('idle')

  useEffect(() => {
    setStatus('idle')
    try {
      const storedDraft = localStorage.getItem(storageKey)
      if (storedDraft) {
        form.reset(JSON.parse(storedDraft) as T)
        setStatus('restored')
      }
    } catch {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        setStatus('idle')
      }
    }
  }, [form, storageKey])

  useEffect(() => {
    let saveTimer: number | undefined
    const subscription = form.watch((values) => {
      setStatus('saving')
      window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(values))
          setStatus('saved')
        } catch {
          setStatus('idle')
        }
      }, 500)
    })

    return () => {
      window.clearTimeout(saveTimer)
      subscription.unsubscribe()
    }
  }, [form, storageKey])

  return status
}

export function removeFormDraft(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    return
  }
}
