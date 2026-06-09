const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// ==========================================
// 1. CONFIGURACIÓN DEL SERVIDOR Y BD
// ==========================================
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'db_universidad_test',
    password: 'juanitosp', // <-- Tu contraseña local
    port: 5432,
});

// ==========================================
// 2. ESTADO DEL SERVICIO CRON Y MOTOR DE EJECUCIÓN
// ==========================================
let tareaCronActiva = null;
let configuracionCron = { activo: false, frecuencia: '0 0 * * *', etiqueta: 'Diario (00:00)' };

// Función ÚNICA para ejecutar Python (Soporta granularidad)
const ejecutarScriptPython = (ruta, emitirEvento, origen = 'Manual', argumentosExtra = []) => {
    console.log(`🚀 Iniciando proceso (${origen})...`);
    io.emit('terminal_stream', `\n[*] INICIANDO PROTOCOLO DESDE ORIGEN: ${origen}`);

    const opciones = { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } };

    // Inyectamos las tablas seleccionadas al comando de Python
    const argumentos = ['-u', ruta, ...argumentosExtra];
    const proceso = spawn('py', argumentos, opciones);

    proceso.stdout.on('data', (data) => io.emit('terminal_stream', data.toString()));
    proceso.stderr.on('data', (data) => io.emit('terminal_stream', data.toString()));

    proceso.on('close', (code) => {
        io.emit('backup_completado', { exito: code === 0, mensaje: `Proceso (${origen}) finalizado con código ${code}.` });
        io.emit('actualizar_metricas');
    });
};

// ==========================================
// 3. LÓGICA DE WEBSOCKETS (TIEMPO REAL)
// ==========================================
io.on('connection', (socket) => {
    console.log('🟢 Dashboard de React Conectado. ID:', socket.id);

    // --- Módulo de Métricas y Archivos ---
    socket.on('solicitar_metricas', async () => {
        try {
            const query = `SELECT relname AS tabla, n_live_tup AS registros FROM pg_stat_user_tables ORDER BY relname;`;
            const { rows } = await pool.query(query);
            socket.emit('metricas_bd', rows);
        } catch (error) { console.error(error); }
    });

    socket.on('solicitar_historial_archivos', () => {
        const rutaBackups = 'C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backups';
        try {
            if (!fs.existsSync(rutaBackups)) { socket.emit('historial_archivos', []); return; }
            const archivos = fs.readdirSync(rutaBackups)
                .filter(file => file.endsWith('.enc'))
                .map(file => {
                    const stats = fs.statSync(path.join(rutaBackups, file));
                    return { nombre: file, pesoMB: (stats.size / (1024 * 1024)).toFixed(2), fechaMs: stats.mtimeMs };
                }).sort((a, b) => b.fechaMs - a.fechaMs);
            socket.emit('historial_archivos', archivos);
        } catch (error) { console.error(error); }
    });

    // --- Módulo de Ejecución ---
    // Atrapamos el array de "tablasSeleccionadas" que viene de React
    socket.on('iniciar_backup', (tablasSeleccionadas = []) => {
        const origen = tablasSeleccionadas.length > 0 ? 'Manual_Granular' : 'Manual_Completo';
        ejecutarScriptPython(
            'C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backup_script.py',
            'backup_completado',
            origen,
            tablasSeleccionadas // Le pasamos el array a la función
        );
    });

    socket.on('iniciar_restauracion', () => {
        ejecutarScriptPython('C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\restore_script.py', 'backup_completado', 'Restauración_Crítica');
    });

    // --- MÓDULO DE AUTOMATIZACIÓN (CRON) ---
    socket.on('solicitar_estado_cron', () => {
        socket.emit('estado_cron', configuracionCron);
    });

    socket.on('configurar_cron', (nuevaConfig) => {
        if (tareaCronActiva) {
            tareaCronActiva.stop();
            tareaCronActiva = null;
        }

        configuracionCron = nuevaConfig;

        if (configuracionCron.activo) {
            console.log(`⏱️ Cron Activado: ${configuracionCron.frecuencia}`);
            tareaCronActiva = cron.schedule(configuracionCron.frecuencia, () => {
                ejecutarScriptPython('C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backup_script.py', 'backup_completado', 'Automático_Cron');
            });
        } else {
            console.log('⏸️ Cron Desactivado por el operador.');
        }

        io.emit('estado_cron', configuracionCron);
    });

    socket.on('disconnect', () => console.log('🔴 Dashboard desconectado'));
});

server.listen(4000, () => console.log(`📡 Servidor ITIL API corriendo en http://localhost:4000`));