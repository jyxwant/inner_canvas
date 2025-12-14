
import React, { useReducer, useRef, useState, useCallback, useEffect } from 'react';
import { ActionType, CanvasAction, CanvasState, Coordinate, NodeData, EdgeData, ChatMessage, ProfilingOption } from './types';
import { MindNode } from './components/MindNode';
import { Connections } from './components/Connections';
import { ChatPanel } from './components/ChatPanel';
import { processUserInput, generateNodeImage, generateSpeech } from './services/baiduService';
import { audioEngine } from './services/audioEngine'; // New Audio Engine
import { 
    MagnifyingGlassMinusIcon, 
    MagnifyingGlassPlusIcon, 
    ArrowsPointingOutIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    LinkIcon,
    ChatBubbleLeftRightIcon,
    MusicalNoteIcon
} from '@heroicons/react/24/outline';

// --- Initial State ---
const initialState: CanvasState = {
  nodes: [],
  edges: [],
  view: { x: 0, y: 0, scale: 1 },
  selectedNodeIds: [],
  isThinking: false,
  chatHistory: [],
  isSpeaking: true,
  isMusicOn: true,
  language: 'zh',
};

// --- Reducer ---
function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case ActionType.PAN:
      return {
        ...state,
        view: { ...state.view, x: state.view.x + action.payload.x, y: state.view.y + action.payload.y },
      };
    case ActionType.ZOOM: {
      const { delta, center } = action.payload;
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      let newScale = state.view.scale * zoomFactor;
      newScale = Math.max(0.2, Math.min(newScale, 4));

      const worldX = (center.x - state.view.x) / state.view.scale;
      const worldY = (center.y - state.view.y) / state.view.scale;

      const newX = center.x - worldX * newScale;
      const newY = center.y - worldY * newScale;

      return {
        ...state,
        view: { x: newX, y: newY, scale: newScale },
      };
    }
    case ActionType.SET_VIEW:
      return {
        ...state,
        view: action.payload,
      };
    case ActionType.ADD_NODE:
      return {
        ...state,
        nodes: [...state.nodes, action.payload.node],
        edges: action.payload.edge ? [...state.edges, action.payload.edge] : state.edges,
        // Auto-select the new node, replacing previous selection
        selectedNodeIds: [action.payload.node.id],
      };
    case ActionType.UPDATE_NODE_DATA:
      return {
        ...state,
        nodes: state.nodes.map(n => 
            n.id === action.payload.id 
            ? { ...n, ...action.payload.data } 
            : n
        ),
      };
    case ActionType.SET_SELECTION:
      return {
        ...state,
        selectedNodeIds: action.payload,
      };
    case ActionType.SET_THINKING:
      return {
        ...state,
        isThinking: action.payload,
      };
    case ActionType.UPDATE_NODE_POS:
        return {
            ...state,
            nodes: state.nodes.map(n => 
                n.id === action.payload.id 
                ? { ...n, x: action.payload.x, y: action.payload.y }
                : n
            )
        };
    case ActionType.ADD_CHAT_MESSAGE:
        return {
            ...state,
            chatHistory: [...state.chatHistory, action.payload]
        };
    case ActionType.SET_SPEAKING:
        return {
            ...state,
            isSpeaking: action.payload
        };
    case ActionType.SET_MUSIC:
        return {
            ...state,
            isMusicOn: action.payload
        };
    case ActionType.SET_LANGUAGE:
        return {
            ...state,
            language: action.payload
        };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(canvasReducer, initialState);
  const [inputText, setInputText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isNodeDragging, setIsNodeDragging] = useState<string | null>(null);
  const lastMousePos = useRef<Coordinate>({ x: 0, y: 0 });
  const lastInteractionId = useRef<number>(0); // To prevent race conditions

  // --- Audio Engine Initialization ---
  useEffect(() => {
    // Sync music state with engine
    audioEngine.toggleMusic(state.isMusicOn);
  }, [state.isMusicOn]);

  // Handle global click to ensure AudioContext resumes (browsers block auto-play)
  const handleGlobalInteraction = useCallback(async () => {
      await audioEngine.init();
      // 如果音乐已启用但还没播放，尝试启动
      if (state.isMusicOn) {
          audioEngine.toggleMusic(true);
      }
  }, [state.isMusicOn]);

  // --- Camera Helper ---
  const centerCameraOn = (x: number, y: number, scale = 1) => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    dispatch({
        type: ActionType.SET_VIEW,
        payload: {
            x: (width / 2) - (x * scale),
            y: (height / 2) - (y * scale),
            scale: scale
        }
    });
  };

  // --- Event Handlers ---
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        dispatch({
            type: ActionType.ZOOM,
            payload: {
                delta: -e.deltaY,
                center: { x: mouseX, y: mouseY },
            },
        });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Global resume trigger
    handleGlobalInteraction();

    // If clicking background, clear selection
    if (state.selectedNodeIds.length > 0) {
        dispatch({ type: ActionType.SET_SELECTION, payload: [] });
    }

    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // Stop bubbling to canvas
      handleGlobalInteraction(); // Resume audio
      
      let newSelection = [...state.selectedNodeIds];
      
      if (e.shiftKey) {
          // Multi-selection logic
          if (newSelection.includes(id)) {
              newSelection = newSelection.filter(nid => nid !== id);
          } else {
              newSelection.push(id);
          }
      } else {
          // Single selection logic (exclusive)
          // Only change if not already selected or if it's a different single selection
          if (!newSelection.includes(id) || newSelection.length > 1) {
             newSelection = [id];
          }
      }

      dispatch({ type: ActionType.SET_SELECTION, payload: newSelection });
      setIsNodeDragging(id);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [state.selectedNodeIds, handleGlobalInteraction]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isNodeDragging) {
        const deltaX = (e.clientX - lastMousePos.current.x) / state.view.scale;
        const deltaY = (e.clientY - lastMousePos.current.y) / state.view.scale;
        
        const node = state.nodes.find(n => n.id === isNodeDragging);
        if (node) {
            dispatch({
                type: ActionType.UPDATE_NODE_POS,
                payload: { id: node.id, x: node.x + deltaX, y: node.y + deltaY }
            });
        }
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        return;
    }

    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      dispatch({ type: ActionType.PAN, payload: { x: deltaX, y: deltaY } });
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsNodeDragging(null);
  };

  // --- Main Logic ---

  const handleInteraction = async (input: string, isOptionSelect = false) => {
    if (!input.trim()) return;
    
    // 1. Initialize Audio Context on first user gesture (Redundant but safe)
    await audioEngine.init();

    // 2. Stop any pending audio from previous interactions to fix "Simultaneous Playback"
    audioEngine.stopAllTTS();
    const currentRequestId = Date.now();
    lastInteractionId.current = currentRequestId;

    const userContent = isOptionSelect 
        ? `[Identifying Suspect] I feel like: ${input}` 
        : input;

    const userMsg: ChatMessage = {
        id: currentRequestId.toString(),
        role: 'user',
        content: isOptionSelect ? `I choose: ${input}` : input,
        timestamp: Date.now()
    };
    
    dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: userMsg });
    setInputText('');
    dispatch({ type: ActionType.SET_THINKING, payload: true });

    try {
      const selectedNodes = state.nodes.filter(n => state.selectedNodeIds.includes(n.id));

      // Process with Gemini
      const response = await processUserInput(
          userContent, 
          state.chatHistory.map(m => ({ role: m.role, content: m.content })),
          state.language,
          selectedNodes
      );
      
      // Check if this is still the latest request
      if (lastInteractionId.current !== currentRequestId) {
          console.log("Ignored stale response");
          return; 
      }

      // Add Model Chat Message
      const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: response.chatResponse,
          timestamp: Date.now(),
          options: response.profilingOptions,
          optionsHeader: response.optionsHeader
      };
      dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: aiMsg });

      // Update Audio Mood
      audioEngine.setMood(response.soundtrackMood);

      // Generate Audio (使用浏览器 Web Speech API)
      if (state.isSpeaking && lastInteractionId.current === currentRequestId) {
          // 直接使用文本，浏览器 TTS 不需要生成音频文件
          // 确保在用户交互后调用 TTS（某些浏览器要求）
          audioEngine.queueTTS(response.chatResponse);
      }

      // Create Node (If applicable)
      if (response.visualization.shouldCreateNode) {
          let newX = 0;
          let newY = 0;

          // Determine parent node (use the last selected one, or the first one if multiple)
          const primaryParent = selectedNodes.length > 0 ? selectedNodes[selectedNodes.length - 1] : null;

          if (primaryParent) {
            const angle = (Math.random() * Math.PI * 1.5) - (Math.PI * 0.75); 
            const distance = 450; 
            newX = primaryParent.x + Math.cos(angle) * distance;
            newY = primaryParent.y + Math.sin(angle) * distance + 100;
          } else if (state.nodes.length > 0) {
              newX = (Math.random() - 0.5) * 800;
              newY = (Math.random() - 0.5) * 600;
          }

          const newNodeId = `node-${Date.now()}`;
          const newNode: NodeData = {
            id: newNodeId,
            x: newX,
            y: newY,
            title: response.visualization.title,
            insight: response.visualization.insight,
            visualKeyword: response.visualization.visualKeyword,
            isLoadingImage: true,
            parentId: primaryParent?.id
          };

          // If multiple nodes were selected for synthesis, we might want to link the new node to ALL of them
          // For now, let's link to the primary parent with the specific label, and maybe others generically
          let newEdge: EdgeData | undefined;
          if (primaryParent) {
            newEdge = {
              id: `edge-${Date.now()}`,
              sourceId: primaryParent.id,
              targetId: newNodeId,
              label: response.visualization.connectionLabel || 'Connected'
            };
          }

          dispatch({ type: ActionType.ADD_NODE, payload: { node: newNode, edge: newEdge } });
          centerCameraOn(newX, newY, state.view.scale);

          // Async Image Generation
          generateNodeImage(response.visualization.visualKeyword).then(imageUrl => {
             dispatch({ 
                 type: ActionType.UPDATE_NODE_DATA, 
                 payload: { id: newNodeId, data: { imageUrl: imageUrl || undefined, isLoadingImage: false } } 
             });
          }).catch(err => {
              console.error("Image generation skipped:", err);
              dispatch({ 
                 type: ActionType.UPDATE_NODE_DATA, 
                 payload: { id: newNodeId, data: { isLoadingImage: false } } 
             });
          });
      }

    } catch (err) {
      console.error("Error in loop:", err);
       const errorMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'model',
          content: "Connection to the mind palace lost. Please check your network and try again.", 
          timestamp: Date.now()
       };
       dispatch({ type: ActionType.ADD_CHAT_MESSAGE, payload: errorMsg });
    } finally {
        if (lastInteractionId.current === currentRequestId) {
            dispatch({ type: ActionType.SET_THINKING, payload: false });
        }
    }
  };

  const handleSynthesize = () => {
      handleGlobalInteraction();
      const selected = state.nodes.filter(n => state.selectedNodeIds.includes(n.id));
      if (selected.length < 2) return;
      const names = selected.map(n => n.title).join(" + ");
      handleInteraction(`[Synthesizing Evidence] I see a connection between: ${names}. What is the hidden link?`);
  };

  const handleDrillDown = () => {
      handleGlobalInteraction();
      const selected = state.nodes.find(n => state.selectedNodeIds.includes(n.id));
      if (!selected) return;
      handleInteraction(`[Investigating Clue] I want to explore "${selected.title}" deeper. What's behind this?`);
  };

  const handleFreeAssociate = () => {
      handleGlobalInteraction();
      const selected = state.nodes.find(n => state.selectedNodeIds.includes(n.id));
      if (!selected) return;
      handleInteraction(`[Free Association] This clue ("${selected.title}") makes me think of...`);
  };

  const handleOptionSelect = (option: ProfilingOption) => {
      handleGlobalInteraction();
      handleInteraction(option.visualKeyword, true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleGlobalInteraction();
      handleInteraction(inputText);
  };

  const selectedNodesData = state.nodes.filter(n => state.selectedNodeIds.includes(n.id));

  // Initial center
  useEffect(() => {
     centerCameraOn(0, 0, 1);
  }, []);

  return (
    <div 
        className="flex h-screen w-screen overflow-hidden bg-[#F9FAFB]"
        onClick={handleGlobalInteraction} // Capture any click to resume AudioContext
    >
      
      {/* Left: Chat Panel (400px fixed) */}
      <div className="w-[400px] h-full flex-shrink-0 shadow-xl z-20">
          <ChatPanel 
            history={state.chatHistory}
            inputText={inputText}
            isThinking={state.isThinking}
            selectedNodes={selectedNodesData}
            language={state.language}
            onInputChange={setInputText}
            onSubmit={handleSubmit}
            onClearSelection={() => dispatch({ type: ActionType.SET_SELECTION, payload: [] })}
            onOptionSelect={handleOptionSelect}
            onLanguageChange={(lang) => dispatch({ type: ActionType.SET_LANGUAGE, payload: lang })}
          />
      </div>

      {/* Right: Canvas Panel (Fluid) */}
      <div className="flex-1 relative h-full bg-[#F3F4F6]">
        
        {/* Canvas Layer */}
        <div
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing dot-grid"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div
            style={{
                transform: `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                willChange: 'transform',
                transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            >
                <Connections edges={state.edges} nodes={state.nodes} />
                {state.nodes.map(node => (
                    <MindNode 
                        key={node.id} 
                        data={node} 
                        isSelected={state.selectedNodeIds.includes(node.id)}
                        onMouseDown={handleNodeMouseDown}
                    />
                ))}
            </div>
        </div>

        {/* Action Bar (Top Center) - Visible when selection exists */}
        {state.selectedNodeIds.length > 0 && (
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 z-30 pointer-events-auto">
                {/* Single Node Actions */}
                {state.selectedNodeIds.length === 1 && (
                    <>
                        <button
                            onClick={handleDrillDown}
                            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-full shadow-lg border border-gray-200 transition-all font-semibold text-sm hover:scale-105"
                        >
                            <MagnifyingGlassPlusIcon className="w-4 h-4 text-rose-500" />
                            <span>Drill Down</span>
                        </button>
                        <button
                            onClick={handleFreeAssociate}
                            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-full shadow-lg border border-gray-200 transition-all font-semibold text-sm hover:scale-105"
                        >
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-indigo-500" />
                            <span>Discuss</span>
                        </button>
                    </>
                )}

                {/* Multi Node Actions */}
                {state.selectedNodeIds.length > 1 && (
                    <button
                        onClick={handleSynthesize}
                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all font-bold"
                    >
                        <LinkIcon className="w-5 h-5" />
                        <span>Connect Evidence ({state.selectedNodeIds.length})</span>
                    </button>
                )}
            </div>
        )}

        {/* Canvas Overlay Controls (Clean White Floating Buttons) */}
        <div className="absolute top-6 right-6 flex flex-col gap-2">
             <button 
                className={`p-2.5 rounded-xl shadow-sm border border-gray-200 transition-all ${state.isMusicOn ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    handleGlobalInteraction();
                    dispatch({ type: ActionType.SET_MUSIC, payload: !state.isMusicOn });
                }}
                title={state.isMusicOn ? "Mute Music" : "Play Ambient Music"}
            >
                {state.isMusicOn ? <MusicalNoteIcon className="w-5 h-5" /> : <MusicalNoteIcon className="w-5 h-5 opacity-50" />}
            </button>
             <button 
                className={`p-2.5 rounded-xl shadow-sm border border-gray-200 transition-all ${state.isSpeaking ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: ActionType.SET_SPEAKING, payload: !state.isSpeaking });
                }}
                title={state.isSpeaking ? "Mute Voice" : "Enable Voice"}
            >
                {state.isSpeaking ? <SpeakerWaveIcon className="w-5 h-5" /> : <SpeakerXMarkIcon className="w-5 h-5" />}
            </button>
        </div>

        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <button 
                className="p-3 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 text-slate-600 transition-all"
                onClick={() => {
                    const selected = state.nodes.find(n => n.id === state.selectedNodeIds[0]);
                    if (selected) centerCameraOn(selected.x, selected.y, 1);
                    else centerCameraOn(0, 0, 1);
                }}
            >
                <ArrowsPointingOutIcon className="w-5 h-5" />
            </button>
            <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button 
                    className="p-3 hover:bg-gray-50 text-slate-600 border-b border-gray-100"
                    onClick={() => containerRef.current && dispatch({ type: ActionType.ZOOM, payload: { delta: -100, center: {x: containerRef.current.clientWidth/2, y: containerRef.current.clientHeight/2} } })}
                >
                    <MagnifyingGlassPlusIcon className="w-5 h-5" />
                </button>
                <button 
                    className="p-3 hover:bg-gray-50 text-slate-600"
                    onClick={() => containerRef.current && dispatch({ type: ActionType.ZOOM, payload: { delta: 100, center: {x: containerRef.current.clientWidth/2, y: containerRef.current.clientHeight/2} } })}
                >
                    <MagnifyingGlassMinusIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

      </div>

    </div>
  );
};

export default App;
