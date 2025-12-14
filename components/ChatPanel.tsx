import React, { useRef, useEffect } from 'react';
import { ChatMessage, NodeData, ProfilingOption, Language } from '../types';
import { 
    PaperAirplaneIcon, 
    ArrowPathIcon, 
    MoonIcon,
    PaperClipIcon,
    AtSymbolIcon,
    FaceSmileIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    GlobeAltIcon,
    LinkIcon,
    PencilSquareIcon
} from '@heroicons/react/24/outline';

interface ChatPanelProps {
  history: ChatMessage[];
  inputText: string;
  isThinking: boolean;
  selectedNodes: NodeData[];
  language: Language;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearSelection: () => void;
  onOptionSelect: (option: ProfilingOption) => void;
  onLanguageChange: (lang: Language) => void;
}

// Avatar Components
const AIAvatar = () => (
  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-slate-800 border border-slate-700 shadow-sm">
    <img 
      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sherlock&backgroundColor=1e293b&clothing=blazerAndShirt" 
      alt="Inner Canvas AI" 
      className="w-full h-full object-cover"
    />
  </div>
);

const UserAvatar = () => (
  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-orange-50 border border-orange-100 shadow-sm">
    <img 
      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Annie&hairColor=4a312c&backgroundColor=ffccbc" 
      alt="User" 
      className="w-full h-full object-cover"
    />
  </div>
);

