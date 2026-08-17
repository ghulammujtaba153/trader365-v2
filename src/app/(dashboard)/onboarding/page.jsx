'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import QuestionnaireFormDialog from '@/components/onboarding/questionnaire-form-dialog'
import DashboardHeader from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function OnboardingQuestionnairePage() {
  const [questionnaires, setQuestionnaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabIndex, setTabIndex] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchQuestionnaires = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/onboarding/questionnaire')
      const list = Array.isArray(res.data) ? res.data : []
      setQuestionnaires(list)
      setTabIndex(prev => (list.length === 0 ? 0 : Math.min(prev, list.length - 1)))
    } catch {
      toast.error('Failed to load questionnaires')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchQuestionnaires()
    })
  }, [])

  const active = questionnaires[tabIndex]

  return (
    <>
      <DashboardHeader
        title='Onboarding Questionnaire'
        description='Manage the question sets users complete during onboarding.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm text-muted-foreground'>
            {questionnaires.length} questionnaire{questionnaires.length === 1 ? '' : 's'}
          </p>
          <Button
            onClick={() => {
              setSelected(null)
              setFormOpen(true)
            }}
          >
            <Plus className='size-4' />
            Add questionnaire
          </Button>
        </div>

        {loading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-64 w-full' />
          </div>
        ) : questionnaires.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
              <p className='text-sm font-medium'>No questionnaires yet</p>
              <p className='text-sm text-muted-foreground'>
                Create the first questionnaire to collect onboarding answers.
              </p>
              <Button
                onClick={() => {
                  setSelected(null)
                  setFormOpen(true)
                }}
              >
                <Plus className='size-4' />
                Add questionnaire
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className='border-b px-2 pt-2 sm:px-3'>
              <div className='flex gap-1 overflow-x-auto pb-2'>
                {questionnaires.map((q, i) => (
                  <Button
                    key={q._id}
                    type='button'
                    variant={tabIndex === i ? 'default' : 'ghost'}
                    size='sm'
                    className={cn('shrink-0', tabIndex === i && 'shadow-sm')}
                    onClick={() => setTabIndex(i)}
                  >
                    {q.title || `Untitled ${i + 1}`}
                  </Button>
                ))}
              </div>
            </div>

            {active ? (
              <CardContent className='space-y-4 pt-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='min-w-0'>
                    <h2 className='text-base font-semibold'>{active.title || 'Untitled questionnaire'}</h2>
                    <p className='mt-1 text-sm text-muted-foreground'>{active.subTitle || 'No subtitle'}</p>
                  </div>
                  <div className='flex shrink-0 gap-1'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setSelected(active)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className='size-4' />
                      Edit
                    </Button>
                    <Button variant='outline' size='sm' onClick={() => setDeleteId(active._id)}>
                      <Trash2 className='size-4 text-destructive' />
                      Delete
                    </Button>
                  </div>
                </div>

                {(active.questions || []).length === 0 ? (
                  <div className='rounded-xl border border-dashed py-10 text-center'>
                    <p className='text-sm font-medium'>No questions in this set</p>
                    <p className='mt-1 mb-3 text-sm text-muted-foreground'>
                      Edit this questionnaire to add questions.
                    </p>
                    <Button
                      onClick={() => {
                        setSelected(active)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil className='size-4' />
                      Edit questionnaire
                    </Button>
                  </div>
                ) : (
                  <ul className='space-y-2'>
                    {active.questions.map((question, index) => (
                      <li
                        key={`${active._id}-${index}`}
                        className='flex items-center gap-3 rounded-xl border p-3'
                      >
                        <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground'>
                          {index + 1}
                        </span>

                        {active.images && question.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={question.image}
                            alt={`Question ${index + 1}`}
                            className='size-14 shrink-0 rounded-lg border object-cover'
                          />
                        ) : null}

                        <p className='min-w-0 flex-1 text-sm font-medium'>
                          {question.text || 'Untitled question'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            ) : null}
          </Card>
        )}
      </main>

      <QuestionnaireFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        questionnaire={selected}
        onSaved={() => fetchQuestionnaires({ silent: true })}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={open => !open && setDeleteId(null)}
        title='Delete questionnaire?'
        description='Are you sure you want to delete this questionnaire?'
        confirmText='Delete'
        destructive
        onConfirm={async () => {
          await api.delete(`/api/onboarding/questionnaire/${deleteId}`)
          await fetchQuestionnaires({ silent: true })
          return 'Questionnaire deleted successfully'
        }}
      />
    </>
  )
}
