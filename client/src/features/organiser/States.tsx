import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { Button, GlassCard } from '@/ui'

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError
      ? error.code === 'NOT_FOUND'
        ? "We couldn't find that. It may not exist or may not be yours."
        : error.message
      : 'Something went wrong while loading.'
  return (
    <GlassCard className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-warning" />
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </GlassCard>
  )
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: ReactNode }) {
  return (
    <GlassCard className="flex flex-col items-center gap-2 py-14 text-center">
      <span className="float-bob text-6xl">{emoji}</span>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </GlassCard>
  )
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
