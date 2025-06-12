import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware básico
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏢 TUBOS MONTERREY S.A. DE C.V. - API Sistema de Solicitudes de Crédito',
    data: {
      status: 'online',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servicio disponible',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// Ruta de prueba para clientes
app.post('/api/auth/cliente', (req, res) => {
  const { numeroCliente, rfc } = req.body;
  
  // Simulación básica de validación
  if (numeroCliente === '12345' && rfc === 'XAXX010101000') {
    res.json({
      success: true,
      message: 'Cliente autenticado exitosamente',
      data: {
        cliente: {
          id: 1,
          codigo_sn: numeroCliente,
          nombre_sn: 'Cliente de Prueba',
          rfc: rfc
        },
        tipo_persona: rfc.length === 13 ? 'FISICA' : 'MORAL'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'No encontramos su número de cliente y/o RFC en nuestra base de datos'
    });
  }
});

// Ruta de prueba para admin
app.post('/api/auth/admin', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@tubosmonterrey.com.mx' && password === 'admin123456') {
    res.json({
      success: true,
      message: 'Administrador autenticado exitosamente',
      data: {
        token: 'fake-jwt-token',
        user: {
          id: 1,
          email: email,
          name: 'Administrador Sistema',
          role: 'admin'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenciales inválidas'
    });
  }
});

// Validación de RFC
app.post('/api/auth/validate-rfc', (req, res) => {
  const { rfc } = req.body;
  
  if (!rfc) {
    return res.status(400).json({
      success: false,
      message: 'RFC requerido'
    });
  }
  
  // Validación básica de RFC mexicano
  const rfcRegex = /^[A-ZÑ&]{3,4}[0-9]{6}[A-V1-9][A-Z1-9][0-9A]$/;
  const isValid = rfcRegex.test(rfc.toUpperCase());
  
  const tipoPersona = rfc.length === 13 ? 'FISICA' : rfc.length === 12 ? 'MORAL' : null;
  
  res.json({
    success: true,
    data: {
      valid: isValid,
      rfc: rfc.toUpperCase(),
      tipo_persona: tipoPersona,
      longitud: rfc.length
    }
  });
});

// Simulación de endpoint para solicitudes
app.post('/api/solicitudes', (req, res) => {
  const { tipo_persona, formulario_data, cliente_id } = req.body;
  
  // Generar folio único
  const folio = `TM-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
  res.json({
    success: true,
    message: 'Solicitud creada exitosamente',
    data: {
      id: Math.floor(Math.random() * 10000),
      folio: folio,
      tipo_persona: tipo_persona,
      cliente_id: cliente_id,
      estado: 'PENDIENTE',
      created_at: new Date().toISOString()
    }
  });
});

// Endpoint para obtener dashboard stats
app.get('/api/admin/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      total_solicitudes: 15,
      solicitudes_pendientes: 8,
      solicitudes_procesadas: 5,
      solicitudes_rechazadas: 2,
      total_clientes: 120,
      solicitudes_por_mes: [
        { mes: 'Enero', cantidad: 3 },
        { mes: 'Febrero', cantidad: 5 },
        { mes: 'Marzo', cantidad: 4 },
        { mes: 'Abril', cantidad: 7 },
        { mes: 'Mayo', cantidad: 8 },
        { mes: 'Junio', cantidad: 2 }
      ]
    }
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    data: {
      method: req.method,
      url: req.originalUrl
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
