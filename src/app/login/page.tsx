import { Compass } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PillButton } from "@/components/PillButton";
import { GoogleIcon } from "@/components/GoogleIcon";
import { signIn, signUp, signInWithGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-teal-100 via-brand-teal-50 to-brand-mint-200 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm">
        <div className="flex justify-center pb-6">
          <Logo />
        </div>
        <h1 className="text-center font-display text-2xl font-semibold text-brand-ink">
          Welcome back
        </h1>
        <p className="mt-1 text-center text-sm text-brand-muted">
          Sign in or create an account to start planning.
        </p>

        {params.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        )}
        {params.message && (
          <p className="mt-4 rounded-lg bg-brand-teal-50 px-3 py-2 text-sm text-brand-teal-700">
            {params.message}
          </p>
        )}

        <form action={signIn} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wide text-brand-muted"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="select-input"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wide text-brand-muted"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              className="select-input"
            />
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <PillButton formAction={signIn} type="submit">
              <Compass className="h-4 w-4" />
              Sign in
            </PillButton>
            <PillButton formAction={signUp} type="submit" variant="secondary">
              Create account
            </PillButton>
          </div>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-brand-teal-100" />
          <span className="text-xs uppercase tracking-wide text-brand-muted">
            or
          </span>
          <div className="h-px flex-1 bg-brand-teal-100" />
        </div>

        <form action={signInWithGoogle} className="mt-4">
          <PillButton type="submit" variant="secondary" className="w-full justify-center">
            <GoogleIcon />
            Continue with Google
          </PillButton>
        </form>
      </div>
    </div>
  );
}
