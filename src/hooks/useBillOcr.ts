'use client'

import { useCallback, useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'

export function useBillOcr() {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null)

  const recognize = useCallback(async (file: File) => {
    setIsProcessing(true)
    setProgress(0)
    setStatus('Preparing OCR…')
    try {
      const worker = await createWorker('eng', 1, {
        logger: message => {
          if (message.status) setStatus(message.status)
          if (typeof message.progress === 'number') setProgress(Math.round(message.progress * 100))
        },
      })
      workerRef.current = worker
      const result = await worker.recognize(file)
      setProgress(100)
      return result.data.text
    } finally {
      if (workerRef.current) await workerRef.current.terminate()
      workerRef.current = null
      setIsProcessing(false)
    }
  }, [])

  return { recognize, progress, status, isProcessing }
}
