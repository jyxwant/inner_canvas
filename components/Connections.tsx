import React from 'react';
import { EdgeData, NodeData } from '../types';

interface ConnectionsProps {
  edges: EdgeData[];
  nodes: NodeData[];
}

export const Connections: React.FC<ConnectionsProps> = ({ edges, nodes }) => {
  // Map nodes for fast lookup
  const nodeMap = React.useMemo(() => {
    const map = new Map<string, NodeData>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Constants for node geometry (based on MindNode.tsx styles)
  // w-72 (288px) -> half width 144
  // marginTop: -120 -> Top is y-120.
  // We want arrows to point to the top of the card, and lines to originate from bottom.
  const NODE_TOP_OFFSET = 120;
  const NODE_BOTTOM_OFFSET = 120; // Approximate bottom edge

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#E11D48" />
        </marker>
      </defs>
      {edges.map(edge => {
        const source = nodeMap.get(edge.sourceId);
        const target = nodeMap.get(edge.targetId);

        if (!source || !target) return null;

        // Start from bottom of source, end at top of target
        const sx = source.x;
        const sy = source.y + NODE_BOTTOM_OFFSET;
        
        const tx = target.x;
        const ty = target.y - NODE_TOP_OFFSET;

        // Calculate path
        const deltaX = tx - sx;
        const deltaY = ty - sy;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Dynamic control point curvature
        const controlOffset = Math.min(dist * 0.5, 150);

        // Path definition: Source -> Down -> Up -> Target
        const pathD = `
          M ${sx} ${sy}
          C ${sx} ${sy + controlOffset},
            ${tx} ${ty - controlOffset},
            ${tx} ${ty}
        `;

        return (
          <g key={edge.id}>
            <path
              d={pathD}
              fill="none"
              stroke="#E11D48" 
              strokeWidth="2"
              strokeDasharray="5, 3"
              markerEnd="url(#arrowhead)"
              className="opacity-70 drop-shadow-sm"
            />
            {edge.label && (
              <g transform={`translate(${sx + (tx - sx) * 0.5}, ${sy + (ty - sy) * 0.5})`}>
                 <rect 
                    x="-32" 
                    y="-11" 
                    width="64" 
                    height="22" 
                    rx="2" 
                    fill="#FFF1F2" 
                    stroke="#FDA4AF"
                    strokeWidth="1"
                    className="shadow-sm"
                 />
                 <text 
                    x="0" 
                    y="4" 
                    textAnchor="middle" 
                    className="text-[9px] fill-rose-700 font-bold uppercase tracking-widest"
                 >
                    {edge.label}
                 </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
