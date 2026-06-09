import React from 'react';
import type { RegistroHistorico } from '../types';

interface Props {
    historico: RegistroHistorico[];
}

const AnalyticsPanel: React.FC<Props> = ({ historico }) => {
    // Datos base por defecto en caso de que el histórico esté vacío al iniciar
    const datos = historico.length > 0 ? historico : [
        { fecha: 'Resp. 1', peso: 0.1, tiempo: 0.5 },
        { fecha: 'Resp. 2', peso: 0.2, tiempo: 0.8 },
        { fecha: 'Resp. 3', peso: 0.5, tiempo: 1.2 },
        { fecha: 'Resp. 4', peso: 0.9, tiempo: 1.5 }
    ];

    return (
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>📈 Análisis de Capacidad y Rendimiento</h2>

            <div style={styles.grid}>
                {/* GRÁFICO 1: LÍNEA - CRECIMIENTO DEL ALMACENAMIENTO */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Crecimiento de Almacenamiento (MB)</h3>
                    <svg viewBox="0 0 400 200" style={styles.svg}>
                        {/* Líneas de cuadrícula */}
                        <line x1="40" y1="20" x2="380" y2="20" stroke="#222" />
                        <line x1="40" y1="70" x2="380" y2="70" stroke="#222" />
                        <line x1="40" y1="120" x2="380" y2="120" stroke="#222" />
                        <line x1="40" y1="170" x2="380" y2="170" stroke="#444" />

                        {/* Trazo dinámico de la línea */}
                        <polyline
                            fill="none"
                            stroke="#deff9a"
                            strokeWidth="3"
                            points={datos.map((d, i) => `${40 + (i * 100)}, ${170 - (d.peso * 80)}`).join(' ')}
                        />

                        {/* Puntos de datos */}
                        {datos.map((d, i) => (
                            <circle
                                key={i}
                                cx={40 + (i * 100)}
                                cy={170 - (d.peso * 80)}
                                r="5"
                                fill="#0a0a0a"
                                stroke="#deff9a"
                                strokeWidth="2"
                            />
                        ))}
                    </svg>
                    <div style={styles.labelRow}>
                        {datos.map((d, i) => <span key={i} style={styles.axisLabel}>{d.fecha}</span>)}
                    </div>
                </div>

                {/* GRÁFICO 2: BARRAS - TIEMPO DE RESPUESTA POR OPERACIÓN */}
                <div style={styles.chartCard}>
                    <h3 style={styles.chartTitle}>Tiempos de Ejecución del Script (SLA)</h3>
                    <div style={styles.barChartContainer}>
                        {datos.map((d, i) => (
                            <div key={i} style={styles.barWrapper}>
                                <div style={styles.barTrack}>
                                    <div
                                        style={{
                                            ...styles.barFill,
                                            height: `${Math.min(d.tiempo * 50, 100)}%`
                                        }}
                                    />
                                </div>
                                <span style={styles.axisLabel}>{d.tiempo}s</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* COMPONENTE DE SECUENCIA OPERATIVA DE PRODUCCIÓN */}
            <div style={styles.sequenceCard}>
                <h3 style={styles.chartTitle}>Flujo de Trabajo del Ciclo de Vida del Respaldo</h3>
                <div style={styles.sequenceFlow}>
                    <div style={styles.step}>
                        <div style={styles.stepNumber}>1</div>
                        <div><strong>Extracción</strong><p style={styles.stepSub}>pg_dump -v</p></div>
                    </div>
                    <div style={styles.arrow}>➔</div>
                    <div style={styles.step}>
                        <div style={styles.stepNumber}>2</div>
                        <div><strong>Empaquetado</strong><p style={styles.stepSub}>Compresión Custom</p></div>
                    </div>
                    <div style={styles.arrow}>➔</div>
                    <div style={styles.step}>
                        <div style={styles.stepNumber}>3</div>
                        <div><strong>Cifrado</strong><p style={styles.stepSub}>AES-256 (Fernet)</p></div>
                    </div>
                    <div style={styles.arrow}>➔</div>
                    <div style={styles.step}>
                        <div style={styles.stepNumber}>4</div>
                        <div><strong>Auditoría</strong><p style={styles.stepSub}>Logs & Retención</p></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { marginTop: '10px' },
    sectionTitle: { fontSize: '22px', margin: '0 0 20px 0', color: '#f5f5f5' },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
    chartCard: { backgroundColor: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #222' },
    chartTitle: { margin: '0 0 15px 0', fontSize: '15px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
    svg: { width: '100%', height: '160px', overflow: 'visible' },
    labelRow: { display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: '10px' },
    axisLabel: { fontSize: '12px', color: '#666', fontFamily: 'monospace' },

    // Estilos del gráfico de barras
    barChartContainer: { display: 'flex', justifyContent: 'space-around', height: '160px', alignItems: 'flex-end', paddingTop: '10px' },
    barWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' },
    barTrack: { width: '30px', height: '120px', backgroundColor: '#1f1f1f', borderRadius: '4px', overflow: 'hidden', position: 'relative' },
    barFill: { width: '100%', backgroundColor: '#deff9a', position: 'absolute', bottom: 0, transition: 'height 0.5s ease-out', borderRadius: '2px' },

    // Estilos de la Secuencia Operativa
    sequenceCard: { backgroundColor: '#111', padding: '20px', borderRadius: '10px', border: '1px solid #222' },
    sequenceFlow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' },
    step: { display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px', border: '1px solid #333', flex: 1 },
    stepNumber: { width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#deff9a', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
    stepSub: { margin: 0, fontSize: '11px', color: '#666', fontFamily: 'monospace' },
    arrow: { color: '#444', fontSize: '20px', padding: '0 10px' }
};

export default AnalyticsPanel;