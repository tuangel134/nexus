import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';
import { getAIConfig } from '@/hooks/useAI';
import { motion } from 'framer-motion';
import { Brain, AlertTriangle, Repeat, Network, FileText, Loader2, Trash2 } from 'lucide-react';

const analysisButtons = [
  { type: 'profile', label: 'Perfil Psicológico', icon: Brain, desc: 'Análisis profundo de personalidad y motivaciones' },
  { type: 'risk', label: 'Evaluación de Riesgo', icon: AlertTriangle, desc: 'Nivel de amenaza y factores de riesgo' },
  { type: 'pattern', label: 'Patrones de Comportamiento', icon: Repeat, desc: 'Rutinas, hábitos y consistencias' },
  { type: 'network', label: 'Análisis de Red', icon: Network, desc: 'Mapa de relaciones y conexiones' },
  { type: 'summary', label: 'Resumen Ejecutivo', icon: FileText, desc: 'Síntesis completa del caso' },
];

const PROMPTS: Record<string, string> = {
  profile: `ACTUÁS COMO UN PSICÓLOGO FORENSE DE ALTÍSIMO NIVEL, especializado en elaboración de perfiles criminales y análisis psicológico profundo.

Con los datos proporcionados, generá un PERFIL PSICOLÓGICO COMPLETO y DETALLADO del sujeto. Incluí:

1. **Estructura de Personalidad**: Rasgos dominantes (Big Five), posibles trastornos de personalidad, estabilidad emocional.
2. **Motivaciones Profundas**: Qué impulsa al sujeto, necesidades psicológicas no satisfechas, miedos y deseos.
3. **Estilo Cognitivo**: Cómo procesa información, toma decisiones, resuelve problemas. Nivel de inteligencia, creatividad, impulsividad.
4. **Comportamiento Social**: Estilo de interacción, empatía, manipulación, liderazgo, dependencia, aislamiento.
5. **Áreas de Vulnerabilidad**: Estrés, trauma, adicciones, inseguridades, puntos de presión psicológica.
6. **Patrones de Vida**: Estilo de vida, rutinas, intereses, valores, creencias, contradicciones.
7. **Indicadores Forenses**: Signos de engaño, manipulación, psicopatía, narcisismo, maquiavelismo basados en la evidencia disponible.
8. **Recomendaciones de Interacción**: Cómo abordarlo, técnicas de entrevista, puntos de persuasión.

Basá cada afirmación en evidencia concreta de los datos proporcionados. Diferenciá entre lo que es seguro, lo probable y lo especulativo.`,

  risk: `ACTUÁS COMO UN ANALISTA DE INTELIGENCIA Y EVALUACIÓN DE AMENAZAS DE ÉLITE, con experiencia en agencias de seguridad.

Con los datos proporcionados, generá una EVALUACIÓN DE RIESGO COMPLETA. Incluí:

1. **Nivel de Riesgo General**: BAJO/MEDIO/ALTO/CRÍTICO con justificación detallada basada en datos.
2. **Factores de Riesgo Identificados**: Cada factor con su nivel de impacto y probabilidad.
3. **Indicadores de Alerta**: Señales de advertencia presentes en los datos, comportamientos de preocupación.
4. **Análisis de Amenazas**: Capacidad de daño, intención, oportunidad, medios disponibles.
5. **Vulnerabilidades del Sujeto**: Puntos débiles explotables tácticamente.
6. **Escenarios Futuros**: Posibles evoluciones del caso, líneas de acción probables.
7. **Recomendaciones Operativas**: Medidas concretas para mitigar riesgos, prioridades de investigación.
8. **Matrix de Riesgo**: Tabla visual de probabilidad vs impacto para cada factor identificado.

Priorizá los hallazgos por urgencia. Sé específico y evita generalizaciones.`,

  pattern: `ACTUÁS COMO UN ANALISTA DE COMPORTAMIENTO CRIMINAL Y PATRONES DE VIDA, experto en encontrar consistencias e inconsistencias en datos de investigaciones.

Con los datos proporcionados, generá un ANÁLISIS DE PATRONES DE COMPORTAMIENTO. Incluí:

1. **Rutinas Identificadas**: Patrones diarios, semanales, mensuales. Horarios, lugares, actividades recurrentes.
2. **Patrones Temporales**: Concentración de actividades en ciertos días/horas, estacionalidad, periodicidad.
3. **Huella Geográfica**: Zonas de actividad, rutas de desplazamiento, lugares frecuentes, zonas evitadas.
4. **Consistencias**: Comportamientos que se repiten de forma predecible y confiable.
5. **Inconsistencias y Anomalías**: Desviaciones de patrones, comportamientos atípicos, cambios repentinos.
6. **Firmas de Comportamiento**: Acciones únicas o distintivas que caracterizan al sujeto.
7. **Correlaciones**: Relaciones entre diferentes tipos de actividades, conexiones entre eventos y contactos.
8. **Predicciones**: Próximos movimientos probables basados en patrones históricos.

Identificá qué patrones están confirmados por múltiples fuentes vs cuáles son especulativos.`,

  network: `ACTUÁS COMO UN ESPECIALISTA EN ANÁLISIS DE REDES SOCIALES E INTELIGENCIA DE FUENTES ABIERTAS, experto en reconstruir estructuras relacionales.

Con los datos proporcionados, generá un ANÁLISIS DE RED COMPLETO. Incluí:

1. **Mapa de Relaciones**: Estructura general de la red, roles de cada nodo, centralidad.
2. **Jerarquías Identificadas**: Quién lidera, quién sigue, relaciones de poder, dependencias.
3. **Conexiones Clave**: Vínculos más importantes, nodos puente entre grupos, intermediarios.
4. **Relaciones Sospechosas**: Vínculos que requieren atención, conexiones inusuales o contradictorias.
5. **Análisis del Pizarrón**: Interpretación de las conexiones visuales del pizarrón, patrones espaciales.
6. **Grupos y Subredes**: Clusters naturales, afinidades, facciones, aislamientos.
7. **Vulnerabilidades de Red**: Puntos de fallo, nodos aislados, dependencias excesivas.
8. **Recomendaciones de Investigación**: Por dónde continuar, qué relaciones profundizar, qué nodos priorizar.

Usá los datos del pizarrón como fuente principal de la topología de red.`,

  summary: `ACTUÁS COMO UN ANALISTA SENIOR DE INTELIGENCIA, encargado de producir informes ejecutivos para toma de decisiones de alto nivel.

Con los datos proporcionados, generá un RESUMEN EJECUTIVO COMPLETO del caso. Incluí:

1. **Ficha del Sujeto**: Datos básicos, perfil, estado actual, nivel de riesgo.
2. **Hallazgos Principales**: Los 5-7 descubrimientos más importantes del caso, ordenados por relevancia.
3. **Línea de Tiempo**: Secuencia cronológica de eventos clave.
4. **Red de Contactos**: Personas y entidades vinculadas, tipo de relación, fuerza del vínculo.
5. **Evidencia Clave**: Datos, documentos, ubicaciones y conexiones más relevantes del pizarrón.
6. **Análisis de Riesgo**: Evaluación resumida con nivel y factores principales.
7. **Líneas de Investigación**: Próximos pasos recomendados, prioridades, hipótesis a confirmar.
8. **Recomendaciones**: Acciones concretas para avanzar el caso.

El resumen debe ser COMPRENSIBLE para alguien que no conoce el caso. Priorizá claridad y concisión sin perder profundidad analítica.`
};

