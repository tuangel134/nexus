import type {
  Subject, MediaItem, EventItem, LocationItem, RelationItem,
  IdentifierItem, ContactItem, NoteItem, AIAnalysis, BoardNode, BoardConnection
} from '@/types';

export const demoSubjects: Subject[] = [
  {
    id: 'sub_1',
    name: 'Roberto "El Ingeniero" Mendoza',
    dob: '1985-03-15',
    gender: 'M',
    nationality: 'México',
    status: 'suspect',
    risk_level: 'critical',
    tags: ['narcotráfico', 'lavado', 'redes'],
    aliases: ['El Ingeniero', 'RM85', 'Don Roberto'],
    notes: 'Sujeto clave en operación de lavado de activos. Movimientos financieros sospechosos detectados desde 2023. Tiene conexiones con políticos locales.',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-06-15T14:30:00Z',
    media_count: 8,
    events_count: 12,
    locations_count: 5,
    relations_count: 7,
    notes_count: 4,
  },
  {
    id: 'sub_2',
    name: 'Valentina Cruz Romero',
    dob: '1992-07-22',
    gender: 'F',
    nationality: 'Colombia',
    status: 'active',
    risk_level: 'high',
    tags: ['finanzas', 'testigo protegido'],
    aliases: ['La Contadora', 'VCR'],
    notes: 'Ex-contadora del sujeto principal. Aceptó colaborar con la fiscalía. Requiere protección constante.',
    created_at: '2024-02-05T10:00:00Z',
    updated_at: '2024-06-10T09:00:00Z',
    media_count: 3,
    events_count: 6,
    locations_count: 2,
    relations_count: 3,
    notes_count: 2,
  },
  {
    id: 'sub_3',
    name: 'Carlos "El Pollo" Vargas',
    dob: '1978-11-03',
    gender: 'M',
    nationality: 'México',
    status: 'suspect',
    risk_level: 'high',
    tags: ['seguridad', 'enforcer'],
    aliases: ['El Pollo', 'CV78'],
    notes: 'Jefe de seguridad de Mendoza. Vinculado a actos de intimidación. Ex policía municipal destituido.',
    created_at: '2024-03-01T12:00:00Z',
    updated_at: '2024-05-20T16:00:00Z',
    media_count: 4,
    events_count: 8,
    locations_count: 3,
    relations_count: 2,
    notes_count: 3,
  },
  {
    id: 'sub_4',
    name: 'Isabella Fontaine',
    dob: '1990-01-18',
    gender: 'F',
    nationality: 'Francia',
    status: 'active',
    risk_level: 'medium',
    tags: ['abogada', 'internacional'],
    aliases: [],
    notes: 'Abogada de offshore vinculada a transferencias internacionales sospechosas.',
    created_at: '2024-04-12T09:00:00Z',
    updated_at: '2024-06-01T11:00:00Z',
    media_count: 2,
    events_count: 4,
    locations_count: 2,
    relations_count: 2,
    notes_count: 1,
  },
];

