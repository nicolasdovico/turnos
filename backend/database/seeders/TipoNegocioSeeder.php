<?php

namespace Database\Seeders;

use App\Models\TipoNegocio;
use Illuminate\Database\Seeder;

class TipoNegocioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tipos = [
            [
                'nombre' => 'Club',
                'slug' => 'club',
                'descripcion' => 'Club social y deportivo con socios, actividades y reservas de canchas.',
                'esta_activo' => true,
            ],
            [
                'nombre' => 'Complejo',
                'slug' => 'complejo',
                'descripcion' => 'Complejo deportivo comercial enfocado en alquiler de canchas por turno.',
                'esta_activo' => true,
            ],
            [
                'nombre' => 'Gimnasio / Centro de Entrenamiento',
                'slug' => 'gimnasio',
                'descripcion' => 'Centro de entrenamiento, gimnasio o academia deportiva.',
                'esta_activo' => true,
            ],
        ];

        foreach ($tipos as $tipo) {
            TipoNegocio::updateOrCreate(
                ['slug' => $tipo['slug']],
                $tipo
            );
        }
    }
}
