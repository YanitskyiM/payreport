import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { login, signup } from './actions'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function LoginPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data?.claims?.sub) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const message = typeof params.message === 'string' ? params.message : null
  const error = typeof params.error === 'string' ? params.error : null

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold text-slate-500">PayReport</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-slate-900">
            Sign in
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Use email and password. New users can create an account here.
          </p>
        </div>

        <form className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">Email</span>
            <input
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">Password</span>
            <input
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>

          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          {message ? <p className="text-sm font-semibold text-emerald-600">{message}</p> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700"
              formAction={login}
            >
              Sign In
            </button>
            <button
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              formAction={signup}
            >
              Create Account
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