const LanguageSelector: React.FC<{ current: Language, onChange: (l: Language) => void }> = ({ current, onChange }) => (
    <div className="relative group">
        <button className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <GlobeAltIcon className="w-5 h-5" />
            <span className="text-xs font-medium uppercase">{current}</span>
        </button>
        <div className="absolute right-0 top-full mt-2 w-24 bg-white border border-gray-100 shadow-lg rounded-lg overflow-hidden hidden group-hover:block z-50">
            {[
                { code: 'zh', label: '中文' },
                { code: 'en', label: 'English' },
                { code: 'ja', label: '日本語' },
                { code: 'ko', label: '한국어' },
                { code: 'es', label: 'Español' },
                { code: 'fr', label: 'Français' },
            ].map(lang => (
                <button 
                    key={lang.code}
                    onClick={() => onChange(lang.code as Language)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${current === lang.code ? 'text-rose-600 font-bold' : 'text-slate-600'}`}
                >
                    {lang.label}
                </button>
            ))}
        </div>
    </div>
);

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  history, 
  inputText, 
  isThinking, 
  selectedNodes,
  language,
  onInputChange, 
  onSubmit,
  onClearSelection,
  onOptionSelect,
  onLanguageChange
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isThinking]);

  const handleManualInputFocus = () => {
      if (inputRef.current) {
          inputRef.current.focus();
          // We intentionally do NOT scrollIntoView here to avoid jarring layout jumps ("跳转的过了").
          // The input is fixed at the bottom, so it's likely visible.
          // We just gently update the placeholder to encourage typing.
          const originalPlaceholder = inputRef.current.placeholder;
          inputRef.current.placeholder = "Tell me in your own words...";
          
          // Optional: Restore placeholder on blur if empty (handled by React render mostly, but nice for UX)
      }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-xl z-20 border-r border-gray-100 relative">
      
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white shadow-md">
                <span className="font-bold text-sm">IC</span>
            </div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">Inner Canvas</h1>
        </div>
        <div className="flex items-center gap-3">
            <LanguageSelector current={language} onChange={onLanguageChange} />
            <div className="w-px h-4 bg-gray-200"></div>
            <button className="text-slate-400 hover:text-slate-600 transition-colors"><ArrowPathIcon className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA] custom-scrollbar">
        {history.length === 0 && (
            <div className="mt-12 flex flex-col items-center text-center px-8">
                <AIAvatar />
                <div className="mt-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 max-w-xs">
                    <p className="text-slate-600 text-sm font-medium">Case File Open.</p>
                    <p className="text-slate-500 text-xs mt-2">Describe the problem or feeling. I'll help you profile the suspects and solve the mystery.</p>
                </div>
            </div>
        )}
        
        {history.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {msg.role === 'user' ? <UserAvatar /> : <AIAvatar />}

                {/* Bubble */}
                <div className="flex flex-col">
                    {/* Name Label */}
                    <span className={`text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.role === 'user' ? 'You' : 'Inner Canvas'}
                    </span>

                    <div
                    className={`p-3.5 text-sm leading-6 shadow-sm relative group ${
                        msg.role === 'user'
                        ? 'bg-[#FFEDD5] text-slate-900 rounded-2xl rounded-tr-sm'
                        : 'bg-white text-slate-700 border border-gray-100 rounded-2xl rounded-tl-sm'
                    }`}
                    >
                        {msg.content}
                    </div>
                </div>
            </div>

            {/* Profiling Options (if present) */}
            {msg.options && msg.options.length > 0 && (
                <div className="ml-12 mt-2 flex flex-col gap-2 w-full max-w-[85%]">
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1">
                        {msg.optionsHeader || "Choose an option:"}
                     </p>
                     <div className="grid grid-cols-1 gap-2">
                        {msg.options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => onOptionSelect(option)}
                                className="text-left bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-200 p-3 rounded-xl shadow-sm transition-all group flex items-start gap-3"
                            >
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center text-slate-500 group-hover:text-rose-600 transition-colors">
                                    <span className="font-bold text-xs">{option.id}</span>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-700 group-hover:text-rose-700">{option.label}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                                </div>
                            </button>
                        ))}
                        {/* Always append 'None of these' option */}
                        <button
                            onClick={handleManualInputFocus}
                            className="text-left bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-slate-400 p-3 rounded-xl shadow-sm transition-all group flex items-start gap-3"
                        >
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-slate-200 group-hover:border-slate-300 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                                <PencilSquareIcon className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-600 group-hover:text-slate-800">None of these / Custom</h4>
                                <p className="text-xs text-slate-400 mt-0.5">I'll describe it in my own words...</p>
                            </div>
                        </button>
                     </div>
                </div>
            )}
          </div>
        ))}
        
        {isThinking && (
            <div className="flex gap-3">
                <AIAvatar />
                <div className="flex flex-col">
                     <span className="text-[10px] text-slate-400 mb-1 text-left font-semibold uppercase tracking-wider">Inner Canvas</span>
                     <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-gray-100 flex gap-2 items-center shadow-sm w-fit">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-100">
        
        {/* Context Banner */}
        {selectedNodes.length > 0 && (
            <div className="flex items-center justify-between px-5 py-2 bg-rose-50 border-b border-rose-100 animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="flex items-center gap-2 overflow-hidden">
                     {selectedNodes.length > 1 ? <LinkIcon className="w-4 h-4 text-rose-500" /> : <MagnifyingGlassIcon className="w-4 h-4 text-rose-500" />}
                     <span className="text-xs font-bold text-rose-700 whitespace-nowrap">
                        {selectedNodes.length > 1 ? 'Synthesizing Evidence:' : 'Investigating Clue:'}
                     </span>
                     <span className="text-xs text-rose-600 truncate">
                        {selectedNodes.map(n => n.title).join(' + ')}
                     </span>
                </div>
                <button 
                    onClick={onClearSelection}
                    className="p-1 hover:bg-rose-100 rounded-full text-rose-400 hover:text-rose-700 transition-colors"
                    title="Clear Focus"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>
        )}

        <div className="p-5">
            <div className={`relative flex flex-col border rounded-xl focus-within:ring-1 focus-within:ring-slate-900 focus-within:border-slate-900 transition-all bg-white shadow-sm ${selectedNodes.length > 0 ? 'border-rose-200 ring-rose-100' : 'border-gray-200'}`}>
                <form 
                    onSubmit={onSubmit}
                    className="w-full"
                >
                <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        if(e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSubmit(e);
                        }
                    }}
                    placeholder={
                        selectedNodes.length > 1 
                        ? `Connect these ${selectedNodes.length} clues...` 
                        : selectedNodes.length === 1 
                          ? `Drill down into "${selectedNodes[0].title}"...` 
                          : "Describe the case..."
                    }
                    className="w-full min-h-[80px] max-h-[120px] bg-transparent border-none outline-none text-slate-700 placeholder-slate-300 text-sm px-4 py-3 resize-none custom-scrollbar"
                    disabled={isThinking}
                />
                
                <div className="flex items-center justify-between px-3 pb-3 mt-1">
                    <div className="flex gap-2 text-slate-400">
                        <button type="button" className="p-1.5 hover:bg-slate-50 rounded-full transition-colors">
                            <PaperClipIcon className="w-5 h-5" />
                        </button>
                        <button type="button" className="p-1.5 hover:bg-slate-50 rounded-full transition-colors">
                            <AtSymbolIcon className="w-5 h-5" />
                        </button>
                        <button type="button" className="p-1.5 hover:bg-slate-50 rounded-full transition-colors">
                            <FaceSmileIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isThinking}
                        className={`p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center ${selectedNodes.length > 0 ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                    >
                        {isThinking ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <PaperAirplaneIcon className="w-5 h-5 -ml-0.5 mt-0.5 transform -rotate-45" />
                        )}
                    </button>
                </div>
                </form>
            </div>
            <div className="text-center mt-2">
                <p className="text-[10px] text-slate-300">Shift + Click to select multiple clues for synthesis.</p>
            </div>
        </div>
      </div>
    </div>
  );
};
