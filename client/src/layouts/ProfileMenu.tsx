import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Badge } from '@/ui'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default function ProfileMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-from to-secondary-to p-[2px] transition hover:scale-105"
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-bg-elev text-sm font-semibold">
          {initials(user.fullName || user.username)}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="absolute right-0 top-12 w-72 origin-top-right rounded-lg border border-glass-border bg-bg-elev/95 p-2 shadow-2xl backdrop-blur-xl"
          >
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold">{user.fullName || user.username}</p>
                {user.role && <Badge tone={user.role === 'organiser' ? 'teal' : 'primary'}>{user.role}</Badge>}
              </div>
              <p className="truncate text-sm text-muted">@{user.username}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-success">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Active on this device
              </p>
            </div>
            <div className="my-1 h-px bg-glass-border" />
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted transition hover:bg-white/5 hover:text-danger"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
