#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE saas_testing'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'saas_testing')\gexec
    GRANT ALL PRIVILEGES ON DATABASE saas_testing TO $POSTGRES_USER;
EOSQL
