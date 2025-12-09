import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Helper to parse inline markdown (Bold, Italic, Links)
  const parseInline = (text: string): React.ReactNode[] => {
    if (!text) return [];

    // Regex for:
    // 1. Links: [text](url)
    // 2. Bold: **text**
    // 3. Italic: *text*
    const regex = /(\[.*?\]\(.*?\))|(\*\*.*?\*\*)|(\*.*?\*)/g;
    
    const parts = text.split(regex).filter(p => p !== undefined && p !== "");
    
    return parts.map((part, index) => {
      // Handle Link
      if (part.match(/^\[(.*?)\]\((.*?)\)$/)) {
        const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
          return (
            <a 
              key={index} 
              href={match[2]} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
            >
              {match[1]}
            </a>
          );
        }
      }
      
      // Handle Bold
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-emerald-300 font-bold">{part.slice(2, -2)}</strong>;
      }

      // Handle Italic
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="text-gray-400 italic">{part.slice(1, -1)}</em>;
      }

      // Plain text
      return <span key={index}>{part}</span>;
    });
  };

  const getConfidenceBadge = (text: string): React.ReactNode | null => {
    const upperText = text.toUpperCase().replace(/\*/g, '').trim(); // Remove asterisks and normalize
    
    if (upperText.includes('EXTREMA')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold bg-amber-950/60 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
          <span className="material-icons text-[10px] mr-1">bolt</span> EXTREMA
        </span>
      );
    }
    if (upperText.includes('ALTA')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold bg-emerald-950/60 text-emerald-400 border-emerald-500/50">
          <span className="material-icons text-[10px] mr-1">check_circle</span> ALTA
        </span>
      );
    }
    if (upperText.includes('MEDIA') || upperText.includes('MÉDIA')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold bg-yellow-950/60 text-yellow-400 border-yellow-500/50">
           <span className="material-icons text-[10px] mr-1">warning</span> MÉDIA
        </span>
      );
    }
    if (upperText.includes('BAIXA')) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded border text-xs font-bold bg-red-950/60 text-red-400 border-red-500/50">
          <span className="material-icons text-[10px] mr-1">block</span> BAIXA
        </span>
      );
    }
    return null;
  };

  // Main rendering logic
  if (!content) return null;
  
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  const renderTable = () => {
    if (tableRows.length === 0) return null;
    
    return (
      <div key={`table-${Math.random()}`} className="overflow-x-auto my-6 border border-gray-700/50 rounded-xl shadow-lg bg-gray-900/30">
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-800/80 text-xs uppercase font-bold text-gray-100 tracking-wider">
            <tr>
              {tableHeader.map((th, idx) => (
                <th key={idx} className="px-4 py-3 border-b border-gray-700 whitespace-nowrap">
                  {parseInline(th.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className={`hover:bg-gray-800/50 transition-colors ${rIdx % 2 === 0 ? 'bg-transparent' : 'bg-gray-850/30'}`}>
                {row.map((td, cIdx) => {
                  const content = td.trim();
                  
                  // Try to find a confidence badge first
                  const badge = getConfidenceBadge(content);
                  
                  // If it's the header row for Confidence, usually the content is just the value
                  // We check if the content is SHORT and matches confidence keywords to replace it entirely with the badge
                  // Otherwise we render inline markdown
                  
                  let innerContent: React.ReactNode;
                  
                  if (badge && content.length < 20) { // Only replace if it looks like just the status
                    innerContent = badge;
                  } else {
                    innerContent = parseInline(content);
                  }

                  return (
                    <td key={cIdx} className="px-4 py-3 whitespace-pre-wrap leading-snug">
                      {innerContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Table Detection
    if (trimmedLine.startsWith('|')) {
      // Split by pipe but respect escaped pipes if any (simplified here)
      const parts = line.split('|').map(p => p.trim());
      // Remove first and last empty elements from split if bar is at start/end
      if (parts[0] === '') parts.shift();
      if (parts[parts.length - 1] === '') parts.pop();
      
      if (!inTable) {
        inTable = true;
        tableHeader = parts;
        tableRows = [];
      } else {
        // Separator check (e.g. |---|)
        const isSeparator = parts.every(p => p.match(/^[-: ]+$/));
        if (!isSeparator) {
          tableRows.push(parts);
        }
      }
    } else {
      if (inTable) {
        renderedElements.push(renderTable());
        inTable = false;
        tableRows = [];
        tableHeader = [];
      }

      // Skip table separators if they appear outside (rare but possible in bad markdown)
      if (trimmedLine.match(/^\|[-: ]+\|/)) continue;

      // Headers
      if (line.startsWith('### ')) {
        renderedElements.push(<h3 key={i} className="text-xl font-bold text-emerald-400 mt-8 mb-3 flex items-center gap-2">{parseInline(line.replace('### ', ''))}</h3>);
      } else if (line.startsWith('## ')) {
        renderedElements.push(<h2 key={i} className="text-2xl font-bold text-white mt-10 mb-4 border-b border-gray-700 pb-2">{parseInline(line.replace('## ', ''))}</h2>);
      } else if (line.startsWith('# ')) {
        renderedElements.push(<h1 key={i} className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white mt-6 mb-6">{parseInline(line.replace('# ', ''))}</h1>);
      } 
      // Blockquotes
      else if (line.startsWith('> ')) {
        renderedElements.push(
          <blockquote key={i} className="border-l-4 border-emerald-500 pl-4 py-3 my-4 bg-gray-900/50 rounded-r italic text-gray-300 shadow-sm">
            {parseInline(line.replace('> ', ''))}
          </blockquote>
        );
      } 
      // Lists (Unordered)
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const content = line.replace(/^[-*] /, '');
        renderedElements.push(
          <li key={i} className="ml-4 list-disc text-gray-300 mb-1 pl-1 marker:text-emerald-500">
            {parseInline(content)}
          </li>
        );
      }
      // Lists (Ordered) - Fixed regex crash
      else if (trimmedLine.match(/^\d+\. /)) {
        // Safe extraction using the match result or cleaned trimmed line
        const match = trimmedLine.match(/^(\d+\.)\s+(.*)/);
        const number = match ? match[1] : trimmedLine.split(' ')[0];
        const content = match ? match[2] : trimmedLine.substring(number.length).trim();
        
        renderedElements.push(
          <div key={i} className="flex gap-2 mb-1 ml-2">
             <span className="font-bold text-emerald-500">{number}</span>
             <span className="text-gray-300">{parseInline(content)}</span>
          </div>
        );
      }
      // Empty lines
      else if (trimmedLine === '') {
         renderedElements.push(<div key={i} className="h-2" />);
      } 
      // Paragraphs
      else {
        renderedElements.push(<p key={i} className="leading-relaxed text-gray-300 mb-2">{parseInline(line)}</p>);
      }
    }
  }

  if (inTable) {
     renderedElements.push(renderTable());
  }

  return <div>{renderedElements}</div>;
};

export default MarkdownRenderer;