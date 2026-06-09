import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
    socket: Socket;
}

const CronPanel: React.FC<Props> = ({ socket }) => {
    const [activo, setActivo] = useState(false);
    const [frecuencia, setFrecuencia] = useState('0 0 * * *');
    const [etiqueta, setEtiqueta] = useState('Diario (00:00)');

    useEffect(() => {
        socket.emit('solicitar_estado_cron');

        socket.on('estado_cron', (config) => {
            setActivo(config.activo);
            setFrecuencia(config.frecuencia);
            setEtiqueta(config.etiqueta);
        });

        return () => {
            socket.off('estado_cron');
        };
    }, [socket]);

    const manejarCambioFrecuencia = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const valor = e.target.value;
        const texto = e.target.options[e.target.selectedIndex].text;
        setFrecuencia(valor);
        setEtiqueta(texto);
    };

    const aplicarConfiguracion = () => {
        socket.emit('configurar_cron', { activo: !activo, frecuencia, etiqueta });
    };

    return (
        <div style={styles.card}>
            <div style={styles.header}>
                <div>
                    <h3 style={styles.title}>🤖 Demonio de Automatización Cron</h3>
                    <p style={styles.subtitle}>Programación de ejecución desatendida</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: activo ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>
                        {activo ? '● SERVICIO ACTIVO' : '● SERVICIO DETENIDO'}
                    </span>
                    <button
                        style={{ ...styles.toggleBtn, backgroundColor: activo ? '#ef4444' : '#deff9a', color: activo ? '#fff' : '#000' }}
                        onClick={aplicarConfiguracion}
                    >
                        {activo ? 'DETENER' : 'ARRANCAR DEMONIO'}
                    </button>
                </div>
            </div>

            <div style={styles.body}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Frecuencia de Respaldo:</label>
                    <select
                        style={styles.select}
                        value={frecuencia}
                        onChange={manejarCambioFrecuencia}
                        disabled={activo} // No permite cambiar la frecuencia si está corriendo
                    >
                        <option value="*/1 * * * *">Modo Test (Cada 1 Minuto) - Ideal para presentación</option>
                        <option value="0 * * * *">Cada Hora en punto</option>
                        <option value="0 0 * * *">Diario (Medianoche)</option>
                        <option value="0 12 * * *">Diario (Mediodía)</option>
                        <option value="0 0 * * 0">Semanal (Domingo a la medianoche)</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    card: { backgroundColor: '#111', borderRadius: '10px', border: '1px solid #333', marginBottom: '20px', padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '15px', marginBottom: '15px' },
    title: { margin: 0, color: '#f5f5f5', fontSize: '18px' },
    subtitle: { margin: '5px 0 0 0', color: '#888', fontSize: '13px' },
    toggleBtn: { padding: '8px 16px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontSize: '12px' },
    body: { display: 'flex', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
    label: { color: '#aaa', fontSize: '12px', textTransform: 'uppercase' },
    select: { padding: '10px', backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#f5f5f5', borderRadius: '6px', fontSize: '14px', outline: 'none' }
};

export default CronPanel;