import React, { useState, useRef, useEffect } from 'react';
import { generateFootballAnalysis, chatWithGemini } from './services/geminiService';
import { Message, ModelType, BettingStrategy } from './types';
import MessageBubble from './components/MessageBubble';

// Simple ID generator to avoid external dependencies causing load errors
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const App: React.FC = () => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Settings
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]); // +1 day
  const [activeModel, setActiveModel] = useState<ModelType>(ModelType.PRO);
  const [bettingStrategy, setBettingStrategy] = useState<BettingStrategy>(BettingStrategy.CONSERVATIVE);
  const [targetLeagues, setTargetLeagues] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Cast to File[] to avoid 'unknown' type error in strict mode
      const files = Array.from(e.target.files) as File[];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const clearImages = () => {
    setSelectedImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generic Chat Handler
  const handleSendMessage = async () => {
    if ((!inputText.trim() && selectedImages.length === 0) || isLoading) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
      images: [...selectedImages]
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsLoading(true);

    const modelMsgId = generateId();
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isLoading: true
    };
    setMessages(prev => [...prev, modelMsg]);

    try {
      await chatWithGemini(userMsg.content, userMsg.images, activeModel, (chunk) => {
        setMessages(prev => prev.map(m => 
          m.id === modelMsgId 
            ? { ...m, content: m.content + chunk, isLoading: false } 
            : m
        ));
      });
    } catch (error) {
      setMessages(prev => prev.map(m => 
        m.id === modelMsgId 
          ? { ...m, content: "Erro: Não foi possível gerar a resposta. Verifique a sua Chave de API.", isLoading: false } 
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Specific Football Analysis Handler
  const handleGenerateAnalysis = async () => {
    if (isLoading) return;
    
    const strategyName = bettingStrategy === BettingStrategy.EV_PREMIUM ? 'EV+ Premium 2.0' : 
                         bettingStrategy === BettingStrategy.VALUE ? 'Valor (Agressivo)' : 'Conservadora';
                         
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: `Analise as partidas de ${startDate} até ${endDate} usando a estratégia ${strategyName}${targetLeagues ? ` focando nas ligas: ${targetLeagues}` : ''}.`,
      timestamp: Date.now(),
      type: 'football_analysis'
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const modelMsgId = generateId();
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isLoading: true
    };
    setMessages(prev => [...prev, modelMsg]);

    try {
      await generateFootballAnalysis(startDate, endDate, bettingStrategy, targetLeagues, (chunk) => {
        setMessages(prev => prev.map(m => 
          m.id === modelMsgId 
            ? { ...m, content: m.content + chunk, isLoading: false } 
            : m
        ));
      });
    } catch (error) {
       setMessages(prev => prev.map(m => 
        m.id === modelMsgId 
          ? { ...m, content: "Erro: A análise falhou. Certifique-se de que a Chave de API está configurada e é válida.", isLoading: false } 
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans selection:bg-emerald-500 selection:text-white">
      {/* Sidebar - Settings & Tools */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-gray-900 border-r border-gray-800 flex flex-col h-full overflow-hidden shrink-0`}>
         {/* Sidebar Content */}
         <div className="p-5 flex-1 overflow-y-auto">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200 mb-6 flex items-center gap-2">
               <span className="material-icons text-emerald-400">sports_soccer</span>
               BetAI Analista Pro
            </h1>
            
            {/* Settings Section */}
            <div className="space-y-6">
                
                {/* Dates */}
                <div>
                   <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Período de Análise</label>
                   <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                         <span className="text-xs text-gray-400">Início</span>
                         <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-emerald-500 outline-none text-white" />
                      </div>
                      <div className="space-y-1">
                         <span className="text-xs text-gray-400">Fim</span>
                         <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:border-emerald-500 outline-none text-white" />
                      </div>
                   </div>
                </div>

                {/* Strategy */}
                <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Estratégia</label>
                    <div className="grid grid-cols-1 gap-2">
                        <button 
                           onClick={() => setBettingStrategy(BettingStrategy.CONSERVATIVE)}
                           className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${bettingStrategy === BettingStrategy.CONSERVATIVE ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
                        >
                           <div className="flex flex-col items-start">
                              <span className="font-semibold">Conservadora</span>
                              <span className="text-[10px] opacity-70">Apostas seguras, alta taxa de acerto</span>
                           </div>
                           {bettingStrategy === BettingStrategy.CONSERVATIVE && <span className="material-icons text-sm">check_circle</span>}
                        </button>

                        <button 
                           onClick={() => setBettingStrategy(BettingStrategy.VALUE)}
                           className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${bettingStrategy === BettingStrategy.VALUE ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
                        >
                           <div className="flex flex-col items-start">
                              <span className="font-semibold">Aposta de Valor</span>
                              <span className="text-[10px] opacity-70">Odds maiores, risco calculado</span>
                           </div>
                           {bettingStrategy === BettingStrategy.VALUE && <span className="material-icons text-sm">check_circle</span>}
                        </button>

                        <button 
                           onClick={() => setBettingStrategy(BettingStrategy.EV_PREMIUM)}
                           className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${bettingStrategy === BettingStrategy.EV_PREMIUM ? 'bg-amber-900/40 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750'}`}
                        >
                           <div className="flex flex-col items-start">
                              <span className="font-semibold flex items-center gap-1"><span className="material-icons text-[14px]">bolt</span> EV+ Premium 2.0</span>
                              <span className="text-[10px] opacity-70">Vitória e Ambas Marcam (Risco Extremo)</span>
                           </div>
                           {bettingStrategy === BettingStrategy.EV_PREMIUM && <span className="material-icons text-sm">check_circle</span>}
                        </button>
                    </div>
                </div>

                {/* Leagues */}
                <div>
                   <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Ligas Alvo</label>
                   <textarea 
                     value={targetLeagues}
                     onChange={e => setTargetLeagues(e.target.value)}
                     placeholder="ex: Premier League, Série A, Champions League..."
                     className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none h-20 resize-none placeholder-gray-600"
                   />
                </div>

                {/* Action Button */}
                <button
                    onClick={handleGenerateAnalysis}
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-900/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                           <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                           Analisando...
                        </>
                    ) : (
                        <>
                           <span className="material-icons text-sm">auto_awesome</span>
                           Gerar Relatório
                        </>
                    )}
                </button>
            </div>
         </div>
         
         {/* Sidebar Footer */}
         <div className="p-4 border-t border-gray-800 bg-gray-900">
             <div className="flex items-center justify-between">
                 <span className="text-xs text-gray-500">Modelo:</span>
                 <select 
                    value={activeModel} 
                    onChange={e => setActiveModel(e.target.value as ModelType)}
                    className="bg-gray-800 text-xs text-gray-300 border border-gray-700 rounded px-2 py-1 outline-none"
                 >
                     <option value={ModelType.PRO}>Gemini 3 Pro (Raciocínio)</option>
                     <option value={ModelType.FLASH}>Gemini 2.5 Flash</option>
                 </select>
             </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
          {/* Header */}
          <div className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur flex items-center px-4 justify-between shrink-0">
              <div className="flex items-center gap-3">
                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                      <span className="material-icons">menu</span>
                  </button>
                  <span className="font-semibold text-gray-200">Chat de Análise</span>
              </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
              {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                      <span className="material-icons text-6xl mb-4 text-emerald-900">analytics</span>
                      <p className="text-lg font-medium">Pronto para analisar partidas</p>
                      <p className="text-sm">Configure no menu lateral e clique em Gerar Relatório</p>
                  </div>
              ) : (
                  <div className="max-w-4xl mx-auto">
                      {messages.map(msg => (
                          <MessageBubble key={msg.id} message={msg} />
                      ))}
                      <div ref={messagesEndRef} />
                  </div>
              )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-800 bg-gray-900 shrink-0">
             <div className="max-w-4xl mx-auto relative">
                {/* Image Previews */}
                {selectedImages.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 flex gap-2 p-2 bg-gray-800 rounded-lg border border-gray-700 shadow-xl">
                        {selectedImages.map((img, idx) => (
                            <div key={idx} className="relative group">
                                <img src={img} alt="Preview" className="w-16 h-16 object-cover rounded border border-gray-600" />
                                <button onClick={() => {
                                    const newImages = [...selectedImages];
                                    newImages.splice(idx, 1);
                                    setSelectedImages(newImages);
                                    if (newImages.length === 0 && fileInputRef.current) fileInputRef.current.value = '';
                                }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-icons text-[10px] block">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex items-end gap-2 bg-gray-800 p-2 rounded-xl border border-gray-700 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all shadow-lg">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Enviar imagem"
                    >
                        <span className="material-icons">add_photo_alternate</span>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*" 
                        multiple 
                        onChange={handleImageUpload}
                    />
                    
                    <textarea 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Faça uma pergunta de acompanhamento..."
                        className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-sm md:text-base resize-none py-2 max-h-32 min-h-[40px]"
                        rows={1}
                        style={{ height: 'auto', minHeight: '40px' }}
                    />

                    <button 
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() && selectedImages.length === 0 || isLoading}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        <span className="material-icons">send</span>
                    </button>
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default App;