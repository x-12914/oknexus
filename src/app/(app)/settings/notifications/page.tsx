export default function NotificationsPage() {
  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Choose what events you want to be notified about.
        </p>
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <h3 className="font-medium text-white">Email Notifications</h3>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]" />
                <span className="text-sm text-white">Deposit & Withdrawal Confirmations</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]" />
                <span className="text-sm text-white">Security Alerts (New logins, password changes)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]" />
                <span className="text-sm text-white">Marketing & Promotional Offers</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
