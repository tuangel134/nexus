import { useAppStore } from '@/store/useAppStore';
import { useRef, useState, useCallback, useEffect } from 'react';
import * as api from '@/lib/api';
import { getAIConfig } from '@/hooks/useAI';
import { motion } from 'framer-motion';
import {
  MousePointer, Hand, ZoomIn, ZoomOut,
  StickyNote, Image, Type, Link2, Trash2, RotateCcw,
  Plus, X, Pin, Brain, LayoutDashboard, Pencil, Maximize, Minimize
} from 'lucide-react';
import type { BoardNode, BoardConnection } from '@/types';

type BoardTool = 'select' | 'connect' | 'pan' | 'add_sticky' | 'add_photo' | 'add_note';

const BOARD_COLORS: Record<string, string> = {
  media: '#4080e8', contacts: '#40c880', locations: '#e8a020',
  events: '#a060e8', notes: '#20c8c8', identifiers: '#e84040',
  relations: '#ff6060', subject: '#e8a020', sticky: '#f0b840',
  photo: '#4080e8', note_card: '#20c8c8',
};

const STICKY_COLORS = ['#f0b840', '#e84040', '#40c880', '#4080e8', '#a060e8', '#20c8c8'];

export default function BoardSection() {
  const { board, setBoard, selectedBoardNode, setSelectedBoardNode, currentSubject, addNotification, media } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<BoardTool>('select');
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [stickyColorIdx, setStickyColorIdx] = useState(0);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [photoPickerPos, setPhotoPickerPos] = useState({ x: 0, y: 0 });
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Load saved board from localStorage
  useEffect(() => {
    if (!currentSubject) return;
    const saved = localStorage.getItem(`nexus_board_${currentSubject.id}`);
    if (saved) {
      try { const parsed = JSON.parse(saved); setBoard(parsed); } catch {}
    }
  }, [currentSubject?.id]);

  // Save board to localStorage
  function saveBoard() {
    if (!currentSubject) return;
    localStorage.setItem(`nexus_board_${currentSubject.id}`, JSON.stringify(board));
    addNotification('Pizarrón guardado', 'success');
  }

  // Load board data from API
  async function loadBoard() {
    if (!currentSubject) return;
    try {
      const data = await api.board.get(currentSubject.id);
      if (!data) return;
      const cx = 400, cy = 200;
      const newNodes: any[] = [];
      const newConnections: any[] = [];
      const cats = ['contacts', 'locations', 'events', 'notes', 'identifiers', 'relations'];
      // Media images as photo frames
      (data.media || []).forEach((item: any, i: number) => {
        if (item.type === 'image') {
          const angle = (i / Math.max((data.media||[]).length, 1)) * Math.PI * 1.2;
          newNodes.push({
            id: `media_${item.id}`, type: 'photo',
            x: cx + Math.cos(angle) * 140, y: cy + Math.sin(angle) * 140,
            width: 140, height: 180, zIndex: 5,
            label: item.original_name || 'Foto',
            imageUrl: `/uploads/${item.filename}`,
            color: '#4080e8',
          });
        }
      });
      cats.forEach((cat, ci) => {
        const items = data[cat] || [];
        items.forEach((item: any, i: number) => {
          const angle = (i / Math.max(items.length, 1)) * Math.PI * 1.2 + ci * 0.5;
          const r = 170 + ci * 35;
          newNodes.push({
            id: `${cat}_${item.id || i}`, type: cat,
            x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
            width: 160, height: 50, zIndex: 5, data: item,
            label: item.name || item.title || item.value || item.original_name || '',
            description: item.address || item.notes || item.content || item.description || '',
            imageUrl: item.type === 'image' ? `/uploads/${item.filename}` : undefined,
            color: BOARD_COLORS[cat],
          });
          newConnections.push({ id: `conn_${cat}_${i}`, fromId: 'subject', toId: `${cat}_${item.id || i}`,
            color: BOARD_COLORS[cat], style: 'dashed', thickness: 1, label: cat });
        });
      });
      // Center subject
      const primaryMedia = (data.media || []).find((m: any) => m.is_primary);
      newNodes.unshift({
        id: 'subject', type: 'subject', x: cx, y: cy,
        width: 120, height: 90, zIndex: 10,
        label: data.subject?.name || 'Sujeto',
        imageUrl: primaryMedia ? `/uploads/${primaryMedia.filename}` : undefined,
        color: BOARD_COLORS.subject,
      });
      setBoard({ nodes: newNodes, connections: newConnections, scale: 1, offsetX: 0, offsetY: 0 });
    } catch (e) { console.error('Board load error:', e); }
  }

  // AI-powered board organization
  async function aiOrganizeBoard() {
    if (!currentSubject) return;
    addNotification('Organizando pizarrón con IA...', 'info');
    try {
      const data = await api.board.get(currentSubject.id);
      if (!data) return;
      const summary = `Sujeto: ${data.subject?.name}\nEventos: ${(data.events||[]).map((e:any)=>e.title).join(', ')}\nContactos: ${(data.contacts||[]).map((c:any)=>c.value).join(', ')}\nUbicaciones: ${(data.locations||[]).map((l:any)=>l.name).join(', ')}`;
      const r = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: getAIConfig().apiKey,
          api_endpoint: getAIConfig().endpoint,
          model: getAIConfig().model,
          max_tokens: getAIConfig().maxTokens,
          system: 'Sos un analista experto en inteligencia. Analizá los datos de este sujeto y sugerí conexiones (relaciones) entre los datos. Respondé SOLO con un JSON así: {"connections":[{"from":"eventos","to":"contactos","why":"email coincide"},...]}. No expliques nada, solo el JSON.',
          messages: [{ role: 'user', content: summary }],
        }),
      });
      const d = await r.json();
      const text = d.content?.[0]?.text || d.choices?.[0]?.message?.content || '';
      // Parse AI connections
      const json = text.match(/\{.*\}/s)?.[0] || '{}';
      const ai = JSON.parse(json);
      // Reload board first
      if (data) {
        const cx = 400, cy = 200;
        const newNodes: any[] = [{ id: 'subject', type: 'subject', x: cx, y: cy, width: 120, height: 90, zIndex: 10, label: data.subject?.name, color: BOARD_COLORS.subject }];
        const newConns: any[] = [];
        const cats = ['contacts','locations','events','notes','identifiers','relations'];
        cats.forEach((cat, ci) => {
          (data[cat]||[]).forEach((item:any,i:number) => {
            const angle = (i/Math.max((data[cat]||[]).length,1))*2.8+ci*0.5;
            const r = 150+ci*30;
            newNodes.push({ id:`${cat}_${item.id||i}`,type:cat, x:cx+Math.cos(angle)*r, y:cy+Math.sin(angle)*r, width:160, height:50, zIndex:5, data:item, label:item.name||item.title||item.value||'', description:item.address||item.notes||item.content||'', imageUrl:item.type==='image'?`/uploads/${item.filename}`:undefined, color:BOARD_COLORS[cat] });
            newConns.push({id:`conn_${cat}_${i}`,fromId:'subject',toId:`${cat}_${item.id||i}`,color:BOARD_COLORS[cat],style:'dashed',thickness:1,label:cat});
          });
        });
        // Add AI-suggested connections
        (ai.connections||[]).forEach((c:any,i:number) => {
          newConns.push({id:`ai_conn_${i}`,fromId:`${c.from}_0`,toId:`${c.to}_0`,color:'#a060e8',style:'dotted',thickness:2,label:c.why||'IA'});
        });
        setBoard({ nodes: newNodes, connections: newConns, scale: 1, offsetX: 0, offsetY: 0 });
      }
      addNotification(`Pizarrón organizado: ${(ai.connections||[]).length} conexiones sugeridas`, 'success');
    } catch (e: any) {
      addNotification('Error: ' + e.message, 'error');
    }
  }

  const nodes = board.nodes;
  const connections = board.connections;
  const scale = board.scale;
  const offsetX = board.offsetX;
  const offsetY = board.offsetY;

  // Transform mouse to board coordinates
  const toBoardCoords = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }, [scale, offsetX, offsetY]);

  // Mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const boardPos = toBoardCoords(e.clientX, e.clientY);
    setMousePos(boardPos);

    if (isDragging && dragNode) {
      const node = nodes.find((n) => n.id === dragNode);
      if (node) {
        const newX = boardPos.x - dragOffset.x;
        const newY = boardPos.y - dragOffset.y;
        setBoard({
          ...board,
          nodes: nodes.map((n) => (n.id === dragNode ? { ...n, x: newX, y: newY } : n)),
        });
      }
    }

    if (isPanning) {
      setBoard({
        ...board,
        offsetX: offsetX + e.movementX,
        offsetY: offsetY + e.movementY,
      });
    }
  }, [isDragging, dragNode, dragOffset, isPanning, nodes, board, toBoardCoords, offsetX, offsetY, setBoard]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragNode(null);
    setIsPanning(false);
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const boardPos = toBoardCoords(e.clientX, e.clientY);
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    if (tool === 'connect') {
      if (connectingFrom === null) {
        setConnectingFrom(nodeId);
        setSelectedBoardNode(nodeId);
      } else if (connectingFrom !== nodeId) {
        // Create connection
        const newConn: BoardConnection = {
          id: `conn_${Date.now()}`,
          fromId: connectingFrom,
          toId: nodeId,
          color: '#e8a020',
          style: 'solid',
          thickness: 2,
        };
        setBoard({
          ...board,
          connections: [...connections, newConn],
        });
        setConnectingFrom(null);
      } else {
        setConnectingFrom(null);
      }
      return;
    }

    if (tool === 'pan') return;

    setIsDragging(true);
    setDragNode(nodeId);
    setDragOffset({ x: boardPos.x - node.x, y: boardPos.y - node.y });
    setSelectedBoardNode(nodeId);

    // Bring to front
    const maxZ = Math.max(...nodes.map((n) => n.zIndex), 0);
    setBoard({
      ...board,
      nodes: nodes.map((n) => (n.id === nodeId ? { ...n, zIndex: maxZ + 1 } : n)),
    });
  }, [tool, connectingFrom, nodes, board, connections, toBoardCoords, setBoard, setSelectedBoardNode]);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).dataset?.board === 'true') {
      if (tool === 'pan' || e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsPanning(true);
        return;
      }

      if (tool === 'add_sticky') {
        const pos = toBoardCoords(e.clientX, e.clientY);
        const newNode: BoardNode = {
          id: `sticky_${Date.now()}`,
          type: 'sticky',
          x: pos.x - 75,
          y: pos.y - 60,
          width: 150,
          height: 120,
          zIndex: Math.max(...nodes.map((n) => n.zIndex), 0) + 1,
          rotation: (Math.random() - 0.5) * 6,
          label: 'NOTA',
          description: 'Doble clic para editar',
          color: STICKY_COLORS[stickyColorIdx % STICKY_COLORS.length],
        };
        setBoard({ ...board, nodes: [...nodes, newNode] });
        setStickyColorIdx((prev) => prev + 1);
        setTool('select');
        return;
      }

      if (tool === 'add_note') {
        const pos = toBoardCoords(e.clientX, e.clientY);
        const newNode: BoardNode = {
          id: `note_${Date.now()}`,
          type: 'note_card',
          x: pos.x - 75,
          y: pos.y - 40,
          width: 150,
          height: 80,
          zIndex: Math.max(...nodes.map((n) => n.zIndex), 0) + 1,
          rotation: 0,
          label: 'Nueva Nota',
          description: '',
          color: '#20c8c8',
        };
        setBoard({ ...board, nodes: [...nodes, newNode] });
        setTool('select');
        return;
      }

      if (tool === 'add_photo') {
        setPhotoPickerPos(toBoardCoords(e.clientX, e.clientY));
        setShowPhotoPicker(true);
        setTool('select');
        return;
      }

      setSelectedBoardNode(null);
      setConnectingFrom(null);
    }
  }, [tool, nodes, board, toBoardCoords, setBoard, setSelectedBoardNode, stickyColorIdx]);

  const handleZoom = useCallback((delta: number) => {
    const newScale = Math.max(0.3, Math.min(3, scale + delta));
    setBoard({ ...board, scale: newScale });
  }, [scale, board, setBoard]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setBoard({
      ...board,
      nodes: nodes.filter((n) => n.id !== nodeId),
      connections: connections.filter((c) => c.fromId !== nodeId && c.toId !== nodeId),
    });
    setSelectedBoardNode(null);
  }, [nodes, connections, board, setBoard, setSelectedBoardNode]);

  const handleDeleteConnection = useCallback((connId: string) => {
    setBoard({
      ...board,
      connections: connections.filter((c) => c.id !== connId),
    });
  }, [connections, board, setBoard]);

  const handleDoubleClick = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    // Photo nodes → show fullscreen viewer
    if (node.type === 'photo' && node.imageUrl) {
      setViewerImage(node.imageUrl);
      return;
    }
    // Other nodes → edit label/description
    setEditingNode(nodeId);
    setEditLabel(node.label || '');
    setEditDescription(node.description || '');
  }, [nodes]);

  const saveEdit = useCallback(() => {
    if (!editingNode) return;
    setBoard({
      ...board,
      nodes: nodes.map((n) => {
        if (n.id !== editingNode) return n;
        const lines = Math.max(
          (editLabel.length / 12) + (editDescription.length / 20),
          2
        );
        const h = n.type === 'photo' ? Math.max(180, 150 + lines * 14) :
                 n.type === 'sticky' ? Math.max(120, 60 + lines * 16) :
                 n.type === 'note_card' ? Math.max(80, 50 + lines * 14) :
                 n.height || 50;
        return { ...n, label: editLabel, description: editDescription, height: Math.min(h, 500) };
      }),
    });
    setEditingNode(null);
  }, [editingNode, editLabel, editDescription, nodes, board, setBoard]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
    }
  }, [handleZoom]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBoardNode && !editingNode) {
          handleDeleteNode(selectedBoardNode);
        }
      }
      if (e.key === 'Escape') {
        setEditingNode(null);
        setConnectingFrom(null);
        setTool('select');
        setShowAddMenu(false);
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedBoardNode, editingNode, handleDeleteNode]);

  // Get node center
  const getNodeCenter = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  };

  // Get connection midpoint for delete button
  const getConnectionMidpoint = (conn: BoardConnection) => {
    const from = getNodeCenter(conn.fromId);
    const to = getNodeCenter(conn.toId);
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  };

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-[9999] bg-[#080a0f]' : ''} h-full flex flex-col`} data-board="true">
        {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#0c0f16]/90 backdrop-blur border-b border-[#1c2435] flex-shrink-0 z-10">
        <span className="font-mono text-[10px] text-[#5a6880] tracking-wider mr-3 flex-shrink-0">
          📌 PIZARRÓN
        </span>
        {nodes.length === 0 && (
          <span className="text-[10px] text-[#5a6880] font-mono">Usá CARGAR para traer los datos</span>
        )}
        {tool !== 'select' && tool !== 'pan' && tool !== 'connect' && (
          <span className="text-[10px] text-[#e8a020] font-mono animate-pulse mr-2">
            ⚡ Haz clic en el pizarrón para colocar
          </span>
        )}

        {/* Tools */}
        <div className="flex items-center gap-0.5">
          {[
            { id: 'select' as BoardTool, icon: MousePointer, label: 'Seleccionar' },
            { id: 'connect' as BoardTool, icon: Link2, label: 'Conectar (V)' },
            { id: 'pan' as BoardTool, icon: Hand, label: 'Mover vista' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTool(t.id); setConnectingFrom(null); }}
              className={`p-2 rounded-lg transition-all ${
                tool === t.id
                  ? 'bg-[#e8a020]/20 text-[#e8a020]'
                  : 'text-[#5a6880] hover:bg-[#161c2a] hover:text-[#8a98b0]'
              }`}
              title={t.label}
            >
              <t.icon size={16} />
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-[#1c2435] mx-2" />

        {/* Board action buttons */}
        <button onClick={loadBoard}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono text-[#5a6880] hover:text-[#e8a020] hover:bg-[#161c2a] rounded transition-colors tracking-wider"
          title="Cargar todos los datos del sujeto">
          <LayoutDashboard size={14} /> CARGAR
        </button>
        <button onClick={aiOrganizeBoard}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono text-[#a060e8] hover:bg-[#a060e8]/10 rounded transition-colors tracking-wider"
          title="La IA organiza y conecta el pizarrón">
          <Brain size={14} /> IA ORGANIZAR
        </button>
        <button onClick={saveBoard}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono text-[#40c880] hover:bg-[#40c880]/10 rounded transition-colors tracking-wider"
          title="Guardar pizarrón">
          <Pin size={14} /> GUARDAR
        </button>
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="p-2 rounded-lg text-[#5a6880] hover:bg-[#161c2a] hover:text-[#e8a020] transition-all"
            title="Agregar elemento"
          >
            <Plus size={16} />
          </button>
          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1 bg-[#0c0f16] border border-[#252d40] rounded-lg shadow-2xl z-50 py-1 min-w-[160px]">
              {[
                { id: 'add_sticky' as BoardTool, icon: StickyNote, label: 'Nota adhesiva' },
                { id: 'add_photo' as BoardTool, icon: Image, label: 'Marco de foto' },
                { id: 'add_note' as BoardTool, icon: Type, label: 'Tarjeta de nota' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setTool(item.id); setShowAddMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#d4dce8] hover:bg-[#161c2a] transition-colors text-left"
                >
                  <item.icon size={14} className="text-[#5a6880]" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[#1c2435] mx-2" />

        {/* Zoom */}
        <button onClick={() => handleZoom(0.2)} className="p-2 rounded-lg text-[#5a6880] hover:bg-[#161c2a] hover:text-[#8a98b0]">
          <ZoomIn size={16} />
        </button>
        <span className="font-mono text-[10px] text-[#5a6880] w-10 text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => handleZoom(-0.2)} className="p-2 rounded-lg text-[#5a6880] hover:bg-[#161c2a] hover:text-[#8a98b0]">
          <ZoomOut size={16} />
        </button>

        <div className="w-px h-5 bg-[#1c2435] mx-2" />

        {/* Reset */}
        <button
          onClick={() => setBoard({ ...board, scale: 1, offsetX: 0, offsetY: 0 })}
          className="p-2 rounded-lg text-[#5a6880] hover:bg-[#161c2a] hover:text-[#8a98b0]"
          title="Reset view"
        >
          <RotateCcw size={16} />
        </button>
        <button onClick={() => setFullscreen(!fullscreen)}
          className="p-2 rounded-lg text-[#5a6880] hover:bg-[#161c2a] hover:text-[#e8a020]"
          title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
          {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>

        {/* Delete selected */}
        {selectedBoardNode && (
          <>
            <div className="w-px h-5 bg-[#1c2435] mx-2" />
            <button
              onClick={() => {
                const node = nodes.find(n => n.id === selectedBoardNode);
                if (node) { setEditingNode(node.id); setEditLabel(node.label||''); setEditDescription(node.description||''); }
              }}
              className="p-2 rounded-lg text-[#40c880] hover:bg-[#40c880]/20 transition-colors"
              title="Editar seleccionado">
              <Pencil size={16} />
            </button>
            <button
              onClick={() => handleDeleteNode(selectedBoardNode)}
              className="p-2 rounded-lg text-[#e84040] hover:bg-[#e84040]/20 transition-colors"
              title="Eliminar seleccionado (Del)"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}

        {/* Connection mode indicator */}
        {tool === 'connect' && connectingFrom && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-[#e8a020]/10 border border-[#e8a020]/30 rounded-lg">
            <Link2 size={12} className="text-[#e8a020]" />
            <span className="text-[10px] font-mono text-[#e8a020]">Selecciona destino...</span>
          </div>
        )}
      </div>

      {/* Board Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-visible cursor-crosshair"
        style={{
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(60,30,10,0.4) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(40,20,8,0.3) 0%, transparent 50%),
            repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px),
            linear-gradient(135deg, #2c1a0a 0%, #3d2510 25%, #2a1608 50%, #3a2010 75%, #281408 100%)
          `,
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={handleContainerMouseDown}
        onWheel={handleWheel}
        data-board="true"
      >
        {/* Cork texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 15% 25%, rgba(180,130,80,0.15) 0%, transparent 100%),
              radial-gradient(1px 1px at 40% 60%, rgba(160,110,60,0.1) 0%, transparent 100%),
              radial-gradient(1px 1px at 70% 35%, rgba(180,140,90,0.12) 0%, transparent 100%),
              radial-gradient(1px 1px at 85% 75%, rgba(150,100,50,0.1) 0%, transparent 100%)
            `,
          }}
        />

        {/* Ambient light */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(255,220,150,0.04) 0%, transparent 70%)',
          }}
        />

        {/* Transform container */}
        <div
          className="absolute inset-0"
          data-board="true"
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Lines Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1, overflow: 'visible' }}>
            {connections.map((conn) => {
              const from = getNodeCenter(conn.fromId);
              const to = getNodeCenter(conn.toId);
              const dash = conn.style === 'dashed' ? '5,5' : conn.style === 'dotted' ? '2,4' : 'none';

              return (
                <g key={conn.id}>
                  <line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke={conn.color}
                    strokeWidth={conn.thickness}
                    strokeDasharray={dash}
                    opacity={0.5}
                  />
                  {/* Connection dots */}
                  <circle cx={from.x} cy={from.y} r={3} fill={conn.color} opacity={0.6} />
                  <circle cx={to.x} cy={to.y} r={3} fill={conn.color} opacity={0.6} />
                  {/* Label */}
                  {conn.label && (
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 5}
                      textAnchor="middle"
                      fill={conn.color}
                      fontSize="9"
                      fontFamily="monospace"
                      opacity={0.7}
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Connection in progress */}
            {connectingFrom && (
              <line
                x1={getNodeCenter(connectingFrom).x}
                y1={getNodeCenter(connectingFrom).y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#e8a020"
                strokeWidth={2}
                strokeDasharray="5,5"
                opacity={0.7}
              />
            )}
          </svg>

          {/* Connection delete buttons (visible on hover of connection area - simplified) */}
          {connections.map((conn) => {
            const mid = getConnectionMidpoint(conn);
            return (
              <button
                key={`del_${conn.id}`}
                className="absolute w-5 h-5 rounded-full bg-[#e84040] text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20"
                style={{
                  left: mid.x - 10,
                  top: mid.y - 10,
                  fontSize: '10px',
                }}
                onClick={(e) => { e.stopPropagation(); handleDeleteConnection(conn.id); }}
              >
                <X size={10} />
              </button>
            );
          })}

          {/* Nodes Layer */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute select-none ${
                tool === 'connect' ? 'cursor-crosshair' : tool === 'pan' ? 'cursor-grab' : 'cursor-grab'
              } ${selectedBoardNode === node.id ? 'ring-2 ring-[#e8a020] ring-offset-2 ring-offset-transparent' : ''}`}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                zIndex: node.zIndex,
                transform: `rotate(${node.rotation || 0}deg)`,
                transition: isDragging && dragNode === node.id ? 'none' : 'transform 0.15s ease',
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onDoubleClick={() => handleDoubleClick(node.id)}
            >
              {/* Pin */}
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full z-10"
                style={{
                  background: node.type === 'subject'
                    ? 'radial-gradient(circle at 40% 40%, #ffd700, #b8860b)'
                    : 'radial-gradient(circle at 40% 40%, #ff6b6b, #c0392b)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)',
                }}
              />

              {/* Content based on type */}
              {node.type === 'sticky' && (
                <div className="w-full h-full p-3 polaroid-shadow hover:polaroid-shadow-hover transition-shadow rounded-sm flex flex-col overflow-hidden"
                  style={{ background: node.color || '#f0b840', color: '#1a0f05', fontFamily: "'Courier New', monospace" }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-70 mb-1">{node.label}</div>
                  <div className="text-[11px] leading-tight opacity-90 break-words overflow-y-auto max-h-[calc(100%-24px)]">{node.description}</div>
                </div>
              )}

              {node.type === 'photo' && (
                <div className="w-full h-full bg-[#f5f0e8] p-1.5 polaroid-shadow hover:polaroid-shadow-hover transition-shadow rounded-sm flex flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-hidden rounded-sm">
                    {node.imageUrl ? (
                      <img src={node.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#d4c8b8] flex items-center justify-center text-[#a09080]">
                        <Image size={28} />
                      </div>
                    )}
                  </div>
                  <div className="pt-1 px-0.5 flex-shrink-0">
                    <div className="text-[8px] font-bold text-[#3a2a18] uppercase tracking-wider font-mono text-center leading-tight">{node.label}</div>
                    {node.description && (
                      <div className="text-[7px] text-[#5a4a38] mt-0.5 text-center leading-tight break-words">{node.description}</div>
                    )}
                  </div>
                </div>
              )}

              {node.type === 'note_card' && (
                <div className="w-full h-full bg-white p-3 polaroid-shadow hover:polaroid-shadow-hover transition-shadow rounded-sm border-l-4"
                  style={{ borderLeftColor: node.color || '#20c8c8' }}
                >
                  <div className="text-[10px] font-bold text-[#1a0f05] mb-1 uppercase tracking-wider font-mono">{node.label}</div>
                  <div className="text-[10px] text-[#3a2a18] leading-tight break-words overflow-y-auto max-h-[calc(100%-24px)]">{node.description}</div>
                </div>
              )}

              {node.type === 'subject' && (
                <div className="w-full h-full bg-[#f0ebe0] p-2 pb-8 polaroid-shadow hover:polaroid-shadow-hover transition-shadow rounded-sm">
                  <div className="w-full h-full bg-[#161c2a] rounded-sm flex items-center justify-center text-[#e8a020]">
                    <span className="text-2xl font-mono font-bold">{currentSubject?.name.charAt(0)}</span>
                  </div>
                  <div className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] font-bold text-[#e8a020] uppercase tracking-wider font-mono truncate px-2">
                    {node.label}
                  </div>
                </div>
              )}

              {node.type === 'relations' && (
                <div className="w-full h-full bg-[#f0ebe0] p-2 pb-8 polaroid-shadow hover:polaroid-shadow-hover transition-shadow rounded-sm">
                  <div className="w-full h-full bg-[#161c2a] rounded-sm flex items-center justify-center text-[#a060e8] border-2 border-[#a060e8]">
                    <span className="text-lg font-mono font-bold">
                      {(node.label || '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-bold text-[#a060e8] uppercase tracking-wider font-mono truncate px-2">
                    {node.label}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-[#8a6860] z-0">
              <Pin size={48} className="mx-auto mb-3 opacity-30" />
              <div className="text-sm font-mono">PIZARRÓN VACÍO</div>
              <div className="text-[11px] mt-1 opacity-60">Usa el menú + para agregar elementos</div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingNode && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setEditingNode(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-6 w-[450px] max-w-[90vw] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1c2435]">
              <span className="font-mono text-sm text-[#e8a020] tracking-[2px]">◈ EDITAR ELEMENTO</span>
              <button onClick={() => setEditingNode(null)} className="text-[#5a6880] hover:text-[#e84040]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono text-[#5a6880] tracking-wider block mb-1.5">ETIQUETA</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full bg-[#111520] border border-[#252d40] rounded-lg px-3 py-2 text-sm text-[#d4dce8] outline-none focus:border-[#e8a020] transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-[#5a6880] tracking-wider block mb-1.5">DESCRIPCIÓN</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={Math.max(3, Math.ceil(editDescription.length / 40))}
                  className="w-full bg-[#111520] border border-[#252d40] rounded-lg px-3 py-2 text-sm text-[#d4dce8] outline-none focus:border-[#e8a020] transition-colors resize-y min-h-[60px] max-h-[300px]"
                  placeholder="Escribí la descripción…"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#1c2435]">
              <button
                onClick={() => setEditingNode(null)}
                className="px-4 py-2 text-[11px] text-[#8a98b0] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-[#e8a020] text-black rounded-lg text-[11px] font-bold hover:bg-[#f0b840] transition-colors"
              >
                GUARDAR
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Photo picker modal */}
      {showPhotoPicker && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowPhotoPicker(false)}>
          <motion.div initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} onClick={e => e.stopPropagation()}
            className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[500px] max-w-[90vw] max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-[#4080e8] tracking-wider">SELECCIONAR FOTO DE MULTIMEDIA</span>
              <button onClick={() => setShowPhotoPicker(false)} className="text-[#5a6880] hover:text-white"><X size={16} /></button>
            </div>
            {media.filter(m => m.type === 'image').length === 0 ? (
              <p className="text-[#5a6880] text-sm py-8 text-center">No hay fotos en Multimedia. Subí algunas primero.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {media.filter(m => m.type === 'image').map(m => (
                  <button key={m.id} onClick={() => {
                    const newNode: BoardNode = {
                      id: `photo_${Date.now()}`, type: 'photo',
                      x: photoPickerPos.x - 60, y: photoPickerPos.y - 75,
                      width: 140, height: 180,
                      zIndex: Math.max(...nodes.map(n => n.zIndex), 0) + 1,
                      rotation: (Math.random() - 0.5) * 5,
                      label: m.original_name || 'Foto',
                      imageUrl: `/uploads/${m.filename}`,
                      color: '#4080e8',
                    };
                    setBoard({ ...board, nodes: [...nodes, newNode] });
                    setShowPhotoPicker(false);
                  }}
                    className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-transparent hover:border-[#e8a020] transition-all bg-[#111520]">
                    <img src={`/uploads/${m.filename}`} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Fullscreen image viewer */}
      {viewerImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center" onClick={() => setViewerImage(null)}>
          <button onClick={() => setViewerImage(null)} className="absolute top-4 right-4 text-white/60 hover:text-white z-10 text-2xl">✕</button>
          <img src={viewerImage} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-[#0a0804]/80 backdrop-blur px-3 py-1.5 rounded-lg border border-[#1c2435] z-10">
        {Object.entries(BOARD_COLORS).slice(0, 6).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[8px] font-mono text-[#8a6860] uppercase tracking-wider">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
