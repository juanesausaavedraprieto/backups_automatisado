import React, { useState, useEffect } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    palabraClave: string;
}

const SecurityModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, palabraClave }) => {
    const [input, setInput] = useState('');

    // Limpiar el input cada vez que se abre o cierra
    useEffect(() => {
        if (!isOpen) setInput('');
    }, [isOpen]);

    if (!isOpen) return null;

    const esValido = input === palabraClave;

    const manejarConfirmacion = () => {
        if (esValido) {
            onConfirm();
            onClose();
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <div style={styles.warningIcon}>⚠️</div>
                    <h3 style={styles.title}>Acción Estrictamente Restringida</h3>
                </div>

                <div style={styles.body}>
                    <p style={styles.text}>
                        Estás a punto de iniciar el <strong>Protocolo de Recuperación Crítica</strong>.
                        Esta acción sobrescribirá la base de datos de rescate con el último bloque cifrado disponible en la bóveda.
                    </p>

                    <div style={styles.alertBox}>
                        Para confirmar esta operación, escribe <strong>{palabraClave}</strong> a continuación:
                    </div>

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={palabraClave}
                        style={styles.input}
                        autoComplete="off"
                    />
                </div>

                <div style={styles.footer}>
                    <button onClick={onClose} style={styles.btnCancel}>CANCELAR</button>
                    <button
                        onClick={manejarConfirmacion}
                        disabled={!esValido}
                        style={{ ...styles.btnConfirm, opacity: esValido ? 1 : 0.5, cursor: esValido ? 'pointer' : 'not-allowed' }}
                    >
                        EJECUTAR RESTAURACIÓN
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modal: { width: '100%', maxWidth: '450px', backgroundColor: '#0f0f0f', borderRadius: '8px', border: '1px solid #3f3f46', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' },
    header: { padding: '20px', borderBottom: '1px solid #1f1f1f', display: 'flex', alignItems: 'center', gap: '10px' },
    warningIcon: { fontSize: '24px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' },
    title: { margin: 0, color: '#f5f5f5', fontSize: '18px', fontWeight: 'bold' },
    body: { padding: '20px' },
    text: { color: '#a1a1aa', fontSize: '14px', lineHeight: '1.5', margin: '0 0 15px 0' },
    alertBox: { backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', color: '#fca5a5', borderRadius: '4px', fontSize: '13px', marginBottom: '15px' },
    input: { width: '100%', padding: '12px', backgroundColor: '#000', border: '1px solid #3f3f46', color: '#fff', borderRadius: '4px', fontSize: '14px', outline: 'none', fontFamily: 'monospace', textAlign: 'center', letterSpacing: '2px', boxSizing: 'border-box' },
    footer: { padding: '15px 20px', backgroundColor: '#18181b', borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    btnCancel: { padding: '10px 15px', backgroundColor: 'transparent', color: '#a1a1aa', border: '1px solid #3f3f46', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: '0.2s' },
    btnConfirm: { padding: '10px 15px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', transition: '0.2s' }
};

export default SecurityModal;