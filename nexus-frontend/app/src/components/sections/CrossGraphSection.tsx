import { useEffect, useRef, useState } from 'react'; import { useAppStore } from '@/store/useAppStore'; import { ZoomIn, ZoomOut } from 'lucide-react';
export default function CrossGraphSection() {
  const { subjects } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    if (subjects.length === 0) { ctx.fillStyle = '#5a6880'; ctx.font = '14px monospace'; ctx.textAlign = 'center'; ctx.fillText('Sin sujetos para graficar', W/2, H/2); return; }
    const cx = W/2, cy = H/2;
    const nodes: {x:number,y:number,color:string,name:string,risk:string}[] = [];
    const riskCol: Record<string,string> = { low:'#40c880', medium:'#e8a020', high:'#e84040', critical:'#ff6060' };
    subjects.forEach((s, i) => {
      const angle = (i/subjects.length)*Math.PI*2 - Math.PI/2;
      const r = Math.min(W,H)*0.35*scale;
      nodes.push({ x: cx+Math.cos(angle)*r, y: cy+Math.sin(angle)*r, color: riskCol[s.risk_level]||'#5a6880', name: s.name, risk: s.risk_level });
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nodes[i].x, nodes[i].y);
      ctx.strokeStyle = 'rgba(232,160,32,0.15)'; ctx.lineWidth = 1; ctx.stroke();
    });
    // Center subject circle
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
    grd.addColorStop(0, '#f0b840'); grd.addColorStop(1, '#c47010');
    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI*2); ctx.fillStyle = grd; ctx.fill();
    ctx.fillStyle = '#000'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NEXUS', cx, cy);
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, n.y, 18, 0, Math.PI*2);
      ctx.fillStyle = n.color+'33'; ctx.fill(); ctx.strokeStyle = n.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#d4dce8'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(n.name.length > 14 ? n.name.slice(0,13)+'…' : n.name, n.x, n.y+22);
    });
  }, [subjects, scale]);
  return (<div className="p-6"><div className="flex items-center justify-between mb-4">
    <span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">GRAFO DE SUJETOS</span>
    <div className="flex gap-1">
      <button onClick={() => setScale(s=>Math.min(s+0.2,3))} className="p-1.5 bg-[#111520] border border-[#252d40] rounded text-[#5a6880] hover:text-white"><ZoomIn size={14} /></button>
      <button onClick={() => setScale(s=>Math.max(s-0.2,0.3))} className="p-1.5 bg-[#111520] border border-[#252d40] rounded text-[#5a6880] hover:text-white"><ZoomOut size={14} /></button>
    </div>
  </div>
    <canvas ref={canvasRef} className="w-full h-[500px] bg-[#0c0f16] border border-[#1c2435] rounded-lg" />
  </div>);
}
