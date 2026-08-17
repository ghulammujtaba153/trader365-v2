'use client'

import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
import DashboardHeader from '@/components/layout/dashboard-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const emptyFeature = () => ({ title: '', description: '', icons: '' })

const emptyForm = () => ({
  title: '',
  description: '',
  features: [emptyFeature()],
  showIcons: false
})

export default function WelcomeScreenPage() {
  const [data, setData] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [progress, setProgress] = useState(0)

  const fetchData = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      const res = await api.get('/api/welcome')
      const payload = res.data || {}
      setData({
        title: payload.title || '',
        description: payload.description || '',
        features:
          Array.isArray(payload.features) && payload.features.length > 0
            ? payload.features.map(f => ({
                title: f.title || '',
                description: f.description || '',
                icons: f.icons || ''
              }))
            : [emptyFeature()],
        showIcons: Boolean(payload.showIcons)
      })
    } catch (err) {
      if (err.response?.status === 404) {
        setData(emptyForm())
      } else {
        toast.error(err.response?.data?.message || 'Failed to load welcome screen')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      fetchData()
    })
  }, [])

  const updateFeature = (index, field, value) => {
    setData(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => (i === index ? { ...feature, [field]: value } : feature))
    }))
  }

  const addFeature = () => {
    setData(prev => ({
      ...prev,
      features: [...prev.features, emptyFeature()]
    }))
  }

  const removeFeature = index => {
    setData(prev => ({
      ...prev,
      features: prev.features.length <= 1 ? prev.features : prev.features.filter((_, i) => i !== index)
    }))
  }

  const handleIconSelect = async (file, index) => {
    if (!file) return

    setUploadingIndex(index)
    setProgress(0)

    try {
      const { fileUrl } = await uploadToS3(file, percent => setProgress(percent || 0))
      updateFeature(index, 'icons', fileUrl)
      toast.success('Icon uploaded successfully')
    } catch (err) {
      toast.error(err.message || 'Icon upload failed')
    } finally {
      setUploadingIndex(null)
      setProgress(0)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/api/welcome', data)
      toast.success('Welcome page saved successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save welcome screen')
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = async () => {
    await fetchData({ silent: true })
    toast.success('Refreshed')
  }

  const uploading = uploadingIndex !== null

  return (
    <>
      <DashboardHeader
        title='Welcome Screen'
        description='Configure the welcome page shown to new users during onboarding.'
      />

      <main className='flex-1 space-y-4 px-4 py-4 md:px-6 md:pb-6'>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          <Button variant='outline' onClick={handleRefresh} disabled={loading || saving}>
            <RefreshCw className='size-4' />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={loading || saving || uploading}>
            <Save className='size-4' />
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        {loading ? (
          <div className='space-y-3'>
            <Skeleton className='h-48 w-full' />
            <Skeleton className='h-64 w-full' />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Main content</CardTitle>
                <CardDescription>Title, description, and icon visibility.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='welcome-title'>Title</Label>
                  <Input
                    id='welcome-title'
                    value={data.title}
                    onChange={e => setData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder='Welcome title'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='welcome-description'>Description</Label>
                  <Textarea
                    id='welcome-description'
                    value={data.description}
                    onChange={e => setData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder='Welcome description'
                    rows={4}
                  />
                </div>

                <div className='flex items-center justify-between gap-3 rounded-xl border p-3'>
                  <div>
                    <p className='text-sm font-medium'>Show icons</p>
                    <p className='text-xs text-muted-foreground'>
                      Toggle to show or hide feature icons on the welcome page.
                    </p>
                  </div>
                  <Switch
                    checked={data.showIcons}
                    onCheckedChange={checked => setData(prev => ({ ...prev, showIcons: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-start justify-between gap-3 space-y-0'>
                <div>
                  <CardTitle>Features</CardTitle>
                  <CardDescription>Feature cards shown on the welcome screen.</CardDescription>
                </div>
                <Button type='button' variant='outline' size='sm' onClick={addFeature}>
                  <Plus className='size-4' />
                  Add feature
                </Button>
              </CardHeader>
              <CardContent className='space-y-3'>
                {data.features.map((feature, index) => (
                  <Card key={index} className='ring-1 ring-foreground/10'>
                    <CardContent className='space-y-3 pt-4'>
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-sm font-medium'>Feature {index + 1}</p>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='text-destructive hover:text-destructive'
                          onClick={() => removeFeature(index)}
                          disabled={data.features.length <= 1}
                        >
                          <Trash2 className='size-4' />
                          Remove
                        </Button>
                      </div>

                      <div className='grid gap-3 sm:grid-cols-2'>
                        <div className='space-y-1.5'>
                          <Label htmlFor={`feature-title-${index}`}>Title</Label>
                          <Input
                            id={`feature-title-${index}`}
                            value={feature.title}
                            onChange={e => updateFeature(index, 'title', e.target.value)}
                            placeholder='Feature title'
                          />
                        </div>
                        <div className='space-y-1.5'>
                          <Label htmlFor={`feature-description-${index}`}>Description</Label>
                          <Input
                            id={`feature-description-${index}`}
                            value={feature.description}
                            onChange={e => updateFeature(index, 'description', e.target.value)}
                            placeholder='Feature description'
                          />
                        </div>
                      </div>

                      <MediaUploadField
                        label='Icon'
                        hint='Upload feature icon'
                        accept='image/*'
                        imagePreview={feature.icons || undefined}
                        uploading={uploadingIndex === index}
                        progress={progress}
                        onSelect={file => handleIconSelect(file, index)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </>
  )
}
