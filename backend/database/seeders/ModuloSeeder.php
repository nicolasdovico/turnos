<?php

namespace Database\Seeders;

use App\Models\Modulo;
use Illuminate\Database\Seeder;

class ModuloSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $modulos = [
            [
                'nombre' => 'Reservas y Agenda',
                'slug' => 'reservas',
                'descripcion' => 'Motor de reservas de canchas, gestión de horarios y agenda en tiempo real.',
            ],
            [
                'nombre' => 'Punto de Venta & Buffet',
                'slug' => 'pos_buffet',
                'descripcion' => 'Punto de venta (POS), control de stock de kiosco/buffet y arqueo de caja.',
            ],
            [
                'nombre' => 'Gestor de Torneos',
                'slug' => 'torneos',
                'descripcion' => 'Administración de ligas, llaves de playoffs, fixtures y tablas de posiciones.',
            ],
            [
                'nombre' => 'CMS Web & Landing Page',
                'slug' => 'cms_web',
                'descripcion' => 'Sitio web dinámico y personalizable para el complejo con optimización SEO.',
            ],
            [
                'nombre' => 'Domótica IoT & Luces',
                'slug' => 'domotica',
                'descripcion' => 'Control automatizado de iluminación y dispositivos IoT sincronizados con reservas.',
            ],
            [
                'nombre' => 'Partidos Abiertos & Split Payment',
                'slug' => 'split_payment',
                'descripcion' => 'Matchmaking de jugadores incompletos y cobro fraccionado por participante.',
            ],
            [
                'nombre' => 'Turnos Recurrentes / Fijos',
                'slug' => 'turnos_fijos',
                'descripcion' => 'Gestión y facturación automática de turnos semanales fijos.',
            ],
        ];

        foreach ($modulos as $modulo) {
            Modulo::updateOrCreate(
                ['slug' => $modulo['slug']],
                $modulo
            );
        }
    }
}
