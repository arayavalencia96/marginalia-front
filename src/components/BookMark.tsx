interface BookMarkProps {
  className?: string
}

export function BookMark({ className = 'size-8' }: BookMarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 48 48">
      <path d="M8 9.5A5.5 5.5 0 0 1 13.5 4H24v35H13.5A5.5 5.5 0 0 0 8 44.5v-35Z" fill="currentColor" opacity=".9" />
      <path d="M40 9.5A5.5 5.5 0 0 0 34.5 4H24v35h10.5a5.5 5.5 0 0 1 5.5 5.5v-35Z" fill="currentColor" opacity=".55" />
      <path d="M14 12h5M29 12h5M14 18h6M28 18h6" stroke="var(--paper)" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
