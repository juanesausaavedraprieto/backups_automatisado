import React from 'react';
import type { MetricaTabla } from '../types';

interface Props {
    metricas: MetricaTabla[];
    tablasSeleccionadas: string[];
    setTablasSeleccionadas: React.Dispatch<React.SetStateAction<string[]>>;
    enEjecucion: boolean;
}

const TableSelector: React.FC<Props> = ({ metricas, tablasSeleccionadas, setTablasSeleccionadas, enEjecucion }) => {

    const manejarSeleccion = (nombreTabla: string) => {
        setTablasSeleccionadas(prev =>
            prev.includes(nombreTabla)
                ? prev.filter(t => t !== nombreTabla) // Si ya estaba, la quitamos
                : [...prev, nombreTabla] // Si no estaba, la agregamos
        );
    };

    const seleccionarTodas = () => setTablasSeleccionadas([]);

    // Si el array está vacío, significa que se copiará toda la base de datos
    const esBackupCompleto = tablasSeleccionadas.length === 0;

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <h3 style={styles.title}>🎯 Selección de Cobertura (Granularidad)</h3>
                <button
                    style={{ ...styles.badgeBtn, backgroundColor: esBackupCompleto ? '#deff9a' : '#333', color: esBackupCompleto ? '#000' : '#888' }}
                    onClick={seleccionarTodas}
                    disabled={enEjecucion}
                >
                    {esBackupCompleto ? '✓ MODO COMPLETO ACTIVO' : 'RESTAURAR A COMPLETO'}
                </button>
            </div>

            <p style={styles.helperText}>
                {esBackupCompleto
                    ? "No has seleccionado tablas individuales. Se extraerá el 100% de la base de datos."
                    : `Modo Parcial: Se extraerán ${tablasSeleccionadas.length} tabla(s) seleccionada(s).`}
            </p>

            <div style={styles.grid}>
                {metricas.map((tabla, idx) => (
                    <label key={idx} style={{ ...styles.checkboxLabel, opacity: enEjecucion ? 0.5 : 1 }}>
                        <input
                            type="checkbox"
                            checked={tablasSeleccionadas.includes(tabla.tabla)}
                            onChange={() => manejarSeleccion(tabla.tabla)}
                            disabled={enEjecucion}
                            style={styles.checkbox}
                        />
                        {tabla.tabla} <span style={styles.badge}>{tabla.registros} reg.</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: { backgroundColor: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    title: { margin: 0, color: '#f5f5f5', fontSize: '16px' },
    badgeBtn: { border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
    helperText: { color: '#888', fontSize: '13px', marginBottom: '15px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' },
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1a1a1a', padding: '10px 15px', borderRadius: '6px', border: '1px solid #222', cursor: 'pointer', fontSize: '14px', color: '#ccc' },
    checkbox: { cursor: 'pointer', width: '16px', height: '16px', accentColor: '#deff9a' },
    badge: { marginLeft: 'auto', backgroundColor: '#333', color: '#aaa', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }
};

export default TableSelector;