import React from 'react';
import type { MetricaTabla } from '../types';

interface Props {
    metricas: MetricaTabla[];
}

const MetricsPanel: React.FC<Props> = ({ metricas }) => {
    return (
        <div style={styles.card}>
            <h3 style={styles.title}>📊 Radiografía de Activos Críticos</h3>
            {metricas.length === 0 ? (
                <p style={{ color: '#888' }}>Cargando métricas de la base de datos...</p>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Tabla (Esquema Público)</th>
                            <th style={styles.th}>Registros Activos</th>
                            <th style={styles.th}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metricas.map((metrica, index) => (
                            <tr key={index} style={styles.tr}>
                                <td style={styles.td}>{metrica.tabla}</td>
                                <td style={styles.td}>{metrica.registros}</td>
                                <td style={styles.td}>
                                    <span style={styles.badge}>Lista para respaldo</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: {
        backgroundColor: '#111',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid #333',
        marginBottom: '20px',
        width: '100%',
    },
    title: { marginTop: 0, color: '#f5f5f5', borderBottom: '1px solid #333', paddingBottom: '10px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
    th: { textAlign: 'left', padding: '10px', color: '#deff9a', borderBottom: '2px solid #333' },
    td: { padding: '10px', color: '#ccc', borderBottom: '1px solid #222' },
    tr: { transition: 'background-color 0.2s' },
    badge: { backgroundColor: '#166534', color: '#4ade80', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }
};

export default MetricsPanel;