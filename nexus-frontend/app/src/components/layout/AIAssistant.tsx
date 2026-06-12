import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Send, Settings, Loader2, LayoutDashboard, CalendarDays, Link2, Pin, Activity } from 'lucide-react';
import { getAIConfig, saveAIConfig } from '@/hooks/useAI';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';

const TAB_LABELS: Record<string, string> = {
  overview: 'Resumen del sujeto',
  media: 'Multimedia',
  events: 'Eventos y línea de tiempo',
  locations: 'Ubicaciones',
  relations: 'Relaciones con otros sujetos',
  identifiers: 'Identificadores',
  contacts: 'Contactos',
  notes: 'Notas de investigación',
  ai: 'Análisis con IA',
  osint: 'Investigación OSINT',
  board: 'Pizarrón de investigación',
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; action: string; data?: any }>>([]);
  const [executing, setExecuting] = useState<string | null>(null);

  const store = useAppStore();
  const { currentSubject, currentTab, events, media, relations, notes, contacts, locations } = store;

  const inputRef = useRef<HTMLInputElement>(null);

  function buildContext(): string {
    if (!currentSubject) return 'No hay sujeto seleccionado.';
    let ctx = `SUJETO: ${currentSubject.name} (${currentSubject.status}, riesgo: ${currentSubject.risk_level})\n`;
    ctx += `PESTAÑA: ${TAB_LABELS[currentTab] || currentTab}\n`;
    ctx += `EVENTOS: ${events.length} registrados\n`;
    ctx += `RELACIONES: ${relations.length} conexiones\n`;
    ctx += `MULTIMEDIA: ${media.length} archivos\n`;
    ctx += `NOTAS: ${notes.length}\n`;
    ctx += `CONTACTOS: ${contacts.length}\n`;
    ctx += `UBICACIONES: ${locations.length}\n`;
    return ctx;
  }

  async function handleSend() {
    if (!prompt.trim()) return;
    setResponse('');
    setSuggestions([]);
    setLoading(true);

    const ctx = buildContext();
    const fullPrompt = `Contexto:\n${ctx}\n\nPetición del usuario: ${prompt}\n\n`;
    const system = `Eres un asistente experto en inteligencia forense integrado en NEXUS. 
El usuario puede pedirte acciones como:
- "Ordena los eventos" → responder con ACCION: sort_events
- "Crea una relación entre X y Y" → ACCION: create_relation
- "Organiza el pizarrón" → ACCION: organize_board
- "Resume este sujeto" → ACCION: summary
- "Analiza los eventos" → ACCION: analyze_events
- "Conecta los puntos en el pizarrón" → ACCION: connect_board
- "Genera un análisis de IA" → ACCION: run_ai_analysis

Si detectás una acción específica, respondé con:
ACCIÓN: nombre_accion
SEGURO: si/no (si necesitás confirmación)
EXPLICACIÓN: explicación breve

Si no es una acción específica, respondé normalmente como asistente.`;

    try {
      const r = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: getAIConfig().apiKey,
          api_endpoint: getAIConfig().endpoint,
          model: getAIConfig().model,
          max_tokens: getAIConfig().maxTokens,
          system,
          messages: [{ role: 'user', content: fullPrompt }],
        }),
      });
      const d = await r.json();
      const text = d.content?.[0]?.text || d.choices?.[0]?.message?.content || '';

      // Parse action
      const actionMatch = text.match(/ACCIÓN:\s*(\w+)/);
      const seguroMatch = text.match(/SEGURO:\s*(si|no)/);
      const explMatch = text.match(/EXPLICACIÓN:\s*(.+)/);

      const action = actionMatch?.[1];
      const seguro = seguroMatch?.[1] === 'si';
      const explanation = explMatch?.[1] || '';

      if (action && seguro) {
        setSuggestions([{ label: getActionLabel(action), action, data: { explanation } }]);
        setResponse(text.replace(/ACCIÓN:.*\n?/, '').replace(/SEGURO:.*\n?/, '').replace(/EXPLICACIÓN:.*\n?/, '').trim());
      } else if (action && !seguro) {
        executeAction(action);
        setResponse(explanation || 'Ejecutando...');
      } else {
        setResponse(text);
      }
    } catch (e: any) {
      setResponse('Error: ' + e.message);
    }
    setLoading(false);
  }

  function getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      sort_events: '📅 Ordenar eventos',
      create_relation: '🔗 Crear relación',
      organize_board: '📌 Organizar pizarrón',
      summary: '📋 Resumen ejecutivo',
      analyze_events: '📊 Analizar eventos',
      connect_board: '🔗 Conectar pizarrón',
      run_ai_analysis: '🧠 Ejecutar análisis IA',
    };
    return labels[action] || `Ejecutar: ${action}`;
  }

  async function executeAction(action: string) {
    if (!currentSubject) return;
    setExecuting(action);
    try {
      switch (action) {
        case 'sort_events': {
          const sorted = [...events].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
          store.setEvents(sorted);
          store.addNotification('Eventos ordenados por fecha', 'success');
          break;
        }
        case 'organize_board':
        case 'connect_board': {
          const boardData = await api.board.get(currentSubject.id);
          if (boardData) {
            const nodes: any[] = [];
            const connections: any[] = [];
            const cx = 400, cy = 200;
            const cats = ['media', 'contacts', 'locations', 'events', 'notes', 'identifiers', 'relations'];
            cats.forEach((cat, ci) => {
              const items = boardData[cat] || [];
              items.forEach((item: any, i: number) => {
                const angle = (i / Math.max(items.length, 1)) * Math.PI * 1.5 + ci * 0.3;
                const r = 180 + ci * 40;
                nodes.push({
                  id: `${cat}_${item.id || i}`,
                  type: cat, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
                  width: 160, height: 50, zIndex: 5, data: item,
                });
                connections.push({
                  id: `conn_${cat}_${i}`, fromId: 'subject', toId: `${cat}_${item.id || i}`,
                  color: '#e8a020', style: 'dashed', thickness: 1, label: cat,
                });
              });
            });
            store.setBoard({ nodes: [{ id: 'subject', type: 'subject', x: cx, y: cy, width: 100, height: 80, zIndex: 10, label: currentSubject.name } as any, ...nodes], connections, scale: 1, offsetX: 0, offsetY: 0 });
            store.setCurrentTab('board');
            store.addNotification('Pizarrón organizado', 'success');
          }
          break;
        }
        case 'run_ai_analysis': {
          store.setCurrentTab('ai');
          // Trigger the AAI analysis by clicking the first button
          store.addNotification('Cambiá a la pestaña ANÁLISIS IA y elegí un tipo', 'info');
          break;
        }
        case 'summary': {
          const r = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: getAIConfig().apiKey,
              api_endpoint: getAIConfig().endpoint,
              model: getAIConfig().model,
              max_tokens: getAIConfig().maxTokens,
              system: 'Generá un resumen ejecutivo del caso.',
              messages: [{ role: 'user', content: buildContext() }],
            }),
          });
          const d = await r.json();
          const text = d.content?.[0]?.text || d.choices?.[0]?.message?.content || '';
          setResponse(text);
          // Save as note
          await api.notes.create(currentSubject.id, { title: 'Resumen IA', content: text, category: 'intel' });
          store.addNotification('Resumen guardado como nota', 'success');
          break;
        }
        case 'analyze_events': {
          const eventsData = events.map(e => `${e.date?.slice(0,10)||'?'}: ${e.title} (${e.event_type})`).join('\n');
          const r = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: getAIConfig().apiKey,
              api_endpoint: getAIConfig().endpoint,
              model: getAIConfig().model,
              max_tokens: getAIConfig().maxTokens,
              system: 'Analizá estos eventos de una investigación. Identificá patrones, inconsistencias, y sugerí líneas de investigación.',
              messages: [{ role: 'user', content: eventsData }],
            }),
          });
          const d = await r.json();
          const text = d.content?.[0]?.text || d.choices?.[0]?.message?.content || '';
          setResponse(text);
          await api.notes.create(currentSubject.id, { title: 'Análisis de eventos IA', content: text, category: 'intel' });
          store.addNotification('Análisis guardado como nota', 'success');
          break;
        }
        default:
          store.addNotification(`Acción "${action}" no implementada`, 'error');
      }
    } catch (e: any) {
      store.addNotification(`Error: ${e.message}`, 'error');
    }
    setExecuting(null);
    setSuggestions([]);
  }

  return (
    <>
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full bg-gradient-to-r from-[#4020a0] to-[#a060e8] flex items-center justify-center shadow-xl hover:shadow-[0_0_20px_rgba(160,96,232,0.4)] transition-shadow">
        {open ? <X size={20} className="text-white" /> : <Brain size={20} className="text-white" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-[9999] w-[420px] max-w-[90vw] bg-[#0c0f16] border border-[#252d40] rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2435]">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-[#a060e8]" />
                <span className="font-mono text-xs text-[#a060e8] tracking-wider">ASISTENTE IA</span>
                {currentSubject && <span className="text-[9px] text-[#5a6880] font-mono">· {currentSubject.name}</span>}
              </div>
              <button onClick={() => setShowConfig(!showConfig)} className="text-[#5a6880] hover:text-[#e8a020]"><Settings size={14} /></button>
            </div>

            {showConfig && (
              <div className="p-4 border-b border-[#1c2435] space-y-2 bg-[#080a0f]">
                <AIConfigFields />
                <button onClick={() => setShowConfig(false)}
                  className="w-full py-1.5 bg-[#e8a020] text-black rounded text-xs font-bold tracking-wider hover:bg-[#f0b840]">CERRAR</button>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                {suggestions.map(s => (
                  <button key={s.action} onClick={() => executeAction(s.action)} disabled={executing === s.action}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#e8a020]/10 border border-[#e8a020]/30 rounded text-[10px] text-[#e8a020] hover:bg-[#e8a020]/20 disabled:opacity-50">
                    {executing === s.action ? <Loader2 size={10} className="animate-spin" /> : <Activity size={10} />}
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Response */}
            {response && (
              <div className="px-4 pt-3">
                <div className="p-3 bg-[#111520] border border-[#2a1a4a] rounded-lg text-xs text-[#d4dce8] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {response}
                </div>
              </div>
            )}

            {/* Quick actions per tab */}
            <div className="px-4 pt-3 flex flex-wrap gap-1.5">
              <TabAction icon={CalendarDays} label="Ordenar eventos" tab="events" />
              <TabAction icon={LayoutDashboard} label="Resumen" tab="overview" />
              <TabAction icon={Pin} label="Organizar pizarrón" tab="board" />
              <TabAction icon={Link2} label="Analizar eventos" tab="events" />
              <TabAction icon={Brain} label="Análisis IA" tab="ai" />
            </div>

            {/* Input */}
            <div className="p-4 flex gap-2 border-t border-[#1c2435]">
              <input ref={inputRef} value={prompt} onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={`Acción en ${TAB_LABELS[currentTab] || 'la app'}...`}
                className="flex-1 bg-[#111520] border border-[#252d40] rounded-lg px-3 py-2 text-xs text-[#d4dce8] outline-none focus:border-[#a060e8]" />
              <button onClick={handleSend} disabled={loading || !prompt.trim()}
                className="px-3 py-2 bg-[#a060e8] rounded-lg text-white disabled:opacity-50 hover:bg-[#b070f8]">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TabAction({ icon: Icon, label, tab }: { icon: any; label: string; tab: string }) {
  const store = useAppStore();
  return (
    <button onClick={() => { store.setCurrentTab(tab); }}
      className="flex items-center gap-1 px-2 py-1 bg-[#1c2435] hover:bg-[#252d40] rounded text-[9px] text-[#5a6880] hover:text-[#a060e8] transition-colors">
      <Icon size={10} /> {label}
    </button>
  );
}

function AIConfigFields() {
  const cfg = getAIConfig();
  const [key, setKey] = useState(cfg.apiKey);
  const [endpoint, setEndpoint] = useState(cfg.endpoint);
  const [model, setModel] = useState(cfg.model);

  return (
    <div className="space-y-2">
      <input value={key} onChange={e => { setKey(e.target.value); saveAIConfig({ apiKey: e.target.value }); }}
        placeholder="API Key" className="w-full bg-[#111520] border border-[#252d40] rounded px-2.5 py-1.5 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
      <input value={endpoint} onChange={e => { setEndpoint(e.target.value); saveAIConfig({ endpoint: e.target.value }); }}
        placeholder="Endpoint (ej: https://integrate.api.nvidia.com/v1/chat/completions)"
        className="w-full bg-[#111520] border border-[#252d40] rounded px-2.5 py-1.5 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
      <input value={model} onChange={e => { setModel(e.target.value); saveAIConfig({ model: e.target.value }); }}
        placeholder="Modelo" className="w-full bg-[#111520] border border-[#252d40] rounded px-2.5 py-1.5 text-xs text-[#d4dce8] outline-none focus:border-[#e8a020]" />
    </div>
  );
}
