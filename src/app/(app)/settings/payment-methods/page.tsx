export default function PaymentMethodsPage() {
  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Payment Methods</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Manage your saved bank accounts, cards, and crypto wallets.
        </p>
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-10 text-center">
          <p className="text-sm text-[var(--color-muted)]">No payment methods added yet.</p>
          <button className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Add Payment Method
          </button>
        </div>
      </div>
    </div>
  );
}
