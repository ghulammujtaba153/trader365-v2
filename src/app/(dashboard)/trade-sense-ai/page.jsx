'use client'

import { useMemo, useRef, useState } from 'react'
import { SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'

import DashboardHeader from '@/components/layout/dashboard-header'
import api from '@/lib/api'
import AudioPlayer from '@/components/media/audio-player'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

/*
  MOBILE STREAM NOTES (POST /api/bot)
  -----------------------------------
  Response: Content-Type text/event-stream

  Split on blank lines. Each event looks like:
    data: {JSON}\n\n
  Ignore empty data. Stream ends with:
    data: [DONE]

  JSON.parse the payload. Then branch (order matters):

  1) { "token": "..." }
     Append to the current assistant bubble.
     Newline = real U+000A inside token after JSON.parse (not a separate event).
     Render multiline (Swift: split on \n; Flutter: Text honors \n).

  2) { "replace": true, "token": "full text" }
     REPLACE the whole assistant message. Do not append.
     Used after stream when exercise paragraphs are appended (must match cards).

  3) { "suggestions": [ ... ] }
     Audio resource cards under the bubble. Ignore empty [].

  3b) Canonical exercise event (one card only):
      { "exerciseSuggestion": {
          id, title, description, durationLabel, durationSeconds,
          order, type: "exercise", suggestion
        } }
     Render this single object under the bubble (do not re-filter).
     Ignore null / missing. Never dump this JSON into the message text.
     Known ids: box-breathing-reset | grounding-54321 | let-the-day-go
     Legacy: { "exerciseSuggestions": [ ... ] } → use the first item only.
     Start Exercise → deep link by id, e.g. trader365://therapy/exercise/{id}

  4) { "meta": { ... } } — ignore in UI
  5) { "error": "..." } — failed assistant message

  Do not concatenate suggestions / exerciseSuggestion / exerciseSuggestions /
  meta / [DONE] into the message string.
*/

const normalizeExerciseSuggestion = incoming => {
  if (!incoming) return null
  if (Array.isArray(incoming)) return incoming[0] || null
  if (typeof incoming === 'object') return incoming
  return null
}

const approximateDuration = seconds => {
  const value = Number(seconds) || 0
  if (value <= 0) return 'Short listen'
  return `${Math.max(1, Math.round(value / 60))} min`
}

const resourceTags = item => {
  if (Array.isArray(item?.tags)) return item.tags.map(tag => String(tag).trim()).filter(Boolean)
  if (typeof item?.tags === 'string' && item.tags.trim()) {
    return item.tags.split(',').map(tag => tag.trim()).filter(Boolean)
  }
  return []
}

const LIST_LINE = /^(?:[-*•–—]|\d+[.)])\s+(.+)$/

