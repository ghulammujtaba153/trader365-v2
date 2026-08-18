'use client'

import { useEffect, useState } from 'react'
import { ImageIcon, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const emptyItem = () => ({ iconUrl: '', text: '' })

const defaultCards = () => [
  {
    title: 'Performance Tools',
    items: [
      { iconUrl: '', text: 'Trading journal with mood and emotion tracking.' },
      { iconUrl: '', text: 'Habit and goal tracking for consistency.' },
      { iconUrl: '', text: 'Insights, streaks, badges, and accountability.' }
    ]
  },
  {
    title: 'Core Features',
    items: [
      { iconUrl: '', text: 'Smart trading plans for disciplined execution.' },
      { iconUrl: '', text: 'Expert video and audio learning for traders.' },
      { iconUrl: '', text: 'AI chat support for guidance and reflection.' },
      { iconUrl: '', text: 'Daily market-focused motivation.' }
    ]
  }
]

const emptyForm = {
  brandName: 'TRADER 365',
  tagline: '',
  logo: '',
  title: 'About Us',
  description: '',
  aboutBody: '',
  aboutFooter: '',
  secondaryImage: '',
  featureCards: defaultCards()
}

export default function AboutSection() {
  const [form, setForm] = useState(emptyForm)
  const [existingId, setExistingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [itemUploading, setItemUploading] = useState('')

  const fetchAbout = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/about')
      const data = res.data
      if (data) {
        setForm({
          brandName: data.brandName || 'TRADER 365',
          tagline: data.tagline || '',
          logo: data.logo || data.primaryImage || '',
          title: data.title || 'About Us',
          description: data.description || '',
          aboutBody: data.aboutBody || '',
          aboutFooter: data.aboutFooter || '',
          secondaryImage: data.secondaryImage || '',
          featureCards: Array.isArray(data.featureCards) && data.featureCards.length
            ? data.featureCards.map(card => ({
                title: card.title || '',
                items: Array.isArray(card.items) && card.items.length
                  ? card.items.map(item => ({
                      iconUrl: item.iconUrl || (item.icon?.startsWith('http') ? item.icon : ''),
                      text: item.text || ''
                    }))
                  : [emptyItem()]
              }))
            : defaultCards()
        })
        setExistingId(data._id || null)
      } else {
        setForm(emptyForm)
        setExistingId(null)
      }
    } catch {
      toast.error('Failed to load About data')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchAbout()
    })
  }, [])

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const updateCard = (index, patch) => {
    setForm(prev => ({
      ...prev,
      featureCards: prev.featureCards.map((card, i) => (i === index ? { ...card, ...patch } : card))
    }))
  }

  const updateItem = (cardIndex, itemIndex, patch) => {
    setForm(prev => ({
      ...prev,
      featureCards: prev.featureCards.map((card, i) =>
        i === cardIndex
          ? {
              ...card,
              items: card.items.map((item, j) => (j === itemIndex ? { ...item, ...patch } : item))
            }
          : card
      )
    }))
  }

  const addCard = () => {
    setForm(prev => ({
      ...prev,
      featureCards: [...prev.featureCards, { title: 'New card', items: [emptyItem()] }]
    }))
  }

  const removeCard = index => {
    setForm(prev => ({
      ...prev,
      featureCards: prev.featureCards.filter((_, i) => i !== index)
    }))
  }

  const addItem = cardIndex => {
    setForm(prev => ({
      ...prev,
      featureCards: prev.featureCards.map((card, i) =>
        i === cardIndex ? { ...card, items: [...card.items, emptyItem()] } : card
      )
    }))
  }

  const removeItem = (cardIndex, itemIndex) => {
    setForm(prev => ({
      ...prev,
      featureCards: prev.featureCards.map((card, i) =>
        i === cardIndex
          ? { ...card, items: card.items.filter((_, j) => j !== itemIndex) }
          : card
      )
    }))
  }

  const handleItemIconSelect = async (cardIndex, itemIndex, file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Icon size should not exceed 2MB')
      return
    }

    const key = `${cardIndex}-${itemIndex}`
    setItemUploading(key)
    try {
      const { fileUrl } = await uploadToS3(file)
      updateItem(cardIndex, itemIndex, { iconUrl: fileUrl })
      toast.success('Icon uploaded')
    } catch {
      toast.error('Icon upload failed')
    } finally {
      setItemUploading('')
    }
  }

  const handleLogoSelect = async file => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Logo size should not exceed 8MB')
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const { fileUrl } = await uploadToS3(file, percent => setProgress(percent))
      update('logo', fileUrl)
      toast.success('Logo uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()

    if (!form.logo) {
      toast.error('Upload the complete About logo first')
      return
    }
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Mission and About Us title are required')
      return
    }

    setSaving(true)
    try {
      await api.post('/api/about', {
        ...form,
        brandName: form.brandName.trim() || 'TRADER 365',
        tagline: form.tagline.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        aboutBody: form.aboutBody.trim(),
        aboutFooter: form.aboutFooter.trim(),
        primaryImage: form.logo,
        ...(existingId ? { _id: existingId } : {})
      })
      toast.success('About section saved successfully')
      await fetchAbout({ silent: true })
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save About')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-56 w-full' />
        <Skeleton className='h-56 w-full' />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-3 space-y-0'>
          <div>
            <CardTitle>Complete logo</CardTitle>
            <CardDescription>
              Upload the full artwork (icon, name, and tagline in one image). The app shows this as-is.
            </CardDescription>
          </div>
          {form.logo ? (
            <Button type='button' variant='outline' size='sm' onClick={() => update('logo', '')}>
              Remove
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <MediaUploadField
            label='Logo file'
            hint='PNG or JPG — click or drag the complete logo'
            accept='image/png,image/jpeg,image/webp,image/svg+xml'
            required
            imagePreview={form.logo || undefined}
            uploading={uploading}
            progress={progress}
            objectFit='contain'
            onSelect={handleLogoSelect}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mission</CardTitle>
          <CardDescription>Paragraph under the logo on the About screen.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-1.5'>
            <Label htmlFor='about-mission'>
              Mission <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              id='about-mission'
              value={form.description}
              onChange={e => update('description', e.target.value)}
              rows={5}
              required
              placeholder='Our mission is to transform trading performance…'
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-3 space-y-0'>
          <div>
            <CardTitle>Feature cards</CardTitle>
            <CardDescription>Carousel cards such as Performance Tools. Click the square to upload each item’s icon.</CardDescription>
          </div>
          <Button type='button' variant='outline' size='sm' onClick={addCard}>
            <Plus className='size-4' />
            Add card
          </Button>
        </CardHeader>
        <CardContent className='space-y-4'>
          {form.featureCards.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No cards yet. Add one to show a carousel on the app.</p>
          ) : (
            form.featureCards.map((card, cardIndex) => (
              <div key={`card-${cardIndex}`} className='space-y-3 rounded-xl border p-4'>
                <div className='flex items-end gap-2'>
                  <div className='min-w-0 flex-1 space-y-1.5'>
                    <Label>Card title</Label>
                    <Input
                      value={card.title}
                      onChange={e => updateCard(cardIndex, { title: e.target.value })}
                      placeholder='Performance Tools'
                    />
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => removeCard(cardIndex)}
                    aria-label='Remove card'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>

                <div className='space-y-2'>
                  {card.items.map((item, itemIndex) => {
                    const uploadKey = `${cardIndex}-${itemIndex}`
                    const busy = itemUploading === uploadKey
                    return (
                      <div key={`item-${cardIndex}-${itemIndex}`} className='grid gap-2 sm:grid-cols-[4.5rem_1fr_auto]'>
                        <label className='relative flex size-11 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40'>
                          <input
                            type='file'
                            accept='image/png,image/jpeg,image/webp,image/svg+xml'
                            className='sr-only'
                            disabled={busy}
                            onChange={e => {
                              handleItemIconSelect(cardIndex, itemIndex, e.target.files?.[0])
                              e.target.value = ''
                            }}
                          />
                          {item.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.iconUrl} alt='' className='size-full object-contain p-1' />
                          ) : (
                            <ImageIcon className='size-4 text-muted-foreground' />
                          )}
                          {busy ? (
                            <span className='absolute inset-0 grid place-items-center bg-background/70 text-[10px]'>
                              …
                            </span>
                          ) : null}
                        </label>
                        <Input
                          value={item.text}
                          onChange={e => updateItem(cardIndex, itemIndex, { text: e.target.value })}
                          placeholder='Feature description'
                        />
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() => removeItem(cardIndex, itemIndex)}
                          aria-label='Remove item'
                        >
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    )
                  })}
                </div>

                <Button type='button' variant='outline' size='sm' onClick={() => addItem(cardIndex)}>
                  <Plus className='size-4' />
                  Add item
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Us card</CardTitle>
          <CardDescription>Last carousel card with the company story.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='about-card-title'>
              Card title <span className='text-destructive'>*</span>
            </Label>
            <Input
              id='about-card-title'
              value={form.title}
              onChange={e => update('title', e.target.value)}
              required
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='about-card-body'>Body</Label>
            <Textarea
              id='about-card-body'
              value={form.aboutBody}
              onChange={e => update('aboutBody', e.target.value)}
              rows={5}
              placeholder='Trader 365 was built for traders who want more than a strategy…'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='about-card-footer'>Footer line</Label>
            <Input
              id='about-card-footer'
              value={form.aboutFooter}
              onChange={e => update('aboutFooter', e.target.value)}
              placeholder='Trading just got better.'
            />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <Button type='submit' disabled={saving || uploading || Boolean(itemUploading)}>
          <Save className='size-4' />
          {saving ? 'Saving…' : existingId ? 'Save changes' : 'Publish about'}
        </Button>
      </div>
    </form>
  )
}
