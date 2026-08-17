'use client'

import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Underline as UnderlineIcon,
  Undo2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function ToolbarButton({ active, disabled, onClick, children, title }) {
  return (
    <Button
      type='button'
      variant={active ? 'secondary' : 'ghost'}
      size='icon-sm'
      disabled={disabled}
      onClick={onClick}
      title={title}
      className='shrink-0'
    >
      {children}
    </Button>
  )
}

export default function RichTextEditor({ value = '', onChange, disabled = false }) {
  const [showSource, setShowSource] = useState(false)
  const [sourceCode, setSourceCode] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] }
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] })
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML())
    }
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const next = value || ''
    if (next !== current) {
      editor.commands.setContent(next, false)
    }
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  const setLink = () => {
    if (!editor || disabled) return
    const previous = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', previous || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const toggleSource = () => {
    if (!editor) return
    if (!showSource) {
      setSourceCode(editor.getHTML())
      setShowSource(true)
      return
    }
    editor.commands.setContent(sourceCode || '', false)
    onChange?.(editor.getHTML())
    setShowSource(false)
  }

  if (!editor) {
    return (
      <div className='min-h-[200px] rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground'>
        Loading editor…
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', disabled && 'opacity-70')}>
      {!showSource ? (
        <div className='flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1'>
          <ToolbarButton
            title='Bold'
            disabled={disabled}
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Italic'
            disabled={disabled}
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Underline'
            disabled={disabled}
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Heading 1'
            disabled={disabled}
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Heading 2'
            disabled={disabled}
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Bullet list'
            disabled={disabled}
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Ordered list'
            disabled={disabled}
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Align left'
            disabled={disabled}
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Align center'
            disabled={disabled}
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Align right'
            disabled={disabled}
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className='size-4' />
          </ToolbarButton>
          <ToolbarButton title='Link' disabled={disabled} active={editor.isActive('link')} onClick={setLink}>
            <Link2 className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Undo'
            disabled={disabled || !editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className='size-4' />
          </ToolbarButton>
          <ToolbarButton
            title='Redo'
            disabled={disabled || !editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className='size-4' />
          </ToolbarButton>
          <ToolbarButton title='HTML source' disabled={disabled} onClick={toggleSource}>
            <Code2 className='size-4' />
          </ToolbarButton>
        </div>
      ) : (
        <div className='flex justify-end'>
          <Button type='button' variant='outline' size='sm' disabled={disabled} onClick={toggleSource}>
            Back to editor
          </Button>
        </div>
      )}

      {showSource ? (
        <Textarea
          value={sourceCode}
          disabled={disabled}
          onChange={e => {
            setSourceCode(e.target.value)
            onChange?.(e.target.value)
          }}
          className='min-h-[200px] font-mono text-xs'
          spellCheck={false}
        />
      ) : (
        <EditorContent
          editor={editor}
          className={cn(
            'rounded-lg border border-border bg-background px-3 py-2',
            '[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none',
            '[&_.ProseMirror_p]:mb-3 [&_.ProseMirror_p]:leading-relaxed',
            '[&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold',
            '[&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold',
            '[&_.ProseMirror_ul]:mb-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5',
            '[&_.ProseMirror_ol]:mb-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5',
            '[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline',
            disabled && 'pointer-events-none'
          )}
        />
      )}
    </div>
  )
}
