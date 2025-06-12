#!/usr/bin/env node

/**
 * Script para poblar la base de datos con datos de ejemplo
 * TUBOS MONTERREY S.A. DE C.V.
 */

import { pool, query } from '../src/models/database';
import { ClienteModel } from '../src/models/Cliente';
import { UserModel } from '../src/models/User';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import config from '../src/config';

// Datos de ejemplo para clientes
const clientesEjemplo = [
  {
    codigo_sn: 'CLI001',
    nombre_sn: 'FERRETERÍA GONZÁLEZ S.A. DE C.V.',
    rfc: 'FGO950523ABC',
    codigo_condiciones_pago: '30',
    codigo_grupo: 'A'
  },
  {
    codigo_sn: 'CLI002',
    nombre_sn: 'CONSTRUCCIONES MARTÍNEZ',
    rfc: 'MARP801215DEF',
    codigo_condiciones_pago: '15',
    codigo_grupo: 'B'
  },
  {
    codigo_sn: 'CLI003',
    nombre_sn: 'DISTRIBUIDORA INDUSTRIAL LÓPEZ S.A.',
    rfc: 'DIL920310GHI',
    codigo_condiciones_pago: '45',
    codigo_grupo: 'A'
  },
  {
    codigo_sn: 'CLI004',
    nombre_sn: 'JUAN CARLOS HERNÁNDEZ RUIZ',
    rfc: 'HERJ850618JKL',
    codigo_condiciones_pago: '30',
    codigo_grupo: 'C'
  },
  {
    codigo_sn: 'CLI005',
    nombre_sn: 'MATERIALES Y CONSTRUCCIÓN DEL NORTE S.A.',
    rfc: 'MCN880425MNO',
    codigo_condiciones_pago: '60',
    codigo_grupo: 'A'
  },
  {
    codigo_sn: 'CLI006',
    nombre_sn: 'PATRICIA RODRÍGUEZ SÁNCHEZ',
    rfc: 'ROSP920715XYZ',
    codigo_condiciones_pago: '15',
    codigo_grupo: 'B'
  },
  {
    codigo_sn: 'CLI007',
    nombre_sn: 'HERRAJES Y SUMINISTROS INDUSTRIALES S.A.',
    rfc: 'HSI990830DEF',
    codigo_condiciones_pago: '30',
    codigo_grupo: 'A'
  },
  {
    codigo_sn: 'CLI008',
    nombre_sn: 'CARLOS EDUARDO MÉNDEZ TORRES',
    rfc: 'METC751205GHI',
    codigo_condiciones_pago: '45',
    codigo_grupo: 'C'
  },
  {
    codigo_sn: 'CLI009',
    nombre_sn: 'COMERCIALIZADORA DE ACEROS DEL BAJÍO S.A.',
    rfc: 'CAB850612JKL',
    codigo_condiciones_pago: '30',
    codigo_grupo: 'A'
  },
  {
    codigo_sn: 'CLI010',
    nombre_sn: 'MARÍA ELENA GARCÍA LÓPEZ',
    rfc: 'GALM680920MNO',
    codigo_condiciones_pago: '15',
    codigo_grupo: 'B'
  },
  {
    codigo_sn: 'CLI011',
    nombre_sn: 'ESTRUCTURAS METÁLICAS DEL CENTRO S.A.',
    rfc: 'EMC930415PQR',
    codigo_condiciones_pago: '60',
    codigo_grupo: 'A'
  },
  {
    codigo_sn: 'CLI012',
    nombre_sn: 'ROBERTO ALEJANDRO VÁZQUEZ PÉREZ',
    rfc: 'VAPR821130STU',
    codigo_condiciones_pago: '30',
    codigo_grupo: 'C'
  },
  {
    codigo_sn: 'CLI013',
    nombre_sn: 'PROVEEDORA DE MATERIALES INDUSTRIALES S.A.',
    rfc: 'PMI870925VWX',
    codigo_condiciones_pago: '45',
    codigo_grupo: 'A'
  },
  {
    codigo_sn: 'CLI014',
    nombre_sn: 'ANA SOFÍA MARTÍNEZ JIMÉNEZ',
    rfc: 'MAJA940308YZA',
    codigo_condiciones_pago: '15',
    codigo_grupo: 'B'
  },
  {
    codigo_sn: 'CLI015',
    nombre_sn: 'TUBERÍA Y CONEXIONES DEL GOLFO S.A.',
    rfc: 'TCG910720BCD',
    codigo_condiciones_pago: '30',
    codigo_grupo: 'A'
  }
];

