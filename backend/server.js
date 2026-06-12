const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const bcrypt = require('bcrypt');     
const jwt = require('jsonwebtoken');   

const app = express();
app.use(cors());
app.use(express.json()); 

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// LLAVE SECRETA PARA FIRMAR LOS TOKENS (En producción usar una variable de entorno)
const JWT_SECRET = 'CONSOLA_ITIL_SUPER_SECRET_KEY_2026';

// ==========================================
// 1. ARQUITECTURA DE DOBLE POOL DE DATOS
// ==========================================
// Pool A: Cerebro de la Consola (Usuarios, Roles y Permisos)
const poolAuth = new Pool({
    user: 'postgres', host: 'localhost', database: 'db_consola_itil',
    password: 'juanitosp', port: 5432,
});

// Pool B: Datos Operativos (La infraestructura que vigilamos y respaldamos)
const poolData = new Pool({
    user: 'postgres', host: 'localhost', database: 'db_universidad_test',
    password: 'juanitosp', port: 5432,
});

// ==========================================
// 2. ENDPOINTS API REST (AUTENTICACIÓN)
// ==========================================

// Registro de nuevos operadores (Nacen en estado PENDIENTE)
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Verificar si el usuario ya existe
        const existe = await poolAuth.query('SELECT * FROM usuarios_admin WHERE email = $1', [email]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado.' });
        }

        // 2. Hashear la contraseña con Bcrypt (Salt de 10 rondas estándar)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Insertar en db_consola_itil delegando el ID UUID al motor Postgres
        await poolAuth.query(
            'INSERT INTO usuarios_admin (email, password_hash, rol, estado) VALUES ($1, $2, $3, $4)',
            [email, passwordHash, 'OPERADOR', 'PENDIENTE']
        );

        res.status(201).json({ mensaje: 'Solicitud de registro enviada. En espera de aprobación por el Administrador Superior.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno en el servidor de identidades.' });
    }
});

// Login de Usuarios
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const resultado = await poolAuth.query('SELECT * FROM usuarios_admin WHERE email = $1', [email]);
        if (resultado.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const usuario = resultado.rows[0];

        // Verificación de Contraseña Hasheada
        const passwordValido = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValido) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // CONTROL DE FLUJO DE ESTADOS (Sala de Espera Corporativa)
        if (usuario.estado === 'PENDIENTE') {
            return res.status(403).json({ status_error: 'PENDIENTE', error: 'Tu solicitud de acceso se encuentra en proceso de revisión.' });
        }
        if (usuario.estado === 'RECHAZADO') {
            return res.status(403).json({ status_error: 'RECHAZADO', error: 'El administrador ha rechazado tu solicitud de acceso al sistema.' });
        }

        // Si está APROBADO, fabricamos su pase de acceso JWT
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol, estado: usuario.estado },
            JWT_SECRET,
            { expiresIn: '8h' } // Expira en 8 horas por seguridad de turno laboral
        );

        res.json({ token, usuario: { email: usuario.email, rol: usuario.rol } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno en el servidor.' });
    }
});

// ==========================================
// 2.5 MOTOR DE PERMISOS (GESTIÓN DE IDENTIDADES)
// ==========================================

// Middleware Guardián: Verifica el Token y el Rol de SUPER_ADMIN
const verificarSuperAdmin = (req, res, next) => {
    // El token llega en la cabecera: "Bearer eyJhbGci..."
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. No hay pase de seguridad.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodificado = jwt.verify(token, JWT_SECRET);

        // La barrera de cristal: Si no es admin, se bloquea la petición
        if (decodificado.rol !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Infracción de seguridad: Se requieren privilegios de SUPER_ADMIN.' });
        }

        req.usuario = decodificado; // Pasamos los datos del admin a la ruta
        next(); // Permitimos el paso
    } catch (error) {
        return res.status(401).json({ error: 'Pase de seguridad inválido o expirado.' });
    }
};

// ENDPOINT 1: Leer todos los operadores (Solo lectura, sin contraseñas)
app.get('/api/admin/usuarios', verificarSuperAdmin, async (req, res) => {
    try {
        // Excluimos deliberadamente el password_hash por seguridad
        const query = `
            SELECT id, email, rol, estado, fecha_registro 
            FROM usuarios_admin 
            ORDER BY fecha_registro DESC;
        `;
        const { rows } = await poolAuth.query(query);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al consultar la base de datos de identidades.' });
    }
});

