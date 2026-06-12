import { useAppStore } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { FileImage, Calendar, MapPin, Link2, StickyNote, Activity } from 'lucide-react';

const statCards = [
  { key: 'media_count', label: 'ARCHIVOS', icon: FileImage, color: 'text-[#4080e8]', bg: 'bg-[#4080e8]/10', border: 'border-[#4080e8]/20' },
  { key: 'events_count', label: 'EVENTOS', icon: Calendar, color: 'text-[#e8a020]', bg: 'bg-[#e8a020]/10', border: 'border-[#e8a020]/20' },
  { key: 'locations_count', label: 'UBICACIONES', icon: MapPin, color: 'text-[#40c880]', bg: 'bg-[#40c880]/10', border: 'border-[#40c880]/20' },
  { key: 'relations_count', label: 'RELACIONES', icon: Link2, color: 'text-[#a060e8]', bg: 'bg-[#a060e8]/10', border: 'border-[#a060e8]/20' },
  { key: 'notes_count', label: 'NOTAS', icon: StickyNote, color: 'text-[#20c8c8]', bg: 'bg-[#20c8c8]/10', border: 'border-[#20c8c8]/20' },
];

export default function OverviewSection() {
  const { currentSubject, events, notes, relations } = useAppStore();

  if (!currentSubject) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[#5a6880]">
        <Activity size={48} className="opacity-20 mb-4" />
        <div className="font-mono text-lg tracking-[3px] text-[#8a98b0]">NEXUS INTEL</div>
        <p className="text-sm mt-2">Selecciona un sujeto para comenzar la investigación</p>
      </div>
    );
  }

  const pinnedNotes = notes.filter((n) => n.is_pinned).slice(0, 3);
  const recentEvents = [...events].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 4);

  return (
    <div className="p-6 space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          const value = currentSubject[stat.key as keyof typeof currentSubject] as number;
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className={`${stat.bg} border ${stat.border} rounded-lg p-4 text-center hover:border-opacity-50 transition-all cursor-default`}
            >
              <div className={`font-mono text-2xl font-bold ${stat.color}`}>{value}</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Icon size={10} className={stat.color} />
                <span className="text-[10px] font-mono text-[#5a6880] tracking-wider">{stat.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] text-[#5a6880] tracking-[2px] border-b border-[#1c2435] pb-2 flex-1">
              ÚLTIMOS EVENTOS
            </span>
          </div>
          <div className="space-y-2">
            {recentEvents.length > 0 ? recentEvents.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#0c0f16] border border-[#1c2435] rounded-lg p-3 hover:border-[#c47010]/50 transition-colors group cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm text-[#d4dce8] font-medium group-hover:text-white transition-colors">{e.title}</span>
                  <span className="font-mono text-[10px] text-[#e8a020] flex-shrink-0 ml-3">
                    {e.date ? e.date.slice(0, 10) : '—'}
                  </span>
                </div>
                {e.location && (
                  <div className="text-[11px] text-[#5a6880] mt-1 flex items-center gap-1">
                    <MapPin size={10} />
                    {e.location}
                  </div>
                )}
                <span className={`inline-block mt-2 text-[9px] font-mono px-2 py-0.5 rounded border ${
                  e.importance === 'critical' ? 'bg-[#e84040]/10 text-[#e84040] border-[#e84040]/20' :
                  e.importance === 'high' ? 'bg-[#e8a020]/10 text-[#e8a020] border-[#e8a020]/20' :
                  'bg-[#111520] text-[#5a6880] border-[#252d40]'
                }`}>
                  {e.event_type.toUpperCase()}
                </span>
              </motion.div>
            )) : (
              <p className="text-[#5a6880] text-sm py-4 text-center">Sin eventos registrados</p>
            )}
          </div>
        </div>

        {/* Network Graph placeholder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] text-[#5a6880] tracking-[2px] border-b border-[#1c2435] pb-2 flex-1">
              RED DE RELACIONES
            </span>
          </div>
          <div className="bg-[#0c0f16] border border-[#1c2435] rounded-lg p-4 h-[280px] relative overflow-hidden dot-pattern">
            {/* Simple canvas graph */}
            <svg className="w-full h-full" viewBox="0 0 400 250">
              {/* Center node */}
              <circle cx="200" cy="125" r="25" fill="#e8a020" opacity="0.9" />
              <text x="200" y="130" textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold" fontFamily="monospace">
                {currentSubject.name.split(' ')[0]}
              </text>

              {/* Relation nodes */}
              {relations.map((r, i) => {
                const angle = (i / Math.max(relations.length, 1)) * Math.PI * 2 - Math.PI / 2;
                const radius = 90;
                const x = 200 + Math.cos(angle) * radius;
                const y = 125 + Math.sin(angle) * radius;
                const otherName = r.name_a === currentSubject.name ? r.name_b : r.name_a;

                return (
                  <g key={r.id}>
                    <line x1="200" y1="125" x2={x} y2={y} stroke="#e8a020" strokeWidth={r.strength === 'strong' ? 2 : 1} opacity="0.3" />
                    <circle cx={x} cy={y} r="18" fill="#161c2a" stroke="#2e3a52" strokeWidth="2" />
                    <text x={x} y={y + 4} textAnchor="middle" fill="#d4dce8" fontSize="9" fontFamily="monospace">
                      {otherName.split(' ')[0]}
                    </text>
                    <text x={(200 + x) / 2} y={(125 + y) / 2} textAnchor="middle" fill="#5a6880" fontSize="8" fontFamily="monospace">
                      {r.relation_type}
                    </text>
                  </g>
                );
              })}

              {relations.length === 0 && (
                <text x="200" y="180" textAnchor="middle" fill="#2e3a52" fontSize="11" fontFamily="monospace" fontWeight="bold">
                  Sin relaciones registradas
                </text>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] text-[#5a6880] tracking-[2px] border-b border-[#1c2435] pb-2 flex-1">
              NOTAS DESTACADAS
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pinnedNotes.map((note, i) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0c0f16] border border-[#c47010]/40 rounded-lg p-4 cursor-pointer hover:border-[#e8a020] transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#e8a020]">📌</span>
                  <span className="text-sm font-semibold text-[#d4dce8]">{note.title}</span>
                </div>
                <p className="text-xs text-[#8a98b0] line-clamp-3">{note.content}</p>
                <span className="inline-block mt-2 text-[9px] font-mono px-2 py-0.5 rounded bg-[#4080e8]/10 text-[#4080e8] border border-[#4080e8]/20">
                  {note.category.toUpperCase()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
