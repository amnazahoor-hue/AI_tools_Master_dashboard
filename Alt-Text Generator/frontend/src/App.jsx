import { useMemo, useState } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5101'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [altText, setAltText] = useState('')
  const [keywords, setKeywords] = useState([])
  const [error, setError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')

  // Build a temporary browser URL to preview the uploaded image.
  const previewUrl = useMemo(() => {
    if (!selectedFile) return ''
    return URL.createObjectURL(selectedFile)
  }, [selectedFile])

  const resetResultState = () => {
    setAltText('')
    setKeywords([])
    setError('')
    setCopyMessage('')
  }

  const handleFileSelect = (file) => {
    if (!file) return
    setSelectedFile(file)
    resetResultState()
  }

  const handleInputChange = (event) => {
    const file = event.target.files?.[0]
    handleFileSelect(file)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    handleFileSelect(file)
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Please upload an image first.')
      return
    }

    setIsLoading(true)
    setError('')
    setCopyMessage('')

    try {
      const formData = new FormData()
      formData.append('image', selectedFile)

      const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setAltText(response.data?.alt_text ?? '')
      setKeywords(Array.isArray(response.data?.keywords) ? response.data.keywords : [])
    } catch (requestError) {
      const message =
        requestError?.response?.data?.error || 'Failed to analyze image. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyAltText = async () => {
    if (!altText) return

    try {
      await navigator.clipboard.writeText(altText)
      setCopyMessage('Alt-text copied to clipboard.')
    } catch (clipboardError) {
      setCopyMessage('Copy failed. Please copy manually.')
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <header className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">
                AI SEO SUITE
              </p>
              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                Smart Image SEO Generator
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                Upload once, get accessibility-first alt text and SEO-focused keywords in seconds.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              {selectedFile ? 'Image Ready' : 'Waiting For Upload'}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white">Upload & Analyze</h2>
            <p className="mt-1 text-sm text-slate-300">
              Drag and drop your file for a smoother workflow, or browse manually.
            </p>

            <div
              className={`mt-5 rounded-2xl border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? 'border-cyan-300 bg-cyan-400/10 shadow-[0_0_0_4px_rgba(34,211,238,0.1)]'
                  : 'border-slate-600 bg-slate-900/40'
              }`}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <p className="text-base font-medium text-slate-100">Drop your image here</p>
              <p className="my-2 text-sm text-slate-400">or click below</p>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25">
                Select Image
                <input type="file" accept="image/*" onChange={handleInputChange} className="hidden" />
              </label>

              {selectedFile && (
                <p className="mt-4 rounded-lg bg-slate-800/70 px-3 py-2 text-sm text-slate-200">
                  {selectedFile.name}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isLoading ? 'Analyzing Image...' : 'Generate SEO Output'}
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white">Image Preview</h2>
            <p className="mt-1 text-sm text-slate-300">Instant preview before generating results.</p>
            <div className="mt-5 flex h-80 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded preview"
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <p className="text-sm text-slate-400">No image uploaded yet.</p>
              )}
            </div>
          </section>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-300/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {(altText || keywords.length > 0) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">Generated Alt Text</h3>
                <button
                  type="button"
                  onClick={handleCopyAltText}
                  className="rounded-lg border border-slate-500/60 bg-slate-800/80 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-slate-700"
                >
                  Copy
                </button>
              </div>
              <p className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-4 leading-relaxed text-slate-200">
                {altText || 'No alt-text generated.'}
              </p>
              {copyMessage && <p className="mt-2 text-sm text-emerald-300">{copyMessage}</p>}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
              <h3 className="text-lg font-semibold text-white">SEO Keywords</h3>
              {keywords.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <li
                      key={keyword}
                      className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-100"
                    >
                      {keyword}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No keywords generated.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
