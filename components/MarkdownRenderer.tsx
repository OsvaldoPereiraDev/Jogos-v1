import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Split content by lines to process block elements
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];

  const processTable = () => {
    if (tableRows.length === 0) return null;
    
    return (
      <div key={`table-${Math.random()}`} className="overflow-x-auto my-4 border border-gray-700 rounded-lg shadow-sm">
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="bg-gray-800 text-xs uppercase font-bold text-gray-100">
            <tr>
              {tableHeader.map((th, idx) => (
                <th key={idx} className="px-4 py-3 border-b border-gray-700 whitespace-nowrap">{th.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-gray-900" : "bg-gray-850 hover:bg-gray-800 transition-colors"}>
                {row.map((td, cIdx) => {
                  const content = td.trim();
                  let cellClass = "px-4 py-3 border-b border-gray-800";
                  let innerContent: React.ReactNode = content;

                  // Highlight logic for Confidence column
                  if (content.includes('ALTA')) {
                    innerContent = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-900/50 text-green-400 border border-green-700/50">ALTA</span>;
                  } else if (content.includes('MÉDIA') || content.includes('MEDIA')) {
                    innerContent = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-900/30 text-yellow-400 border border-yellow-700/30">MÉDIA</span>;
                  } else if (content.includes('BAIXA')) {
                    innerContent = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-900/30 text-red-400 border border-red-700/30">BAIXA</span>;
                  }

                  return <td key={cIdx} className={cellClass}>{innerContent}</td>
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

    // Simple Table Detection
    if (line.trim().startsWith('|')) {
      const parts = line.split('|').filter(p => p.trim() !== ''); // Remove empty start/end
      
      if (!inTable) {
        // Start of table
        inTable = true;
        tableHeader = parts;
        tableRows = [];
      } else {
        // Separator line detection (e.g., |---|---|)
        if (line.replace(/[\s\|\-:]/g, '').length === 0) {
          continue; 
        }
        tableRows.push(parts);
      }
    } else {
      if (inTable) {
        // End of table detected
        renderedElements.push(processTable());
        inTable = false;
        tableRows = [];
        tableHeader = [];
      }

      // Headers
      if (line.startsWith('### ')) {
        renderedElements.push(<h3 key={i} className="text-xl font-bold text-emerald-400 mt-8 mb-3 flex items-center gap-2">{line.replace('### ', '')}</h3>);
      } else if (line.startsWith('## ')) {
        renderedElements.push(<h2 key={i} className="text-2xl font-bold text-white mt-10 mb-4 border-b border-gray-700 pb-2">{line.replace('## ', '')}</h2>);
      } else if (line.startsWith('# ')) {
        renderedElements.push(<h1 key={i} className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-white mt-6 mb-6">{line.replace('# ', '')}</h1>);
      } else if (line.startsWith('> ')) {
        // Blockquotes
        renderedElements.push(
          <blockquote key={i} className="border-l-4 border-emerald-500 pl-4 py-3 my-4 bg-gray-900/50 rounded-r italic text-gray-400">
            {line.replace('> ', '')}
          </blockquote>
        );
      } else if (line.startsWith('- ')) {
        // Lists
        renderedElements.push(<li key={i} className="ml-4 list-disc text-gray-300 mb-1 pl-1 marker:text-emerald-500">{line.replace('- ', '')}</li>);
      } else if (line.trim() === '') {
         renderedElements.push(<br key={i}/>);
      } else {
        // Paragraph with basic bold/italic parsing
        const parts = line.split(/(\*\*.*?\*\*)/g);
        const paraContent = parts.map((part, idx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx} className="text-emerald-300 font-semibold">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        renderedElements.push(<p key={i} className="leading-relaxed text-gray-300 mb-2">{paraContent}</p>);
      }
    }
  }

  // Flush remaining table
  if (inTable) {
     renderedElements.push(processTable());
  }

  return <div>{renderedElements}</div>;
};

export default MarkdownRenderer;