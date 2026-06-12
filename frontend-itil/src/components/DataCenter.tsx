import React, { useState } from 'react';
import type { ArchivoBackup } from '../types';

interface Props {
    archivos: ArchivoBackup[];
}

const DataCenter: React.FC<Props> = ({ archivos }) => {
    const [descargando, setDescargando] = useState<string | null>(null);

    // Lógica de descarga del archivo encriptado (.enc)
    const descargarActivoCifrado = async (nombreArchivo: string) => {
        const token = localStorage.getItem('itil_token');
        if (!token) return alert('Autenticación requerida.');

        setDescargando(nombreArchivo);

        try {
            const response = await fetch(`http://localhost:4000/api/backups/download/${nombreArchivo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al validar credenciales o encontrar el archivo.');

            // Convertimos el stream de datos en un objeto descargable
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('[-] Acceso Denegado o Archivo Inaccesible.');
        } finally {
            setDescargando(null);
        }
    };

    // Lógica para descargar el sello de integridad (Fabricado en memoria RAM)
    const descargarSelloSHA = (nombreArchivo: string, hash: string) => {
        if (!hash || hash === 'Firma no encontrada') return alert('No hay sello disponible.');
        const blob = new Blob([hash], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nombreArchivo}.sha256`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (archivos.length === 0) {
        return (
            <div style={styles.card}>
                <h3 style={styles.title}>🗄️ Bóveda de Activos Críticos</h3>
                <p style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>La bóveda se encuentra vacía. No hay respaldos cifrados disponibles.</p>
            </div>
        );
    }

    return (
        <div style={styles.card}>
            <h3 style={styles.title}>🗄️ Bóveda de Activos Críticos (Cifrado AES-256)</h3>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Nombre del Activo</th>
                            <th style={styles.th}>Capacidad (MB)</th>
                            <th style={styles.th}>Sello de Integridad (SHA-256)</th>
                            <th style={styles.th}>Fecha de Almacenamiento</th>
                            <th style={styles.th}>Acciones de Portabilidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {archivos.map((archivo, index) => (
                            <tr key={index} style={styles.tr}>
                                <td style={styles.td_nombre}>🔒 {archivo.nombre}</td>
                                <td style={styles.td}>{archivo.pesoMB} MB</td>
                                <td style={styles.td}>
                                    <code style={styles.checksumCode}>
                                        {archivo.checksum && archivo.checksum !== 'Firma no encontrada'
                                            ? `${archivo.checksum.substring(0, 8)}...${archivo.checksum.substring(archivo.checksum.length - 8)}`
                                            : 'N/A'}
                                    </code>
                                </td>
                                <td style={styles.td}>{new Date(archivo.fechaMs).toLocaleString()}</td>
                                <td style={styles.td}>
                                    <div style={styles.actionGroup}>
                                        <button
                                            onClick={() => descargarActivoCifrado(archivo.nombre)}
                                            style={styles.btnDownload}
                                            disabled={descargando === archivo.nombre}
                                        >
                                            {descargando === archivo.nombre ? '⏳' : '⬇️ DATA'}
                                        </button>
                                        <button
                                            onClick={() => descargarSelloSHA(archivo.nombre, archivo.checksum || '')}
                                            style={styles.btnDownloadHash}
                                        >
                                            ⬇️ FIRMA
                                        </button>
                                    </div>
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
    card: { backgroundColor: '#111', padding: '25px', borderRadius: '10px', border: '1px solid #333', width: '100%', boxSizing: 'border-box' },
    title: { margin: '0 0 20px 0', color: '#f5f5f5', fontSize: '18px' },
    tableContainer: { width: '100%', overflowX: 'auto' },
    table: { width: '100%', minWidth: '900px', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '12px', color: '#666', borderBottom: '2px solid #222', fontSize: '13px', textTransform: 'uppercase' },
    td: { padding: '15px 12px', borderBottom: '1px solid #1a1a1a', color: '#ccc', fontSize: '14px' },
    td_nombre: { padding: '15px 12px', borderBottom: '1px solid #1a1a1a', color: '#deff9a', fontSize: '14px', fontFamily: 'monospace' },
    tr: { transition: '0.2s' },
    checksumCode: { backgroundColor: '#161615', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid #2d2d2a' },
    actionGroup: { display: 'flex', gap: '10px' },
    btnDownload: { backgroundColor: '#1f1f1f', color: '#deff9a', border: '1px solid #333', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: '0.2s' },
    btnDownloadHash: { backgroundColor: 'transparent', color: '#888', border: '1px solid #333', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: '0.2s' }
};

export default DataCenter;