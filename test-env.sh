#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}====================================================${NC}"
echo -e "${YELLOW}  Iniciando Verificación del Entorno Docker Compose  ${NC}"
echo -e "${YELLOW}====================================================${NC}"

# 1. Validar sintaxis de docker-compose.yml
echo -n "1. Validando configuración de docker-compose... "
docker compose config > /dev/null
echo -e "${GREEN}[OK]${NC}"

# 2. Levantar los contenedores
echo "2. Construyendo y levantando servicios con docker compose up -d --build..."
docker compose up -d --build

# 3. Esperar a que los servicios estén listos
echo "3. Esperando que los contenedores completen el arranque..."
sleep 5

# 4. Verificar estado de contenedores
echo "4. Verificando estado de los 5 contenedores:"
SERVICES=("saas_backend" "saas_frontend" "saas_webserver" "saas_database" "saas_cache")
for s in "${SERVICES[@]}"; do
    STATUS=$(docker inspect -f '{{.State.Running}}' "$s" 2>/dev/null || echo "false")
    if [ "$STATUS" = "true" ]; then
        echo -e "   - Contenedor $s: ${GREEN}RUNNING${NC}"
    else
        echo -e "   - Contenedor $s: ${RED}ERROR / NO RUNNING${NC}"
        exit 1
    fi
done

# 5. Probar Backend PHP 8.3 y extensiones requeridas
echo "5. Verificando extensiones de PHP 8.3 en Backend:"
PHP_MODULES=$(docker compose exec -T backend php -m)
EXTENSIONS=("pdo_pgsql" "redis" "gd" "bcmath" "Zend OPcache")
for ext in "${EXTENSIONS[@]}"; do
    if echo "$PHP_MODULES" | grep -iq "$ext"; then
        echo -e "   - Extensión $ext: ${GREEN}[INSTALADA]${NC}"
    else
        echo -e "   - Extensión $ext: ${RED}[FALTANTE]${NC}"
        exit 1
    fi
done

# 6. Probar conexión a PostgreSQL
echo -n "6. Probando conexión a PostgreSQL (database:5432)... "
if docker compose exec -T database pg_isready -U saas_user -d saas_db > /dev/null 2>&1; then
    echo -e "${GREEN}[OK - Listo y respondiendo]${NC}"
else
    echo -e "${RED}[FALLO]${NC}"
    exit 1
fi

# 7. Probar conexión a Redis
echo -n "7. Probando ping a Redis (cache:6379)... "
REDIS_PING=$(docker compose exec -T cache redis-cli ping 2>/dev/null || echo "FAIL")
if [[ "$REDIS_PING" =~ "PONG" ]]; then
    echo -e "${GREEN}[OK - PONG recibido]${NC}"
else
    echo -e "${RED}[FALLO - $REDIS_PING]${NC}"
    exit 1
fi

# 8. Probar respuesta directa de Frontend en puerto 3000
echo -n "8. Probando respuesta HTTP Frontend (Node 22 / :3000)... "
FRONT_RESP=$(curl -s http://localhost:3000 || echo "FAIL")
if [[ "$FRONT_RESP" =~ "frontend" ]]; then
    echo -e "${GREEN}[OK - Frontend respondiendo]${NC}"
else
    echo -e "${RED}[FALLO - Respuesta: $FRONT_RESP]${NC}"
    exit 1
fi

# 9. Probar Webserver Caddy en puerto 80
echo -n "9. Probando Webserver Caddy (:80/health)... "
HEALTH_RESP=$(curl -s http://localhost:80/health || echo "FAIL")
if [ "$HEALTH_RESP" = "OK" ]; then
    echo -e "${GREEN}[OK - Healthcheck 200 OK]${NC}"
else
    echo -e "${RED}[FALLO - Respuesta: $HEALTH_RESP]${NC}"
    exit 1
fi

# 10. Probar Webserver Caddy reverse proxy hacia Backend API
echo -n "10. Probando proxy Caddy -> Backend FastCGI (:80/api/index.php)... "
API_RESP=$(curl -s http://localhost:80/api/index.php || echo "FAIL")
if [[ "$API_RESP" =~ "Laravel 11 Backend" ]]; then
    echo -e "${GREEN}[OK - PHP FastCGI funcionando]${NC}"
else
    echo -e "${RED}[FALLO - Respuesta: $API_RESP]${NC}"
    exit 1
fi

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}  ✓ TODOS LOS SERVICIOS VERIFICADOS Y FUNCIONANDO   ${NC}"
echo -e "${GREEN}====================================================${NC}"
