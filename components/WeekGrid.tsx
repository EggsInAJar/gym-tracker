import { Submission } from '@/types'

interface WeekGridProps {
  submissions: Submission[]
}

export default function WeekGrid({ submissions }: WeekGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {submissions.map((sub, index) => {
        const date = new Date(sub.submitted_at)
        const timeStr = date.toLocaleString('en-US', {
          timeZone: 'America/Los_Angeles',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })

        return (
          <div key={sub.id} className="relative rounded-xl overflow-hidden aspect-square bg-zinc-800">
            <img
              src={sub.photo_url}
              alt={`Session ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 p-2">
              <p className="text-white text-xs font-medium">Session {index + 1}</p>
              <p className="text-zinc-300 text-xs">{timeStr}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
