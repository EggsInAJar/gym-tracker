'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FeedItemWithMeta, Comment } from '@/types'
import { timeAgo } from '@/lib/utils'

export default function FeedCard({ item }: { item: FeedItemWithMeta }) {
  const [liked, setLiked] = useState(item.isLikedByMe)
  const [likeCount, setLikeCount] = useState(item.likeCount)
  const [isTogglingLike, setIsTogglingLike] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [commentCount, setCommentCount] = useState(item.commentCount)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const handleLike = async () => {
    if (isTogglingLike) return
    setIsTogglingLike(true)
    const prevLiked = liked
    const prevCount = likeCount
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: item.id }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLiked(data.liked)
      setLikeCount(data.liked ? prevCount + 1 : prevCount - 1)
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
    } finally {
      setIsTogglingLike(false)
    }
  }

  const handleToggleComments = async () => {
    if (!showComments && comments === null) {
      const res = await fetch(`/api/comment?submissionId=${item.id}`)
      const data = await res.json()
      setComments(data.comments ?? [])
    }
    setShowComments(!showComments)
  }

  const handlePostComment = async () => {
    if (!newComment.trim() || isSubmittingComment) return
    setIsSubmittingComment(true)
    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: item.id, content: newComment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setComments(prev => [...(prev ?? []), data.comment])
      setCommentCount(c => c + 1)
      setNewComment('')
    } catch {
      // silently fail — user can retry
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const checkin = item.checkins

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${item.profiles.id}`}
              className="font-semibold text-zinc-50 hover:text-zinc-300 transition-colors"
            >
              {item.profiles.name}
            </Link>
            {item.profiles.is_comp ? (
              <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-900 font-bold text-xs px-2 py-0.5 rounded shadow-sm shadow-amber-500/30">
                COMP
              </span>
            ) : (
              <span className="bg-zinc-700 text-zinc-400 font-medium text-xs px-2 py-0.5 rounded">
                REC
              </span>
            )}
          </div>
          {checkin && (
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              {checkin.gym_name && <span>📍 {checkin.gym_name}</span>}
              {checkin.duration_minutes != null && <span>⏱ {checkin.duration_minutes} min</span>}
            </div>
          )}
        </div>
        <span className="text-zinc-500 text-xs shrink-0 mt-0.5">{timeAgo(item.submitted_at)}</span>
      </div>

      {/* Photo */}
      <div className="relative aspect-video bg-zinc-800">
        <Image
          src={item.photo_url}
          alt={`${item.profiles.name}'s gym session`}
          fill
          className="object-cover"
          sizes="(max-width: 672px) 100vw, 672px"
        />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            liked ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          💬 {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-3">
          {comments === null ? (
            <p className="text-zinc-500 text-sm">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="text-zinc-600 text-sm">No comments yet.</p>
          ) : (
            <div className="space-y-2">
              {comments.map(c => (
                <div key={c.id} className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/profile/${c.profiles.id}`}
                      className="text-zinc-300 font-medium text-sm hover:text-zinc-100 transition-colors"
                    >
                      {c.profiles.name}
                    </Link>
                    <span className="text-zinc-400 text-sm ml-2">{c.content}</span>
                  </div>
                  <span className="text-zinc-600 text-xs shrink-0">{timeAgo(c.created_at)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePostComment()}
              placeholder="Add a comment..."
              maxLength={500}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={handlePostComment}
              disabled={!newComment.trim() || isSubmittingComment}
              className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium disabled:opacity-40 transition-colors"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