export const demoMedia: MediaItem[] = [
  { id: 'med_1', subject_id: 'sub_1', filename: 'foto_casino.jpg', original_name: 'Foto Casino Royal', type: 'image', is_primary: true, created_at: '2024-01-15T10:00:00Z' },
  { id: 'med_2', subject_id: 'sub_1', filename: 'transferencias.pdf', original_name: 'Registro Transferencias Bancarias', type: 'document', is_primary: false, created_at: '2024-02-01T14:00:00Z' },
  { id: 'med_3', subject_id: 'sub_1', filename: 'reunion_hotel.mp4', original_name: 'Video Reunión Hotel Marriott', type: 'video', is_primary: false, created_at: '2024-03-10T19:30:00Z' },
  { id: 'med_4', subject_id: 'sub_1', filename: 'placa_auto.jpg', original_name: 'Foto Placas Vehículo', type: 'image', is_primary: false, created_at: '2024-03-15T08:00:00Z' },
  { id: 'med_5', subject_id: 'sub_1', filename: 'llamada_audio.mp3', original_name: 'Interceptación Telefónica #14', type: 'audio', is_primary: false, created_at: '2024-04-01T22:00:00Z' },
  { id: 'med_6', subject_id: 'sub_1', filename: 'pasaporte_scan.jpg', original_name: 'Scan Pasaporte Mendoza', type: 'image', is_primary: false, created_at: '2024-04-20T09:00:00Z' },
  { id: 'med_7', subject_id: 'sub_1', filename: 'propiedades.pdf', original_name: 'Listado Propiedades Inmobiliarias', type: 'document', is_primary: false, created_at: '2024-05-05T11:00:00Z' },
  { id: 'med_8', subject_id: 'sub_1', filename: 'foto_aeropuerto.jpg', original_name: 'Foto Aeropuerto Tijuana', type: 'image', is_primary: false, created_at: '2024-06-01T06:30:00Z' },
];

export const demoEvents: EventItem[] = [
  { id: 'evt_1', subject_id: 'sub_1', title: 'Depósito sospechoso cuenta off-shore', date: '2024-01-20T09:00:00', event_type: 'transaction', importance: 'critical', location: 'Banco Cayman, Grand Cayman', description: 'Transferencia de $2.3M USD a cuenta vinculada a Fontaine & Associates', created_at: '2024-01-21T08:00:00Z', updated_at: '2024-01-21T08:00:00Z' },
  { id: 'evt_2', subject_id: 'sub_1', title: 'Reunión con Valentina Cruz', date: '2024-02-10T14:30:00', event_type: 'meeting', importance: 'high', location: 'Hotel Marriott Polanco, CDMX', description: 'Reunión de 3 horas. Posible coordinación de finanzas.', created_at: '2024-02-10T18:00:00Z', updated_at: '2024-02-10T18:00:00Z' },
  { id: 'evt_3', subject_id: 'sub_1', title: 'Viaje a Tijuana', date: '2024-03-05T06:00:00', event_type: 'travel', importance: 'high', location: 'Aeropuerto Tijuana, BC', description: 'Vuelo privado. Se encontró con sujetos no identificados.', created_at: '2024-03-05T12:00:00Z', updated_at: '2024-03-05T12:00:00Z' },
  { id: 'evt_4', subject_id: 'sub_1', title: 'Conversación telefónica interceptada', date: '2024-03-22T23:15:00', event_type: 'communication', importance: 'critical', location: null, description: 'Llamada de 45 minutos con código. Mención de "el envío" y "la ruta del pacífico".', created_at: '2024-03-23T08:00:00Z', updated_at: '2024-03-23T08:00:00Z' },
  { id: 'evt_5', subject_id: 'sub_1', title: 'Compra vehículo de lujo', date: '2024-04-08T11:00:00', event_type: 'transaction', importance: 'normal', location: 'Agencia Porsche, Santa Fe CDMX', description: 'Compra contado Mercedes-AMG G63. Pagó $4.2M MXN en efectivo.', created_at: '2024-04-08T15:00:00Z', updated_at: '2024-04-08T15:00:00Z' },
  { id: 'evt_6', subject_id: 'sub_1', title: 'Visita a inmueble Lomas', date: '2024-04-25T16:00:00', event_type: 'activity', importance: 'normal', location: 'Calle Paseo de las Palmas #1240, Lomas', description: 'Ingresó a propiedad registrada a nombre de prestanombres. Permaneció 2 horas.', created_at: '2024-04-25T19:00:00Z', updated_at: '2024-04-25T19:00:00Z' },
  { id: 'evt_7', subject_id: 'sub_1', title: 'Encuentro con Carlos Vargas', date: '2024-05-12T20:00:00', event_type: 'meeting', importance: 'high', location: 'Restaurante El Bajío, Coyoacán', description: 'Cena privada. Salieron juntos en vehículo de Vargas.', created_at: '2024-05-12T23:00:00Z', updated_at: '2024-05-12T23:00:00Z' },
  { id: 'evt_8', subject_id: 'sub_1', title: 'Alerta bancaria', date: '2024-05-28T03:00:00', event_type: 'transaction', importance: 'critical', location: 'Varios bancos', description: 'Movimiento atípico: retiro de $500K USD en 24 horas distribuido en 8 sucursales.', created_at: '2024-05-28T09:00:00Z', updated_at: '2024-05-28T09:00:00Z' },
  { id: 'evt_9', subject_id: 'sub_1', title: 'Viaje a Panamá', date: '2024-06-02T07:00:00', event_type: 'travel', importance: 'high', location: 'Aeropuerto Tocumen, Panamá', description: 'Viaje de negocios. Reunión en zona libre con individuos de nacionalidad rusa.', created_at: '2024-06-02T14:00:00Z', updated_at: '2024-06-02T14:00:00Z' },
  { id: 'evt_10', subject_id: 'sub_1', title: 'Amenaza a testigo', date: '2024-06-08T01:00:00', event_type: 'incident', importance: 'critical', location: 'Residencia Valentina Cruz', description: 'Vehículo sospechoso rondando el domicilio de la testigo protegida. Placas coinciden con vehículo de Vargas.', created_at: '2024-06-08T06:00:00Z', updated_at: '2024-06-08T06:00:00Z' },
];