// Usuarios de ejemplo
const usuariosEjemplo = [
  {
    email: 'admin@tubosmonterrey.com.mx',
    password: 'TubosAdmin2024!',
    name: 'Administrador Principal',
    role: 'admin' as const
  },
  {
    email: 'ijimenez@tubosmonterrey.com.mx',
    password: 'Credito2024!',
    name: 'Isabel Jiménez - Crédito',
    role: 'admin' as const
  },
  {
    email: 'supervisor@tubosmonterrey.com.mx',
    password: 'Supervisor2024!',
    name: 'Supervisor de Crédito',
    role: 'admin' as const
  }
];

async function seedDatabase(): Promise<void> {
  try {
    console.log('🌱 Iniciando población de la base de datos con datos de ejemplo...');
    
    // Verificar si ya existen datos
    const existingClientes = await query('SELECT COUNT(*) FROM clientes');
    const existingUsers = await query('SELECT COUNT(*) FROM users');
    
    const clienteCount = parseInt(existingClientes.rows[0].count);
    const userCount = parseInt(existingUsers.rows[0].count);
    
    console.log(`📊 Estado actual:`);
    console.log(`   Clientes existentes: ${clienteCount}`);
    console.log(`   Usuarios existentes: ${userCount}`);
    
    // Crear usuarios de ejemplo si no existen
    if (userCount === 0) {
      console.log('\n👥 Creando usuarios de ejemplo...');
      
      for (const userData of usuariosEjemplo) {
        try {
          const user = await UserModel.create(userData);
          console.log(`   ✓ Usuario creado: ${user.email}`);
        } catch (error) {
          if (error instanceof Error && error.message.includes('duplicate')) {
            console.log(`   ⚠️  Usuario ya existe: ${userData.email}`);
          } else {
            console.error(`   ❌ Error creando usuario ${userData.email}:`, error);
          }
        }
      }
    } else {
      console.log('\n👥 Usuarios ya existen, omitiendo creación...');
    }
    
    // Crear clientes de ejemplo si no existen
    if (clienteCount === 0) {
      console.log('\n🏢 Creando clientes de ejemplo...');
      
      for (const clienteData of clientesEjemplo) {
        try {
          const cliente = await ClienteModel.create(clienteData);
          console.log(`   ✓ Cliente creado: ${cliente.codigo_sn} - ${cliente.nombre_sn}`);
        } catch (error) {
          if (error instanceof Error && error.message.includes('duplicate')) {
            console.log(`   ⚠️  Cliente ya existe: ${clienteData.codigo_sn}`);
          } else {
            console.error(`   ❌ Error creando cliente ${clienteData.codigo_sn}:`, error);
          }
        }
      }
    } else {
      console.log('\n🏢 Clientes ya existen, omitiendo creación...');
    }
    
    // Crear algunas solicitudes de ejemplo (opcional)
    const existingSolicitudes = await query('SELECT COUNT(*) FROM solicitudes');
    const solicitudCount = parseInt(existingSolicitudes.rows[0].count);
    
    if (solicitudCount === 0) {
      console.log('\n📋 Creando solicitudes de ejemplo...');
      
      // Obtener algunos clientes para crear solicitudes
      const clientes = await query('SELECT * FROM clientes LIMIT 3');
      
      if (clientes.rows.length > 0) {
        const solicitudesEjemplo = [
          {
            folio: 'TM-20241201-001',
            tipo_persona: 'MORAL',
            cliente_id: clientes.rows[0].id,
            formulario_data: {
              id_cif: 'CIF123456789',
              linea_credito_solicitada: '$500,000.00',
              agente_ventas: 'JUAN PÉREZ',
              correo_empresa: 'contacto@ferreteriagonzalez.com',
              tipo_domicilio_empresa: 'PROPIO',
              fecha_constitucion: '23/05/1995',
              numero_escritura: '12345',
              folio_registro: 'RPP-001-95',
              fecha_registro: '25/05/1995',
              capital_inicial: '$100,000.00',
              capital_actual: '$2,000,000.00',
              fecha_ultimo_aumento: '15/03/2020',
              giro_actividades: 'VENTA AL MENUDEO DE MATERIALES PARA LA CONSTRUCCIÓN'
            },
            archivos_urls: [],
            estado: 'PENDIENTE'
          },
          {
            folio: 'TM-20241201-002',
            tipo_persona: 'FISICA',
            cliente_id: clientes.rows[1].id,
            formulario_data: {
              id_cif: 'CIF987654321',
              linea_credito_solicitada: '$200,000.00',
              agente_ventas: 'MARÍA GONZÁLEZ',
              nombre_titular: 'MARIO ARTURO RODRÍGUEZ PÉREZ',
              telefono_fijo: '55-1234-5678',
              celular: '55-9876-5432',
              correo_electronico: 'mario.rodriguez@construcciones.com',
              tipo_domicilio: 'PROPIO',
              giro_actividades: 'CONSTRUCCIÓN DE OBRAS DE INGENIERÍA CIVIL'
            },
            archivos_urls: [],
            estado: 'PROCESADA'
          }
        ];
        
        for (const solicitud of solicitudesEjemplo) {
          try {
            await query(`
              INSERT INTO solicitudes (folio, tipo_persona, cliente_id, formulario_data, archivos_urls, estado)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [
              solicitud.folio,
              solicitud.tipo_persona,
              solicitud.cliente_id,
              JSON.stringify(solicitud.formulario_data),
              JSON.stringify(solicitud.archivos_urls),
              solicitud.estado
            ]);
            console.log(`   ✓ Solicitud creada: ${solicitud.folio}`);
          } catch (error) {
            console.error(`   ❌ Error creando solicitud ${solicitud.folio}:`, error);
          }
        }
      }
    } else {
      console.log('\n📋 Solicitudes ya existen, omitiendo creación...');
    }
    
    // Mostrar estadísticas finales
    console.log('\n📊 Estadísticas finales:');
    
    const finalStats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM clientes) as total_clientes,
        (SELECT COUNT(*) FROM solicitudes) as total_solicitudes,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'PENDIENTE') as solicitudes_pendientes,
        (SELECT COUNT(*) FROM solicitudes WHERE estado = 'PROCESADA') as solicitudes_procesadas,
        (SELECT COUNT(*) FROM solicitudes WHERE tipo_persona = 'FISICA') as personas_fisicas,
        (SELECT COUNT(*) FROM solicitudes WHERE tipo_persona = 'MORAL') as personas_morales
    `);
    
    const stats = finalStats.rows[0];
    console.log(`   👥 Usuarios: ${stats.total_users}`);
    console.log(`   🏢 Clientes: ${stats.total_clientes}`);
    console.log(`   📋 Solicitudes: ${stats.total_solicitudes}`);
    console.log(`      - Pendientes: ${stats.solicitudes_pendientes}`);
    console.log(`      - Procesadas: ${stats.solicitudes_procesadas}`);
    console.log(`      - Personas físicas: ${stats.personas_fisicas}`);
    console.log(`      - Personas morales: ${stats.personas_morales}`);
    
    console.log('\n🎉 ¡Base de datos poblada exitosamente!');
    console.log('\n📝 Credenciales de ejemplo:');
    console.log('   Admin Principal:');
    console.log('     Email: admin@tubosmonterrey.com.mx');
    console.log('     Password: TubosAdmin2024!');
    console.log('   Crédito:');
    console.log('     Email: ijimenez@tubosmonterrey.com.mx');
    console.log('     Password: Credito2024!');
    console.log('\n🔍 Cliente de prueba:');
    console.log('     Código: CLI001');
    console.log('     RFC: FGO950523ABC');
    
  } catch (error) {
    console.error('❌ Error poblando la base de datos:', error);
    throw error;
  }
}

// Función para limpiar datos de ejemplo
async function clearExampleData(): Promise<void> {
  try {
    console.log('🧹 Limpiando datos de ejemplo...');
    
    // Eliminar en orden para respetar las referencias
    await query('DELETE FROM solicitudes WHERE folio LIKE \'TM-%\'');
    console.log('   ✓ Solicitudes de ejemplo eliminadas');
    
    await query('DELETE FROM clientes WHERE codigo_sn LIKE \'CLI%\'');
    console.log('   ✓ Clientes de ejemplo eliminados');
    
    await query('DELETE FROM users WHERE email LIKE \'%@tubosmonterrey.com.mx\' AND email != $1', [config.defaultAdmin.email]);
    console.log('   ✓ Usuarios de ejemplo eliminados');
    
    console.log('✅ Datos de ejemplo limpiados exitosamente');
    
  } catch (error) {
    console.error('❌ Error limpiando datos de ejemplo:', error);
    throw error;
  }
}

// Comprueba si el script se ejecuta directamente
// En ES Modules, se compara la URL del módulo actual con la URL del script principal
const scriptUrl = pathToFileURL(process.argv[1]).href;
if (import.meta.url === scriptUrl) {
  const action = process.argv[2];
  
  if (action === 'clear') {
    clearExampleData()
      .then(() => {
        console.log('\n✅ Limpieza completada exitosamente');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Error en limpieza:', error);
        process.exit(1);
      })
      .finally(() => {
        pool.end();
      });
  } else {
    seedDatabase()
      .then(() => {
        console.log('\n✅ Poblado completado exitosamente');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Error en poblado:', error);
        process.exit(1);
      })
      .finally(() => {
        pool.end();
      });
  }
}

export { seedDatabase, clearExampleData };
