'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavBarProps {
  userName: string
}

export default function NavBar({ userName }: NavBarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-zinc-50">🏋️ PlexTech Gym Comp</span>
          <div className="flex gap-1">
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/scoreboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/scoreboard'
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Scoreboard
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-zinc-500 text-sm hidden sm:block">{userName}</span>
          <button
            onClick={handleSignOut}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
