# Estrategia de Backups y Recuperación de Desastres (NanoLabs OnlyFood SaaS)

## 1. Métricas Objetivas

* **RPO (Recovery Point Objective):** <= 1 Hora. (Pérdida máxima tolerable de datos).
* **RTO (Recovery Time Objective):** <= 15 Minutos. (Tiempo máximo para restaurar el servicio en caso de fallo crítico).

---

## 2. Estrategia por Componente

### 2.1 Base de Datos Lógica (MariaDB)
1. **Backups Diarios Completos + Snapshots Cada 6 Horas:**
   * Generados mediante `mariadb-dump` / `mysqldump` con flags `--single-transaction --quick --routines --triggers`.
   * Comprimidos mediante `gzip` y encriptados en tránsito hacia almacenamiento secundario.
2. **Procedimiento de Backup Automatizado:**
   ```bash
   docker exec -t beatsburgers-db-1 mariadb-dump -u beatsburgers -p"${DB_PASSWORD}" beatsburgers | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
   ```
3. **Procedimiento de Restauración Probado:**
   ```bash
   gunzip < backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i beatsburgers-db-1 mariadb -u beatsburgers -p"${DB_PASSWORD}" beatsburgers
   ```

### 2.2 Almacenamiento de Archivos e Imágenes (Cloudflare R2 / S3)
* Object Storage con versionado habilitado (`Object Versioning`).
* Los archivos se conservan bajo `tenants/{tenantId}/...` con redundancia geográfica automática provista por Cloudflare R2 / S3.
* Eliminaciones accidentales recuperables mediante versiones previas.

### 2.3 Secretos y Configuración de Tenants
* Credenciales de Mercado Pago, WhatsApp Meta y PrintNode se encuentran cifradas con AES-256-GCM en la base de datos (`TenantIntegration`), por lo que quedan automáticamente respaldadas y protegidas en los dumps de la BD.
* La clave maestra (`AUTH_SALT` / `ENCRYPTION_MASTER_KEY`) se preserva en variables de entorno seguras.
