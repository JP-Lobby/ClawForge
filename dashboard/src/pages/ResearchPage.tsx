import { useApi } from '../hooks/useApi'
import { fetchResearchFiles, fetchResearchFile } from '../api/endpoints'
import { LoadingState, ErrorState } from '../components/ErrorState'
import MarkdownView from '../components/MarkdownView'
import { useState } from 'react'
import { FileText, Calendar, Search as SearchIcon } from 'lucide-react'

interface ResearchFile {
  filename: string
  sizeBytes: number
  modifiedAt: number
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString()
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function ResearchPage() {
  const { data: files, loading, error, refresh } = useApi<ResearchFile[]>(fetchResearchFiles, [])
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { data: fileContent, loading: fileLoading } = useApi<{ content: string } | null>(
    () => selected ? fetchResearchFile(selected) : Promise.resolve(null),
    [selected]
  )

  const filtered = (files ?? []).filter(f =>
    !search || f.filename.toLowerCase().includes(search.toLowerCase())
  )

  if (loading && !files) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Research</h1>
        <p className="text-gray-400 text-sm mt-1">Reports saved by the research tool</p>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* File list */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              className="w-full bg-gray-900 border border-gray-800 rounded px-3 pl-8 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="Search files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filtered.map((file: ResearchFile) => (
              <button
                key={file.filename}
                onClick={() => setSelected(file.filename)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected === file.filename
                    ? 'bg-indigo-900/40 border-indigo-700 text-indigo-200'
                    : 'bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileText size={14} className="flex-shrink-0 mt-0.5 text-gray-500" />
                  <div className="min-w-0">
                    <div className="text-xs font-mono truncate" title={file.filename}>{file.filename}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{fmtSize(file.sizeBytes)}</span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {fmtDate(file.modifiedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                {search ? 'No matching files.' : 'No research files yet.'}
              </div>
            )}
          </div>
        </div>

        {/* Content viewer */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-lg overflow-y-auto p-4">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Select a file to view its contents
            </div>
          ) : fileLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">Loading…</div>
          ) : fileContent ? (
            <MarkdownView content={fileContent.content} />
          ) : (
            <div className="text-gray-500 text-sm">Failed to load file.</div>
          )}
        </div>
      </div>
    </div>
  )
}
