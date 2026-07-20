export default function PreferencesPage() {
  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Preferences</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Customize your OKNexus experience.
        </p>
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <h3 className="font-medium text-white">Appearance</h3>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Choose between Light and Dark mode.</p>
            <div className="mt-4 flex gap-3">
              <button className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--color-accent)]">Dark Mode</button>
              <button className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-border)]">Light Mode</button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <h3 className="font-medium text-white">Local Currency</h3>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Set your preferred fiat currency for portfolio balances.</p>
            <select className="mt-4 w-full max-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
