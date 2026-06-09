import React, { useEffect, useRef } from 'react';

interface Props {
    logs: string[];
}

const TerminalVirtual: React.FC<Props> = ({ logs }) => {
    const terminalFinRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalFinRef.current) {
            terminalFinRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs]);

    return (
        <div style={styles.terminal}>
            <div style={styles.terminalHeader}>
                <span>🔴 🟡 🟢</span>
                <span style={{ marginLeft: '15px', color: '#aaa', fontSize: '14px' }}>Conexión SSH Virtual - pg_dump en vivo</span>
            </div>
            <div style={styles.terminalBody}>
                {logs.length === 0 && <span style={{ color: '#555' }}>Esperando inicialización del motor Python...</span>}

                {logs.map((log, index) => (
                    <div key={index} style={styles.logLine}>{log}</div>
                ))}
                <div ref={terminalFinRef} />
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    terminal: {
        width: '100%',
        backgroundColor: '#050505',
        borderRadius: '10px',
        border: '1px solid #333',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        overflow: 'hidden'
    },
    terminalHeader: { backgroundColor: '#1a1a1a', padding: '10px 15px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center' },
    terminalBody: { padding: '20px', height: '350px', overflowY: 'auto', fontFamily: 'monospace', color: '#22c55e', fontSize: '14px', lineHeight: '1.5' },
    logLine: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' }
};

export default TerminalVirtual;