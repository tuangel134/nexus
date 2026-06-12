import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import * as api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Eye, Star, Trash2, FileText, Music, Film, Camera, MapPin, X, Loader2 } from 'lucide-react';

const typeIcons: Record<string, React.ReactNode> = {
  image: <Film size={20} />,
  video: <Film size={20} />,
  audio: <Music size={20} />,
  document: <FileText size={20} />,
};

const typeColors: Record<string, string> = {
  image: 'text-[#4080e8]',
  video: 'text-[#a060e8]',
  audio: 'text-[#20c8c8]',
  document: 'text-[#e8a020]',
};

export default function MediaSection() {
  const { currentSubject, media, setMedia, addNotification } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [exifData, setExifData] = useState<any>(null);
  const [exifLoading, setExifLoading] = useState<string | null>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || !currentSubject) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        await api.media.upload(currentSubject!.id, fd);
        addNotification(`${file.name} subido`, 'success');
      } catch (e: any) {
        addNotification(`Error: ${file.name}`, 'error');
      }
    }
    const updated = await api.media.list(currentSubject!.id);
    setMedia(updated);
    setUploading(false);
  }

  async function deleteMedia(id: string) {
    if (!confirm('¿Eliminar archivo?')) return;
    await api.media.delete(id);
    if (currentSubject) {
      const updated = await api.media.list(currentSubject.id);
      setMedia(updated);
    }
  }

  async function setPrimary(id: string) {
    await api.media.setPrimary(id);
    if (currentSubject) {
      const updated = await api.media.list(currentSubject.id);
      setMedia(updated);
    }
  }

  async function viewExif(id: string) {
    setExifLoading(id);
    setExifData(null);
    try {
      const r = await fetch(`/api/media/${id}/exif`);
      const d = await r.json();
      setExifData(d);
    } catch (e: any) {
      addNotification('Error leyendo metadatos', 'error');
    }
    setExifLoading(null);
  }

  return (
    <div className="p-6">
      <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />

      {/* Upload zone */}
      <div onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-[#e8a020]', 'bg-[#e8a020]/5'); }}
        onDragLeave={e => { e.currentTarget.classList.remove('border-[#e8a020]', 'bg-[#e8a020]/5'); }}
        onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-[#e8a020]', 'bg-[#e8a020]/5'); handleUpload(e.dataTransfer.files); }}
        className="border-2 border-dashed border-[#252d40] rounded-xl p-8 text-center cursor-pointer hover:border-[#e8a020] hover:bg-[#e8a020]/5 transition-all group mb-6"
      >
        {uploading ? <Loader2 size={32} className="mx-auto text-[#e8a020] animate-spin mb-2" /> : <Upload size={32} className="mx-auto text-[#5a6880] group-hover:text-[#e8a020] transition-colors mb-2" />}
        <p className="text-sm text-[#8a98b0] group-hover:text-[#d4dce8]">Arrastra archivos aquí o haz clic para seleccionar</p>
        <p className="text-[11px] text-[#5a6880] mt-1">Imágenes, Videos, Documentos, Audio</p>
      </div>

      {/* Grid */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] text-[#5a6880] tracking-[2px]">ARCHIVOS ({media.length})</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {media.map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
            className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-[#0c0f16] border border-[#1c2435] hover:border-[#c47010] transition-all cursor-pointer"
          >
            {/* Thumb */}
            {m.type === 'image' ? (
              <img src={`/uploads/${m.filename}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className={typeColors[m.type] || 'text-[#5a6880]'}>{typeIcons[m.type]}</span>
                <span className="text-[9px] text-[#5a6880] uppercase font-mono">{m.type}</span>
                <span className="text-[9px] text-[#8a98b0] px-2 text-center break-all">{m.original_name.slice(0, 20)}</span>
              </div>
            )}

            {m.is_primary && (
              <div className="absolute top-2 right-2 bg-[#e8a020] text-black text-[8px] font-bold px-1.5 py-0.5 rounded font-mono z-10">★ PRINCIPAL</div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <a href={`/uploads/${m.filename}`} target="_blank"
                className="flex items-center gap-1 px-3 py-1 bg-[#161c2a] border border-[#252d40] rounded text-[10px] text-[#d4dce8] hover:border-[#e8a020]">
                <Eye size={10} /> Ver
              </a>
              {m.type === 'image' && (
                <button onClick={() => viewExif(m.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-[#161c2a] border border-[#252d40] rounded text-[10px] text-[#20c8c8] hover:border-[#20c8c8]">
                  {exifLoading === m.id ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />} Metadatos
                </button>
              )}
              {!m.is_primary && (
                <button onClick={() => setPrimary(m.id)}
                  className="flex items-center gap-1 px-3 py-1 bg-[#e8a020] rounded text-[10px] text-black font-bold hover:bg-[#f0b840]">
                  <Star size={10} /> Principal
                </button>
              )}
              <button onClick={() => deleteMedia(m.id)}
                className="flex items-center gap-1 px-3 py-1 bg-[#e84040]/20 border border-[#e84040]/30 rounded text-[10px] text-[#e84040] hover:bg-[#e84040]/30">
                <Trash2 size={10} /> Borrar
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {media.length === 0 && (
        <div className="text-center py-12 text-[#5a6880]"><p className="text-sm">Sin archivos multimedia</p></div>
      )}

      {/* EXIF Modal */}
      <AnimatePresence>
        {exifData && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setExifData(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0c0f16] border border-[#252d40] rounded-xl p-5 w-[500px] max-w-[90vw] max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs text-[#20c8c8] tracking-wider flex items-center gap-2">
                  <Camera size={14} /> METADATOS
                </span>
                <button onClick={() => setExifData(null)} className="text-[#5a6880] hover:text-white"><X size={16} /></button>
              </div>

              {exifData.gps?.lat && (
                <div className="mb-3 p-3 bg-[#20c8c8]/5 border border-[#20c8c8]/20 rounded-lg">
                  <div className="flex items-center gap-1 text-xs text-[#20c8c8] mb-1"><MapPin size={12} /> UBICACIÓN GPS</div>
                  <a href={`https://maps.google.com/?q=${exifData.gps.lat},${exifData.gps.lng}`} target="_blank"
                    className="text-sm text-[#d4dce8] underline hover:text-[#e8a020]">
                    {exifData.gps.lat.toFixed(6)}, {exifData.gps.lng.toFixed(6)}
                  </a>
                </div>
              )}

              <div className="space-y-1">
                {Object.entries(exifData.exif || {}).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs py-1 border-b border-[#1c2435] last:border-none">
                    <span className="text-[#5a6880] font-mono w-1/2 shrink-0">{k}</span>
                    <span className="text-[#d4dce8] break-all">{String(v)}</span>
                  </div>
                ))}
              </div>

              {(!exifData.exif || Object.keys(exifData.exif).length === 0) && (
                <p className="text-xs text-[#5a6880] text-center py-4">Esta imagen no tiene metadatos EXIF</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
