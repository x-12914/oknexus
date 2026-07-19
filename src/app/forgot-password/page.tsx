import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Reset password · OKNexus" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <ForgotPasswordForm />
    </div>
  );
}
