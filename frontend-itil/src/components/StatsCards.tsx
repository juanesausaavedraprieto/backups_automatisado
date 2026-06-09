import React from 'react';

interface Props {
    totalTablas: number;
    tiempoUltimoProceso: string;
}

const StatsCards: React.FC<Props> = ({ totalTablas, tiempoUltimoProceso }) => {
    return (
        <div style={styles.grid}>
            <div style={styles.card}>
                <h4 style={styles.title}>Activos Protegidos</h4>
                <p style={styles.value}>{totalTablas} <span style={styles.unit}>Tablas</span></p>
            </div>
            <div style={styles.card}>
                <h4 style={styles.title}>Salud del Sistema</h4>
                <p style={styles.value}><span style={{ color: '#4ade80' }}>Óptima</span></p>
            </div>
            <div style={styles.card}>
                <h4 style={styles.title}>Tiempo de Ejecución (SLA)</h4>
                <p style={styles.value}>{tiempoUltimoProceso}</p>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' },
    card: { backgroundColor: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #333', borderLeft: '4px solid #deff9a' },
    title: { margin: '0 0 10px 0', color: '#888', fontSize: '14px', textTransform: 'uppercase' },
    value: { margin: 0, fontSize: '28px', color: '#f5f5f5', fontWeight: 'bold' },
    unit: { fontSize: '16px', color: '#888', fontWeight: 'normal' }
};

export default StatsCards;