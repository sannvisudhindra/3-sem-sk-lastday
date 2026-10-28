// First-time Google users pick a role once (PRD §1.2).
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/types'
import { AuroraBackground, GlassCard, Spinner } from '@/ui'

const OPTIONS: { role: Role; emoji: string; title: string; text: string; tint: string }[] = [
  { role: 'customer', emoji: '🎟️', title: 'I want to book', text: 'Discover events, pick seats and get tickets.', tint: 'var(--tint-coral)' },
  { role: 'organiser', emoji: '🎪', title: 'I want to host', text: 'Choose a venue, set prices and track sales.', tint: 'var(--tint-teal)' },
]

export default function RoleOnboardingPage() {
  const { user, chooseRole } = useAuth()
  const [saving, setSaving] = useState<Role | null>(null)

  if (user?.role) return <Navigate to="/" replace />

  async function pick(role: Role) {
    setSaving(role)
    try {
      await chooseRole(role)
    } catch {
      toast.error('Could not save your choice. Try again.')
      setSaving(null)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <AuroraBackground />
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Hi{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}! <span className="text-gradient">How will you use Encore?</span>
        </h1>
        <p className="mt-3 text-muted">You can only choose once, so pick the one that fits.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {OPTIONS.map((o, i) => (
            <motion.div key={o.role} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <GlassCard
                tint={o.tint}
                interactive
                role="button"
                tabIndex={0}
                onClick={() => !saving && pick(o.role)}
                onKeyDown={(e) => e.key === 'Enter' && !saving && pick(o.role)}
                className="relative p-8 text-left"
              >
                <span className="float-bob block text-6xl">{o.emoji}</span>
                <h2 className="mt-6 text-xl font-semibold">{o.title}</h2>
                <p className="mt-1 text-sm text-muted">{o.text}</p>
                {saving === o.role && <Spinner className="absolute right-6 top-6 text-primary-to" />}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
