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
          <div className="flex items-center justify-between bg-[#252018] rounded-t px-3 py-1.5">
            <span className="text-xs text-[#5c5040]">{lang || 'code'}</span>
            <button
              onClick={() => copyCode(code, id)}
              className="flex items-center gap-1 text-xs text-[#5c5040] hover:text-[#9c8f80] transition-colors"
            >
              {copied === id ? <Check size={11} /> : <Copy size={11} />}
              {copied === id ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-[#141210] border border-[#2c2520] rounded-b px-4 py-3 text-xs text-[#9c8f80] overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      )
      i++
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-display font-bold text-[#f0ebe4] mt-6 mb-3">{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-display font-semibold text-[#f0ebe4] mt-5 mb-2">{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-base font-display font-semibold text-[#f0ebe4] mt-4 mb-2">{line.slice(4)}</h3>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={i} className="text-sm text-[#9c8f80] ml-4 list-disc">{line.slice(2)}</li>)
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(<li key={i} className="text-sm text-[#9c8f80] ml-4 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>)
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i} className="border-l-2 border-amber-700 pl-3 text-sm text-[#9c8f80] italic my-1">{line.slice(2)}</blockquote>)
    } else if (line === '') {
      elements.push(<br key={i} />)
    } else {
      const formatted = line
        .replace(/`([^`]+)`/g, '<code class="bg-[#252018] text-amber-300 px-1 rounded text-xs">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-[#f0ebe4]">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em class="text-[#9c8f80]">$1</em>')
      elements.push(<p key={i} className="text-sm text-[#9c8f80] my-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />)
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
      <div className="w-56 border-r border-[#2c2520] flex flex-col bg-[#141210]">
        <div className="p-3 border-b border-[#2c2520]">
          <h1 className="text-sm font-display font-bold text-[#f0ebe4]">Docs</h1>
          <p className="text-xs text-[#3a3028] mt-0.5">{(files ?? []).length} files</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading && <p className="text-xs text-[#3a3028] px-3 py-2">Loading…</p>}
          {(files ?? []).map(file => (
            <button
              key={file.filename}
              onClick={() => setSelectedFile(file.filename)}
              className={`w-full text-left px-3 py-2 transition-colors ${selectedFile === file.filename ? 'bg-amber-950/40 border-r-2 border-amber-500' : 'hover:bg-[#252018]'}`}
            >
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-[#5c5040] shrink-0" />
                <span className="text-xs text-[#9c8f80] truncate">{file.filename}</span>
              </div>
              <p className="text-[10px] text-[#3a3028] mt-0.5 ml-4">{(file.sizeBytes / 1024).toFixed(1)} KB</p>
            </button>
          ))}
          {!loading && (files ?? []).length === 0 && (
            <p className="text-xs text-[#3a3028] px-3 py-4 text-center">No research files found.</p>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-y-auto bg-[#0a0907] p-6">
        {!selectedFile && (
          <div className="flex items-center justify-center h-full text-[#3a3028]">
            <p className="text-xs font-mono">Select a file to view</p>
          </div>
        )}
        {selectedFile && fileLoading && (
          <p className="text-[#5c5040] text-xs font-mono">Loading…</p>
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