// ENDPOINT 2: Modificar el estado y rol de un operador
app.put('/api/admin/usuarios/:id', verificarSuperAdmin, async (req, res) => {
    const idUsuarioDestino = req.params.id;
    const { estado, rol } = req.body;

    // Validación de seguridad básica para no auto-degradarse por error
    if (req.usuario.id === idUsuarioDestino && estado !== 'APROBADO') {
        return res.status(400).json({ error: 'No puedes bloquearte o degradarte a ti mismo.' });
    }

    try {
        await poolAuth.query(
            'UPDATE usuarios_admin SET estado = $1, rol = $2 WHERE id = $3',
            [estado, rol, idUsuarioDestino]
        );

        // Opcional: Podríamos usar io.emit aquí para expulsar al usuario en tiempo real si fue RECHAZADO, 
        // pero por ahora actualizar la BD es suficiente.

        res.json({ mensaje: 'Políticas de acceso actualizadas correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al aplicar las nuevas políticas de seguridad.' });
    }
});
// ==========================================
// 3. MIDDLEWARE DE PROTECCIÓN PARA SOCKET.IO
// ==========================================
// Ningún cliente de React podrá conectar su websocket si no envía un token JWT válido
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Acceso denegado. Token no suministrado."));
    }
    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        socket.usuario = verificado; // Guardamos los datos decodificados en el socket
        next();
    } catch (err) {
        next(new Error("Token inválido o expirado."));
    }
});


// ==========================================
// 4. MOTOR DE EJECUCIÓN PYTHON (RESPALDOS)
// ==========================================
let tareaCronActiva = null;
let configuracionCron = { activo: false, frecuencia: '0 0 * * *', etiqueta: 'Diario (00:00)' };

const ejecutarScriptPython = (ruta, origen = 'Manual', argumentosExtra = []) => {
    console.log(`🚀 Iniciando proceso (${origen})...`);
    io.emit('terminal_stream', `\n[*] INICIANDO PROTOCOLO DESDE ORIGEN: ${origen}`);

    const opciones = { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } };
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
// 5. LÓGICA DE EVENTOS DE SOCKET
// ==========================================
io.on('connection', (socket) => {
    // Al conectar, podemos ver qué usuario autenticado está operando la consola
    console.log(`🟢 Operador autenticado conectado: ${socket.usuario.email} [Rol: ${socket.usuario.rol}]`);

    // Solicitud de Métricas Logísticas (Consume de poolData)
    socket.on('solicitar_metricas', async () => {
        try {
            const query = `SELECT relname AS tabla, n_live_tup AS registros FROM pg_stat_user_tables ORDER BY relname;`;
            const { rows } = await poolData.query(query);
            socket.emit('metricas_bd', rows);
        } catch (error) { console.error(error); }
    });

    // Solicitud de Historial de la Bóveda de Archivos
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

    // Despacho de Respaldos Manuales
    socket.on('iniciar_backup', (tablasSeleccionadas = []) => {
        const origen = tablasSeleccionadas.length > 0 ? `Manual_Granular_[${socket.usuario.email}]` : `Manual_Completo_[${socket.usuario.email}]`;
        ejecutarScriptPython(
            'C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backup_script.py',
            origen,
            tablasSeleccionadas
        );
    });

    // Despacho de Recuperación de Desastres
    socket.on('iniciar_restauracion', () => {
        // Bloqueo de seguridad: Solo permitir restaurar si es SUPER_ADMIN o si está explicitado en la política TI
        ejecutarScriptPython(
            'C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\restore_script.py',
            `Restauración_Crítica_[${socket.usuario.email}]`
        );
    });

    // Gestión del Servicio Cron
    socket.on('solicitar_estado_cron', () => {
        socket.emit('estado_cron', configuracionCron);
    });

    socket.on('configurar_cron', (nuevaConfig) => {
        if (tareaCronActiva) { tareaCronActiva.stop(); tareaCronActiva = null; }
        configuracionCron = nuevaConfig;

        if (configuracionCron.activo) {
            console.log(`⏱️ Cron activado por ${socket.usuario.email}: ${configuracionCron.frecuencia}`);
            tareaCronActiva = cron.schedule(configuracionCron.frecuencia, () => {
                ejecutarScriptPython('C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backup_script.py', 'Automático_Cron');
            });
        }
        io.emit('estado_cron', configuracionCron);
    });

    socket.on('disconnect', () => console.log('🔴 Operador desconectado'));
});

server.listen(4000, () => console.log(`📡 Servidor ITIL API corriendo en http://localhost:4000`));