# NEXUS — Plataforma de Investigación de Personas

## Instalación y uso

### Requisitos
- Python 3.8+
- Flask (se instala automáticamente)

### Lanzar la aplicación

```bash
# Opción 1: Script de lanzamiento
chmod +x nexus.sh
./nexus.sh

# Opción 2: Directo con Python
python3 app.py
```

Abre automáticamente en tu navegador: http://localhost:7331

## Características

### 📋 Gestión de Sujetos
- Crear perfiles completos con foto, alias, datos personales
- Niveles de riesgo: Bajo / Medio / Alto / Crítico
- Estados: Activo / Inactivo / Sospechoso / Cerrado
- Etiquetas personalizadas
- Búsqueda en tiempo real

### 🖼 Multimedia
- Subida de imágenes, videos, audio, documentos
- Foto principal del perfil
- Visor integrado
- Drag & drop

### 📅 Línea de Tiempo
- Registro de eventos con fecha, tipo, importancia
- Tipos: Actividad, Reunión, Viaje, Transacción, Comunicación, Incidente, Detención
- Codificación visual por importancia

### 📍 Ubicaciones
- Domicilios, trabajos, lugares frecuentes
- Coordenadas GPS con enlace a Google Maps
- Tipos: Hogar, Trabajo, Frecuente, Temporal, Sospechoso

### 🔗 Red de Relaciones
- Conexiones entre sujetos
- Tipos: Familiar, Pareja, Amigo, Colega, Rival, Víctima, etc.
- Visualización de red en canvas
- Fuerza de relación configurable

### 🪪 Identificadores
- CURP, RFC, Pasaporte, INE, NSS, Licencia, Placas
- Emails, teléfonos, redes sociales, cuentas bancarias, IPs

### 📡 Contactos
- Teléfono, celular, email, Telegram, WhatsApp
- Facebook, Instagram, Twitter/X, TikTok

### 📝 Notas
- Categorías: Inteligencia, Vigilancia, Financiero, Legal, Personal, Hipótesis
- Notas fijadas / destacadas
- Editor de texto completo

### 🤖 Análisis con IA (Anthropic Claude)
- Perfil Psicológico
- Evaluación de Riesgo
- Patrones de Comportamiento
- Análisis de Red
- Resumen Ejecutivo
- Requiere API Key de Anthropic (configurable en la app)

### 📤 Exportación
- Exportar perfil completo en JSON

## Datos
- Base de datos SQLite local: `nexus.db`
- Archivos: carpeta `uploads/`
- Todo se guarda localmente, sin conexión a servidores externos
