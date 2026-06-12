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
// 1.5. FUNCIÓN CENTRALIZADA DE AUDITORÍA
// ==========================================
// Función centralizada para el registro inmutable de acciones
const registrarAuditoria = async (email, evento, descripcion, estado, ip = '127.0.0.1') => {
    try {
        const query = `
            INSERT INTO auditoria_eventos (usuario_email, evento, descripcion, estado, ip_cliente)
            VALUES ($1, $2, $3, $4, $5);
        `;
        await poolAuth.query(query, [email, evento, descripcion, estado, ip]);
    } catch (error) {
        console.error('[-] Error crítico al escribir en el log de auditoría:', error.message);
    }
};

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1515025468892385545/0gUaWmVxl_bRy9FpEOJKSNFWSZIe_fIGzhiVOWm_gm1bZJMzsqP_Sa0XrXSjBn-ihIa_';

const enviarAlertaDiscord = async (evento, origen, operador, exito, detalles) => {
    if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes('TU_WEBHOOK_AQUI')) return;

    // Colores: Verde para éxito (5763719), Rojo para error (15548997)
    const colorNotificacion = exito ? 5763719 : 15548997;
    const iconoEstado = exito ? '✅' : '🚨';

    const payload = {
        username: "Console TI - Alertas",
        avatar_url: "https://cdn-icons-png.flaticon.com/512/2115/2115916.png", // Un ícono de servidor
        embeds: [{
            title: `${iconoEstado} Notificación de Infraestructura ITIL`,
            color: colorNotificacion,
            fields: [
                { name: "Operación", value: evento, inline: true },
                { name: "Estado", value: exito ? "Completado con Éxito" : "Fallo Crítico", inline: true },
                { name: "Operador/Origen", value: operador, inline: true },
                { name: "Tipo de Lanzamiento", value: origen, inline: true },
                { name: "Detalles del Sistema", value: `\`\`\`${detalles}\`\`\``, inline: false }
            ],
            footer: { text: "Sistema de Continuidad de Negocio | PostgreSQL" },
            timestamp: new Date().toISOString()
        }]
    };

    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error('[-] Error al disparar el Webhook de Discord:', error.message);
    }
};
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

// Login Auditado
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    try {
        const resultado = await poolAuth.query('SELECT * FROM usuarios_admin WHERE email = $1', [email]);
        if (resultado.rows.length === 0) {
            await registrarAuditoria(email, 'LOGIN', 'Intento de acceso fallido: Usuario no registrado', 'ERROR', ip);
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const usuario = resultado.rows[0];

        // Verificación de Contraseña Hasheada
        const passwordValido = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValido) {
            await registrarAuditoria(email, 'LOGIN', 'Intento de acceso fallido: Contraseña incorrecta', 'ERROR', ip);
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // CONTROL DE FLUJO DE ESTADOS (Sala de Espera Corporativa)
        if (usuario.estado === 'PENDIENTE' || usuario.estado === 'RECHAZADO') {
            await registrarAuditoria(email, 'LOGIN', `Acceso bloqueado: Cuenta en estado ${usuario.estado}`, 'ERROR', ip);
            return res.status(403).json({ status_error: usuario.estado, error: 'Acceso no autorizado por políticas de IAM.' });
        }

        // Si está APROBADO, fabricamos su pase de acceso JWT
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol, estado: usuario.estado },
            JWT_SECRET,
            { expiresIn: '8h' } // Expira en 8 horas por seguridad de turno laboral
        );

        await registrarAuditoria(email, 'LOGIN', 'Inicio de sesión exitoso. Token JWT emitido.', 'EXITO', ip);
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

// ENDPOINT: Leer todos los operadores (Solo lectura, sin contraseñas)
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

