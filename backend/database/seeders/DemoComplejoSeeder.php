<?php

namespace Database\Seeders;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Plan;
use Illuminate\Database\Seeder;

class DemoComplejoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plan = Plan::where('slug', 'pro')->orWhere('slug', 'enterprise')->first();
        if (!$plan) {
            $plan = Plan::first();
        }

        $complejo = Complejo::updateOrCreate(
            ['subdominio' => 'padelpro'],
            [
                'uuid' => '11111111-1111-1111-1111-111111111111',
                'nombre' => 'Padel Pro Arena',
                'plan_id' => $plan?->id,
                'estado' => 'activo',
                'latitud' => -34.5800,
                'longitud' => -58.4000,
                'direccion' => 'Av. Libertador 1234',
                'ciudad' => 'Buenos Aires',
                'telefono' => '+54 11 5555-4321',
            ]
        );

        $cancha = Cancha::updateOrCreate(
            ['id' => 1],
            [
                'complejo_id' => $complejo->id,
                'nombre' => 'Cancha Central Cristal',
                'deporte' => 'padel',
                'superficie' => 'sintetico',
                'techada' => true,
                'precio_base' => 8000,
                'estado' => 'activo',
            ]
        );

        // Horarios de atención para todos los días
        for ($dia = 0; $dia <= 6; $dia++) {
            HorarioAtencion::updateOrCreate(
                [
                    'complejo_id' => $complejo->id,
                    'dia_semana' => $dia,
                ],
                [
                    'hora_apertura' => '08:00',
                    'hora_cierre' => '23:00',
                    'duracion_turno_minutos' => 60,
                ]
            );
        }
    }
}
