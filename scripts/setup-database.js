#!/usr/bin/env node
import { pool, query } from '../src/models/database';
import config from '../src/config';
const createTablesSQL = `
-- Tabla de usuarios (administradores)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'client')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para la tabla users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    codigo_sn VARCHAR(50) UNIQUE NOT NULL,
    nombre_sn VARCHAR(200) NOT NULL,
    rfc VARCHAR(13) UNIQUE NOT NULL,
    codigo_condiciones_pago VARCHAR(20) NOT NULL,
    codigo_grupo VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para la tabla clientes
CREATE INDEX IF NOT EXISTS idx_clientes_codigo_sn ON clientes(codigo_sn);
CREATE INDEX IF NOT EXISTS idx_clientes_rfc ON clientes(rfc);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes USING gin(to_tsvector('spanish', nombre_sn));
CREATE INDEX IF NOT EXISTS idx_clientes_grupo ON clientes(codigo_grupo);

-- Tabla de solicitudes de crédito
CREATE TABLE IF NOT EXISTS solicitudes (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    tipo_persona VARCHAR(10) NOT NULL CHECK (tipo_persona IN ('FISICA', 'MORAL')),
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    formulario_data JSONB NOT NULL,
    archivos_urls JSONB DEFAULT '[]'::jsonb,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PROCESADA', 'RECHAZADA')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para la tabla solicitudes
CREATE INDEX IF NOT EXISTS idx_solicitudes_folio ON solicitudes(folio);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cliente_id ON solicitudes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_tipo_persona ON solicitudes(tipo_persona);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created_at ON solicitudes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_formulario_data ON solicitudes USING gin(formulario_data);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at 
    BEFORE UPDATE ON clientes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_solicitudes_updated_at ON solicitudes;
CREATE TRIGGER update_solicitudes_updated_at 
    BEFORE UPDATE ON solicitudes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para estadísticas rápidas
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM clientes) as total_clientes,
    (SELECT COUNT(*) FROM solicitudes) as total_solicitudes,
    (SELECT COUNT(*) FROM solicitudes WHERE estado = 'PENDIENTE') as solicitudes_pendientes,
    (SELECT COUNT(*) FROM solicitudes WHERE estado = 'PROCESADA') as solicitudes_procesadas,
    (SELECT COUNT(*) FROM solicitudes WHERE estado = 'RECHAZADA') as solicitudes_rechazadas,
    (SELECT COUNT(*) FROM solicitudes WHERE tipo_persona = 'FISICA') as personas_fisicas,
    (SELECT COUNT(*) FROM solicitudes WHERE tipo_persona = 'MORAL') as personas_morales,
    (SELECT COUNT(*) FROM solicitudes WHERE created_at >= CURRENT_DATE) as solicitudes_hoy;

-- Función para generar folios únicos
CREATE OR REPLACE FUNCTION generate_folio()
RETURNS TEXT AS $$
DECLARE
    current_date_str TEXT;
    daily_count INTEGER;
    folio TEXT;
BEGIN
    -- Formato: TM-YYYYMMDD-000
    current_date_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Contar solicitudes del día actual
    SELECT COUNT(*) + 1 INTO daily_count
    FROM solicitudes 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Generar folio
    folio := 'TM-' || current_date_str || '-' || LPAD(daily_count::TEXT, 3, '0');
    
    RETURN folio;
END;
$$ LANGUAGE plpgsql;

-- Función para buscar clientes (full-text search)
CREATE OR REPLACE FUNCTION search_clientes(search_term TEXT)
RETURNS TABLE(
    id INTEGER,
    codigo_sn VARCHAR(50),
    nombre_sn VARCHAR(200),
    rfc VARCHAR(13),
    codigo_condiciones_pago VARCHAR(20),
    codigo_grupo VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.codigo_sn,
        c.nombre_sn,
        c.rfc,
        c.codigo_condiciones_pago,
        c.codigo_grupo,
        c.created_at,
        c.updated_at,
        ts_rank(to_tsvector('spanish', c.nombre_sn), plainto_tsquery('spanish', search_term)) as rank
    FROM clientes c
    WHERE 
        to_tsvector('spanish', c.nombre_sn) @@ plainto_tsquery('spanish', search_term)
        OR UPPER(c.codigo_sn) LIKE UPPER('%' || search_term || '%')
        OR UPPER(c.rfc) LIKE UPPER('%' || search_term || '%')
    ORDER BY rank DESC, c.nombre_sn ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para estadísticas por período
CREATE OR REPLACE FUNCTION get_solicitudes_by_period(period_type TEXT DEFAULT 'month')
RETURNS TABLE(
    periodo TEXT,
    total INTEGER,
    pendientes INTEGER,
    procesadas INTEGER,
    rechazadas INTEGER
) AS $$
BEGIN
    IF period_type = 'day' THEN
        RETURN QUERY
        SELECT 
            TO_CHAR(DATE(s.created_at), 'YYYY-MM-DD') as periodo,
            COUNT(*)::INTEGER as total,
            COUNT(CASE WHEN s.estado = 'PENDIENTE' THEN 1 END)::INTEGER as pendientes,
            COUNT(CASE WHEN s.estado = 'PROCESADA' THEN 1 END)::INTEGER as procesadas,
            COUNT(CASE WHEN s.estado = 'RECHAZADA' THEN 1 END)::INTEGER as rechazadas
        FROM solicitudes s
        WHERE s.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(s.created_at)
        ORDER BY DATE(s.created_at) DESC;
    ELSE
        RETURN QUERY
        SELECT 
            TO_CHAR(DATE_TRUNC('month', s.created_at), 'YYYY-MM') as periodo,
            COUNT(*)::INTEGER as total,
            COUNT(CASE WHEN s.estado = 'PENDIENTE' THEN 1 END)::INTEGER as pendientes,
            COUNT(CASE WHEN s.estado = 'PROCESADA' THEN 1 END)::INTEGER as procesadas,
            COUNT(CASE WHEN s.estado = 'RECHAZADA' THEN 1 END)::INTEGER as rechazadas
        FROM solicitudes s
        WHERE s.created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', s.created_at)
        ORDER BY DATE_TRUNC('month', s.created_at) DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear extensiones útiles si no existen
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Comentarios en las tablas
COMMENT ON TABLE users IS 'Usuarios administradores del sistema';
COMMENT ON TABLE clientes IS 'Base de datos de clientes para validación de solicitudes';
COMMENT ON TABLE solicitudes IS 'Solicitudes de líneas de crédito';

COMMENT ON COLUMN clientes.codigo_sn IS 'Código único del cliente en el sistema SN';
COMMENT ON COLUMN clientes.rfc IS 'RFC mexicano válido (12 o 13 caracteres)';
COMMENT ON COLUMN solicitudes.folio IS 'Folio único generado automáticamente (TM-YYYYMMDD-NNN)';
COMMENT ON COLUMN solicitudes.formulario_data IS 'Datos del formulario en formato JSON';
COMMENT ON COLUMN solicitudes.archivos_urls IS 'URLs de archivos subidos a Cloudinary';
`;
async function setupDatabase() {
    try {
        console.log('🔄 Iniciando configuración de la base de datos...');
        console.log(`📍 Base de datos: ${config.database.url.split('@')[1]?.split('/')[1] || 'desconocida'}`);
        await query(createTablesSQL);
        console.log('✅ Tablas creadas exitosamente');
        console.log('✅ Índices creados exitosamente');
        console.log('✅ Triggers configurados exitosamente');
        console.log('✅ Funciones creadas exitosamente');
        console.log('✅ Vistas creadas exitosamente');
        const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'clientes', 'solicitudes')
      ORDER BY table_name
    `);
        console.log('\n📋 Tablas creadas:');
        tablesResult.rows.forEach((row) => {
            console.log(`   ✓ ${row.table_name}`);
        });
        const indexesResult = await query(`
      SELECT DISTINCT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('users', 'clientes', 'solicitudes')
      ORDER BY tablename, indexname
    `);
        console.log('\n🔗 Índices creados:');
        let currentTable = '';
        indexesResult.rows.forEach((row) => {
            if (row.tablename !== currentTable) {
                currentTable = row.tablename;
                console.log(`   📊 ${row.tablename}:`);
            }
            console.log(`      ✓ ${row.indexname}`);
        });
        const functionsResult = await query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      AND routine_name IN ('generate_folio', 'search_clientes', 'get_solicitudes_by_period', 'update_updated_at_column')
      ORDER BY routine_name
    `);
        console.log('\n⚙️  Funciones creadas:');
        functionsResult.rows.forEach((row) => {
            console.log(`   ✓ ${row.routine_name}`);
        });
        console.log('\n🎉 ¡Base de datos configurada exitosamente!');
        console.log('\n📝 Próximos pasos:');
        console.log('   1. Ejecutar: npm run db:seed (opcional - datos de ejemplo)');
        console.log('   2. Ejecutar: npm run dev (iniciar servidor)');
        console.log('   3. Crear usuario admin: POST /api/auth/setup-admin');
    }
    catch (error) {
        console.error('❌ Error configurando la base de datos:', error);
        throw error;
    }
}
if (require.main === module) {
    setupDatabase()
        .then(() => {
        console.log('\n✅ Setup completado exitosamente');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Error en setup:', error);
        process.exit(1);
    })
        .finally(() => {
        pool.end();
    });
}
export { setupDatabase };
//# sourceMappingURL=setup-database.js.map