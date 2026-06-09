export interface BackupResponse {
    exito: boolean;
    mensaje: string;
}

export interface MetricaTabla {
    tabla: string;
    registros: number;
}
export interface ArchivoBackup {
    nombre: string;
    pesoMB: string;
    fechaMs: number;
}

export interface RegistroHistorico {
    fecha: string;
    peso: number;   // MB
    tiempo: number; // Segundos
}