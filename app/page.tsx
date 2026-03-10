'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const searchParams = useSearchParams()
  const notAllowed = searchParams.get('error') === 'not_allowed'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏋️</div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Gym Squad</h1>
          <p className="text-zinc-400 mt-2 text-sm">4x a week. No excuses.</p>
        </div>

        {notAllowed && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-4 mb-4 text-center">
            <p className="text-red-400 text-sm">Your email is not on the approved list.</p>
          </div>
        )}

        {sent ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="text-3xl mb-3">📬</div>
            <h2 className="text-lg font-semibold text-zinc-50 mb-2">Check your email</h2>
            <p className="text-zinc-400 text-sm">
              We sent a magic link to <span className="text-zinc-200 font-medium">{email}</span>.
              Click it to sign in.
            </p>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm transition"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>

            <p className="text-zinc-500 text-xs text-center mt-6">
              Only approved squad members can sign in.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
