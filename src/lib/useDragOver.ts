import { useCallback, useRef, useState } from "react";

export function useDragState() {
  const [isDragging, setIsDragging] = useState(false);
  const counterRef = useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counterRef.current += 1;
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counterRef.current -= 1;
    if (counterRef.current <= 0) {
      counterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const resetDrag = useCallback(() => {
    counterRef.current = 0;
    setIsDragging(false);
  }, []);

  return { isDragging, onDragEnter, onDragLeave, onDragOver, resetDrag };
}
