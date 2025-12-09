import React, { useState, useRef, useEffect } from 'react';
import { generateFootballAnalysis, chatWithGemini } from './services/geminiService';
import { Message, ModelType, BettingStrategy } from './types';
import MessageBubble from './components/MessageBubble';
import { v4 as uuidv4 } from 'uuid';

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
      // Cast to File[] to avoid 'unknown' type error in strict mode when passing to FileReader
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
    if (!inputText.trim() && selectedImages.length === 0) return;

    const userMsg: Message = {
      id: uuidv4(),
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

    const modelMsgId = uuidv4();
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
          ? { ...m, content: "Error: Could not generate response. Please check API Key.", isLoading: false } 
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  // Specific Football Analysis Handler
  const handleGenerateAnalysis = async () => {
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: `Analyze matches from ${startDate} to ${endDate} (${bettingStrategy} strategy)`,
      timestamp: Date.now(),
      type: 'football_analysis'
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const modelMsgId = uuidv4();
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
          ? { ...m, content: "Error: Analysis failed. Ensure API Key is set and valid.", isLoading: false } 
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
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-green-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/50">
             <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">BetAI Pro</h1>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Football Tool Section */}
          <div className="mb-8">
            <h3 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-wider flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Analysis Config
            </h3>
            <div className="space-y-4 bg-gray-850 p-4 rounded-xl border border-gray-800 shadow-inner">
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Start</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">End</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Strategy Selector */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Strategy</label>
                <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700">
                  <button 
                    onClick={() => setBettingStrategy(BettingStrategy.CONSERVATIVE)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${bettingStrategy === BettingStrategy.CONSERVATIVE ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  >
                    Safe
                  </button>
                  <button 
                    onClick={() => setBettingStrategy(BettingStrategy.VALUE)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${bettingStrategy === BettingStrategy.VALUE ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                  >
                    Value
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-tight">
                  {bettingStrategy === BettingStrategy.CONSERVATIVE 
                    ? "Focus on high win rate & lower odds."
                    : "Focus on higher odds & value detection."}
                </p>
              </div>

              {/* Leagues Filter */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Specific Leagues (Optional)</label>
                <input 
                  type="text" 
                  value={targetLeagues}
                  onChange={(e) => setTargetLeagues(e.target.value)}
                  placeholder="e.g. Premier League, Serie A..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors placeholder-gray-600"
                />
              </div>

              <button 
                onClick={handleGenerateAnalysis}
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-emerald-900/20 transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                )}
                Generate Ticket
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="mb-8">
            <h3 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-wider">AI Model</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveModel(ModelType.PRO)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${activeModel === ModelType.PRO ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-gray-850 border-gray-800 text-gray-400 hover:bg-gray-800'}`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  <span className="font-medium">Gemini 3.0 Pro</span>
                </div>
                {activeModel === ModelType.PRO && <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>}
              </button>
              <div className="text-[10px] text-gray-500 px-1 mt-1">
                Deep reasoning (32k thinking budget) enabled for complex match analysis.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950">
        
        {/* Header Toggle */}
        <div className="absolute top-4 left-4 z-10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-16">
          <div className="max-w-4xl mx-auto min-h-full flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl mb-6 flex items-center justify-center shadow-2xl border border-gray-700">
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Ready to Analyze</h2>
                <p className="max-w-md text-gray-400">
                  Select your <span className="text-emerald-400">Strategy</span> in the sidebar and generate a professional ticket, or simply chat to ask for specific insights.
                </p>
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gray-950 border-t border-gray-800">
          <div className="max-w-4xl mx-auto">
            {/* Image Preview */}
            {selectedImages.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-emerald-500/30" />
                    <button onClick={clearImages} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-gray-900 p-2 rounded-2xl border border-gray-800 shadow-xl focus-within:border-emerald-500/50 transition-colors">
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handleImageUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-emerald-400 hover:bg-gray-800 rounded-xl transition-all"
                title="Upload Image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about specific matches, players, or stats..."
                className="w-full bg-transparent text-white border-none focus:ring-0 p-3 min-h-[50px] max-h-[150px] resize-none placeholder-gray-500 text-sm md:text-base"
                rows={1}
              />
              
              <button 
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && selectedImages.length === 0) || isLoading}
                className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all mb-0.5"
              >
                <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;