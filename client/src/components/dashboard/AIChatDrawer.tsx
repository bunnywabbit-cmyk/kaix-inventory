import { Loader2, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../../lib/api'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

const QUICK_QUESTIONS = [
  'What were my top 3 best-selling shirt designs this month?',
  'Do I have enough Gildan L Black blanks for pending orders?',
  'Which screens are dirty and need to be reclaimed right now?',
  'What is my total sales revenue for this week compared to last week?',
]

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-slate-200 px-1 py-0.5 text-[11px] dark:bg-slate-700">{children}</code>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-slate-200 px-2 py-1 text-left font-semibold dark:border-slate-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-200 px-2 py-1 dark:border-slate-800">{children}</td>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-sky-600 underline dark:text-sky-400">
      {children}
    </a>
  ),
}

function AIChatDrawer() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, open])

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || sending) return

    // conversationHistory is everything BEFORE this new turn — the server
    // appends `message` itself, so sending it twice would duplicate the turn.
    const conversationHistory = messages.map(({ role, content }) => ({ role, content }))

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setSending(true)

    try {
      const result = await api.post<{ reply: string }>('/ai/chat', {
        message: text,
        conversationHistory,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
          isError: true,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    handleSend()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI assistant"
        className={`fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-transform hover:scale-105 dark:bg-slate-100 dark:text-slate-900 ${
          open ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <Sparkles className="size-6" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close AI assistant"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px] dark:bg-slate-950/50"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-sky-600 dark:text-sky-400" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Kaix AI Assistant
                  </h3>
                  <p className="text-xs text-slate-400">Sales, inventory, screens & production</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">
                  Ask about sales, inventory, screens, or production — I&rsquo;ll pull real figures
                  from your shop data instead of guessing.
                </p>
              )}
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : msg.isError
                          ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
                    <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-slate-400" />
                  </div>
                </div>
              )}
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                {QUICK_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => handleSend(question)}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-left text-xs text-slate-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
            >
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about sales, inventory, screens..."
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  )
}

export default AIChatDrawer