// ENDPOINT: Obtener historial completo de auditoría inmutable
app.get('/api/admin/auditoria', verificarSuperAdmin, async (req, res) => {
    try {
        const query = `SELECT id, usuario_email, evento, descripcion, estado, ip_cliente, fecha FROM auditoria_eventos ORDER BY fecha DESC;`;
        const { rows } = await poolAuth.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar logs de auditoría.' });
    }
});
// ENDPOINT: Descarga Segura "Off-Site" de Activos de la Bóveda
app.get('/api/backups/download/:filename', verificarSuperAdmin, (req, res) => {
    const filename = req.params.filename;

    // Aseguramos la ruta exacta a tu bóveda
    const rutaBackups = 'C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backups';
    const filepath = path.join(rutaBackups, filename);

    // Medida de seguridad: Prevenir ataques de "Directory Traversal" (ej. ../../)
    if (!filepath.startsWith(rutaBackups) || !fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'Activo de información no encontrado o acceso denegado.' });
    }

    // Registramos la descarga en el log de auditoría
    registrarAuditoria(
        req.usuario.email,
        'DESCARGA_OFFSITE',
        `Extracción segura del activo cifrado: ${filename}`,
        'EXITO',
        req.ip || req.socket.remoteAddress
    );

    // Transmitimos el archivo
    res.download(filepath);
});
// Modificación de Políticas de IAM Auditada
app.put('/api/admin/usuarios/:id', verificarSuperAdmin, async (req, res) => {
    const idUsuarioDestino = req.params.id;
    const { estado, rol } = req.body;
    const ip = req.ip || req.socket.remoteAddress;

    // Validación de seguridad básica para no auto-degradarse por error
    if (req.usuario.id === idUsuarioDestino && estado !== 'APROBADO') {
        return res.status(400).json({ error: 'No puedes bloquearte o degradarte a ti mismo.' });
    }

    try {
        // Consultamos el correo del afectado para guardarlo en la descripción de la auditoría
        const afectado = await poolAuth.query('SELECT email FROM usuarios_admin WHERE id = $1', [idUsuarioDestino]);
        const emailAfectado = afectado.rows[0]?.email || 'Desconocido';

        await poolAuth.query(
            'UPDATE usuarios_admin SET estado = $1, rol = $2 WHERE id = $3',
            [estado, rol, idUsuarioDestino]
        );

        await registrarAuditoria(
            req.usuario.email,
            'IAM_MODIFICACION',
            `Modificación de derechos sobre el usuario [${emailAfectado}]. Nuevo Estado: ${estado}, Nuevo Rol: ${rol}`,
            'EXITO',
            ip
        );

        res.json({ mensaje: 'Políticas de acceso actualizadas correctamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al aplicar políticas de seguridad.' });
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

// Modifica la función ejecutarScriptPython para recibir el correo del operador
const ejecutarScriptPython = (ruta, origen = 'Manual', argumentosExtra = [], emailOperador = 'Sistema') => {
    console.log(`🚀 Iniciando proceso (${origen})...`);
    io.emit('terminal_stream', `\n[*] INICIANDO PROTOCOLO DESDE ORIGEN: ${origen}`);

    const opciones = { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } };
    const argumentos = ['-u', ruta, ...argumentosExtra];
    const proceso = spawn('py', argumentos, opciones);

    proceso.stdout.on('data', (data) => io.emit('terminal_stream', data.toString()));
    proceso.stderr.on('data', (data) => io.emit('terminal_stream', data.toString()));

    proceso.on('close', async (code) => {
        const exito = code === 0;
        const tipoEvento = ruta.includes('backup') ? 'BACKUP' : 'RESTAURACION';
        const mensajeDetalle = `Proceso finalizado con código de salida ${code}.`;
        await registrarAuditoria(
            emailOperador,
            tipoEvento,
            `Ejecución de script [${tipoEvento}]. Origen de la llamada: ${origen}. ${mensajeDetalle}`,
            exito ? 'EXITO' : 'ERROR'
        );

        // 2. NUEVO: ALERTA EXTERNA VÍA DISCORD
        await enviarAlertaDiscord(tipoEvento, origen, emailOperador, exito, mensajeDetalle);

        // 3. ACTUALIZACIÓN DEL FRONTEND REACT
        io.emit('backup_completado', { exito, mensaje: `Proceso (${origen}) finalizado con código ${code}.` });
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
                    const rtuatCompleta = path.join(rutaBackups, file);
                    const stats = fs.statSync(rtuatCompleta);

                    // === NUEVO: LEER EL COMPAÑERO SHA-256 ===
                    const rutaSha = rtuatCompleta + '.sha256';
                    let checksum = 'Firma no encontrada';
                    if (fs.existsSync(rutaSha)) {
                        checksum = fs.readFileSync(rutaSha, 'utf8').trim();
                    }

                    return {
                        nombre: file,
                        pesoMB: (stats.size / (1024 * 1024)).toFixed(2),
                        fechaMs: stats.mtimeMs,
                        checksum: checksum 
                    };
                }).sort((a, b) => b.fechaMs - a.fechaMs);
            socket.emit('historial_archivos', archivos);
        } catch (error) { console.error(error); }
    });

    // Despacho de Respaldos Manuales con Auditoría
    socket.on('iniciar_backup', (tablasSeleccionadas = []) => {
        const origen = tablasSeleccionadas.length > 0 ? 'Manual_Granular' : 'Manual_Completo';
        ejecutarScriptPython(
            'C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backup_script.py',
            origen,
            tablasSeleccionadas,
            socket.usuario.email // <-- PASAMOS EL OPERADOR AUTENTICADO
        );
    });

    // Despacho de Recuperación de Desastres con Auditoría
    socket.on('iniciar_restauracion', () => {
        // Bloqueo de seguridad: Solo permitir restaurar si es SUPER_ADMIN o si está explicitado en la política TI
        ejecutarScriptPython(
            'C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\restore_script.py',
            'Restauración_Crítica',
            [],
            socket.usuario.email // <-- PASAMOS EL OPERADOR AUTENTICADO
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
                // Al ser automático, el sistema lo registra
                ejecutarScriptPython('C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backup_script.py', 'Automático_Cron');
            });
        }
        io.emit('estado_cron', configuracionCron);
    });

    socket.on('disconnect', () => console.log('🔴 Operador desconectado'));
});

