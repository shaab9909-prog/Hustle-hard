import React, { useState, useRef } from 'react';
import { Move } from 'lucide-react';

export default function DraggableBox({
  x,
  y,
  width,
  height,
  editMode,
  onUpdate,
  children,
  minWidth = 200,
  minHeight = 100
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const resizeStartRef = useRef({ startX: 0, startY: 0, initialW: 0, initialH: 0 });

  const handlePointerDownDrag = (e) => {
    if (!editMode && !e.target.closest('[data-drag-handle]')) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: x,
      initialY: y
    };

    const handlePointerMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - dragStartRef.current.startX;
      const deltaY = moveEvt.clientY - dragStartRef.current.startY;
      const newX = Math.max(0, Math.min(window.innerWidth - width, dragStartRef.current.initialX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - height, dragStartRef.current.initialY + deltaY));
      onUpdate({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerDownResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialW: width,
      initialH: height
    };

    const handlePointerMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - resizeStartRef.current.startX;
      const deltaY = moveEvt.clientY - resizeStartRef.current.startY;
      const newW = Math.max(minWidth, Math.min(window.innerWidth - x, resizeStartRef.current.initialW + deltaX));
      const newH = Math.max(minHeight, Math.min(window.innerHeight - y, resizeStartRef.current.initialH + deltaY));
      onUpdate({ width: newW, height: newH });
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDownDrag}
      className={`absolute transition-shadow duration-200 group ${
        editMode 
          ? 'cursor-grab active:cursor-grabbing border-2 border-dashed border-sky-400/70 hover:border-sky-300 ring-2 ring-sky-400/20 rounded-2xl shadow-2xl z-30' 
          : 'z-20'
      }`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
        touchAction: 'none'
      }}
    >
      {editMode && (
        <div className="absolute -top-3.5 left-3 px-2 py-0.5 rounded-full bg-sky-500 text-black text-[10px] font-bold tracking-wider uppercase shadow-md pointer-events-none flex items-center gap-1">
          <Move className="w-2.5 h-2.5" />
          <span>Drag</span>
        </div>
      )}

      <div className="w-full h-full">
        {children}
      </div>

      {editMode && (
        <div 
          onPointerDown={handlePointerDownResize}
          className="absolute w-3.5 h-3.5 bottom-0.5 right-0.5 cursor-nwse-resize rounded-sm hover:scale-125 transition-transform"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, #38bdf8 50%)'
          }}
          title="Click and drag to resize"
        />
      )}
    </div>
  );
}
