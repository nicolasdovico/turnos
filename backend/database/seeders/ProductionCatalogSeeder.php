<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class ProductionCatalogSeeder extends Seeder
{
    /**
     * Inicializa únicamente el catálogo de producción:
     * - Tipos de negocio (Club, Complejo, Gimnasio)
     * - Módulos del SaaS (Turnos, Web CMS, POS, etc.)
     * - Planes de suscripción (Bronce, Plata, Oro)
     * - Deportes y especificaciones (Pádel, Tenis, Fútbol, superficies, paredes, etc.)
     * 
     * NO crea complejos demo, ni turnos, ni clientes ficticios.
     */
    public function run(): void
    {
        $this->call([
            TipoNegocioSeeder::class,
            ModuloSeeder::class,
            PlanSeeder::class,
            DeportesYEquipamientosSeeder::class,
        ]);
    }
}
