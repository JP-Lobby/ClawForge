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
      {/* Sidebar */}
      <div className="w-56 border-r border-gray-800 flex flex-col bg-gray-900">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between">
          <h1 className="text-sm font-bold text-gray-100">Notes</h1>
          <button onClick={handleNew} className="text-indigo-400 hover:text-indigo-300 p-1 rounded">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading && <p className="text-xs text-gray-600 px-3 py-2">Loading…</p>}
          {isNew && (
            <div className="px-3 py-2 bg-indigo-900/40 border-r-2 border-indigo-500">
              <p className="text-sm text-indigo-300">New note…</p>
            </div>
          )}
          {sorted.map(note => (
            <button
              key={note.id}
              onClick={() => setSelectedId(note.id)}
              className={`w-full text-left px-3 py-2 transition-colors group ${selectedId === note.id ? 'bg-indigo-900/40 border-r-2 border-indigo-500' : 'hover:bg-gray-800'}`}
            >
              <div className="flex items-center gap-1.5">
                {note.pinned && <Pin size={10} className="text-indigo-400 shrink-0" />}
                <p className="text-xs text-gray-300 truncate flex-1">
                  {note.content.split('\n')[0].slice(0, 40) || 'Empty note'}
                </p>
              </div>
              <p className="text-[10px] text-gray-600 mt-0.5">{new Date(note.updatedAt).toLocaleDateString()}</p>
            </button>
          ))}
          {!loading && notes.length === 0 && !isNew && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">No notes yet.<br />Click + to create one.</p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {(selectedId || isNew) ? (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <span className="text-xs text-gray-500">
                {isNew ? 'New note (unsaved)' : `Last updated ${new Date(selected?.updatedAt ?? 0).toLocaleString()}`}
              </span>
              <div className="flex items-center gap-2">
                {!isNew && selected && (
                  <>
                    <button
                      onClick={() => handlePin(selected.id, selected.pinned)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${selected.pinned ? 'text-indigo-400 bg-indigo-900/40' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      <Pin size={12} /> {selected.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={() => handleDelete(selected.id)} className="text-gray-600 hover:text-red-400 p-1 rounded transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                {isNew && (
                  <button onClick={handleSaveNew} disabled={!draft.trim()} className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors">
                    Save
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={draft}
              onChange={e => handleDraftChange(e.target.value)}
              placeholder="Write your note here… (Markdown supported)"
              className="flex-1 bg-transparent text-sm text-gray-200 resize-none p-5 focus:outline-none placeholder-gray-700 font-mono leading-relaxed"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <StickyNoteIcon />
              <p className="text-sm mt-2">Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StickyNoteIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto opacity-30">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