const splitMessageBlocks = text => {
  const blocks = []
  const lines = String(text || '').split('\n')
  let paragraph = []
  let items = []

  const flushParagraph = () => {
    const value = paragraph.join('\n').trim()
    if (value) blocks.push({ type: 'p', text: value })
    paragraph = []
  }

  const flushList = () => {
    if (items.length) blocks.push({ type: 'ul', items: [...items] })
    items = []
  }

  for (const line of lines) {
    const match = line.trim().match(LIST_LINE)
    if (match) {
      flushParagraph()
      items.push(match[1].trim())
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()
  return blocks
}

function ChatMessageBody({ text }) {
  const blocks = splitMessageBlocks(text)
  if (blocks.length === 0) return null

  return (
    <div className='space-y-2'>
      {blocks.map((block, index) =>
        block.type === 'ul' ? (
          <ul key={`list-${index}`} className='list-disc space-y-1 pl-5 text-sm leading-6'>
            {block.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={`p-${index}`} className='whitespace-pre-wrap text-sm leading-6'>
            {block.text}
          </p>
        )
      )}
    </div>
  )
}

const shouldSuggestResources = text => {
  const q = String(text || '').toLowerCase()
  return [
    'anxious',
    'anxiety',
    'panic',
    'stress',
    'stressed',
    'overwhelmed',
    'sad',
    'down',
    'hopeless',
    'angry',
    'frustrated',
    'ashamed',
    'guilty',
    'fear',
    'afraid',
    'sleep',
    'insomnia',
    'loss',
    'lost again',
    'lost big',
    'win it back',
    'revenge',
    'blew',
    'blown',
    'drawdown',
    'red day',
    'overtrading',
    'resource',
    'resources',
    'listen',
    'audio',
    'feel good',
    'calm',
    'calming',
    'soothing',
    'grounded',
    'suggest',
    'sugget',
    'recommend',
    'meditation',
    'exhausted',
    'overwhelmed',
    'replaying',
    'tilt'
  ].some(term => q.includes(term))
}

export default function TradeSenseAiTestPage() {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const endRef = useRef(null)

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending])

  // SSE parser: append token, replace full text, capture suggestion cards.
  const parseAndAccumulate = async response => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Missing response body for stream')

    const decoder = new TextDecoder()
    let buffer = ''

    let assistantText = ''
    let streamSuggestions = []
    let streamExercise = null
    let done = false

    // Placeholder assistant entry is created outside this function.
    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading
      if (value) {
        buffer += decoder.decode(value, { stream: true })

        // SSE chunks are separated by a blank line.
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          const lines = part.split('\n')
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue

            const data = trimmed.slice(5).trim()
            if (!data || data === '[DONE]') continue

            // Node forwards either JSON like {"token":"..."} or plain strings.
            try {
              const parsed = JSON.parse(data)
              if (Array.isArray(parsed?.suggestions)) {
                streamSuggestions = parsed.suggestions
                continue
              }
              if (parsed?.exerciseSuggestion && typeof parsed.exerciseSuggestion === 'object') {
                streamExercise = normalizeExerciseSuggestion(parsed.exerciseSuggestion)
                setMessages(prev => {
                  const next = [...prev]
                  const last = next[next.length - 1]
                  if (last?.role === 'assistant') {
                    last.exerciseSuggestion = streamExercise
                    delete last.exerciseSuggestions
                  }
                  return next
                })
                continue
              }
              if (Array.isArray(parsed?.exerciseSuggestions)) {
                if (parsed.exerciseSuggestions.length === 0) continue
                streamExercise = normalizeExerciseSuggestion(parsed.exerciseSuggestions)
                setMessages(prev => {
                  const next = [...prev]
                  const last = next[next.length - 1]
                  if (last?.role === 'assistant') {
                    last.exerciseSuggestion = streamExercise
                    delete last.exerciseSuggestions
                  }
                  return next
                })
                continue
              }
              if (parsed?.meta) {
                continue
              }
              if (parsed?.replace && typeof parsed?.token === 'string') {
                assistantText = parsed.token
                setMessages(prev => {
                  const next = [...prev]
                  const last = next[next.length - 1]
                  if (last?.role === 'assistant') last.content = assistantText
                  return next
                })
                continue
              }
              if (typeof parsed?.token === 'string') {
                assistantText += parsed.token
                setMessages(prev => {
                  const next = [...prev]
                  const last = next[next.length - 1]
                  if (last?.role === 'assistant') last.content = assistantText
                  return next
                })
              } else if (typeof parsed?.error === 'string') {
                throw new Error(parsed.error)
              } else if (typeof parsed?.token !== 'string') {
                assistantText += data
                setMessages(prev => {
                  const next = [...prev]
                  const last = next[next.length - 1]
                  if (last?.role === 'assistant') last.content = assistantText
                  return next
                })
              }
            } catch (e) {
              if (e instanceof SyntaxError) {
                assistantText += data
                setMessages(prev => {
                  const next = [...prev]
                  const last = next[next.length - 1]
                  if (last?.role === 'assistant') last.content = assistantText
                  return next
                })
                continue
              }
              throw e
            }
          }
        }
      }
    }

    return { text: assistantText, suggestions: streamSuggestions, exerciseSuggestion: streamExercise }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setInput('')

    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        credentials: 'include'
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || body?.message || `Request failed (${res.status})`)
      }

      const streamed = await parseAndAccumulate(res)
      let nextSuggestions = Array.isArray(streamed.suggestions) ? streamed.suggestions : []
      const historyText = [...messages.map(m => m.content), text].filter(Boolean).slice(-8).join('\n')

      if (nextSuggestions.length > 0) {
        setMessages(prev => {
          const next = [...prev]
          for (let i = next.length - 1; i >= 0; i -= 1) {
            if (next[i]?.role === 'assistant') {
              next[i] = { ...next[i], suggestions: nextSuggestions }
              break
            }
          }
          return next
        })
      }

      if (streamed.exerciseSuggestion) {
        setMessages(prev => {
          const next = [...prev]
          for (let i = next.length - 1; i >= 0; i -= 1) {
            if (next[i]?.role === 'assistant') {
              next[i] = {
                ...next[i],
                exerciseSuggestion: streamed.exerciseSuggestion
              }
              delete next[i].exerciseSuggestions
              break
            }
          }
          return next
        })
      }
    } catch (e) {
      setMessages(prev => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') {
          last.content = String(e?.message || e)
        }
        return next
      })
    } finally {
      setSending(false)
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <DashboardHeader
        title='Trade Sense AI (Test)'
        description='End-to-end chat test: dashboard → Node proxy → Trade Sense AI FastAPI → LLM.'
      />

      <main className='flex min-h-0 flex-1 flex-col px-4 py-4 md:px-6 md:pb-6'>
        <Card className='flex min-h-0 flex-1 overflow-hidden border-muted/60 bg-gradient-to-b from-card to-muted/10'>
          <CardContent className='flex min-h-0 flex-1 flex-col p-0'>
            <div className='flex min-h-[calc(100dvh-8.5rem)] flex-1 flex-col'>
              <div className='flex-1 space-y-4 overflow-y-auto p-4 md:p-5'>
                {messages.length === 0 ? (
                  <div className='space-y-3'>
                    <p className='text-sm text-muted-foreground'>
                      Type a message and press send. Suggestions will appear directly in chat cards.
                    </p>
                    <div className='space-y-2'>
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className='h-14 w-full rounded-xl' />
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div key={`${m.role}-${idx}`} className={`max-w-[92%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
                      <div
                        className={
                          m.role === 'user'
                            ? 'rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground'
                            : 'rounded-2xl rounded-bl-md border bg-background/95 px-4 py-3 shadow-sm'
                        }
                      >
                        <p
                          className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
                            m.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {m.role === 'user' ? 'You' : 'Trade Sense AI'}
                        </p>
                        {m.role === 'assistant' && !m.content && sending && idx === messages.length - 1 ? (
                          <div className='flex items-center gap-1 py-1' aria-label='Trade Sense AI is typing'>
                            <span className='size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]' />
                            <span className='size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]' />
                            <span className='size-1.5 animate-bounce rounded-full bg-muted-foreground' />
                          </div>
                        ) : (
                          <ChatMessageBody text={m.content} />
                        )}
                      </div>

                      {m.role === 'assistant' &&
                      normalizeExerciseSuggestion(
                        m.exerciseSuggestion || m.exerciseSuggestions
                      ) ? (
                        <div className='mt-3'>
                          {(() => {
                            const exercise = normalizeExerciseSuggestion(
                              m.exerciseSuggestion || m.exerciseSuggestions
                            )
                            return (
                              <div
                                key={exercise.id || exercise.title}
                                className='overflow-hidden rounded-xl border bg-card p-4 shadow-sm'
                              >
                                <div className='flex items-start justify-between gap-3'>
                                  <span className='flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground'>
                                    {String(exercise.order || '01').padStart(2, '0')}
                                  </span>
                                  <span className='rounded-full border px-2.5 py-0.5 text-[11px] text-muted-foreground'>
                                    {exercise.durationLabel ||
                                      approximateDuration(exercise.durationSeconds)}
                                  </span>
                                </div>
                                <p className='mt-3 text-base font-semibold'>{exercise.title}</p>
                                <p className='mt-1 text-sm text-muted-foreground'>
                                  {exercise.suggestion || exercise.description}
                                </p>
                                {exercise.description &&
                                exercise.suggestion &&
                                exercise.description !== exercise.suggestion ? (
                                  <p className='mt-2 text-xs text-muted-foreground'>
                                    {exercise.description}
                                  </p>
                                ) : null}
                                <button
                                  type='button'
                                  className='mt-3 text-sm font-medium text-primary hover:underline'
                                  onClick={() => {
                                    const id = exercise.id || 'unknown'
                                    console.info('[exercise] Start Exercise', id, exercise)
                                    toast.message(`Exercise: ${exercise.title || id}`, {
                                      description: `id=${id} (mobile: open therapy/exercise/${id})`
                                    })
                                  }}
                                >
                                  Start Exercise →
                                </button>
                              </div>
                            )
                          })()}
                        </div>
                      ) : null}

                      {m.role === 'assistant' && Array.isArray(m.suggestions) && m.suggestions.length > 0 ? (
                        <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                          {m.suggestions.map(item => (
                            <button
                              key={item.id}
                              type='button'
                              onClick={() => setSelectedSuggestion(item)}
                              className='w-full overflow-hidden rounded-xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            >
                              <div className='flex gap-3 p-3'>
                                {item.thumbnail ? (
                                  <img
                                    src={item.thumbnail}
                                    alt={item.title || 'Suggestion'}
                                    className='h-16 w-16 rounded-lg object-cover'
                                  />
                                ) : (
                                  <div className='h-16 w-16 rounded-lg bg-muted' />
                                )}
                                <div className='min-w-0 flex-1'>
                                  <p className='line-clamp-2 text-sm font-semibold'>{item.title || 'Untitled'}</p>
                                  <p className='mt-1 text-xs text-muted-foreground'>
                                    {[item.category, item.pillar].filter(Boolean).join(' / ') || 'Audio'}
                                  </p>
                                  {resourceTags(item).length > 0 ? (
                                    <div className='mt-1.5 flex flex-wrap gap-1'>
                                      {resourceTags(item).slice(0, 3).map(tag => (
                                        <span key={tag} className='rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground'>
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className='mt-1.5 text-xs text-muted-foreground'>
                                      Approx. {approximateDuration(item.duration)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <div className='border-t bg-background/80 p-4 backdrop-blur md:p-5'>
                <div className='space-y-2'>
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder='Ask anything about trading psychology or emotional wellbeing...'
                    className='min-h-[96px] resize-none rounded-xl'
                    disabled={sending}
                    onKeyDown={e => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendMessage()
                    }}
                  />

                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-xs text-muted-foreground'>
                      Tip: Ctrl/⌘ + Enter to send
                    </p>
                    <Button onClick={sendMessage} disabled={!canSend} className='rounded-xl px-5'>
                      <SendHorizontal className='size-4' />
                      {sending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={Boolean(selectedSuggestion)} onOpenChange={open => !open && setSelectedSuggestion(null)}>
        <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{selectedSuggestion?.title || 'Suggested audio'}</DialogTitle>
            <DialogDescription>
              {[selectedSuggestion?.category, selectedSuggestion?.pillar].filter(Boolean).join(' · ') || 'Audio suggestion'}
            </DialogDescription>
          </DialogHeader>

          {selectedSuggestion ? (
            <div className='space-y-4'>
              <AudioPlayer
                src={selectedSuggestion.url}
                title={selectedSuggestion.title}
                subtitle={[selectedSuggestion.category, selectedSuggestion.pillar].filter(Boolean).join(' · ')}
                artwork={selectedSuggestion.thumbnail}
                active={Boolean(selectedSuggestion)}
              />

              <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                <span className='rounded-full border px-2.5 py-1'>
                  {[selectedSuggestion.category, selectedSuggestion.pillar].filter(Boolean).join(' / ') || 'Audio'}
                </span>
                <span className='rounded-full border px-2.5 py-1'>
                  Approx. {approximateDuration(selectedSuggestion.duration)}
                </span>
              </div>
              {resourceTags(selectedSuggestion).length > 0 ? (
                <div>
                  <p className='mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>Tags</p>
                  <div className='flex flex-wrap gap-1.5'>
                    {resourceTags(selectedSuggestion).map(tag => (
                      <span key={tag} className='rounded-full border px-2.5 py-1 text-xs'>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

