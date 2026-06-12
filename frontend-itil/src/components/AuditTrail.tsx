import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // ==========================================
    // MOTOR DE EXPORTACIÓN PDF (COMPLIANCE)
    // ==========================================
    const exportarPDF = () => {
        // 'l' = landscape (horizontal) ideal para tablas con mucho texto
        const doc = new jsPDF('l', 'mm', 'a4');

        // Cabecera del Documento
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('Reporte Oficial de Auditoría de Infraestructura', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Sistema: Console TI - ITIL v4 Compliant`, 14, 30);
        doc.text(`Fecha de Generación: ${new Date().toLocaleString()}`, 14, 35);
        doc.text(`Registros extraídos: ${logs.length}`, 14, 40);

        // Mapeo de datos para la tabla
        const tableColumn = ["Estampa de Tiempo", "Operador", "Evento", "Descripción Operativa", "Origen IP", "Estado"];
        const tableRows = logs.map(log => [
            new Date(log.fecha).toLocaleString(),
            log.usuario_email,
            log.evento,
            log.descripcion,
            log.ip_cliente,
            log.estado
        ]);

        // Generación de la tabla con estilos corporativos
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 48,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [30, 30, 30], textColor: [222, 255, 154], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 35 }, // Fecha
                1: { cellWidth: 45 }, // Operador
                2: { cellWidth: 30 }, // Evento
                3: { cellWidth: 'auto' }, // Descripción (Se adapta al espacio sobrante)
                4: { cellWidth: 30 }, // IP
                5: { cellWidth: 20 }  // Estado
            }
        });

        // Pie de página (Paginación)
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${i} de ${pageCount} - Documento de Uso Interno Restringido`, 14, 200);
        }

        // Descarga del archivo
        doc.save(`Auditoria_ITIL_${new Date().getTime()}.pdf`);
    };

    return (
        <div style={styles.card}>
            <div style={styles.headerGroup}>
                <div>
                    <h3 style={styles.title}>📜 Libro de Registro de Auditoría Inmutable</h3>
                    <p style={styles.subtitle}>Historial detallado e inalterable de operaciones sobre el clúster de infraestructura</p>
                </div>

                {/* NUEVO BOTÓN DE EXPORTACIÓN */}
                <button onClick={exportarPDF} style={styles.btnExport}>
                    📄 EXPORTAR REPORTE (PDF)
                </button>
            </div>

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
    card: { backgroundColor: '#111', padding: '25px', borderRadius: '10px', border: '1px solid #333', width: '100%', boxSizing: 'border-box' },
    headerGroup: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
    title: { margin: 0, color: '#f5f5f5', fontSize: '18px', fontWeight: 'bold' },
    subtitle: { margin: '5px 0 0 0', color: '#666', fontSize: '13px' },

    // Estilo del botón de exportación
    btnExport: { backgroundColor: '#deff9a', color: '#000', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: '0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },

    tableWrapper: { overflowX: 'auto', width: '100%' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' },
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