export default function AISection() {
  const { currentSubject, aiAnalyses, setAIAnalyses, media, events, locations, relations, identifiers, contacts, notes, board } = useAppStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function runAnalysis(type: string) {
    if (!currentSubject) return;
    const cfg = getAIConfig();
    if (!cfg.apiKey) { setError('Configurá una API key en el asistente IA'); setTimeout(() => setError(''), 3000); return; }

    setLoading(type);
    setError('');

    const ctx = [
      `SUJETO: ${currentSubject.name} (${currentSubject.status}, riesgo: ${currentSubject.risk_level})`,
      `Alias: ${(currentSubject.aliases||[]).join(', ') || 'N/A'} | Tags: ${(currentSubject.tags||[]).join(', ') || 'N/A'}`,
      ``,
      `EVENTOS (${events.length}):`,
      ...events.map(e => `  [${e.date?.slice(0,10)||'?'}] ${e.title} (${e.event_type}, ${e.importance})${e.location ? ' en '+e.location : ''}${e.description ? ' — '+e.description.slice(0,100) : ''}`),
      ``,
      `UBICACIONES (${locations.length}):`,
      ...locations.map(l => `  ${l.name} [${l.location_type}] - ${l.address || 'sin dirección'}`),
      ``,
      `RELACIONES (${relations.length}):`,
      ...relations.map(r => `  ${r.name_a || '?'} ↔ ${r.name_b || '?'} como ${r.relation_type} (${r.strength})${r.notes ? ' — '+r.notes.slice(0,80) : ''}`),
      ``,
      `IDENTIFICADORES (${identifiers.length}):`,
      ...identifiers.map(i => `  ${i.id_type.toUpperCase()}: ${i.value}${i.notes ? ' ('+i.notes+')' : ''}`),
      ``,
      `CONTACTOS (${contacts.length}):`,
      ...contacts.map(c => `  ${c.contact_type}: ${c.value}${c.label ? ' ('+c.label+')' : ''}`),
      ``,
      `NOTAS (${notes.length}):`,
      ...notes.map(n => `  [${n.category}] ${n.title}: ${n.content.slice(0,200)}${n.is_pinned ? ' [FIJADA]' : ''}`),
      ``,
      `ARCHIVOS: ${media.length} archivos (${media.filter(m=>m.type==='image').length} imágenes, ${media.filter(m=>m.type==='video').length} videos)`,
      ``,
      `PIZARRÓN (${board.nodes.length} elementos, ${board.connections.length} conexiones):`,
      ...board.nodes.map(n => `  • ${n.type}: "${n.label || ''}"${n.description ? ' — '+n.description.slice(0,100) : ''}${n.imageUrl ? ' [imagen]' : ''}${n.rotation ? ' rotado' : ''}`),
      ...board.connections.map(c => `  ↳ ${c.fromId} → ${c.toId}${c.label ? ' ('+c.label+')' : ''} (${c.style}, ${c.thickness})`),
    ].join('\n');

    try {
      const r = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: cfg.apiKey, api_endpoint: cfg.endpoint, model: cfg.model,
          max_tokens: Math.min(cfg.maxTokens * 2, 32000),
          system: PROMPTS[type] || PROMPTS.summary,
          messages: [{ role: 'user', content: ctx }],
        }),
      });
      const d = await r.json();
      const text = d.content?.[0]?.text || d.choices?.[0]?.message?.content || 'Sin respuesta';
      await api.ai.save(currentSubject.id, { analysis_type: type, content: text });
      const updated = await api.ai.list(currentSubject.id);
      setAIAnalyses(updated);
    } catch (e: any) {
      setError('Error: ' + e.message);
    }
    setLoading(null);
  }

  async function deleteAnalysis(id: string) {
    if (!currentSubject) return;
    if (!confirm('¿Eliminar este análisis?')) return;
    await fetch(`/api/ai-analyses/${id}`, { method: 'DELETE' });
    const updated = await api.ai.list(currentSubject.id);
    setAIAnalyses(updated);
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-3 mb-6">
        {analysisButtons.map((btn, i) => {
          const Icon = btn.icon;
          return (
            <motion.button key={btn.type}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => runAnalysis(btn.type)}
              disabled={loading !== null}
              className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#4020a0]/80 to-[#a060e8]/80 text-white rounded-lg border border-[#a060e8]/30 hover:border-[#a060e8]/60 hover:shadow-[0_0_20px_rgba(160,96,232,0.2)] transition-all disabled:opacity-50">
              {loading === btn.type ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
              <div className="text-left">
                <div className="text-xs font-bold">{btn.label}</div>
                <div className="text-[9px] text-white/60">{btn.desc}</div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {error && <div className="mb-4 p-3 bg-[#e84040]/10 border border-[#e84040]/30 rounded-lg text-xs text-[#e84040]">{error}</div>}

      <div className="space-y-4">
        {aiAnalyses.map(a => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0c0f16] border border-[#2a1a4a] rounded-lg p-4 group">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] text-[#a060e8] tracking-wider flex items-center gap-2">
                <Brain size={12} /> {a.analysis_type.toUpperCase()}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#5a6880] font-mono">{a.created_at?.slice(0,16).replace('T',' ')}</span>
                <button onClick={() => deleteAnalysis(a.id)} className="text-[#5a6880] hover:text-[#e84040] opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="text-xs text-[#d4dce8] whitespace-pre-wrap leading-relaxed">{a.content}</div>
          </motion.div>
        ))}
        {aiAnalyses.length === 0 && !loading && (
          <p className="text-[#5a6880] text-sm py-8 text-center">Seleccioná un tipo de análisis. Se usarán TODOS los datos del caso.</p>
        )}
      </div>
    </div>
  );
}
