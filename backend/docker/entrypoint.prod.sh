#!/bin/bash
set -e

echo "=== Arrancando TurnosFlow Backend en Railway ==="

# Asegurar directorios de cache y storage con permisos
mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache
chmod -R 775 storage bootstrap/cache

# Optimización y migraciones
if [ "$APP_ENV" = "production" ] || [ "$APP_ENV" = "prod" ]; then
    echo "Optimizando Laravel para producción..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

# Ejecutar migraciones automáticas si DB está configurada
if [ -n "$DB_HOST" ]; then
    echo "Ejecutando migraciones de base de datos..."
    php artisan migrate --force || echo "Aviso: Error temporal al ejecutar migraciones"
fi

# Iniciar PHP-FPM en segundo plano
echo "Iniciando PHP-FPM..."
php-fpm -D

# Iniciar Caddy como servidor web principal en primer plano
echo "Iniciando Caddy Server en puerto ${PORT:-80}..."
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
