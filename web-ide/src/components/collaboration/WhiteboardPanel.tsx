'use client';

import { useState, useRef, useEffect } from 'react';
import { Pencil, Eraser, Circle, Square, Type, Trash2, Undo, Download, Save, Upload, MousePointer2 } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useFileSystem } from '@/hooks/useFileSystem';

type Tool = 'pen' | 'eraser' | 'circle' | 'square' | 'text';

export function WhiteboardPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [size, setSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const { socket, roomId, participants, userName } = useCollaborationStore();
  const { writeFile, readFile } = useFileSystem();
  
  const lastPos = useRef<{x: number, y: number} | null>(null);
  const strokesRef = useRef<any[]>([]); // Keep local copy for saving/history
  const [cursors, setCursors] = useState<Record<string, {x: number, y: number}>>({});
  const lastCursorEmit = useRef<number>(0);

  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#000000', // black
    '#ffffff', // white
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          
          // Redraw everything on resize
          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          repayStrokes(ctx, strokesRef.current);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Socket events
    if (socket && roomId) {
      // Request history on mount
      socket.emit('whiteboard:get-history', { roomId });

      const onDraw = (stroke: any) => {
        strokesRef.current.push(stroke);
        drawStroke(ctx, stroke);
      };

      const onClear = () => {
        strokesRef.current = [];
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      };

      const onHistory = (strokes: any[]) => {
          strokesRef.current = strokes;
          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          repayStrokes(ctx, strokes);
      };

      const onCursor = ({ participantId, x, y }: { participantId: string, x: number, y: number }) => {
          setCursors(prev => ({ ...prev, [participantId]: { x, y } }));
      };

      socket.on('whiteboard:draw', onDraw);
      socket.on('whiteboard:clear', onClear);
      socket.on('whiteboard:history', onHistory);
      socket.on('whiteboard:cursor', onCursor);
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
        socket.off('whiteboard:draw', onDraw);
        socket.off('whiteboard:clear', onClear);
        socket.off('whiteboard:history', onHistory);
        socket.off('whiteboard:cursor', onCursor);
      };
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [socket, roomId]);

  const repayStrokes = (ctx: CanvasRenderingContext2D, strokes: any[]) => {
      strokes.forEach(stroke => drawStroke(ctx, stroke));
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: any) => {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
    }
    
    ctx.stroke();
  };


  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    lastPos.current = { x, y };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const from = lastPos.current;
    const to = { x, y };

    // Draw locally
    ctx.strokeStyle = tool === 'eraser' ? '#1e1e1e' : color;
    ctx.lineWidth = tool === 'eraser' ? size * 5 : size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Construct stroke object
    const stroke = {
        id: Date.now().toString(),
        points: [[from.x, from.y], [to.x, to.y]], // Segment
        color: tool === 'eraser' ? '#1e1e1e' : color,
        size: tool === 'eraser' ? size * 5 : size,
        tool
    };
    
    // Update local state
    strokesRef.current.push(stroke);

    // Emit to socket
    if (socket && roomId) {
      socket.emit('whiteboard:draw', { roomId, stroke });
    }
    
    lastPos.current = to;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Always track cursor position
    const canvas = canvasRef.current;
    if (canvas && socket && roomId) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Throttle emit to 50ms
        const now = Date.now();
        if (now - lastCursorEmit.current > 50) {
            socket.emit('whiteboard:cursor', { roomId, x, y });
            lastCursorEmit.current = now;
        }
    }

    // Handle drawing
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    strokesRef.current = [];

    if (socket && roomId) {
      socket.emit('whiteboard:clear', { roomId });
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };
  
  const saveToFile = async () => {
      try {
          const content = JSON.stringify(strokesRef.current, null, 2);
          const fname = `whiteboard-${Date.now()}.json`; // Or prompt user
          // Actually, let's just save to 'whiteboard.json' for simplicity or let user rename
          await writeFile('whiteboard.json', content);
          alert('Saved to whiteboard.json');
      } catch (e) {
          console.error(e);
          alert('Failed to save');
      }
  };
  
  const loadFromFile = async () => {
      try {
           // For now, load 'whiteboard.json'
           // Ideally we show a file picker? But we are in webcontainer.
           // Maybe prompt for path?
           const fname = prompt('Enter filename to load (e.g. whiteboard.json):', 'whiteboard.json');
           if (!fname) return;
           
           const content = await readFile(fname); // readFile returns string
           const strokes = JSON.parse(content);
           if (Array.isArray(strokes)) {
               strokesRef.current = strokes;
               
               const canvas = canvasRef.current;
               if (canvas) {
                   const ctx = canvas.getContext('2d');
                   if (ctx) {
                       ctx.fillStyle = '#1e1e1e';
                       ctx.fillRect(0, 0, canvas.width, canvas.height);
                       repayStrokes(ctx, strokes);
                   }
               }
           }
      } catch (e) {
          alert('Failed to load file');
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c] bg-[#252526]">
        <div className="flex items-center gap-2">
          {/* Tools */}
          <div className="flex gap-1 p-1 bg-[#1e1e1e] rounded-lg">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded transition-colors ${tool === 'pen' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#3c3c3c]'}`}
              title="Pen"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded transition-colors ${tool === 'eraser' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#3c3c3c]'}`}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {/* Colors */}
          <div className="flex gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          {/* Size */}
          <input
            type="range"
            min="1"
            max="20"
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-gray-500">{size}px</span>
        </div>

        <div className="flex gap-2">
          <button onClick={saveToFile} className="p-2 text-gray-400 hover:text-green-400 hover:bg-[#3c3c3c] rounded" title="Save to File">
             <Save className="w-4 h-4" />
          </button>
           <button onClick={loadFromFile} className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-[#3c3c3c] rounded" title="Load from File">
             <Upload className="w-4 h-4" />
          </button>
        
          <button
            onClick={clearCanvas}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#3c3c3c] rounded transition-colors"
            title="Clear"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={downloadCanvas}
            className="p-2 text-gray-400 hover:text-blue-400 hover:bg-[#3c3c3c] rounded transition-colors"
            title="Download PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-[#1e1e1e] overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />
        
        {/* Render Remote Cursors */}
        {participants.filter(p => p.id !== socket?.id).map(p => {
             const cursor = cursors[p.id];
             if (!cursor) return null;
             
             return (
                 <div 
                    key={p.id}
                    className="absolute pointer-events-none transition-all duration-100 ease-linear z-10"
                    style={{ left: cursor.x, top: cursor.y }}
                 >
                    <MousePointer2 
                        className="w-4 h-4 -ml-1 -mt-1" // Offset to tip
                        style={{ color: p.color, fill: p.color }} 
                    />
                    <div 
                        className="absolute left-3 top-3 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap shadow-sm"
                        style={{ backgroundColor: p.color }}
                    >
                        {p.name}
                    </div>
                 </div>
             );
        })}
      </div>
    </div>
  );
}