export const demoLocations: LocationItem[] = [
  { id: 'loc_1', subject_id: 'sub_1', name: 'Residencia Principal', address: 'Paseo de la Reforma #445, Polanco, CDMX', location_type: 'home', lat: 19.4326, lng: -99.1332, notes: 'Penthouse de lujo. Seguridad privada 24/7.', created_at: '2024-01-12T08:00:00Z' },
  { id: 'loc_2', subject_id: 'sub_1', name: 'Oficina Corporativa', address: 'Torre Mayor, Piso 42, CDMX', location_type: 'work', lat: 19.4270, lng: -99.1755, notes: 'Empresa fachada: "Grupo Empresarial del Pacífico S.A. de C.V."', created_at: '2024-01-15T10:00:00Z' },
  { id: 'loc_3', subject_id: 'sub_1', name: 'Bodega Industrial', address: 'Tlalnepantla, Estado de México', location_type: 'suspicious', lat: 19.5400, lng: -99.1950, notes: 'Bodega donde presuntamente se realizan reuniones clandestinas.', created_at: '2024-03-01T14:00:00Z' },
  { id: 'loc_4', subject_id: 'sub_1', name: 'Rancho Santa Teresa', address: 'Valle de Bravo, Estado de México', location_type: 'frequent', lat: 19.1950, lng: -100.1300, notes: 'Propiedad de recreo. Visitas los fines de semana.', created_at: '2024-04-10T09:00:00Z' },
  { id: 'loc_5', subject_id: 'sub_1', name: 'Departamento Seguro', address: 'Colonia Roma Norte, CDMX', location_type: 'temporary', lat: 19.4167, lng: -99.1667, notes: 'Usado ocasionalmente. Posible encuentro con cómplices.', created_at: '2024-05-20T16:00:00Z' },
];

