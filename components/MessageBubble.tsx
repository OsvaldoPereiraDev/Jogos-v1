import React, { useState } from 'react';
import { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isModel = message.role === 'model';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] ${isModel ? 'flex-row' : 'flex-row-reverse'} group`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isModel ? 'bg-emerald-600 mr-3 shadow-lg shadow-emerald-900/50' : 'bg-blue-600 ml-3 shadow-lg shadow-blue-900/50'}`}>
          <span className="material-icons text-sm text-white font-mono font-bold">
            {isModel ? 'IA' : 'VC'}
          </span>
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col rounded-2xl p-4 shadow-xl border relative ${
          isModel 
            ? 'bg-gray-800 text-gray-100 rounded-tl-none border-gray-700' 
            : 'bg-blue-600 text-white rounded-tr-none border-blue-500'
        }`}>
          {/* Action Bar (Copy) */}
          {isModel && !message.isLoading && (
            <button 
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Copiar Análise"
            >
              {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </button>
          )}

          {/* Images if user uploaded */}
          {!isModel && message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.images.map((img, idx) => (
                <img key={idx} src={img} alt="Imagem enviada" className="max-w-[150px] max-h-[150px] rounded-lg border border-white/20 object-cover" />
              ))}
            </div>
          )}

          {/* Text Content */}
          <div className="prose prose-invert max-w-none text-sm md:text-base break-words">
            {isModel ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          
          <div className="text-[10px] opacity-50 mt-2 text-right flex items-center justify-end gap-1">
            {message.isLoading && isModel && (
              <span className="flex items-center gap-1 mr-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-200"></span>
              </span>
            )}
            {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;