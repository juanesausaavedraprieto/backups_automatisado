import os
import subprocess
import logging
import time
import sys # <-- NUEVA LIBRERÍA PARA LEER ARGUMENTOS
from datetime import datetime
from cryptography.fernet import Fernet

# ==========================================
# 1. CONFIGURACIÓN DEL ENTORNO
# ==========================================
DB_NAME = "db_universidad_test"
DB_USER = "postgres"       
DB_HOST = "localhost"
DB_PORT = "5432"

DIRECTORIO_BASE = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(DIRECTORIO_BASE, "backups")
LOG_FILE = os.path.join(DIRECTORIO_BASE, "logs", "backup_system.log")
KEY_FILE = os.path.join(DIRECTORIO_BASE, "secret.key")

DB_PASSWORD = "juanitosp" # Recuerda colocar tu contraseña real

# ==========================================
# 2. FUNCIONES DE CRIPTOGRAFÍA
# ==========================================
def generar_clave_si_no_existe():
    if not os.path.exists(KEY_FILE):
        clave = Fernet.generate_key()
        with open(KEY_FILE, "wb") as archivo_clave:
            archivo_clave.write(clave)
        print(f"[*] Nueva clave de cifrado generada en: {KEY_FILE}")

def cargar_clave():
    with open(KEY_FILE, "rb") as archivo_clave:
        return archivo_clave.read()

# ==========================================
# 3. GESTIÓN DE CAPACIDAD (RETENCIÓN)
# ==========================================
def limpiar_backups_antiguos(dias_retencion=7):
    print(f"\n[*] Iniciando Política de Retención: Limpiando backups mayores a {dias_retencion} días...")
    tiempo_actual = time.time()
    limite_tiempo = tiempo_actual - (dias_retencion * 86400) 
    archivos_eliminados = 0

    for archivo in os.listdir(BACKUP_DIR):
        if archivo.endswith(".enc"):
            ruta_completa = os.path.join(BACKUP_DIR, archivo)
            tiempo_archivo = os.path.getctime(ruta_completa)

            if tiempo_archivo < limite_tiempo:
                os.remove(ruta_completa)
                print(f"[-] Archivo destruido por antigüedad: {archivo}")
                archivos_eliminados += 1

    if archivos_eliminados == 0:
        print("[*] Capacidad Óptima: No hay archivos antiguos para eliminar hoy.")
    else:
        print(f"[+] Espacio liberado: {archivos_eliminados} archivo(s) antiguo(s) eliminado(s).")

# ==========================================
# 4. MOTOR PRINCIPAL CON SOPORTE GRANULAR
# ==========================================
def realizar_backup():
    # Leemos si Node.js nos envió tablas específicas
    # sys.argv[0] es el nombre del script, los argumentos reales empiezan en sys.argv[1]
    tablas_seleccionadas = sys.argv[1:] 
    
    fecha_actual = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Cambiamos el nombre del archivo si es un backup parcial
    if tablas_seleccionadas:
        backup_filename = f"backup_{DB_NAME}_parcial_{fecha_actual}.backup"
    else:
        backup_filename = f"backup_{DB_NAME}_completo_{fecha_actual}.backup"
        
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    # Construimos el comando dinámicamente
    comando = [
        "pg_dump", "-U", DB_USER, "-h", DB_HOST, "-p", DB_PORT,
        "-F", "c", "-v"
    ]
    
    print(f"[*] Iniciando extracción de '{DB_NAME}'...")

    if tablas_seleccionadas:
        print(f"[*] MODO GRANULAR: Se extraerán únicamente las tablas: {', '.join(tablas_seleccionadas)}")
        for tabla in tablas_seleccionadas:
            comando.extend(["-t", tabla])
    else:
        print("[*] MODO COMPLETO: Se extraerá toda la base de datos.")

    # Al final agregamos el archivo de salida y el nombre de la BD
    comando.extend(["-f", backup_path, DB_NAME])

    try:
        entorno = os.environ.copy()
        entorno["PGPASSWORD"] = DB_PASSWORD
        entorno["PYTHONIOENCODING"] = "utf-8"

        subprocess.run(comando, env=entorno, check=True, capture_output=True, text=True)
        
        if os.path.exists(backup_path):
            peso_bytes = os.path.getsize(backup_path)
            
            if peso_bytes > 0:
                print("\n[*] Iniciando proceso de cifrado de grado militar (AES)...")
                generar_clave_si_no_existe()
                clave = cargar_clave()
                f = Fernet(clave)
                
                with open(backup_path, "rb") as file:
                    datos_originales = file.read()
                
                datos_cifrados = f.encrypt(datos_originales)
                ruta_cifrada = backup_path + ".enc"
                
                with open(ruta_cifrada, "wb") as file:
                    file.write(datos_cifrados)
                    
                os.remove(backup_path) 
                
                peso_mb = round(os.path.getsize(ruta_cifrada) / (1024 * 1024), 2)
                print(f"[+] Éxito: Backup protegido y cifrado. Tamaño: {peso_mb} MB.")
                
                limpiar_backups_antiguos(dias_retencion=7)
                
            else:
                print("[-] Alerta: El backup pesa 0 bytes.")
        else:
            print("[-] Error: No se generó el archivo.")
            
    except subprocess.CalledProcessError as e:
        print(f"[-] Error de PostgreSQL: {e.stderr.strip()}")

if __name__ == "__main__":
    realizar_backup()