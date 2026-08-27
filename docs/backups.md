# Backups y recuperación

Compose habilita binary logs MariaDB en formato ROW, `server-id=1` y retención de siete días. Esto habilita la base técnica para PITR, pero el repositorio no programa ni exporta backups: el operador debe configurar esa automatización fuera del stack.

Por eso los objetivos RPO/RTO son metas operativas, no garantías verificadas. No publicar hasta ejecutar al menos una restauración completa en un entorno aislado.

## Dump consistente

Ejecutar desde el host con variables protegidas y un directorio fuera del repositorio:

```bash
docker compose --env-file .env.docker exec -T db mariadb-dump \
  -u onlyfood -p"$DB_PASSWORD" \
  --single-transaction --quick --routines --triggers \
  onlyfood | gzip > /backups/onlyfood_$(date +%Y%m%d_%H%M%S).sql.gz
```

No pasar contraseñas por una terminal con historial compartido; en operación real usar un archivo de credenciales o secret manager.

## Restauración

Sobre una base vacía y aislada:

```bash
gunzip -c /backups/onlyfood_FECHA.sql.gz | \
  docker compose --env-file .env.docker exec -T db mariadb -u onlyfood -p"$DB_PASSWORD" onlyfood
```

Luego iniciar la versión de aplicación compatible, ejecutar `prisma migrate deploy` y hacer smoke tests. No restaurar encima de una base en servicio.

## PITR

Para recuperar a un instante:

1. restaurar el último dump;
2. copiar fuera del contenedor los binlogs posteriores al dump;
3. inspeccionar posición/fecha con `mariadb-binlog`;
4. reproducir hasta `--stop-datetime` o `--stop-position`;
5. validar integridad antes de habilitar tráfico.

La disponibilidad de `mariadb-binlog` dentro de la imagen y el procedimiento extremo a extremo deben probarse en la versión exacta desplegada. Si la herramienta no está en el contenedor, usar un contenedor cliente MariaDB de la misma versión.

## Storage y secretos

- R2/S3: habilitar versionado, lifecycle y una copia off-site acorde a retención legal.
- Storage local: respaldar `public/uploads`; no es la opción recomendada en producción.
- Respaldar la clave de cifrado en el gestor de secretos. Sin ella, las integraciones cifradas del dump no se pueden recuperar.

## Checklist mensual

- verificar que el backup automático existe y tiene tamaño razonable;
- comprobar checksum y descifrado;
- restaurar dump + binlogs en staging;
- abrir un tenant, un pedido y una integración cifrada;
- medir RPO/RTO reales y registrar el resultado.
