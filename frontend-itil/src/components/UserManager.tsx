import React, { useState, useEffect } from 'react';

interface Usuario {
    id: string;
    email: string;
    rol: string;
    estado: string;
    fecha_registro: string;
}

interface Props {
    token: string;
}

const UserManager: React.FC<Props> = ({ token }) => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [mensaje, setMensaje] = useState('');

    const cargarUsuarios = async () => {
        try {
            const response = await fetch('http://localhost:4000/api/admin/usuarios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setUsuarios(data);
        } catch (err) {
            console.error("Error al cargar auditoría de usuarios.");
        }
    };

    useEffect(() => { cargarUsuarios(); }, []);

    const actualizarEstado = async (id: string, nuevoEstado: string, nuevoRol: string) => {
        try {
            const response = await fetch(`http://localhost:4000/api/admin/usuarios/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: nuevoEstado, rol: nuevoRol })
            });

            if (response.ok) {
                setMensaje('Políticas de acceso actualizadas.');
                cargarUsuarios();
                setTimeout(() => setMensaje(''), 3000);
            }
        } catch (err) {
            alert("Error al aplicar cambios de seguridad.");
        }
    };

    return (
        <div style={styles.card}>
            <h3 style={styles.title}>🔐 Gestión de Identidades y Accesos (IAM)</h3>
            {mensaje && <div style={styles.toast}>{mensaje}</div>}

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Operador</th>
                        <th style={styles.th}>Rol Actual</th>
                        <th style={styles.th}>Estado de Acceso</th>
                        <th style={styles.th}>Acciones de Control</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((u) => (
                        <tr key={u.id} style={styles.tr}>
                            <td style={styles.td}>{u.email}</td>
                            <td style={styles.td}>
                                <span style={{ ...styles.badge, backgroundColor: u.rol === 'SUPER_ADMIN' ? '#4f46e5' : '#333' }}>
                                    {u.rol}
                                </span>
                            </td>
                            <td style={styles.td}>
                                <span style={{ ...styles.status, color: u.estado === 'APROBADO' ? '#4ade80' : u.estado === 'PENDIENTE' ? '#fbbf24' : '#ef4444' }}>
                                    ● {u.estado}
                                </span>
                            </td>
                            <td style={styles.td}>
                                <div style={styles.actions}>
                                    <button onClick={() => actualizarEstado(u.id, 'APROBADO', 'OPERADOR')} style={styles.btnApprove}>APROBAR</button>
                                    <button onClick={() => actualizarEstado(u.id, 'RESTRINGIDO', 'OPERADOR')} style={styles.btnRestrict}>RESTRINGIR</button>
                                    <button onClick={() => actualizarEstado(u.id, 'RECHAZADO', 'OPERADOR')} style={styles.btnReject}>RECHAZAR</button>
                                    <button onClick={() => actualizarEstado(u.id, 'APROBADO', 'SUPER_ADMIN')} style={styles.btnAdmin}>SUBIR A ADMIN</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: { backgroundColor: '#111', padding: '25px', borderRadius: '10px', border: '1px solid #333' },
    title: { margin: '0 0 20px 0', color: '#f5f5f5', fontSize: '18px' },
    toast: { backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '10px', borderRadius: '6px', marginBottom: '15px', textAlign: 'center', border: '1px solid #166534' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '12px', color: '#666', borderBottom: '2px solid #222', fontSize: '13px', textTransform: 'uppercase' },
    td: { padding: '15px 12px', borderBottom: '1px solid #1a1a1a', color: '#ccc', fontSize: '14px' },
    tr: { transition: '0.2s' },
    badge: { padding: '4px 8px', borderRadius: '4px', fontSize: '11px', color: '#fff', fontWeight: 'bold' },
    status: { fontSize: '12px', fontWeight: 'bold' },
    actions: { display: 'flex', gap: '8px' },
    btnApprove: { backgroundColor: '#166534', color: '#4ade80', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
    btnRestrict: { backgroundColor: '#854d0e', color: '#fde047', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
    btnReject: { backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
    btnAdmin: { backgroundColor: '#1e1b4b', color: '#818cf8', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
};

export default UserManager;