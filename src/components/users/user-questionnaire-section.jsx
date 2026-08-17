'use client'

import { useEffect, useMemo, useState } from 'react'

import api from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function UserQuestionnaireSection({ answers }) {
  const [questionnaires, setQuestionnaires] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    queueMicrotask(() => {
      const load = async () => {
        try {
          const res = await api.get('/api/onboarding/questionnaire')
          if (mounted) setQuestionnaires(Array.isArray(res.data) ? res.data : [])
        } catch {
          if (mounted) setQuestionnaires([])
        } finally {
          if (mounted) setLoading(false)
        }
      }
      load()
    })
    return () => {
      mounted = false
    }
  }, [])

  const mapped = useMemo(() => {
    const raw = answers && typeof answers === 'object' ? answers : {}
    return questionnaires.map(tab => {
      const selectedIds = (Array.isArray(raw[tab._id]) ? raw[tab._id] : []).map(String)
      const questions = Array.isArray(tab.questions) ? tab.questions : []
      const selected = questions.filter(q => selectedIds.includes(String(q._id)))
      return {
        id: tab._id,
        title: tab.title,
        selected
      }
    })
  }, [answers, questionnaires])

  const hasAny = mapped.some(item => item.selected.length > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding answers</CardTitle>
        <CardDescription>Questionnaire responses used for profiling and content targeting</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='space-y-2'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-16 w-full' />
            ))}
          </div>
        ) : !hasAny ? (
          <p className='py-6 text-center text-sm text-muted-foreground'>No questionnaire answers saved</p>
        ) : (
          <div className='grid gap-3 md:grid-cols-2'>
            {mapped.map(item => (
              <div key={item.id} className='rounded-xl border p-3'>
                <p className='text-sm font-semibold'>{item.title}</p>
                <div className='mt-2 flex flex-wrap gap-1.5'>
                  {item.selected.length ? (
                    item.selected.map(q => (
                      <Badge key={q._id} variant='outline'>
                        {q.text}
                      </Badge>
                    ))
                  ) : (
                    <span className='text-xs text-muted-foreground'>No answer</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
