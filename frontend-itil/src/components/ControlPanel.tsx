import React from 'react';

interface Props {
    enEjecucion: boolean;
    onIniciar: () => void;
}

const ControlPanel: React.FC<Props> = ({ enEjecucion, onIniciar }) => {
    return (
        <div style={styles.container}>
            <button
                style={{
                    ...styles.button,
                    backgroundColor: enEjecucion ? '#333' : '#deff9a',
                    color: enEjecucion ? '#888' : '#000',
                    cursor: enEjecucion ? 'not-allowed' : 'pointer'
                }}
                onClick={onIniciar}
                disabled={enEjecucion}
            >
                {enEjecucion ? '🔄 PROCESANDO RESPALDO...' : '▶ FORZAR EJECUCIÓN MANUAL'}
            </button>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' },
    button: { padding: '12px 24px', fontSize: '14px', fontWeight: 'bold', border: 'none', borderRadius: '6px', transition: '0.3s' }
};

export default ControlPanel;