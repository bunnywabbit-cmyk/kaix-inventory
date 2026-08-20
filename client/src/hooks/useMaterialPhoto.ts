import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function useMaterialPhoto(initialUrl: string | null = null) {
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl)
  const [previewSrc, setPreviewSrc] = useState<string | null>(initialUrl)

  useEffect(() => {
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setPreviewSrc(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const handleFileChange = (selected: File | null) => {
    setFile(selected)
    if (!selected) setPreviewSrc(imageUrl)
  }

  const handleRemove = () => {
    setFile(null)
    setImageUrl(null)
    setPreviewSrc(null)
  }

  /** Uploads the pending file (if any) and returns the URL to submit with the form. */
  const resolveImageUrl = async (): Promise<string | null> => {
    if (file) {
      const uploaded = await api.upload('/uploads', file)
      return uploaded.url
    }
    return imageUrl
  }

  return { previewSrc, handleFileChange, handleRemove, resolveImageUrl }
}