export const demoRelations: RelationItem[] = [
  { id: 'rel_1', subject_a_id: 'sub_1', subject_b_id: 'sub_2', name_a: 'Roberto Mendoza', name_b: 'Valentina Cruz Romero', relation_type: 'associate', strength: 'strong', notes: 'Relación financiera. Ella manejaba sus cuentas.', created_at: '2024-02-01T08:00:00Z' },
  { id: 'rel_2', subject_a_id: 'sub_1', subject_b_id: 'sub_3', name_a: 'Roberto Mendoza', name_b: 'Carlos Vargas', relation_type: 'employee', strength: 'strong', notes: 'Jefe de seguridad personal. Lealtad confirmada.', created_at: '2024-03-01T10:00:00Z' },
  { id: 'rel_3', subject_a_id: 'sub_1', subject_b_id: 'sub_4', name_a: 'Roberto Mendoza', name_b: 'Isabella Fontaine', relation_type: 'associate', strength: 'medium', notes: 'Asesoría legal offshore. Transacciones internacionales.', created_at: '2024-04-15T09:00:00Z' },
];

export const demoIdentifiers: IdentifierItem[] = [
  { id: 'id_1', subject_id: 'sub_1', id_type: 'curp', value: 'MERA850315HMCDNR08', notes: 'Verificado en RENAPO', created_at: '2024-01-11T08:00:00Z' },
  { id: 'id_2', subject_id: 'sub_1', id_type: 'rfc', value: 'MERA850315ABC', notes: 'Activo en SAT', created_at: '2024-01-11T08:00:00Z' },
  { id: 'id_3', subject_id: 'sub_1', id_type: 'passport', value: 'G12345678', notes: 'Múltiples entradas a Panamá y Colombia', created_at: '2024-01-11T08:00:00Z' },
  { id: 'id_4', subject_id: 'sub_1', id_type: 'phone', value: '+52 55 1234 5678', notes: 'Línea principal. Interceptada.', created_at: '2024-02-15T10:00:00Z' },
  { id: 'id_5', subject_id: 'sub_1', id_type: 'email', value: 'rm.consulting@protonmail.com', notes: 'Correo cifrado. Activo.', created_at: '2024-02-15T10:00:00Z' },
  { id: 'id_6', subject_id: 'sub_1', id_type: 'bank', value: '****4521 BBVA', notes: 'Cuenta principal. Monitoreada.', created_at: '2024-03-01T14:00:00Z' },
  { id: 'id_7', subject_id: 'sub_1', id_type: 'social', value: '@rm_consulting (Instagram)', notes: 'Perfil privado. 2,300 seguidores.', created_at: '2024-03-20T09:00:00Z' },
];

export const demoContacts: ContactItem[] = [
  { id: 'ct_1', subject_id: 'sub_1', contact_type: 'phone', value: '+52 55 1234 5678', label: 'Principal', created_at: '2024-01-12T08:00:00Z' },
  { id: 'ct_2', subject_id: 'sub_1', contact_type: 'mobile', value: '+52 55 8765 4321', label: 'Secundario', created_at: '2024-01-12T08:00:00Z' },
  { id: 'ct_3', subject_id: 'sub_1', contact_type: 'email', value: 'rm.consulting@protonmail.com', label: 'Negocios', created_at: '2024-01-12T08:00:00Z' },
  { id: 'ct_4', subject_id: 'sub_1', contact_type: 'whatsapp', value: '+52 55 1234 5678', label: 'WhatsApp', created_at: '2024-02-01T10:00:00Z' },
  { id: 'ct_5', subject_id: 'sub_1', contact_type: 'telegram', value: '@ingeniero_rm', label: 'Telegram', created_at: '2024-02-01T10:00:00Z' },
];

