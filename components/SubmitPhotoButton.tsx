'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentWeek } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface SubmitPhotoButtonProps {
  userId: string
  currentCount: number
  disabled: boolean
}

export default function SubmitPhotoButton({ userId, currentCount, disabled }: SubmitPhotoButtonProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const { week, year } = getCurrentWeek()

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${year}-${week}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('gym-photos')
        .upload(fileName, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('gym-photos')
        .getPublicUrl(fileName)

      // Insert submission record
      const { error: dbError } = await supabase.from('submissions').insert({
        user_id: userId,
        photo_url: publicUrl,
        week_number: week,
        year: year,
      })

      if (dbError) throw dbError

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        router.refresh()
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (disabled) {
    return (
      <div className="w-full py-4 rounded-2xl bg-green-950 border border-green-800 text-green-400 font-semibold text-center">
        Week complete! See you next Monday 💪
      </div>
    )
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="photo-upload"
      />
      <label
        htmlFor="photo-upload"
        className={`block w-full py-4 rounded-2xl font-semibold text-center cursor-pointer transition-colors ${
          uploading || success
            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
        }`}
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading...
          </span>
        ) : success ? (
          '✓ Session logged!'
        ) : (
          `Submit gym photo (${currentCount}/4)`
        )}
      </label>

      {error && (
        <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
      )}

      <p className="text-zinc-600 text-xs text-center mt-2">
        Take a photo at the gym or upload from your camera roll
      </p>
    </div>
  )
}
