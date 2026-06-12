<div align="center">

<img src="nexus-frontend/app/public/favicon.svg" width="80" alt="NEXUS" />

# ⬡ NEXUS — Plataforma de Investigación

**OSINT Suite • Gestión de Casos • Pizarrón Visual • Análisis con IA**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8%2B-blue)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-black)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev)

</div>

---

## 📋 Descripción

NEXUS es una plataforma integral de investigación diseñada para profesionales de inteligencia, seguridad y análisis forense. Combina gestión de casos, herramientas OSINT automatizadas, visualización de evidencia en un pizarrón interactivo y análisis asistido por IA, todo en una aplicación autónoma con encriptación de datos.

### Características principales

| Módulo | Descripción |
|--------|-------------|
| 🕵️ **Sujetos** | Perfiles completos con foto, alias, nivel de riesgo, etiquetas |
| 🖼️ **Multimedia** | Subida y gestión de imágenes, videos, documentos con extracción EXIF |
| 📅 **Eventos** | Línea de tiempo interactiva con filtros y vista arrastrable |
| 📍 **Ubicaciones** | Registro de lugares con coordenadas GPS y enlace a Google Maps |
| 🔗 **Relaciones** | Conexiones entre sujetos con tipos y fuerza de vínculo |
| 🪪 **Identificadores** | CURP, RFC, pasaporte, INE, emails, teléfonos, IPs |
| 📡 **Contactos** | Redes sociales, mensajería, email |
| 📝 **Notas** | Notas de investigación categorizadas |
| 📓 **Cuaderno** | Bitácora personal del investigador (no se envía a IA) |
| 🤖 **Análisis IA** | Perfil psicológico, evaluación de riesgo, patrones, análisis de red, resumen ejecutivo |
| 🔍 **OSINT** | Búsqueda en 500+ plataformas con Maigret, Socialscan, Holehe, Ignorant |
| 📌 **Pizarrón** | Tablero visual interactivo con nodos, conexiones, notas adhesivas y fotos |
| 📁 **Casos** | Agrupación de sujetos por expedientes con detective asignado |
| 🔗 **Grafo** | Visualización de red entre todos los sujetos |
| 📜 **Auditoría** | Historial completo de cambios |
| 🔐 **Encriptación** | Datos cifrados en reposo con AES-256-GCM + PBKDF2 |
| 📱 **Subir desde teléfono** | Interfaz mobile con código QR para subir archivos desde el celular |
| 💾 **Backup automático** | Backups auto-contenidos con recuperación desde contraseña |

---

## ⚡ Instalación

### Linux / macOS (un solo comando)

```bash
curl -sSL https://raw.githubusercontent.com/tuangel134/nexus/main/install.sh | bash
```

### Windows (PowerShell, un solo comando)

```powershell
iwr -useb https://raw.githubusercontent.com/tuangel134/nexus/main/install.ps1 | iex
```

### Instalación manual

#### Requisitos
- Python 3.8+
- Node.js 18+ (solo para desarrollo)
- pip

```bash
git clone https://github.com/tuangel134/nexus.git
cd nexus

# Instalar dependencias Python
pip install flask cryptography qrcode[pil]

# Construir frontend
cd nexus-frontend/app
npm install
npm run build
cd ../..

# Iniciar
python3 app.py
```

---

## 🚀 Uso

```bash
python3 app.py
```

Se abre en `http://localhost:7331`. En la primera ejecución configura una contraseña maestra para encriptar los datos.

### Escanear desde el teléfono
Una vez iniciado, hacé clic en **📱 TELÉFONO** en la barra superior y escaneá el código QR con tu celular (misma WiFi).

---

## 🔧 Compilación

### Ejecutable Windows (.exe)

```bash
pip install pyinstaller
pyinstaller nexus.spec
```

### Paquete Debian (.deb)

```bash
# Requiere dpkg-deb
./build_deb.sh
```

---

## 🏗️ Arquitectura

```
nexus/
├── app.py                          # Backend Flask (API REST)
├── crypto.py                       # Módulo de encriptación AES-256-GCM
├── nexux.sh                        # Script de inicio
├── nexus-frontend/app/             # Frontend React + Vite + Tailwind
│   └── src/
│       ├── components/layout/      # TopBar, Sidebar, TabNavigation...
│       ├── components/sections/    # EventsSection, BoardSection...
│       └── hooks/                  # useAI, useInitData
├── script investigacion/           # Motor OSINT (sherlock++)
│   └── sherlock_ultimate.py        # 500+ plataformas, Maigret, Socialscan...
├── static/                         # Frontend legacy (HTML plano)
├── uploads/                        # Archivos multimedia
├── backups/                        # Backups auto-contenidos
└── profiles_data/                  # Datos OSINT (encriptados en reposo)
```

---

## 🔒 Seguridad

- **Encriptación en reposo**: AES-256-GCM con derivación de clave PBKDF2 (600,000 iteraciones)
- **Backups auto-contenidos**: Incluyen salt, verificables con solo la contraseña
- **Auto-encriptado**: Al cerrar la aplicación, todos los datos se cifran automáticamente
- **Recovery Package (.nrb)**: Respaldo completo portátil (DB + uploads + OSINT + configuración)

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3, Flask, SQLite |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| OSINT | Sherlock++, Maigret, Socialscan, Holehe, Ignorant, Toutatis |
| Encriptación | AES-256-GCM, PBKDF2, SHA-256 |
| UI | shadcn/ui, Framer Motion, Lucide Icons |

---

## 📄 Licencia

MIT License — ver [LICENSE](LICENSE) para detalles.

---

## ⚠️ Importante

Este repositorio contiene **solamente el código fuente**. Los archivos de datos de investigación (`nexus.db`, `uploads/`, `profiles_data/`, `.nexus_*`) están en `.gitignore` y **nunca se suben** a GitHub. La primera vez que ejecutes la aplicación, se crearán automáticamente.

---

## ☕ Apoya el proyecto

**PayPal:** [https://paypal.me/tuangel1346](https://paypal.me/tuangel1346) — tuangel1346@gmail.com

**Crypto:**

```
BTC: bc1q5nrv64jchep3hpqptvwmume8rkw68937zftfpa
```

---

<div align="center">
  <sub>Hecho con ❤️ para la comunidad de investigación e inteligencia.</sub>
  <br>
  <sub>¿Te sirve NEXUS? Dejá una ⭐ en GitHub</sub>
</div>
