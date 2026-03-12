export interface Profile {
  id: string
  email: string
  name: string
  created_at: string
  is_comp: boolean
  bench_pr: number | null
  squat_pr: number | null
  deadlift_pr: number | null
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

export interface FeedCheckin {
  id: string
  duration_minutes: number | null
  gym_name: string | null
  checked_in_at: string
}

export interface FeedItem {
  id: string
  user_id: string
  photo_url: string
  submitted_at: string
  week_number: number
  year: number
  checkin_id: string | null
  profiles: Pick<Profile, 'id' | 'name' | 'is_comp'>
  checkins: FeedCheckin | null
  likes: { count: number }[]
  comments: { count: number }[]
}

export interface FeedItemWithMeta extends FeedItem {
  isLikedByMe: boolean
  likeCount: number
  commentCount: number
}

export interface Comment {
  id: string
  user_id: string
  submission_id: string
  content: string
  created_at: string
  profiles: Pick<Profile, 'id' | 'name'>
}
