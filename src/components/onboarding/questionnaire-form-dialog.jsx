'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/api'
import { uploadToS3 } from '@/lib/upload'
import { MediaUploadField } from '@/components/resources/media-upload-field'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const emptyQuestion = () => ({ text: '', image: '' })

export default function QuestionnaireFormDialog({ open, onOpenChange, questionnaire, onSaved }) {
  const [title, setTitle] = useState('')
  const [subTitle, setSubTitle] = useState('')
  const [imagesEnabled, setImagesEnabled] = useState(true)
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [progress, setProgress] = useState(0)
  const isEdit = Boolean(questionnaire?._id)

  useEffect(() => {
    if (!open) return

    if (questionnaire) {
      setTitle(questionnaire.title || '')
      setSubTitle(questionnaire.subTitle || '')
      setImagesEnabled(questionnaire.images ?? true)
      setQuestions(
        Array.isArray(questionnaire.questions) && questionnaire.questions.length > 0
          ? questionnaire.questions.map(q => ({ text: q.text || '', image: q.image || '' }))
          : [emptyQuestion()]
      )
    } else {
      setTitle('')
      setSubTitle('')
      setImagesEnabled(true)
      setQuestions([emptyQuestion()])
    }

    setErrors({})
    setUploadingIndex(null)
    setProgress(0)
  }, [open, questionnaire])

  const updateQuestion = (index, key, value) => {
    setQuestions(prev => prev.map((q, i) => (i === index ? { ...q, [key]: value } : q)))
    if (errors.questions) setErrors(prev => ({ ...prev, questions: undefined }))
  }

  const addQuestion = () => {
    setQuestions(prev => [...prev, emptyQuestion()])
  }

  const removeQuestion = index => {
    setQuestions(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleImageSelect = async (file, index) => {
    if (!file) return

    setUploadingIndex(index)
    setProgress(0)

    try {
      const { fileUrl } = await uploadToS3(file, percent => setProgress(percent || 0))
      updateQuestion(index, 'image', fileUrl)
      toast.success('Image uploaded successfully')
    } catch (err) {
      toast.error(err.message || 'Image upload failed')
    } finally {
      setUploadingIndex(null)
      setProgress(0)
    }
  }

  const validate = () => {
    const next = {}
    if (!title.trim()) next.title = 'Title is required'
    if (!subTitle.trim()) next.subTitle = 'Subtitle is required'

    const hasTextQuestion = questions.some(q => q.text?.trim())
    if (!hasTextQuestion) next.questions = 'Add at least one question with text'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    if (saving || confirmOpen) return
    setConfirmOpen(true)
  }

  const confirmAction = async () => {
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        subTitle: subTitle.trim(),
        images: imagesEnabled,
        questions: questions
          .filter(q => q.text?.trim())
          .map(q => ({
            text: q.text.trim(),
            image: imagesEnabled ? q.image || '' : ''
          }))
      }

      if (isEdit) {
        await api.put(`/api/onboarding/questionnaire/${questionnaire._id}`, payload)
        onSaved?.()
        onOpenChange?.(false)
        return 'Questionnaire updated successfully'
      }

      await api.post('/api/onboarding/questionnaire', payload)
      onSaved?.()
      onOpenChange?.(false)
      return 'Questionnaire created successfully'
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to save questionnaire')
    } finally {
      setSaving(false)
    }
  }

  const uploading = uploadingIndex !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>{isEdit ? 'Edit questionnaire' : 'Add questionnaire'}</DialogTitle>
          <DialogDescription>Onboarding questions shown to new users.</DialogDescription>
        </DialogHeader>

        <form
          id='questionnaire-form'
          onSubmit={handleSubmit}
          className='scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto pr-1'
        >
          <div className='space-y-3'>
            <div className='space-y-1.5'>
              <Label htmlFor='questionnaire-title'>Title</Label>
              <Input
                id='questionnaire-title'
                value={title}
                onChange={e => {
                  setTitle(e.target.value)
                  if (errors.title) setErrors(prev => ({ ...prev, title: undefined }))
                }}
                required
              />
              {errors.title ? <p className='text-xs text-destructive'>{errors.title}</p> : null}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='questionnaire-subtitle'>Subtitle</Label>
              <Input
                id='questionnaire-subtitle'
                value={subTitle}
                onChange={e => {
                  setSubTitle(e.target.value)
                  if (errors.subTitle) setErrors(prev => ({ ...prev, subTitle: undefined }))
                }}
                required
              />
              {errors.subTitle ? <p className='text-xs text-destructive'>{errors.subTitle}</p> : null}
            </div>

            <div className='flex items-center justify-between gap-3 rounded-xl border p-3'>
              <div>
                <p className='text-sm font-medium'>Allow images on questions</p>
                <p className='text-xs text-muted-foreground'>
                  When enabled, each question can include an optional image.
                </p>
              </div>
              <Switch checked={imagesEnabled} onCheckedChange={setImagesEnabled} />
            </div>
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <div>
                <p className='text-sm font-medium'>Questions</p>
                <p className='text-xs text-muted-foreground'>Add one or more prompts.</p>
              </div>
              <Button type='button' variant='outline' size='sm' onClick={addQuestion}>
                <Plus className='size-4' />
                Add question
              </Button>
            </div>

            {errors.questions ? <p className='text-xs text-destructive'>{errors.questions}</p> : null}

            <div className='space-y-3'>
              {questions.map((question, index) => (
                <div key={index} className='space-y-3 rounded-xl border p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-sm font-medium'>Question {index + 1}</p>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='text-destructive hover:text-destructive'
                      onClick={() => removeQuestion(index)}
                      disabled={questions.length <= 1}
                    >
                      <Trash2 className='size-4' />
                      Remove
                    </Button>
                  </div>

                  <div className='space-y-1.5'>
                    <Label htmlFor={`question-text-${index}`}>Question text</Label>
                    <Input
                      id={`question-text-${index}`}
                      value={question.text}
                      onChange={e => updateQuestion(index, 'text', e.target.value)}
                      placeholder='Enter question…'
                      required
                    />
                  </div>

                  {imagesEnabled ? (
                    <MediaUploadField
                      label='Image'
                      hint='Optional image'
                      accept='image/*'
                      imagePreview={question.image || undefined}
                      uploading={uploadingIndex === index}
                      progress={progress}
                      onSelect={file => handleImageSelect(file, index)}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter className='shrink-0'>
          <Button variant='outline' onClick={() => onOpenChange?.(false)} disabled={saving || uploading}>
            Cancel
          </Button>
          <Button type='submit' form='questionnaire-form' disabled={saving || confirmOpen || uploading}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={isEdit ? 'Update questionnaire?' : 'Add questionnaire?'}
      description={isEdit ? 'This will update the onboarding questionnaire.' : 'This will create a new onboarding questionnaire.'}
      confirmText={isEdit ? 'Update' : 'Create'}
      destructive={false}
      onConfirm={confirmAction}
    />
  )
}
