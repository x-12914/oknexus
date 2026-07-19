import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Set a new password · OKNexus" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <ResetPasswordForm token={token ?? ""} />
    </div>
  );
}
