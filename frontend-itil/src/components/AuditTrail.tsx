import React, { useState, useEffect } from 'react';

interface EventoAuditoria {
    id: string;
    usuario_email: string;
    evento: string;
    descripcion: string;
    estado: string;
    ip_cliente: string;
    fecha: string;
}

interface Props {
    token: string;
}

const AuditTrail: React.FC<Props> = ({ token }) => {
    const [logs, setLogs] = useState<EventoAuditoria[]>([]);

    useEffect(() => {
        const cargarAuditoria = async () => {
            try {
                const response = await fetch('http://localhost:4000/api/admin/auditoria', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok) setLogs(data);
            } catch (err) {
                console.error("Error al recuperar el mapa de trazabilidad.");
            }
        };
        cargarAuditoria();
    }, [token]);

    return (
        <div style={styles.card}>
            <h3 style={styles.title}>📜 Libro de Registro de Auditoría Inmutable (ITIL Compliance)</h3>
            <p style={styles.subtitle}>Historial detallado e inalterable de operaciones sobre el clúster de infraestructura</p>

            <div style={styles.tableWrapper}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Estampa de Tiempo</th>
                            <th style={styles.th}>Operador</th>
                            <th style={styles.th}>Evento</th>
                            <th style={styles.th}>Descripción Operativa</th>
                            <th style={styles.th}>Origen IP</th>
                            <th style={styles.th}>Resultado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} style={styles.tr}>
                                <td style={styles.td}>{new Date(log.fecha).toLocaleString()}</td>
                                <td style={styles.td_email}>{log.usuario_email}</td>
                                <td style={styles.td}>
                                    <span style={styles.badge}>{log.evento}</span>
                                </td>
                                <td style={styles.td_desc}>{log.descripcion}</td>
                                <td style={styles.td_ip}>{log.ip_cliente}</td>
                                <td style={styles.td}>
                                    <span style={{
                                        ...styles.status,
                                        backgroundColor: log.estado === 'EXITO' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: log.estado === 'EXITO' ? '#4ade80' : '#ef4444',
                                        border: log.estado === 'EXITO' ? '1px solid #166534' : '1px solid #7f1d1d'
                                    }}>
                                        {log.estado}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: { backgroundColor: '#111', padding: '25px', borderRadius: '10px', border: '1px solid #333', width: '100%' },
    title: { margin: 0, color: '#f5f5f5', fontSize: '18px', fontWeight: 'bold' },
    subtitle: { margin: '5px 0 25px 0', color: '#666', fontSize: '13px' },
    tableWrapper: { overflowX: 'auto', width: '100%' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '12px', color: '#555', borderBottom: '2px solid #222', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    td: { padding: '14px 12px', borderBottom: '1px solid #1a1a1a', color: '#aaa', fontSize: '13px', fontFamily: 'monospace' },
    td_email: { padding: '14px 12px', borderBottom: '1px solid #1a1a1a', color: '#ccc', fontSize: '13px', fontWeight: 500 },
    td_desc: { padding: '14px 12px', borderBottom: '1px solid #1a1a1a', color: '#888', fontSize: '13px', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-word' },
    td_ip: { padding: '14px 12px', borderBottom: '1px solid #1a1a1a', color: '#555', fontSize: '13px', fontFamily: 'monospace' },
    tr: { borderBottom: '1px solid #1f1f1f' },
    badge: { backgroundColor: '#1f1f1f', color: '#deff9a', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #333', fontWeight: 'bold' },
    status: { padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', display: 'inline-block' }
};

export default AuditTrail;