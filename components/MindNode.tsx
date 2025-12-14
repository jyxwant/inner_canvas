import React, { memo } from 'react';
import { NodeData } from '../types';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface MindNodeProps {
  data: NodeData;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
}

export const MindNode: React.FC<MindNodeProps> = memo(({ data, isSelected, onMouseDown }) => {
  return (
    <div
      className={`absolute w-72 rounded-[20px] overflow-hidden transition-all duration-300 group cursor-pointer active:scale-95
        ${isSelected ? 'ring-4 ring-rose-500/50 shadow-2xl scale-105 z-30' : 'shadow-lg hover:shadow-xl hover:-translate-y-1 z-10'}
        bg-white border border-gray-100
      `}
      style={{
        transform: `translate(${data.x}px, ${data.y}px)`,
        marginLeft: -144, // Half of w-72 (18rem = 288px)
        marginTop: -120 // Approximate half height
      }}
      onMouseDown={(e) => onMouseDown(e, data.id)}
    >
      {/* Image Area */}
      <div className="h-44 w-full relative bg-slate-50 overflow-hidden group">
        {data.isLoadingImage ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-2"></div>
                <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">Visualizing...</span>
            </div>
        ) : (
            <>
                <img 
                  src={data.imageUrl || `https://picsum.photos/seed/${data.id}/400/300`} 
                  alt={data.visualKeyword}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            </>
        )}
        
        <div className="absolute bottom-4 left-5 right-5">
            <h3 className="text-white font-bold text-lg drop-shadow-md leading-tight tracking-wide">{data.title}</h3>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 bg-white relative">
        <p className="text-slate-600 text-xs leading-relaxed font-medium">
          {data.insight}
        </p>
        
        <div className="mt-4 flex justify-between items-center pt-3 border-t border-gray-50">
             <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <SparklesIcon className="w-3 h-3 text-purple-500" />
                Evidence
             </div>
             {isSelected && (
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] text-rose-500 font-bold">SELECTED</span>
                </div>
             )}
        </div>
      </div>
    </div>
  );
});
