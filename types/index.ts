export interface Profile {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Submission {
  id: string
  user_id: string
  photo_url: string
  submitted_at: string
  week_number: number
  year: number
  profiles?: Profile
}

export interface WeeklyStats {
  user_id: string
  name: string
  email: string
  week_number: number
  year: number
  submission_count: number
  is_relegated: boolean
}

export interface UserStats {
  profile: Profile
  total_sessions: number
  current_week_count: number
  current_streak: number
  best_streak: number
  relegation_count: number
  is_currently_relegated: boolean
}

export interface ScoreboardEntry {
  profile: Profile
  total_sessions: number
  current_week_count: number
  current_streak: number
  best_streak: number
  relegation_count: number
  is_currently_relegated: boolean
  rank: number
}
