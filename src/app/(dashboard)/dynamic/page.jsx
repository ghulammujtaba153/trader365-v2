'use client'

import { useState } from 'react'
import { Gavel, HelpCircle, Info, Quote } from 'lucide-react'

import AboutSection from '@/components/dynamic/about-section'
import FaqsSection from '@/components/dynamic/faqs-section'
import TestimonialsSection from '@/components/dynamic/testimonials-section'
import TermsSection from '@/components/dynamic/terms-section'
import DashboardHeader from '@/components/layout/dashboard-header'
import { cn } from '@/lib/utils'

const TABS = [
  {
    id: 'about',
    label: 'About',
    icon: Info,
    description: 'Logo, mission, feature carousel, and About Us copy for the app'
  },
  {
    id: 'faq',
    label: 'FAQ',
    icon: HelpCircle,
    description: 'Questions and answers shown to users'
  },
  {
    id: 'testimonials',
    label: 'Testimonials',
    icon: Quote,
    description: 'Customer quotes and ratings'
  },
  {
    id: 'terms',
    label: 'Terms',
    icon: Gavel,
    description: 'Legal terms and conditions documents'
  }
]

export default function DynamicPagesPage() {
  const [tab, setTab] = useState('about')
  const active = TABS.find(t => t.id === tab) || TABS[0]

  return (
    <>
      <DashboardHeader
        title='Dynamic Pages'
        description='Content blocks that power About, FAQ, Testimonials, and Terms in the app.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='overflow-x-auto border-b border-border'>
          <div className='flex min-w-max gap-1'>
            {TABS.map(item => {
              const Icon = item.icon
              const selected = item.id === tab
              return (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                    selected
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className='size-4' />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <p className='text-sm text-muted-foreground'>{active.description}</p>

        {tab === 'about' ? <AboutSection /> : null}
        {tab === 'faq' ? <FaqsSection /> : null}
        {tab === 'testimonials' ? <TestimonialsSection /> : null}
        {tab === 'terms' ? <TermsSection /> : null}
      </main>
    </>
  )
}
