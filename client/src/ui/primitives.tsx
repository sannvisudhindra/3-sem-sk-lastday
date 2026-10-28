// Encore design-system primitives ("Midnight Aurora", PRD §8.1).
import {
  useEffect,
  useId,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'

const SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const

// ---------- Button ----------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'btn-shine bg-gradient-to-r from-primary-from to-primary-to text-[#1A0F0A] shadow-[0_10px_30px_-12px_var(--primary-from)] hover:shadow-[0_14px_36px_-10px_var(--primary-from)]',
  teal: 'btn-shine bg-gradient-to-r from-secondary-from to-secondary-to text-[#04131A] shadow-[0_10px_30px_-12px_var(--secondary-from)]',
  secondary: 'border border-glass-border bg-glass text-text backdrop-blur-xl hover:bg-white/10',
  ghost: 'text-muted hover:bg-white/5 hover:text-text',
  danger: 'bg-danger text-white hover:brightness-110',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children?: ReactNode
}) {
  const inactive = disabled || loading
  return (
    <motion.button
      whileHover={inactive ? undefined : { y: -1 }}
      whileTap={inactive ? undefined : { scale: 0.97 }}
      transition={SPRING}
      disabled={inactive}
      className={cn(
        'relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-md font-semibold transition-[background-color,box-shadow,color,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-from/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </motion.button>
  )
}

// ---------- Cards ----------
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg bg-bg-elev p-5', className)} {...props} />
}

/** Frosted glass surface. `tint` adds the coloured bottom glow used on category tiles. */
export function GlassCard({
  className,
  tint,
  interactive = false,
  style,
  ...props
}: HTMLMotionProps<'div'> & { tint?: string; interactive?: boolean }) {
  return (
    <motion.div
      whileHover={interactive ? { y: -4 } : undefined}
      transition={SPRING}
      className={cn(
        'rounded-lg border border-glass-border bg-glass p-5 backdrop-blur-xl',
        interactive && 'cursor-pointer transition-colors hover:border-white/15',
        className,
      )}
      style={{
        ...(tint
          ? { boxShadow: `inset 0 -36px 48px -32px ${tint}, 0 20px 40px -30px ${tint}` }
          : null),
        ...style,
      }}
      {...props}
    />
  )
}

// ---------- Badge ----------
type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'teal'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-white/10 text-text',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  primary: 'bg-primary-from/15 text-primary-to',
  teal: 'bg-secondary-from/15 text-secondary-from',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  )
}

// ---------- Modal ----------
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  /** Omit to make the modal blocking (no backdrop / Esc close). */
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={SPRING}
            className={cn(
              'relative w-full max-w-md rounded-lg border border-glass-border bg-bg-elev/95 p-6 shadow-2xl backdrop-blur-xl',
              className,
            )}
          >
            {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- Inputs ----------
/** Floating-label text input. */
export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <div className="relative">
        <input
          id={inputId}
          placeholder=" "
          aria-invalid={!!error || undefined}
          className={cn(
            'peer h-14 w-full rounded-md border bg-white/[0.03] px-4 pt-5 pb-1.5 text-sm text-text outline-none transition',
            'border-glass-border focus:border-primary-from/70 focus:bg-white/[0.05] focus:ring-4 focus:ring-primary-from/10',
            error && 'border-danger/70 focus:border-danger focus:ring-danger/10',
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted transition-all peer-focus:top-4 peer-focus:text-[11px] peer-focus:text-primary-to peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-[11px]"
        >
          {label}
        </label>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <div className="mt-1.5 text-xs text-muted">{hint}</div>
      ) : null}
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
    <div className="inline-flex items-center gap-2 rounded-md border border-glass-border bg-glass p-1">
      <button
        className="h-8 w-8 rounded-[10px] text-lg transition hover:bg-white/10 disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label="Decrease"
      >
        −
      </button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          className="tabular w-7 text-center font-semibold"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <button
        className="h-8 w-8 rounded-[10px] text-lg transition hover:bg-white/10 disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

/** Segmented control with a sliding pill. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  // T is inferred from `value` only, so onChange can be a typed useState setter.
  tabs: { value: NoInfer<T>; label: ReactNode }[]
  value: T
  onChange: (v: NoInfer<T>) => void
  className?: string
}) {
  const pillId = useId()
  return (
    <div
      className={cn('inline-flex rounded-md border border-glass-border bg-glass p-1', className)}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative flex-1 whitespace-nowrap rounded-[10px] px-4 py-1.5 text-sm font-medium transition-colors',
              active ? 'text-text' : 'text-muted hover:text-text',
            )}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                transition={SPRING}
                className="absolute inset-0 rounded-[10px] bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ---------- Feedback ----------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-white/5', className)} />
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-current/25 border-t-current',
        className,
      )}
    />
  )
}

/** Text with a light sweep, for "Waiting for confirmation…" style states. */
export function ShimmerText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('shimmer-text', className)}>{children}</span>
}

// ---------- Layout ----------
/** Fixed ink background with blurred coral + teal aurora blobs and faint noise. */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}>
      <motion.div
        className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary-from opacity-[0.18] blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-secondary-from opacity-[0.14] blur-[130px]"
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-primary-to opacity-[0.06] blur-[100px]" />
      <div className="noise absolute inset-0 opacity-[0.035]" />
    </div>
  )
}

/** Fade + 8px rise on mount (PRD §8.1 page transition). */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
