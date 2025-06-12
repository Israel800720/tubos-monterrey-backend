# 🏢 TUBOS MONTERREY S.A. DE C.V. - Backend API

Sistema de backend para la gestión de solicitudes de líneas de crédito.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Base de Datos](#base-de-datos)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Desarrollo](#desarrollo)
- [Testing](#testing)

## ✨ Características

- **Autenticación Dual**: Clientes (RFC + Código) y Administradores (Email + Password)
- **Validación RFC**: Validación completa de RFC mexicano con determinación automática de tipo de persona
- **Gestión de Clientes**: CRUD completo con importación/exportación Excel
- **Solicitudes de Crédito**: Sistema completo de formularios dinámicos
- **Almacenamiento de Archivos**: Integración con Cloudinary para manejo de documentos
- **Generación de PDFs**: Creación automática de documentos profesionales
- **Sistema de Emails**: Notificaciones automáticas con Resend
- **Dashboard Administrativo**: Panel completo de gestión y estadísticas
- **API REST**: Documentada y completamente funcional

## 🛠 Tecnologías

- **Runtime**: Node.js 18+ con TypeScript
- **Framework**: Express.js con middlewares de seguridad
- **Base de Datos**: PostgreSQL con Neon (compatible con cualquier PostgreSQL)
- **Autenticación**: JWT con bcrypt
- **Almacenamiento**: Cloudinary para archivos
- **Emails**: Resend para notificaciones
- **Validación**: Joi + express-validator
- **PDF**: pdf-lib para generación de documentos
- **Excel**: xlsx para importación/exportación
- **Deployment**: Fly.io con Docker

## 🚀 Instalación

### Prerrequisitos

- Node.js 18 o superior
- npm o pnpm
- Base de datos PostgreSQL

### Instalación Local

1. **Clonar el proyecto**
```bash
git clone <repository-url>
cd tubos-monterrey-backend
```

2. **Instalar dependencias**
```bash
npm install
# o
pnpm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Configurar base de datos**
```bash
npm run db:setup
npm run db:seed  # Opcional: datos de ejemplo
```

5. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` con las siguientes variables:

```env
# Servidor
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Base de Datos
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/database

# JWT
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRES_IN=24h

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Resend
RESEND_API_KEY=re_tu_api_key

# Email
ADMIN_EMAIL=ijimenez@tubosmonterrey.com.mx
FROM_EMAIL=facturastubos@gmail.com
COMPANY_NAME="TUBOS MONTERREY S.A. DE C.V."

# Configuración adicional
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Configuración de Servicios Externos

#### 1. Base de Datos PostgreSQL (Neon)

1. Crear cuenta en [Neon](https://neon.tech)
2. Crear nueva base de datos
3. Copiar la cadena de conexión
4. Configurar `DATABASE_URL` en `.env`

#### 2. Cloudinary (Almacenamiento de Archivos)

1. Crear cuenta en [Cloudinary](https://cloudinary.com)
2. Obtener credenciales del dashboard
3. Configurar variables en `.env`:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

#### 3. Resend (Envío de Emails)

1. Crear cuenta en [Resend](https://resend.com)
2. Verificar dominio de email (opcional para desarrollo)
3. Generar API key
4. Configurar `RESEND_API_KEY` en `.env`

## 🗄️ Base de Datos

### Estructura de Tablas

```sql
-- Usuarios administradores
users (
  id, email, password_hash, name, role, is_active, 
  created_at, updated_at
)

-- Base de clientes
clientes (
  id, codigo_sn, nombre_sn, rfc, codigo_condiciones_pago, 
  codigo_grupo, created_at, updated_at
)

-- Solicitudes de crédito
solicitudes (
  id, folio, tipo_persona, cliente_id, formulario_data, 
  archivos_urls, estado, created_at, updated_at
)
```

### Scripts de Base de Datos

```bash
# Configurar tablas, índices, funciones y vistas
npm run db:setup

# Poblar con datos de ejemplo
npm run db:seed

# Limpiar datos de ejemplo
npm run db:seed clear
```

### Funciones Incluidas

- `generate_folio()`: Genera folios únicos (TM-YYYYMMDD-000)
- `search_clientes(text)`: Búsqueda full-text de clientes
- `get_solicitudes_by_period(period)`: Estadísticas por período

## 📡 API Endpoints

### Autenticación
```
POST /api/auth/cliente          # Login de cliente
POST /api/auth/admin            # Login de administrador
GET  /api/auth/verify           # Verificar token
POST /api/auth/refresh          # Refrescar token
POST /api/auth/validate-rfc     # Validar RFC
```

### Gestión de Clientes
```
GET    /api/clientes            # Listar clientes
POST   /api/clientes            # Crear cliente
GET    /api/clientes/:id        # Ver cliente
PUT    /api/clientes/:id        # Actualizar cliente
DELETE /api/clientes/:id        # Eliminar cliente
POST   /api/clientes/upload     # Cargar Excel
GET    /api/clientes/template   # Descargar plantilla
GET    /api/clientes/export     # Exportar Excel
```

### Solicitudes de Crédito
```
GET    /api/solicitudes                    # Listar solicitudes
POST   /api/solicitudes                    # Crear solicitud
GET    /api/solicitudes/:id               # Ver solicitud
PUT    /api/solicitudes/:id/estado        # Actualizar estado
GET    /api/solicitudes/:id/archivos/download  # Descargar archivos
GET    /api/solicitudes/folio/:folio      # Buscar por folio
```

### Dashboard Administrativo
```
GET  /api/admin/dashboard           # Datos del dashboard
GET  /api/admin/export/solicitudes  # Exportar solicitudes
GET  /api/admin/system/info         # Info del sistema
POST /api/admin/test/email          # Probar email
```

### Utilidades
```
GET  /api/health    # Health check
GET  /api/info      # Información de la API
```

## 🚢 Deployment

### Fly.io (Recomendado)

1. **Instalar Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Login y configurar**
```bash
fly auth login
fly apps create tubos-monterrey-backend
```

3. **Configurar secrets**
```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set JWT_SECRET="tu_secreto_super_seguro"
fly secrets set CLOUDINARY_CLOUD_NAME="tu_cloud"
fly secrets set CLOUDINARY_API_KEY="tu_key"
fly secrets set CLOUDINARY_API_SECRET="tu_secret"
fly secrets set RESEND_API_KEY="re_tu_key"
fly secrets set ADMIN_EMAIL="ijimenez@tubosmonterrey.com.mx"
fly secrets set FROM_EMAIL="facturastubos@gmail.com"
```

4. **Deploy**
```bash
fly deploy
```

### Docker Local

```bash
# Construir imagen
docker build -t tubos-monterrey-backend .

# Ejecutar contenedor
docker run -p 3001:3001 --env-file .env tubos-monterrey-backend
```

## 🔧 Desarrollo

### Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm run start        # Iniciar servidor de producción
npm run db:setup     # Configurar base de datos
npm run db:seed      # Poblar datos de ejemplo
npm run lint         # Verificar código
npm run format       # Formatear código
npm test             # Ejecutar tests
```

### Estructura del Proyecto

```
src/
├── controllers/     # Controladores de rutas
├── models/         # Modelos de base de datos
├── routes/         # Definición de rutas
├── middleware/     # Middlewares personalizados
├── services/       # Servicios externos (Cloudinary, Resend)
├── utils/          # Utilidades (RFC, Excel, PDF)
├── types/          # Tipos TypeScript
├── config/         # Configuración
└── app.ts          # Aplicación principal

scripts/            # Scripts de configuración
docs/              # Documentación adicional
```

### Flujo de Desarrollo

1. **Crear nueva rama**
```bash
git checkout -b feature/nueva-funcionalidad
```

2. **Desarrollar y probar**
```bash
npm run dev
# Hacer cambios
npm run lint
npm test
```

3. **Commit y push**
```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad
```

## 🧪 Testing

### Ejecutar Tests

```bash
npm test              # Todos los tests
npm run test:watch    # Tests en modo watch
npm run test:coverage # Tests con cobertura
```

### Tests de API

```bash
# Health check
curl http://localhost:3001/api/health

# Información de la API
curl http://localhost:3001/api/info

# Login de administrador
curl -X POST http://localhost:3001/api/auth/admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@tubosmonterrey.com.mx", "password": "admin123456"}'
```

## 📝 Notas Importantes

### Seguridad

- Todas las contraseñas se almacenan con hash bcrypt
- JWT tokens con expiración configurable
- Rate limiting implementado
- Headers de seguridad con Helmet
- Validación estricta de entradas

### Performance

- Compresión gzip habilitada
- Pool de conexiones de base de datos optimizado
- Índices de base de datos en campos críticos
- Lazy loading de servicios externos

### Monitoreo

- Logs estructurados con timestamps
- Health checks configurados
- Métricas de performance básicas
- Error tracking y reporting

## 🆘 Troubleshooting

### Problemas Comunes

1. **Error de conexión a base de datos**
   - Verificar `DATABASE_URL` en `.env`
   - Confirmar que la base de datos está accesible

2. **Error de autenticación JWT**
   - Verificar `JWT_SECRET` en `.env`
   - Comprobar que el token no haya expirado

3. **Error subiendo archivos**
   - Verificar credenciales de Cloudinary
   - Confirmar límites de tamaño de archivo

4. **Error enviando emails**
   - Verificar API key de Resend
   - Comprobar que el dominio esté verificado

### Logs y Debugging

```bash
# Ver logs en desarrollo
npm run dev

# Ver logs en producción (Fly.io)
fly logs

# Debugging con variables de entorno
DEBUG=* npm run dev
```

## 📞 Soporte

Para soporte técnico:

- **Email**: tubosmty@tubosmonterrey.com.mx
- **Teléfono**: 55 5078 7700
- **WhatsApp**: 55 4144 8919

---

**TUBOS MONTERREY S.A. DE C.V.**  
Sistema de Solicitudes de Crédito - Backend API v1.0.0
