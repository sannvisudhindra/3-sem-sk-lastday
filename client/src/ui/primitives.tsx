// Base UI primitives. Working versions for the scaffold; polished in Step 2 (design system).
import { useEffect, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary-from to-primary-to text-[#1A0F0A] shadow-[0_8px_30px_-10px_var(--primary-from)] hover:brightness-110',
  secondary: 'bg-glass border border-glass-border text-text hover:bg-white/10',
  ghost: 'text-muted hover:text-text hover:bg-white/5',
  danger: 'bg-danger text-white hover:brightness-110',
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg bg-bg-elev p-5', className)} {...props} />
}

export function GlassCard({
  className,
  tint,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tint?: string }) {
  return (
    <div
      className={cn('rounded-lg border border-glass-border bg-glass p-5 backdrop-blur-xl', className)}
      style={{
        ...(tint ? { boxShadow: `inset 0 -30px 40px -30px ${tint}` } : null),
        ...style,
      }}
      {...props}
    />
  )
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-white/10 text-text',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  primary: 'bg-primary-from/15 text-primary-to',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeTones[tone], className)}
      {...props}
    />
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open || !onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className={cn('relative w-full max-w-md bg-bg-elev/90', className)}>
        {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
        {children}
      </GlassCard>
    </div>
  )
}

export function Stepper({
  value,
  min = 0,
  max,
  onChange,
}: {
  value: number
  min?: number
  max: number
  onChange(v: number): void
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-md border border-glass-border bg-glass px-2 py-1">
      <button
        className="h-8 w-8 rounded-md text-lg hover:bg-white/10 disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease"
      >
        −
      </button>
      <span className="tabular w-6 text-center font-semibold">{value}</span>
      <button
        className="h-8 w-8 rounded-md text-lg hover:bg-white/10 disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: ReactNode }[]
  value: T
  onChange(v: T): void
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-md border border-glass-border bg-glass p-1', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cn(
            'rounded-[10px] px-4 py-1.5 text-sm font-medium transition',
            t.value === value ? 'bg-white/10 text-text' : 'text-muted hover:text-text',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-white/5', className)} />
}