export const demoNotes: NoteItem[] = [
  { id: 'note_1', subject_id: 'sub_1', title: 'Patrón de viajes sospechosos', content: 'Análisis de los últimos 6 meses revela viajes recurrentes a Tijuana, Cancún y Panamá. Patrón coincide con fechas de decomisos de droga en EU. Posible coordinación de logística. Recomendación: solicitar registros de vuelos privados.', category: 'intel', is_pinned: true, created_at: '2024-03-15T08:00:00Z', updated_at: '2024-06-10T10:00:00Z' },
  { id: 'note_2', subject_id: 'sub_1', title: 'Estructura financiera identificada', content: 'Se han detectado al menos 8 empresas fachada vinculadas indirectamente. Operan en sectores: restaurantes, transporte, bienes raíces y tecnología. Flujo estimado: $15M USD anuales. Se requiere análisis contable forense.', category: 'financial', is_pinned: true, created_at: '2024-04-01T09:00:00Z', updated_at: '2024-05-20T14:00:00Z' },
  { id: 'note_3', subject_id: 'sub_1', title: 'Observación vigilancia 14/Jun', content: 'El sujeto cambió su rutina habitual. Ahora evita el Marriott y utiliza el Four Seasons. Lleva escolta adicional desde el incidente con la testigo. Nivel de paranoia elevado.', category: 'surveillance', is_pinned: false, created_at: '2024-06-14T18:00:00Z', updated_at: '2024-06-14T18:00:00Z' },
  { id: 'note_4', subject_id: 'sub_1', title: 'Hipótesis: red de prestanombres', content: 'Basado en el análisis de propiedades y vehículos, estimo una red de 15-20 prestanombres. Posibles familiares: hermana Carmen Mendoza (vive en Houston), cuñado Luis Hernández (registrado como dueño de 3 propiedades).', category: 'hypothesis', is_pinned: false, created_at: '2024-05-25T11:00:00Z', updated_at: '2024-06-05T09:00:00Z' },
];

export const demoAIAnalyses: AIAnalysis[] = [
  {
    id: 'ai_1',
    subject_id: 'sub_1',
    analysis_type: 'profile',
    content: `PERFIL PSICOLÓGICO - Roberto "El Ingeniero" Mendoza

PERSONALIDAD:
- Narcisista funcional con rasgos de psicopatía administrativa
- Alto coeficiente intelectual, probablemente 130+
- Habilidad para delegar sin exponerse directamente
- Controlador obsesivo de detalles financieros

MOTIVACIONES:
- Poder económico como medida de éxito
- Evasión de impuestos como "juego" intelectual
- Lealtad tribal a su círculo cercano
- Temor a la extradición (motiva estructuras complejas)

COMPORTAMIENTO SOCIAL:
- Faceta pública: empresario filantrópico
- Faceta privada: aislamiento selectivo
- Prefiere comunicación escrita sobre verbal
- Evita alcohol en reuniones de negocios (control)

VULNERABILIDADES:
- Exceso de confianza en la estructura legal
- Dependencia emocional de su familia nuclear
- Tendencia a subestimar a mujeres en su organización
- Uso predecible de patrones de viaje`,
    created_at: '2024-06-01T10:00:00Z',
  },
];

