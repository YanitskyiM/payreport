'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function nextRedirect(path: string, message: string) {
  const params = new URLSearchParams({ message })
  redirect(`${path}?${params.toString()}`)
}

function errorRedirect(path: string, message: string) {
  const params = new URLSearchParams({ error: message })
  redirect(`${path}?${params.toString()}`)
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    errorRedirect('/login', 'Email and password are required.')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    errorRedirect('/login', error.message)
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    errorRedirect('/login', 'Email and password are required.')
  }

  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin')

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: origin
      ? {
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`
        }
      : undefined
  })

  if (error) {
    errorRedirect('/login', error.message)
  }

  nextRedirect('/login', 'Account created. Check your email to confirm the sign-in link if confirmation is enabled.')
}
