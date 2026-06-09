import React, { useState, useEffect } from 'react';

interface Props {
    enEjecucion: boolean;
    logs: string[];
    totalTablasObjetivo: number;
}

const LiveProgress: React.FC<Props> = ({ enEjecucion, logs, totalTablasObjetivo }) => {
    const [segundos, setSegundos] = useState(0);
    const [tablasProcesadas, setTablasProcesadas] = useState(0);

    // 1. Analizador de Logs en Tiempo Real
    useEffect(() => {
        let conteo = 0;
        logs.forEach(log => {
            const texto = log.toLowerCase();
            // pg_dump avisa cada vez que extrae una tabla con estas palabras clave (inglés o español)
            if (texto.includes('dumping contents of table') || texto.includes('copiando los datos de la tabla')) {
                conteo++;
            }
            // Si llegamos a la fase de cifrado, forzamos el 99%
            if (texto.includes('cifrado de grado militar')) {
                conteo = totalTablasObjetivo;
            }
        });

        // Evitamos que pase del 100% si hay sub-procesos
        setTablasProcesadas(Math.min(conteo, totalTablasObjetivo));
    }, [logs, totalTablasObjetivo]);

    // 2. Cronómetro Activo
    useEffect(() => {
        let intervalo: NodeJS.Timeout;
        if (enEjecucion) {
            intervalo = setInterval(() => setSegundos(s => s + 1), 1000);
        } else {
            setSegundos(0);
        }
        return () => clearInterval(intervalo);
    }, [enEjecucion]);

    // Si no está corriendo y no hay progreso, no mostramos nada
    if (!enEjecucion && tablasProcesadas === 0) return null;

    // 3. Cálculos de Inteligencia de Progreso
    // Evitamos división por cero asegurando un mínimo de 1% al arrancar
    const porcentajeRaw = totalTablasObjetivo === 0 ? 0 : (tablasProcesadas / totalTablasObjetivo) * 100;
    const porcentaje = enEjecucion ? Math.max(1, Math.round(porcentajeRaw)) : 100;

    // Calcular el Tiempo Estimado Restante (ETA)
    let eta = 'Calculando...';
    if (tablasProcesadas > 0 && tablasProcesadas < totalTablasObjetivo) {
        const velocidadPorTabla = segundos / tablasProcesadas;
        const tablasRestantes = totalTablasObjetivo - tablasProcesadas;
        const segundosRestantes = Math.round(velocidadPorTabla * tablasRestantes);
        eta = `~ ${segundosRestantes} seg restantes`;
    } else if (tablasProcesadas === totalTablasObjetivo && enEjecucion) {
        eta = 'Cifrando bloque AES-256...';
    } else if (!enEjecucion) {
        eta = 'Operación Finalizada';
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.title}>
                    {enEjecucion ? '⚡ Transmisión de Datos en Curso' : '✅ Transmisión Completada'}
                </span>
                <span style={styles.eta}>{eta}</span>
            </div>

            {/* Contenedor de la Barra */}
            <div style={styles.track}>
                <div style={{ ...styles.fill, width: `${porcentaje}%` }}>
                    {porcentaje > 5 && <span style={styles.percentageText}>{porcentaje}%</span>}
                </div>
            </div>

            <div style={styles.footer}>
                <span style={styles.detail}>Tablas procesadas: {tablasProcesadas} / {totalTablasObjetivo}</span>
                <span style={styles.detail}>Tiempo transcurrido: {segundos}s</span>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { backgroundColor: '#111', padding: '20px', borderRadius: '8px', border: '1px solid #333', marginBottom: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    title: { color: '#deff9a', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
    eta: { color: '#888', fontSize: '13px', fontFamily: 'monospace' },
    track: { width: '100%', height: '24px', backgroundColor: '#1f1f1f', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid #222' },
    fill: { height: '100%', backgroundColor: '#deff9a', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '10px' },
    percentageText: { color: '#000', fontWeight: 'bold', fontSize: '12px' },
    footer: { display: 'flex', justifyContent: 'space-between', marginTop: '10px' },
    detail: { color: '#666', fontSize: '12px', fontFamily: 'monospace' }
};

export default LiveProgress;