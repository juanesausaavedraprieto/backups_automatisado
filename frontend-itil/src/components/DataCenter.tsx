import React from 'react';
import type { ArchivoBackup } from '../types';

interface Props {
    archivos: ArchivoBackup[];
}

const DataCenter: React.FC<Props> = ({ archivos }) => {
    return (
        <div style={styles.card}>
            <h3 style={styles.title}>🗄️ Bóveda de Activos (Archivos Físicos)</h3>
            {archivos.length === 0 ? (
                <p style={{ color: '#888', padding: '20px', textAlign: 'center' }}>No hay archivos de respaldo encriptados en el servidor.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Nombre del Activo</th>
                                <th style={styles.th}>Capacidad (MB)</th>
                                <th style={styles.th}>Huella Digital (SHA-256 Integrity Sello)</th>
                                <th style={styles.th}>Fecha de Almacenamiento</th>
                                <th style={styles.th}>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {archivos.map((archivo, index) => (
                                <tr key={index} style={styles.tr}>
                                    <td style={styles.td_nombre}>🔒 {archivo.nombre}</td>
                                    <td style={styles.td}>{archivo.pesoMB} MB</td>
                                    <td style={styles.td}>
                                        <code style={styles.checksumCode}>
                                            {archivo.checksum ? `${archivo.checksum.substring(0, 8)}...${archivo.checksum.substring(archivo.checksum.length - 8)}` : 'Generando...'}
                                        </code>
                                    </td>
                                    <td style={styles.td}>{new Date(archivo.fechaMs).toLocaleString()}</td>
                                    <td style={styles.td}>
                                        <span style={styles.badge}>AES-256 Seguro</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: { backgroundColor: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginTop: '20px' },
    title: { marginTop: 0, color: '#f5f5f5', borderBottom: '1px solid #333', paddingBottom: '10px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', textAlign: 'left' },
    th: { padding: '12px', color: '#888', borderBottom: '2px solid #333', fontWeight: 'normal' },
    td: { padding: '12px', color: '#ccc', borderBottom: '1px solid #222' },
    td_nombre: { padding: '12px', borderBottom: '1px solid #222', color: '#deff9a', fontFamily: 'monospace' },
    tr: { transition: 'background-color 0.2s' },
    badge: { backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid #166534' },
    checksumCode: {
        backgroundColor: '#161615',
        color: '#deff9a',
        padding: '4px 8px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        border: '1px solid #2d2d2a',
        letterSpacing: '0.5px'
    }
};

export default DataCenter;