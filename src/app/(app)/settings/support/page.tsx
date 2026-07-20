export default function SupportPage() {
  return (
    <div className="h-full p-6 lg:p-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold">Support</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Need help? Contact our support team.
        </p>
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <h3 className="font-medium text-white">Contact Us</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Our support team is available 24/7 to assist you with any account or trading issues.
            </p>
            <button className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-border)]">
              Open a Support Ticket
            </button>
          </div>
          
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-5">
            <h3 className="font-medium text-white">Help Center</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Browse our comprehensive knowledge base for guides and FAQs.
            </p>
            <button className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-border)]">
              Visit Help Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
