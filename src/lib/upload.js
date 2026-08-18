'use client'

import api from '@/lib/api'

const EXT_MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.webm': 'audio/webm',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
}

const resolveContentType = file => {
  if (file?.type && file.type !== 'application/octet-stream') return file.type

  const name = file?.name || ''
  const lastDot = name.lastIndexOf('.')
  const ext = lastDot !== -1 ? name.slice(lastDot).toLowerCase() : ''

  return EXT_MIME[ext] || file?.type || 'application/octet-stream'
}

/**
 * Upload a file via backend-presigned S3 PUT.
 * @returns {{ fileUrl: string, fileKey: string }}
 */
export async function uploadToS3(file, onProgress) {
  if (!file) throw new Error('No file provided')

  const originalName = file.name || 'upload'
  const lastDot = originalName.lastIndexOf('.')
  const ext = lastDot !== -1 ? originalName.slice(lastDot).toLowerCase() : ''
  const baseRaw = lastDot !== -1 ? originalName.slice(0, lastDot) : originalName

  const baseSanitized = baseRaw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const sanitizedFileName = `${baseSanitized || 'file'}-${Date.now()}${ext}`
  const contentType = resolveContentType(file)

  const res = await api.get(
    `/api/file/upload-url?fileName=${encodeURIComponent(sanitizedFileName)}&contentType=${encodeURIComponent(contentType)}`
  )

  const { uploadUrl, fileKey, publicUrl } = res.data

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)

    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const fileUrl = publicUrl || `https://trader-store.s3.eu-north-1.amazonaws.com/${fileKey}`
        resolve({ fileUrl, fileKey })
      } else {
        reject(new Error('Upload failed'))
      }
    }

    xhr.onerror = () => reject(new Error('Upload error'))
    xhr.send(file)
  })
}
