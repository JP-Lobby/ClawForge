export default function MarkdownView({ content }: { content: string }) {
  return (
    <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded p-4 overflow-auto max-h-96 font-mono leading-relaxed">
      {content}
    </pre>
  );
}

export { MarkdownView }
