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

function FaqItem({ item, open, onToggle }) {
  const id = item._id || item.question

  return (
    <div
      data-open={open}
      className='rounded-xl bg-white/90 ring-1 ring-zinc-200/80 transition-shadow duration-500 ease-out data-[open=true]:shadow-sm'
    >
      <button
        type='button'
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className='flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium'
      >
        <span>{item.question}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-out',
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
              'border-t border-zinc-100 px-4 py-3 text-sm leading-relaxed text-muted-foreground transition-opacity duration-500 ease-out',
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
        <p className='text-xs font-semibold tracking-[0.18em] text-cyan-700 uppercase'>Help</p>
        <h1 className='text-3xl font-semibold tracking-tight'>Support Center</h1>
        <p className='max-w-2xl text-sm leading-relaxed text-muted-foreground'>
          Find answers to common questions or reach out to our team. Use the email on your Trader
          365 account so we can match your request.
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        {TOPICS.map(topic => {
          const Icon = topic.icon
          return (
            <Card key={topic.title} className='border-0 bg-white/90 shadow-sm ring-1 ring-zinc-200/80'>
              <CardHeader className='space-y-3'>
                <div className='grid size-10 place-items-center rounded-xl bg-zinc-950 text-white'>
                  <Icon className='size-4' />
                </div>
                <div className='space-y-1'>
                  <CardTitle className='text-base'>{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <section className='space-y-3'>
        <h2 className='text-xl font-semibold tracking-tight'>Frequently Asked Questions</h2>
        {faqLoading ? (
          <div className='space-y-2'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : faqs.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No FAQs available yet.</p>
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

      <Card className='border-0 bg-white/90 shadow-sm ring-1 ring-zinc-200/80'>
        <CardHeader>
          <CardTitle className='text-xl'>Contact Support</CardTitle>
          <CardDescription>
            Can’t find what you are looking for? Submit your issue below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='support-name'>Full name</Label>
              <Input
                id='support-name'
                name='name'
                value={form.name}
                onChange={handleChange}
                placeholder='Jane Trader'
                className='h-10 bg-background px-3'
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='support-email'>Email address</Label>
              <Input
                id='support-email'
                name='email'
                type='email'
                value={form.email}
                onChange={handleChange}
                placeholder='you@example.com'
                className='h-10 bg-background px-3'
                required
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='support-message'>Your message</Label>
              <Textarea
                id='support-message'
                name='message'
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder='How can we help?'
                className='min-h-28 bg-background px-3'
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
