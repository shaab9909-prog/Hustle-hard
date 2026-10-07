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

  const handlePointerDownDrag = (e) => {console.log("--> DRAG CLICK EVENT FIRED!", e);
    if (!editMode) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = x;
    const initialY = y;

    const onPointerMove = (moveEvt) => {
      moveEvt.preventDefault();
      const deltaX = moveEvt.clientX - startX;
      const deltaY = moveEvt.clientY - startY;
      const newX = Math.max(0, Math.min(window.innerWidth - width, initialX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - height, initialY + deltaY));
      onUpdate({ x: newX, y: newY });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
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
      className={`absolute select-none ${
        editMode
          ? 'border-2 border-dashed border-sky-400/70 hover:border-sky-300 ring-2 ring-sky-400/20 rounded-2xl z-30'
          : 'z-20'
      }`}
      style={{
        transform: `translate3d(${x || 0}px, ${y || 0}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
        touchAction: 'none'
      }}
    >
      {editMode && (
        <div
          onPointerDown={handlePointerDownDrag}
          className="absolute -top-3.5 left-3 px-2 py-0.5 rounded-full bg-sky-500 text-black text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 cursor-grab active:cursor-grabbing z-50 select-none shadow-md"
        >
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
