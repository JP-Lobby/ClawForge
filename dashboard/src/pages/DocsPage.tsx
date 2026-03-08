import { useState, type ReactNode } from 'react'
import { useApi } from '../hooks/useApi'
import { fetchResearchFiles, fetchResearchFile } from '../api/endpoints'
import { ResearchFile } from '../api/types'
import { FileText, Copy, Check } from 'lucide-react'

function SimpleMarkdown({ content }: { content: string }) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      const code = codeLines.join('\n')
      const id = `code-${i}`
      elements.push(
        <div key={id} className="relative my-3 group">
          <div className="flex items-center justify-between bg-gray-800 rounded-t px-3 py-1.5">
            <span className="text-xs text-gray-500">{lang || 'code'}</span>
            <button
              onClick={() => copyCode(code, id)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {copied === id ? <Check size={11} /> : <Copy size={11} />}
              {copied === id ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-gray-900 border border-gray-800 rounded-b px-4 py-3 text-xs text-gray-300 overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      )
      i++
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold text-gray-100 mt-6 mb-3">{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-semibold text-gray-100 mt-5 mb-2">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-semibold text-gray-200 mt-4 mb-2">{line.slice(4)}</h3>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={i} className="text-sm text-gray-300 ml-4 list-disc">{line.slice(2)}</li>)
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(<li key={i} className="text-sm text-gray-300 ml-4 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>)
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} className="border-l-2 border-indigo-700 pl-3 text-sm text-gray-400 italic my-1">{line.slice(2)}</blockquote>)
    } else if (line === '') {
      elements.push(<br key={i} />)
    } else {
      const formatted = line
        .replace(/`([^`]+)`/g, '<code class="bg-gray-800 text-indigo-300 px-1 rounded text-xs">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-gray-100">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em class="text-gray-300">$1</em>')
      elements.push(<p key={i} className="text-sm text-gray-300 my-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />)
    }
    i++
  }

  return <div className="prose-sm">{elements}</div>
}

export default function DocsPage() {
  const { data: files, loading } = useApi<ResearchFile[]>(fetchResearchFiles, [])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const { data: fileData, loading: fileLoading } = useApi<{ content: string }>(
    () => selectedFile ? fetchResearchFile(selectedFile) : Promise.resolve({ content: '' }),
    [selectedFile]
  )

  return (
    <div className="flex h-full">
      {/* File list */}
      <div className="w-56 border-r border-gray-800 flex flex-col bg-gray-900">
        <div className="p-3 border-b border-gray-800">
          <h1 className="text-sm font-bold text-gray-100">Docs</h1>
          <p className="text-xs text-gray-600 mt-0.5">{(files ?? []).length} files</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading && <p className="text-xs text-gray-600 px-3 py-2">Loading…</p>}
          {(files ?? []).map(file => (
            <button
              key={file.filename}
              onClick={() => setSelectedFile(file.filename)}
              className={`w-full text-left px-3 py-2 transition-colors ${selectedFile === file.filename ? 'bg-indigo-900/40 border-r-2 border-indigo-500' : 'hover:bg-gray-800'}`}
            >
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-gray-500 shrink-0" />
                <span className="text-xs text-gray-300 truncate">{file.filename}</span>
              </div>
              <p className="text-[10px] text-gray-600 mt-0.5 ml-4">{(file.sizeBytes / 1024).toFixed(1)} KB</p>
            </button>
          ))}
          {!loading && (files ?? []).length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">No research files found.</p>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedFile && (
          <div className="flex items-center justify-center h-full text-gray-700">
            <p className="text-sm">Select a file to view</p>
          </div>
        )}
        {selectedFile && fileLoading && (
          <p className="text-gray-500 text-sm">Loading…</p>
        )}
        {selectedFile && !fileLoading && fileData && (
          <div className="max-w-3xl">
            <SimpleMarkdown content={fileData.content} />
          </div>
        )}
      </div>
    </div>
  )
}