export const demoBoardNodes: BoardNode[] = [
  // Subject center
  {
    id: 'bn_subject',
    type: 'subject',
    x: 500, y: 300,
    width: 160, height: 200,
    zIndex: 10,
    rotation: -2,
    label: 'R. Mendoza',
    description: 'Sujeto principal - Operación NEXUS',
    color: '#e8a020',
    data: { category: 'subject' },
  },
  // Photos
  {
    id: 'bn_photo_1',
    type: 'photo',
    x: 250, y: 150,
    width: 140, height: 170,
    zIndex: 5,
    rotation: 3,
    label: 'Casino Royal',
    description: 'Captado en zona VIP, 2:30 AM',
    color: '#4080e8',
    data: { category: 'media' },
  },
  {
    id: 'bn_photo_2',
    type: 'photo',
    x: 750, y: 180,
    width: 130, height: 160,
    zIndex: 5,
    rotation: -4,
    label: 'Aeropuerto TIJ',
    description: 'Vuelo privado, encuentro sospechoso',
    color: '#4080e8',
    data: { category: 'media' },
  },
  {
    id: 'bn_photo_3',
    type: 'photo',
    x: 100, y: 450,
    width: 120, height: 150,
    zIndex: 5,
    rotation: 2,
    label: 'Hotel Marriott',
    description: 'Reunión con V. Cruz (3 hrs)',
    color: '#4080e8',
    data: { category: 'media' },
  },
  // Sticky notes
  {
    id: 'bn_sticky_1',
    type: 'sticky',
    x: 750, y: 420,
    width: 160, height: 140,
    zIndex: 6,
    rotation: 1,
    label: 'ALERTA',
    description: 'Retiro $500K en 24hrs. 8 sucursales.',
    color: '#e84040',
    data: { category: 'notes' },
  },
  {
    id: 'bn_sticky_2',
    type: 'sticky',
    x: 350, y: 520,
    width: 150, height: 130,
    zIndex: 6,
    rotation: -2,
    label: 'Hipótesis',
    description: 'Red de 15-20 prestanombres identificada. Hermana en Houston.',
    color: '#f0b840',
    data: { category: 'hypothesis' },
  },
  // Note cards
  {
    id: 'bn_note_1',
    type: 'note_card',
    x: 900, y: 100,
    width: 170, height: 120,
    zIndex: 5,
    rotation: 0,
    label: 'Patrón Viajes',
    description: 'Tijuana -> Cancún -> Panamá. Coincide con decomisos.',
    color: '#20c8c8',
    data: { category: 'intel' },
  },
  {
    id: 'bn_note_2',
    type: 'note_card',
    x: 50, y: 250,
    width: 160, height: 100,
    zIndex: 5,
    rotation: -1,
    label: 'Contacto CL',
    description: 'V. Cruz: rm.consulting@protonmail.com',
    color: '#40c880',
    data: { category: 'contacts' },
  },
  // Persons
  {
    id: 'bn_person_1',
    type: 'relations',
    x: 600, y: 100,
    width: 130, height: 160,
    zIndex: 5,
    rotation: 2,
    label: 'V. Cruz',
    description: 'Ex-contadora. Testigo protegida.',
    color: '#a060e8',
    data: { category: 'relations' },
  },
  {
    id: 'bn_person_2',
    type: 'relations',
    x: 900, y: 300,
    width: 130, height: 160,
    zIndex: 5,
    rotation: -3,
    label: 'C. Vargas',
    description: 'Jefe seguridad. Ex-policía.',
    color: '#a060e8',
    data: { category: 'relations' },
  },
];

export const demoBoardConnections: BoardConnection[] = [
  { id: 'bc_1', fromId: 'bn_subject', toId: 'bn_photo_1', label: '', color: '#4080e8', style: 'solid', thickness: 2 },
  { id: 'bc_2', fromId: 'bn_subject', toId: 'bn_photo_2', label: '', color: '#4080e8', style: 'solid', thickness: 2 },
  { id: 'bc_3', fromId: 'bn_subject', toId: 'bn_photo_3', label: '', color: '#4080e8', style: 'solid', thickness: 2 },
  { id: 'bc_4', fromId: 'bn_subject', toId: 'bn_sticky_1', label: 'finanzas', color: '#e84040', style: 'dashed', thickness: 2 },
  { id: 'bc_5', fromId: 'bn_subject', toId: 'bn_sticky_2', label: 'investigación', color: '#f0b840', style: 'dashed', thickness: 1.5 },
  { id: 'bc_6', fromId: 'bn_subject', toId: 'bn_person_1', label: 'asociada', color: '#a060e8', style: 'solid', thickness: 2.5 },
  { id: 'bc_7', fromId: 'bn_subject', toId: 'bn_person_2', label: 'seguridad', color: '#a060e8', style: 'solid', thickness: 3 },
  { id: 'bc_8', fromId: 'bn_photo_3', toId: 'bn_person_1', label: 'reunión', color: '#40c880', style: 'dashed', thickness: 1.5 },
  { id: 'bc_9', fromId: 'bn_sticky_1', toId: 'bn_note_1', label: '', color: '#e84040', style: 'dotted', thickness: 1 },
];
