import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Edit3,
  Minus,
  Maximize2,
  Trash2,
  Check,
  Undo,
} from 'lucide-react';

interface ChartUploaderProps {
  currentImage: string | null;
  onImageSelect: (fileDataUrl: string) => void;
  isAnalyzing: boolean;
}

type DrawTool = 'line' | 'horizontal' | 'pen' | 'erase';

export const ChartUploader: React.FC<ChartUploaderProps> = ({
  currentImage,
  onImageSelect,
  isAnalyzing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawTool>('line');
  const [lineColor, setLineColor] = useState<string>('#F59E0B'); // Amber
  const [lineWidth, setLineWidth] = useState<number>(3);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [drawnHistory, setDrawnHistory] = useState<ImageData[]>([]);

  // Initialize canvas when image is loaded and drawing mode is enabled
  useEffect(() => {
    if (!currentImage || !isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      setDrawnHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = currentImage;
  }, [currentImage, isDrawingMode]);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        onImageSelect(result);
        setIsDrawingMode(false);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Support pasting screenshot from clipboard (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile, isAnalyzing]);

  // Canvas Drawing Handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      const touch = e.touches?.[0] || e.changedTouches?.[0];
      if (touch) {
        clientX = touch.clientX;
        clientY = touch.clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      if (activeTool === 'pen' || activeTool === 'erase') {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode || !startPos) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const currentPos = getCanvasCoords(e);

    if (activeTool === 'pen') {
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth * (canvas.width / 800);
      ctx.lineCap = 'round';
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else if (activeTool === 'erase') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = lineWidth * 3 * (canvas.width / 800);
      ctx.lineCap = 'round';
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    }
  };

  const stopDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !startPos) return;

    const endPos = getCanvasCoords(e);

    if (activeTool === 'line') {
      // Draw trendline
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth * (canvas.width / 800);
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(endPos.x, endPos.y);
      ctx.stroke();
    } else if (activeTool === 'horizontal') {
      // Draw horizontal support/resistance level across entire chart width
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth * (canvas.width / 800);
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, startPos.y);
      ctx.lineTo(canvas.width, startPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    setDrawnHistory((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setStartPos(null);
  };

  const handleClearCanvas = () => {
    if (!currentImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setDrawnHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = currentImage;
  };

  const handleSaveDrawings = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onImageSelect(dataUrl);
    setIsDrawingMode(false);
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        id="file-input"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={isAnalyzing}
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all duration-300 overflow-hidden ${
          isDragging
            ? 'border-amber-500 bg-amber-500/5 scale-[1.01]'
            : 'border-gray-800 bg-zinc-900/50 hover:border-gray-700'
        }`}
      >
        {currentImage ? (
          <div className="relative group">
            {isDrawingMode ? (
              <div className="space-y-3 p-3 bg-black">
                {/* Drawing Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900 border border-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                      Drawing Tools:
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTool('line')}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                        activeTool === 'line'
                          ? 'bg-amber-500 text-black shadow'
                          : 'bg-zinc-800 text-gray-300 hover:text-white'
                      }`}
                    >
                      Trendline
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('horizontal')}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                        activeTool === 'horizontal'
                          ? 'bg-amber-500 text-black shadow'
                          : 'bg-zinc-800 text-gray-300 hover:text-white'
                      }`}
                    >
                      Support / Resistance Zone
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('pen')}
                      className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                        activeTool === 'pen'
                          ? 'bg-amber-500 text-black shadow'
                          : 'bg-zinc-800 text-gray-300 hover:text-white'
                      }`}
                    >
                      Freehand Pen
                    </button>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {['#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#FFFFFF'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setLineColor(color)}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            lineColor === color ? 'scale-125 border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleClearCanvas}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 rounded text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDrawings}
                      className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs cursor-pointer shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Apply Drawings
                    </button>
                  </div>
                </div>

                {/* Canvas Area */}
                <div className="relative flex justify-center bg-black rounded-lg overflow-hidden border border-gray-800">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                    className="max-h-[440px] w-auto object-contain cursor-crosshair touch-none"
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={currentImage}
                  alt="Forex Chart Preview"
                  className="w-full max-h-[460px] object-contain mx-auto rounded-lg bg-black"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end justify-between p-6 opacity-90 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-300 font-mono bg-black/60 px-2.5 py-1 rounded border border-gray-800">
                      Chart ready
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDrawingMode(true)}
                      disabled={isAnalyzing}
                      className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-black bg-amber-500 hover:bg-amber-400 rounded-lg shadow-md transition-all cursor-pointer border border-amber-400/20"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Draw on Chart / S&R
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-black bg-white hover:bg-gray-100 rounded-lg border border-amber-500/20 shadow-md transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Change Image
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 md:p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-500/10 to-yellow-600/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-amber-500/20 shadow-inner">
              <ImageIcon className="w-12 h-12 text-amber-500" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2 tracking-tight">
              Upload Chart (with Volume Bars)
            </h3>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
              Drag & drop your chart screenshot with vertical volume bars visible, click to browse, or paste with Ctrl+V. Analyzed via George Milton & Anna Coulling Volume Price Analysis (VPA).
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/20 border border-amber-400/20 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Browse Chart Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
