import os
import subprocess
import logging
import glob
import sys 
from cryptography.fernet import Fernet

# ==========================================
# 1. CONFIGURACIÓN DEL ENTORNO
# ==========================================
DB_NAME = "db_universidad_restaurada" 
DB_USER = "postgres"       
DB_HOST = "localhost"
DB_PORT = "5432"

DIRECTORIO_BASE = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(DIRECTORIO_BASE, "backups")
LOG_FILE = os.path.join(DIRECTORIO_BASE, "logs", "backup_system.log")
KEY_FILE = os.path.join(DIRECTORIO_BASE, "secret.key")

DB_PASSWORD = "juanitosp" 

# ==========================================
# 2. FUNCIONES DE CRIPTOGRAFÍA
# ==========================================
def cargar_clave():
    if not os.path.exists(KEY_FILE):
        print("[-] Error Fatal: Clave de cifrado no encontrada.")
        sys.exit(1) # Detiene el script con error
    with open(KEY_FILE, "rb") as archivo_clave:
        return archivo_clave.read()

def obtener_ultimo_backup_cifrado():
    archivos = glob.glob(f"{BACKUP_DIR}/*.enc")
    if not archivos:
        return None
    return max(archivos, key=os.path.getctime)

# ==========================================
# 3. MOTOR DE RECUPERACIÓN
# ==========================================
def realizar_restauracion():
    archivo_cifrado = obtener_ultimo_backup_cifrado()
    
    if not archivo_cifrado:
        print("[-] Error: No hay backups cifrados disponibles en la bóveda.")
        sys.exit(1)

    print(f"[*] Iniciando descifrado del archivo: {archivo_cifrado}")
    
    clave = cargar_clave()
    f = Fernet(clave)
    
    with open(archivo_cifrado, "rb") as file:
        datos_cifrados = file.read()
        
    datos_descifrados = f.decrypt(datos_cifrados)
    
    archivo_temporal = archivo_cifrado.replace(".enc", "")
    with open(archivo_temporal, "wb") as file:
        file.write(datos_descifrados)

    print(f"[*] Archivo descifrado con éxito. Inyectando en '{DB_NAME}'...")

    comando = [
        "pg_restore", "-U", DB_USER, "-h", DB_HOST, "-p", DB_PORT,
        "-d", DB_NAME, "-1", "-c", "--if-exists", archivo_temporal
    ]

    try:
        entorno = os.environ.copy()
        entorno["PGPASSWORD"] = DB_PASSWORD
        entorno["PYTHONIOENCODING"] = "utf-8"

        subprocess.run(comando, env=entorno, check=True, capture_output=True, text=True)
        print(f"[+] Éxito: Base de datos '{DB_NAME}' restaurada a su estado original.")
        
    except subprocess.CalledProcessError as e:
        print(f"[-] Error Crítico al restaurar: {e.stderr.strip()}")
        sys.exit(1)
        
    finally:
        if os.path.exists(archivo_temporal):
            os.remove(archivo_temporal)
            print("[*] Archivo temporal en claro destruido por seguridad.")

if __name__ == "__main__":
    realizar_restauracion()