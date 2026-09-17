'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, CreditCard, Headphones, Landmark, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const TOPICS = [
  {
    icon: Headphones,
    title: 'General Support',
    description: 'FAQs, contact options, and app-related help.'
  },
  {
    icon: Landmark,
    title: 'Trading & Account',
    description: 'Issues with trading, login, or settings.'
  },
  {
    icon: CreditCard,
    title: 'Billing & Payments',
    description: 'Payment methods, deposits, and withdrawals.'
  }
]

const cardClassName =
  'border-0 bg-white/90 shadow-sm ring-1 ring-zinc-200/80 dark:bg-zinc-900/90 dark:ring-white/10'

const fieldClassName =
  'h-10 border-zinc-200 bg-white px-3 text-zinc-950 placeholder:text-zinc-400 ' +
  'dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500'

const textareaClassName =
  'min-h-28 border-zinc-200 bg-white px-3 text-zinc-950 placeholder:text-zinc-400 ' +
  'dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500'

const labelClassName = 'text-zinc-700 dark:text-zinc-300'

function FaqItem({ item, open, onToggle }) {
  const id = item._id || item.question

  return (
    <div
      data-open={open}
      className={
        'rounded-xl bg-white/90 ring-1 ring-zinc-200/80 transition-shadow duration-500 ease-out ' +
        'data-[open=true]:shadow-sm dark:bg-zinc-900/90 dark:ring-white/10'
      }
    >
      <button
        type='button'
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className='flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-950 dark:text-zinc-50'
      >
        <span>{item.question}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-zinc-500 transition-transform duration-500 ease-out dark:text-zinc-400',
            open && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-500 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className='overflow-hidden'>
          <p
            className={cn(
              'border-t border-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-500 transition-opacity duration-500 ease-out dark:border-white/10 dark:text-zinc-400',
              open ? 'opacity-100' : 'opacity-0'
            )}
          >
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SupportPage() {
  const [faqs, setFaqs] = useState([])
  const [faqLoading, setFaqLoading] = useState(true)
  const [openFaqId, setOpenFaqId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  useEffect(() => {
    let cancelled = false

    const loadFaqs = async () => {
      try {
        const res = await api.get('/api/faq')
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.faqs)
            ? res.data.faqs
            : []
        if (!cancelled) {
          setFaqs(
            list
              .filter(item => item && (item.question || item.answer))
              .map(item => ({
                _id: item._id,
                question: item.question || '',
                answer: item.answer || ''
              }))
          )
        }
      } catch {
        if (!cancelled) {
          setFaqs([])
          toast.error('Could not load FAQs from the server.')
        }
      } finally {
        if (!cancelled) setFaqLoading(false)
      }
    }

    loadFaqs()
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = e => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Please fill out all fields.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/api/problem/public', {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim()
      })
      toast.success('Your message has been submitted.')
      setForm({ name: '', email: '', message: '' })
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          'Failed to submit support request'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const toggleFaq = id => {
    setOpenFaqId(prev => (prev === id ? null : id))
  }

  return (
    <div className='space-y-8'>
      <div className='space-y-2'>
        <p className='text-xs font-semibold tracking-[0.18em] text-cyan-700 uppercase dark:text-cyan-300'>
          Help
        </p>
        <h1 className='text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50'>
          Support Center
        </h1>
        <p className='max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400'>
          Find answers to common questions or reach out to our team. Use the email on your Trader
          365 account so we can match your request.
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        {TOPICS.map(topic => {
          const Icon = topic.icon
          return (
            <Card key={topic.title} className={cardClassName}>
              <CardHeader className='space-y-3'>
                <div className='grid size-10 place-items-center rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'>
                  <Icon className='size-4' />
                </div>
                <div className='space-y-1'>
                  <CardTitle className='text-base text-zinc-950 dark:text-zinc-50'>
                    {topic.title}
                  </CardTitle>
                  <CardDescription className='text-zinc-500 dark:text-zinc-400'>
                    {topic.description}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50'>
          Frequently Asked Questions
        </h2>
        {faqLoading ? (
          <div className='space-y-2'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : faqs.length === 0 ? (
          <p className='text-sm text-zinc-500 dark:text-zinc-400'>No FAQs available yet.</p>
        ) : (
          <div className='space-y-2'>
            {faqs.map(item => {
              const id = item._id || item.question
              return (
                <FaqItem key={id} item={item} open={openFaqId === id} onToggle={toggleFaq} />
              )
            })}
          </div>
        )}
      </section>

      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle className='text-xl text-zinc-950 dark:text-zinc-50'>Contact Support</CardTitle>
          <CardDescription className='text-zinc-500 dark:text-zinc-400'>
            Can’t find what you are looking for? Submit your issue below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='support-name' className={labelClassName}>
                Full name
              </Label>
              <Input
                id='support-name'
                name='name'
                value={form.name}
                onChange={handleChange}
                placeholder='Jane Trader'
                className={fieldClassName}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='support-email' className={labelClassName}>
                Email address
              </Label>
              <Input
                id='support-email'
                name='email'
                type='email'
                value={form.email}
                onChange={handleChange}
                placeholder='you@example.com'
                className={fieldClassName}
                required
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='support-message' className={labelClassName}>
                Your message
              </Label>
              <Textarea
                id='support-message'
                name='message'
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder='How can we help?'
                className={textareaClassName}
                required
              />
            </div>
            <div className='sm:col-span-2'>
              <Button type='submit' size='lg' className='h-10' disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className='animate-spin' />
                    Submitting…
                  </>
                ) : (
                  'Submit request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
