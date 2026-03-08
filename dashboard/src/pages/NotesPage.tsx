import { useState, useEffect, useRef } from 'react'
import { fetchNotes, createNote, updateNote, deleteNote } from '../api/endpoints'
import { Note } from '../api/types'
import { Plus, Pin, Trash2 } from 'lucide-react'

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isNew = selectedId === '__new__'
  const selected = notes.find(n => n.id === selectedId)

  const load = async () => {
    const data = await fetchNotes()
    setNotes(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (selected) setDraft(selected.content)
    else if (!isNew) setDraft('')
  }, [selectedId])

  const handleDraftChange = (value: string) => {
    setDraft(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (selectedId && !isNew) {
      saveTimer.current = setTimeout(async () => {
        await updateNote(selectedId, { content: value })
        setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, content: value, updatedAt: Date.now() } : n))
      }, 1000)
    }
  }

  const handleNew = () => {
    setSelectedId('__new__')
    setDraft('')
  }

  const handleSaveNew = async () => {
    if (!draft.trim()) return
    const note = await createNote(draft.trim())
    setNotes(prev => [note, ...prev])
    setSelectedId(note.id)
  }

  const handlePin = async (id: string, pinned: boolean) => {
    await updateNote(id, { pinned: !pinned })
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !pinned } : n))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return
    await deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selectedId === id) { setSelectedId(null); setDraft('') }
  }

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt - a.createdAt
  })

  return (
    <div className="flex h-full">
      {/* Note list sidebar */}
      <div className="w-56 border-r border-[#2c2520] flex flex-col bg-[#141210]">
        <div className="p-3 border-b border-[#2c2520] flex items-center justify-between">
          <h1 className="text-xs font-display font-bold text-[#f0ebe4] tracking-wide">Notes</h1>
          <button
            onClick={handleNew}
            className="text-amber-500 hover:text-amber-400 p-1 rounded transition-colors"
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading && (
            <div className="px-3 py-2 space-y-1">
              <div className="h-3 w-32 bg-[#252018] rounded animate-pulse" />
              <div className="h-2 w-20 bg-[#1c1816] rounded animate-pulse" />
            </div>
          )}
          {isNew && (
            <div className="px-3 py-2.5 bg-amber-950/30 border-l-2 border-amber-400">
              <p className="text-xs text-amber-300 font-mono">New note…</p>
            </div>
          )}
          {sorted.map(note => (
            <button
              key={note.id}
              onClick={() => setSelectedId(note.id)}
              className={`w-full text-left px-3 py-2.5 transition-all ${
                selectedId === note.id
                  ? 'bg-amber-950/30 border-l-2 border-amber-400'
                  : 'hover:bg-[#252018] border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {note.pinned && <Pin size={9} className="text-amber-400 shrink-0" />}
                <p className="text-xs text-[#f0ebe4] truncate flex-1 font-mono">
                  {note.content.split('\n')[0].slice(0, 40) || 'Empty note'}
                </p>
              </div>
              <p className="text-[9px] text-[#3a3028] mt-0.5 font-mono">
                {new Date(note.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {!loading && notes.length === 0 && !isNew && (
            <p className="text-[10px] text-[#3a3028] px-3 py-4 text-center font-mono">
              No notes yet.<br />Click + to create one.
            </p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {(selectedId || isNew) ? (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2c2520]">
              <span className="text-[10px] text-[#3a3028] font-mono">
                {isNew
                  ? 'New note (unsaved)'
                  : `Last updated ${new Date(selected?.updatedAt ?? 0).toLocaleString()}`
                }
              </span>
              <div className="flex items-center gap-2">
                {!isNew && selected && (
                  <>
                    <button
                      onClick={() => handlePin(selected.id, selected.pinned)}
                      className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors font-mono ${
                        selected.pinned
                          ? 'text-amber-300 bg-amber-950/40'
                          : 'text-[#5c5040] hover:text-[#9c8f80]'
                      }`}
                    >
                      <Pin size={11} /> {selected.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      onClick={() => handleDelete(selected.id)}
                      className="text-[#3a3028] hover:text-red-400 p-1 rounded transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
                {isNew && (
                  <button
                    onClick={handleSaveNew}
                    disabled={!draft.trim()}
                    className="text-[10px] bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-display font-semibold px-3 py-1.5 rounded transition-colors"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={draft}
              onChange={e => handleDraftChange(e.target.value)}
              placeholder="Write your note here… (Markdown supported)"
              className="flex-1 bg-transparent text-xs text-[#f0ebe4] resize-none p-5 focus:outline-none placeholder-[#2c2520] font-mono leading-relaxed"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-[#2c2520]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto opacity-40">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-xs mt-3 font-mono">Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
