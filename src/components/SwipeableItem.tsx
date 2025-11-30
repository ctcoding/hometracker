import { useState, useRef, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}

export default function SwipeableItem({ children, onDelete, deleteLabel = 'Löschen' }: SwipeableItemProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const DELETE_THRESHOLD = -80;

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Only allow swiping left
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    } else {
      setTranslateX(0);
    }
  }

  function handleTouchEnd() {
    setIsDragging(false);

    if (translateX < DELETE_THRESHOLD) {
      // Show delete button
      setTranslateX(-80);
    } else {
      // Snap back
      setTranslateX(0);
    }
  }

  function handleDelete() {
    // Animate out
    if (containerRef.current) {
      containerRef.current.style.height = containerRef.current.offsetHeight + 'px';
      containerRef.current.style.transition = 'height 0.2s, opacity 0.2s';
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.height = '0';
          containerRef.current.style.opacity = '0';
        }
      });
    }
    setTimeout(onDelete, 200);
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Delete Button Background */}
      <div className="absolute inset-y-0 right-0 flex items-center bg-red-500 px-4">
        <button
          onClick={handleDelete}
          className="flex flex-col items-center text-white"
        >
          <Trash2 size={20} />
          <span className="text-xs mt-1">{deleteLabel}</span>
        </button>
      </div>

      {/* Main Content */}
      <div
        className="relative bg-white dark:bg-gray-800 transition-transform"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
