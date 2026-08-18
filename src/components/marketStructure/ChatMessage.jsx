import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Markdown → styled elements, using the dashboard's own CSS variables so it
 * matches light/dark theme automatically. No typography plugin installed, so
 * every element is mapped explicitly rather than relying on a `prose` class.
 */
const MARKDOWN_COMPONENTS = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-bold" style={{ color: 'var(--dash-text-primary)' }}>{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 last:mb-0 list-disc space-y-0.5 pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 last:mb-0 list-decimal space-y-0.5 pl-4">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>
      {children}
    </a>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="rounded px-1 py-0.5 text-[11px]" style={{ backgroundColor: 'var(--dash-bg-input)', color: 'var(--accent)' }}>
        {children}
      </code>
    ) : (
      <code className="text-[11px]">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg p-2.5 text-[11px]" style={{ backgroundColor: 'var(--dash-bg-input)' }}>
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 pl-2.5 italic" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-muted)' }}>
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <p className="mb-1 text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>{children}</p>,
  h2: ({ children }) => <p className="mb-1 text-sm font-bold" style={{ color: 'var(--dash-text-primary)' }}>{children}</p>,
  h3: ({ children }) => <p className="mb-1 text-xs font-bold" style={{ color: 'var(--dash-text-primary)' }}>{children}</p>,
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b px-1.5 py-1 text-left font-bold" style={{ borderColor: 'var(--dash-border)', color: 'var(--dash-text-secondary)' }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b px-1.5 py-1" style={{ borderColor: 'var(--dash-border)' }}>
      {children}
    </td>
  ),
};

function Avatar({ role, error }) {
  if (role === 'user') {
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ backgroundColor: 'var(--dash-bg-input)', color: 'var(--dash-text-secondary)' }}>
        You
      </div>
    );
  }
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
      style={{
        background: error ? '#f59e0b' : 'linear-gradient(135deg, var(--accent), #818cf8)',
        color: '#0d0f14',
      }}>
      ✦
    </div>
  );
}

/** A single turn in the analyser chat thread — styled like a modern AI assistant panel (Claude, ChatGPT sidebars): right-aligned pill for the user, left-aligned flowing markdown for the assistant. */
export function ChatMessage({ role, content, error }) {
  const isUser = role === 'user';
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar role={role} error={error} />
      <div
        className={`min-w-0 max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={{
          backgroundColor: isUser ? 'rgba(0,212,170,0.12)' : 'var(--dash-bg-input)',
          color: error ? '#f59e0b' : 'var(--dash-text-secondary)',
        }}
      >
        {isUser ? (
          <p className="leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{content}</p>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}

/** Animated "thinking" bubble — the same three-dot pulse pattern used across modern AI chat UIs. */
export function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <Avatar role="assistant" />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm px-3 py-2.5" style={{ backgroundColor: 'var(--dash-bg-input)' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full"
            style={{ backgroundColor: 'var(--dash-text-faint)', animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
