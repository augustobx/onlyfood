# Despliegue y Puesta en Producción

## 1. Requisitos Previos

* Docker Engine 24+ con Docker Compose v2.
* Registro DNS wildcard: `*.producto.nanolabs.app` apuntando a la IP pública del servidor.
* Certificados TLS automáticos gestionados por el contenedor Caddy Proxy.

---

## 2. Pasos de Despliegue

1. **Configurar Variables de Entorno:**
   ```bash
   cp .env.docker.example .env.docker
   # Completar DB_PASSWORD, ADMIN_PASSWORD, AUTH_SALT, ENCRYPTION_MASTER_KEY
   ```

2. **Compilar e Iniciar Servicios:**
   ```bash
   docker compose --env-file .env.docker up -d --build
   ```

3. **Verificar Estado y Healthchecks:**
   ```bash
   docker compose ps
   # Los servicios db, app y proxy deben reportar estado (healthy)
   ```

4. **Verificar Logs:**
   ```bash
   docker compose logs -f app
   ```
