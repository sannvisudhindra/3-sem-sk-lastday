import { GlassCard } from './primitives'

/** Temporary body for pages that haven't been built yet. */
export default function PagePlaceholder({ title, owner }: { title: string; owner: 'P3' | 'P4' }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <GlassCard className="text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted">Placeholder · built by {owner}</p>
      </GlassCard>
    </div>
  )
}
