// Client-side file upload with progress tracking using XMLHttpRequest

export interface UploadProgress {
  filename: string
  progress: number // 0-100
  loaded: number // bytes
  total: number // bytes
  eta: number // seconds
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  timeout?: number // milliseconds (default: 5 minutes)
}

/**
 * Upload a file with progress tracking
 * @param file File to upload
 * @param formData FormData containing all form fields
 * @param options Upload options
 * @returns Promise<Response data>
 */
export async function uploadWithProgress(
  file: File,
  formData: FormData,
  options: UploadOptions = {}
): Promise<unknown> {
  const { onProgress, timeout = 300000 } = options // 5 minutes default

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    let lastLoaded = 0
    let lastTime = Date.now()
    let speed = 0 // bytes per second

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return

      // Throttle updates to every 200ms
      const now = Date.now()
      const timeDiff = (now - lastTime) / 1000 // seconds
      if (timeDiff < 0.2 && event.loaded < event.total) return

      // Calculate upload speed with exponential moving average
      const loadedDiff = event.loaded - lastLoaded
      const currentSpeed = loadedDiff / timeDiff

      // EMA with alpha = 0.3 (smoothing)
      speed = speed === 0 ? currentSpeed : speed * 0.7 + currentSpeed * 0.3

      lastLoaded = event.loaded
      lastTime = now

      const remaining = event.total - event.loaded
      const eta = speed > 0 ? Math.round(remaining / speed) : 0

      if (onProgress) {
        onProgress({
          filename: file.name,
          progress: Math.round((event.loaded / event.total) * 100),
          loaded: event.loaded,
          total: event.total,
          eta: Math.max(0, eta),
        })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.response)
          resolve(result)
        } catch {
          resolve(xhr.response)
        }
      } else {
        try {
          const error = JSON.parse(xhr.response)
          reject(new Error(error.error?.message || `Upload failed: ${xhr.status}`))
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }
    }

    xhr.onerror = () => reject(new Error('שגיאת רשת. אנא בדוק את החיבור לאינטרנט'))
    xhr.ontimeout = () => reject(new Error('העלאה חרגה מזמן. אנא נסה שוב'))
    xhr.timeout = timeout

    xhr.open('POST', '/api/admin/projects')
    xhr.send(formData)
  })
}
