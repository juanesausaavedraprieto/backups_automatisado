import React, { useState } from 'react';

interface AuthProps {
    onLoginSuccess: (token: string, usuario: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // tipo: 'error' | 'success' | 'warning'
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);
        setMensaje({ texto: '', tipo: '' });

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

        try {
            const response = await fetch(`http://localhost:4000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Manejo de estados de acceso corporativo
                if (data.status_error === 'PENDIENTE' || data.status_error === 'RECHAZADO') {
                    setMensaje({ texto: data.error, tipo: 'warning' });
                } else {
                    setMensaje({ texto: data.error || 'Error en la autenticación', tipo: 'error' });
                }
            } else {
                if (isLogin) {
                    onLoginSuccess(data.token, data.usuario);
                } else {
                    setMensaje({ texto: data.mensaje, tipo: 'success' });
                    setIsLogin(true); // Cambiamos a la vista de login tras registrar
                    setPassword(''); // Limpiamos contraseña por seguridad
                }
            }
        } catch (error) {
            setMensaje({ texto: 'Error de conexión con el servidor de identidades.', tipo: 'error' });
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.brand}>
                    <div style={styles.icon}>⚡</div>
                    <h2 style={styles.title}>Console TI</h2>
                    <p style={styles.subtitle}>Centro de Comando ITIL v4</p>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {mensaje.texto && (
                        <div style={{
                            ...styles.alert,
                            backgroundColor: mensaje.tipo === 'error' ? 'rgba(239,68,68,0.1)' : mensaje.tipo === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(234,179,8,0.1)',
                            borderColor: mensaje.tipo === 'error' ? '#ef4444' : mensaje.tipo === 'success' ? '#4ade80' : '#eab308',
                            color: mensaje.tipo === 'error' ? '#fca5a5' : mensaje.tipo === 'success' ? '#86efac' : '#fde047'
                        }}>
                            {mensaje.texto}
                        </div>
                    )}

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Correo Corporativo</label>
                        <input type="email" required style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Clave de Acceso</label>
                        <input type="password" required style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>

                    <button type="submit" disabled={cargando} style={styles.button}>
                        {cargando ? 'Procesando...' : (isLogin ? 'INICIAR SESIÓN' : 'SOLICITAR ACCESO')}
                    </button>
                </form>

                <div style={styles.footer}>
                    <button type="button" onClick={() => { setIsLogin(!isLogin); setMensaje({ texto: '', tipo: '' }); }} style={styles.linkButton}>
                        {isLogin ? '¿No tienes cuenta? Solicita acceso al Administrador' : '¿Ya tienes acceso? Inicia sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#090909', fontFamily: 'system-ui, sans-serif' },
    card: { width: '100%', maxWidth: '400px', backgroundColor: '#111', padding: '40px', borderRadius: '12px', border: '1px solid #222', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
    brand: { textAlign: 'center', marginBottom: '30px' },
    icon: { fontSize: '32px', backgroundColor: '#1a1a1a', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #333', margin: '0 auto 15px auto' },
    title: { margin: 0, color: '#f5f5f5', fontSize: '24px' },
    subtitle: { margin: '5px 0 0 0', color: '#888', fontSize: '14px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    alert: { padding: '12px', borderRadius: '6px', fontSize: '13px', borderLeft: '4px solid', textAlign: 'center' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { color: '#aaa', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    input: { padding: '12px', backgroundColor: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '6px', fontSize: '15px', outline: 'none' },
    button: { padding: '14px', backgroundColor: '#deff9a', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: '0.2s' },
    footer: { marginTop: '20px', textAlign: 'center', borderTop: '1px solid #222', paddingTop: '20px' },
    linkButton: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }
};

export default Auth;