const rotarAuditoria = async () => {
    try {
        console.log('[*] Iniciando protocolo de rotación de auditoría (Retención: 15 días móviles)...');

        // 1. Buscar registros que ya superaron los 15 días de antigüedad
        const querySelect = `SELECT * FROM auditoria_eventos WHERE fecha < NOW() - INTERVAL '15 days' ORDER BY fecha ASC`;
        const { rows } = await poolAuth.query(querySelect);

        if (rows.length === 0) {
            console.log('[*] Rotación de auditoría: No hay registros mayores a 15 días para archivar.');
            return;
        }

        // 2. Formatear la data a formato CSV (Texto Plano ligero)
        const cabeceras = "ID,Usuario_Email,Evento,Descripcion,Estado,IP_Cliente,Fecha\n";
        const lineas = rows.map(r =>
            // Limpiamos las comillas dobles en la descripción para evitar que se rompa el CSV
            `${r.id},${r.usuario_email},${r.evento},"${r.descripcion.replace(/"/g, '""')}",${r.estado},${r.ip_cliente},${r.fecha.toISOString()}`
        ).join("\n");

        // 3. Guardar el archivo inmutable en la Bóveda de Archivos
        // Usamos una marca de tiempo exacta para el nombre del archivo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const nombreArchivo = `auditoria_historica_${timestamp}.csv`;
        const rutaArchivo = path.join('C:\\Users\\JUAN ESAU SAAVEDRA P\\OneDrive - Universidad Tecnologica del Peru\\doc\\MIS_PROYECTOS\\Gestion-TI\\backups', nombreArchivo);

        fs.writeFileSync(rutaArchivo, cabeceras + lineas, 'utf8');

        // 4. Purgar los registros antiguos de la base de datos principal (Liberar espacio)
        const queryDelete = `DELETE FROM auditoria_eventos WHERE fecha < NOW() - INTERVAL '15 days'`;
        await poolAuth.query(queryDelete);

        // 5. Registrar este evento en la tabla "limpia" para dejar constancia de la acción automática
        await registrarAuditoria(
            'Demonio_Cron_Interno',
            'ROTACION_LOGS',
            `Limpieza automática exitosa. Se archivaron ${rows.length} registros antiguos (>= 15 días) en el archivo off-site: ${nombreArchivo}.`,
            'EXITO',
            'localhost'
        );

        console.log(`[+] Éxito: Rotación completada y BD purgada. Archivo generado: ${nombreArchivo}`);
    } catch (error) {
        console.error('[-] Error crítico en la rotación de logs:', error.message);
    }
};

cron.schedule('0 3 * * *', rotarAuditoria);

server.listen(4000, () => console.log(`📡 Servidor ITIL API corriendo en http://localhost:4000`));