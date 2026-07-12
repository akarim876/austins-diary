import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ImageIcon } from 'lucide-react'

interface Props {
  /** Storage path ("uid/pid/file.jpg"), a full Supabase storage URL, or null */
  path: string | null | undefined
  alt: string
  className?: string
  expiresIn?: number
}

const BUCKET = 'diary-photos'

/**
 * Extract the raw storage path from any Supabase storage URL variant.
 * Handles /object/public/..., /object/sign/..., and /object/authenticated/...
 */
function extractPath(url: string): string | null {
  const patterns = [
    `/object/public/${BUCKET}/`,
    `/object/sign/${BUCKET}/`,
    `/object/authenticated/${BUCKET}/`,
  ]
  for (const p of patterns) {
    const idx = url.indexOf(p)
    if (idx !== -1) {
      // Strip any query string (e.g. ?token=...)
      return url.slice(idx + p.length).split('?')[0]
    }
  }
  return null
}

async function toSignedUrl(rawPath: string, expiresIn: number): Promise<string> {
  // If rawPath is a full URL, extract just the path portion first
  const storagePath = rawPath.startsWith('http')
    ? extractPath(rawPath) ?? rawPath
    : rawPath

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export function SecureImage({ path, alt, className, expiresIn = 3600 }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  useEffect(() => {
    if (!path) { setStatus('idle'); setSrc(null); return }

    setStatus('loading')
    toSignedUrl(path, expiresIn)
      .then(url => { setSrc(url); setStatus('ready') })
      .catch(err => {
        console.error('SecureImage – failed to sign URL:', err, '\npath:', path)
        setStatus('error')
      })
  }, [path, expiresIn])

  if (status === 'idle' || !path) return null

  if (status === 'loading') {
    return (
      <div className={`bg-gray-100 animate-pulse flex items-center justify-center ${className ?? ''}`}>
        <ImageIcon className="w-6 h-6 text-gray-300" />
      </div>
    )
  }

  if (status === 'error' || !src) {
    return (
      <div className={`bg-gray-100 flex flex-col items-center justify-center gap-1 ${className ?? ''}`}>
        <ImageIcon className="w-5 h-5 text-gray-300" />
        <span className="text-xs text-gray-400">Photo unavailable</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        console.error('SecureImage – img tag failed to load:', src)
        setStatus('error')
      }}
    />
  )
}
