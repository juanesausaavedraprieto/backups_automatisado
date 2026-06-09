import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BackupResponse, MetricaTabla, ArchivoBackup, RegistroHistorico } from './types';

// Importación de Módulos Modulares
import MetricsPanel from './components/MetricsPanel';
import TerminalVirtual from './components/TerminalVirtual';
import StatsCards from './components/StatsCards';
import DataCenter from './components/DataCenter';
import AnalyticsPanel from './components/AnalyticsPanel';
import CronPanel from './components/CronPanel';
import TableSelector from './components/TableSelector';
import LiveProgress from './components/LiveProgress'; // <-- NUEVA IMPORTACIÓN

const socket: Socket = io('http://localhost:4000');

const App: React.FC = () => {
  // Control de Secciones del Layout Lateral
  const [activeTab, setActiveTab] = useState<'resumen' | 'boveda' | 'analisis' | 'backup' | 'restore'>('resumen');

  const [logs, setLogs] = useState<string[]>([]);
  const [metricas, setMetricas] = useState<MetricaTabla[]>([]);
  const [enEjecucion, setEnEjecucion] = useState<boolean>(false);
  const [archivosFisicos, setArchivosFisicos] = useState<ArchivoBackup[]>([]);

  // Métricas operativas
  const [inicioProceso, setInicioProceso] = useState<number | null>(null);
  const [tiempoUltimoProceso, setTiempoUltimoProceso] = useState<string>('--');
  const [historicoRendimiento, setHistoricoRendimiento] = useState<RegistroHistorico[]>([]);

  // Estado para el selector granular de tablas
  const [tablasSeleccionadas, setTablasSeleccionadas] = useState<string[]>([]);

  useEffect(() => {
    socket.emit('solicitar_metricas');
    socket.emit('solicitar_historial_archivos');

    socket.on('metricas_bd', (data: MetricaTabla[]) => setMetricas(data));
    socket.on('historial_archivos', (data: ArchivoBackup[]) => setArchivosFisicos(data));
    socket.on('terminal_stream', (mensaje: string) => setLogs((prevLogs) => [...prevLogs, mensaje]));

    socket.on('backup_completado', (data: BackupResponse) => {
      setEnEjecucion(false);
      setLogs((prevLogs) => [...prevLogs, `\n[SISTEMA]: ${data.mensaje}`]);

      if (inicioProceso) {
        const segundos = (Date.now() - inicioProceso) / 1000;
        setTiempoUltimoProceso(`${segundos.toFixed(2)} seg`);

        const nuevoRegistro: RegistroHistorico = {
          fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          peso: 0.1,
          tiempo: segundos
        };
        setHistoricoRendimiento((prev) => [...prev.slice(-3), nuevoRegistro]);
      }

      socket.emit('solicitar_metricas');
      socket.emit('solicitar_historial_archivos');
    });

    socket.on('actualizar_metricas', () => {
      socket.emit('solicitar_metricas');
      socket.emit('solicitar_historial_archivos');
    });

    return () => {
      socket.off('metricas_bd');
      socket.off('historial_archivos');
      socket.off('terminal_stream');
      socket.off('backup_completado');
      socket.off('actualizar_metricas');
    };
  }, [inicioProceso]);

  const iniciarBackup = (): void => {
    setEnEjecucion(true);
    setLogs([]);
    setInicioProceso(Date.now());
    socket.emit('iniciar_backup', tablasSeleccionadas);
  };

  const iniciarRestauracion = (): void => {
    if (window.confirm('⚠️ ALERTA DE INCIDENTE\n\n¿Estás seguro de restaurar?')) {
      setEnEjecucion(true);
      setLogs([]);
      setInicioProceso(Date.now());
      socket.emit('iniciar_restauracion');
    }
  };

  // CÁLCULO DE META PARA LA BARRA DE PROGRESO
  // Si no hay tablas seleccionadas, la meta es el total de la base de datos
  const totalTablasObjetivo = tablasSeleccionadas.length > 0
    ? tablasSeleccionadas.length
    : metricas.length;

  return (
    <div style={styles.layoutWrapper}>

      {/* SIDEBAR NAVBAR IZQUIERDO */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <div style={styles.brandIcon}>⚡</div>
          <div>
            <h2 style={styles.brandName}>Console TI</h2>
            <span style={styles.brandStatus}>ITIL v4 Compliant</span>
          </div>
        </div>

        <nav style={styles.sidebarNav}>
          <button style={activeTab === 'resumen' ? styles.sideLinkActive : styles.sideLink} onClick={() => setActiveTab('resumen')}>
            📊 Dashboard Resumen
          </button>
          <button style={activeTab === 'boveda' ? styles.sideLinkActive : styles.sideLink} onClick={() => setActiveTab('boveda')}>
            🗄️ Bóveda de Archivos
          </button>
          <button style={activeTab === 'analisis' ? styles.sideLinkActive : styles.sideLink} onClick={() => setActiveTab('analisis')}>
            📈 Módulo Analítico
          </button>
          <button style={activeTab === 'backup' ? styles.sideLinkActive : styles.sideLink} onClick={() => setActiveTab('backup')}>
            💾 Control de Respaldo
          </button>
          <button style={activeTab === 'restore' ? styles.sideLinkActive : styles.sideLink} onClick={() => setActiveTab('restore')}>
            🚨 Recuperación Crítica
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Operador: Admin_Sistemas</p>
        </div>
      </aside>

      {/* COMPONENTE CONTENEDOR DE PRODUCCIÓN */}
      <div style={styles.mainContentArea}>
        <header style={styles.topHeader}>
          <div style={styles.headerContent}>
            <h1 style={styles.sectionHeading}>
              {activeTab === 'resumen' && 'Bóveda General de Infraestructura'}
              {activeTab === 'boveda' && 'Centro de Datos Cifrados'}
              {activeTab === 'analisis' && 'Métricas de Disponibilidad de Servicios'}
              {activeTab === 'backup' && 'Módulo de Extracción de Activos de Información'}
              {activeTab === 'restore' && 'Plan de Continuidad y Contingencia'}
            </h1>
            <p style={styles.sectionSub}>PostgreSQL Cluster Instance Node Localhost</p>
          </div>
        </header>

        <div style={styles.viewportBody}>
          {/* PESTAÑA 1: RESUMEN DE LA BASE DE DATOS */}
          {activeTab === 'resumen' && (
            <div>
              <StatsCards totalTablas={metricas.length} tiempoUltimoProceso={tiempoUltimoProceso} />
              <MetricsPanel metricas={metricas} />
            </div>
          )}

          {/* PESTAÑA 2: BÓVEDA DE ARCHIVOS AISLADA */}
          {activeTab === 'boveda' && (
            <div>
              <DataCenter archivos={archivosFisicos} />
            </div>
          )}

          {/* PESTAÑA 3: ANALÍTICAS */}
          {activeTab === 'analisis' && (
            <AnalyticsPanel historico={historicoRendimiento} />
          )}

          {/* PESTAÑA 4: RESPALDO MANUAL Y AUTOMÁTICO (CRON) */}
          {activeTab === 'backup' && (
            <div style={styles.tabContainer}>
              <CronPanel socket={socket} />

              <TableSelector
                metricas={metricas}
                tablasSeleccionadas={tablasSeleccionadas}
                setTablasSeleccionadas={setTablasSeleccionadas}
                enEjecucion={enEjecucion}
              />

              <div style={styles.panelToolbar}>
                <h3>Orquestación de Tareas de Respaldo Manual</h3>
                <button style={{ ...styles.btnAction, backgroundColor: enEjecucion ? '#333' : '#deff9a', color: enEjecucion ? '#888' : '#000' }} onClick={iniciarBackup} disabled={enEjecucion}>
                  {enEjecucion ? '🔄 EXTRAYENDO...' : '▶ DISPARAR RESPALDO MANUAL'}
                </button>
              </div>

              {/* INTEGRACIÓN DE LA BARRA DE PROGRESO */}
              <LiveProgress
                enEjecucion={enEjecucion}
                logs={logs}
                totalTablasObjetivo={totalTablasObjetivo}
              />

              <TerminalVirtual logs={logs} />
            </div>
          )}

          {/* PESTAÑA 5: CONTINGENCIA */}
          {activeTab === 'restore' && (
            <div style={styles.tabContainer}>
              <div style={styles.panelToolbar}>
                <h3>Inyección Forzada del Core Logístico</h3>
                <button style={{ ...styles.btnAction, backgroundColor: enEjecucion ? '#333' : '#ef4444', color: enEjecucion ? '#888' : '#fff' }} onClick={iniciarRestauracion} disabled={enEjecucion}>
                  {enEjecucion ? '🔄 RESTAURANDO CORE...' : '🚨 INVOCAR RESTAURACIÓN'}
                </button>
              </div>
              <div style={styles.alertNotice}>
                <strong>ADVERTENCIA OPERATIVA:</strong> Esta acción detendrá temporalmente la escritura del servicio principal para descifrar el bloque AES-256 e inyectarlo en <code>db_universidad_restaurada</code>.
              </div>
              <TerminalVirtual logs={logs} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// ARQUITECTURA DE DISEÑO LAYOUT SIDEBAR (CSS CORREGIDO)
// ==========================================
const styles: { [key: string]: React.CSSProperties } = {
  // Ajustes de Caja Globales para evitar que se desborde o se mueva
  layoutWrapper: { display: 'flex', minHeight: '100vh', backgroundColor: '#090909', color: '#f5f5f5', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' },

  // Sidebar fijo a la izquierda
  sidebar: { width: '280px', backgroundColor: '#0f0f0f', borderRight: '1px solid #1f1f1f', display: 'flex', flexDirection: 'column', padding: '30px 20px', position: 'fixed', height: '100vh', left: 0, top: 0, boxSizing: 'border-box' },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', borderBottom: '1px solid #1f1f1f', paddingBottom: '20px' },
  brandIcon: { fontSize: '24px', backgroundColor: '#1c1c1a', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid #333' },
  brandName: { margin: 0, fontSize: '18px', fontWeight: 'bold' },
  brandStatus: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 },
  sideLink: { background: 'transparent', border: 'none', color: '#888', textAlign: 'left', padding: '14px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', transition: '0.2s', fontWeight: 500 },
  sideLinkActive: { background: '#161615', border: '1px solid #2d2d2a', color: '#deff9a', textAlign: 'left', padding: '14px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  sidebarFooter: { paddingTop: '20px', borderTop: '1px solid #1f1f1f' },

  // Contenedor Derecho (Ocupa el 100% menos los 280px del sidebar)
  mainContentArea: { marginLeft: '280px', width: 'calc(100% - 280px)', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box' },

  // Cabecera superior centrada internamente
  topHeader: { backgroundColor: '#0f0f0f', padding: '25px 0', borderBottom: '1px solid #1f1f1f', width: '100%' },
  headerContent: { maxWidth: '1100px', margin: '0 auto', padding: '0 40px', width: '100%', boxSizing: 'border-box' }, // Centrado exacto
  sectionHeading: { margin: 0, fontSize: '24px', fontWeight: 'bold' },
  sectionSub: { margin: '4px 0 0 0', color: '#555', fontSize: '13px', fontFamily: 'monospace' },

  // Cuerpo principal (Centrado y con límite de ancho para lectura óptima)
  viewportBody: { padding: '40px', maxWidth: '1100px', width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  tabContainer: { display: 'flex', flexDirection: 'column', width: '100%' }, // Asegura que los hijos no se encojan

  panelToolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '10px' },
  btnAction: { padding: '12px 24px', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
  alertNotice: { backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderLeft: '4px solid #ef4444', padding: '15px', color: '#ef4444', marginBottom: '20px', borderRadius: '4px', fontSize: '14px' }
};

export default App;