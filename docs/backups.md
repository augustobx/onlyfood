# Backups y recuperación

Compose habilita binary logs MariaDB en formato ROW, `server-id=1` y retención de siete días. `scripts/backup-production.sh` genera dumps consistentes y la unidad en `docker/systemd` programa la base cada seis horas.

Por eso los objetivos RPO/RTO son metas operativas, no garantías verificadas. No publicar hasta ejecutar al menos una restauración completa en un entorno aislado.

## Backup automatizado

Los backups se guardan en `/opt/backups/onlyfood`, usan bloqueo contra solapamientos, archivo temporal, compresión, verificación y checksum. La retención local predeterminada es de 14 días.

```bash
bash /opt/apps/onlyfood/scripts/backup-production.sh db
```

Las credenciales se leen dentro del contenedor de MariaDB y no se pasan como argumentos del host.

## Restauración

La restauración productiva se realiza sobre la base definitiva sólo después de comprobar archivo, checksum, versión de MariaDB, destino y estado de `_prisma_migrations`. El stack debe permanecer sin tráfico durante la restauración.

```bash
sha256sum -c /opt/backups/onlyfood/db/onlyfood-db-FECHA.sql.gz.sha256
gzip -t /opt/backups/onlyfood/db/onlyfood-db-FECHA.sql.gz
```

El comando de importación se define al recuperar NOVA según el formato y la versión real del dump. Después se revisan y ejecutan únicamente las migraciones pendientes mediante el perfil manual `migration`. Nunca se ejecutan seeds.

## PITR

Para recuperar a un instante:

1. restaurar el último dump;
2. copiar fuera del contenedor los binlogs posteriores al dump;
3. inspeccionar posición/fecha con `mariadb-binlog`;
4. reproducir hasta `--stop-datetime` o `--stop-position`;
5. validar integridad antes de habilitar tráfico.

La disponibilidad de `mariadb-binlog` dentro de la imagen y el procedimiento extremo a extremo deben probarse en la versión exacta desplegada. Si la herramienta no está en el contenedor, usar un contenedor cliente MariaDB de la misma versión.

## Storage y secretos

- Cloudflare R2 contiene los objetos productivos; no se duplican en el backup local del servidor. Su protección y retención se gestionan en Cloudflare.
- Los archivos de `public/uploads` versionados en Git forman parte de la imagen de aplicación, no de la persistencia mutable del servidor.
- Si al recuperar NOVA aparece una persistencia local no versionada, debe identificarse y copiarse explícitamente antes del corte.
- Respaldar la clave de cifrado en el gestor de secretos. Sin ella, las integraciones cifradas del dump no se pueden recuperar.

## Checklist mensual

- verificar que el backup automático existe y tiene tamaño razonable;
- comprobar checksum y descifrado;
- restaurar dump + binlogs en staging;
- abrir un tenant, un pedido y una integración cifrada;
- medir RPO/RTO reales y registrar el resultado.
