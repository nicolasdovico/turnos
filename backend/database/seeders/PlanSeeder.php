<?php

namespace Database\Seeders;

use App\Models\Modulo;
use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $modulos = Modulo::all()->keyBy('slug');

        $planes = [
            [
                'nombre' => 'Bronce',
                'slug' => 'bronce',
                'precio_mensual' => 29.00,
                'estado' => 'activo',
                'modulos' => ['reservas', 'cms_web'],
            ],
            [
                'nombre' => 'Plata',
                'slug' => 'plata',
                'precio_mensual' => 59.00,
                'estado' => 'activo',
                'modulos' => ['reservas', 'cms_web', 'turnos_fijos', 'split_payment', 'pos_buffet'],
            ],
            [
                'nombre' => 'Oro',
                'slug' => 'oro',
                'precio_mensual' => 99.00,
                'estado' => 'activo',
                'modulos' => ['reservas', 'pos_buffet', 'torneos', 'cms_web', 'domotica', 'split_payment', 'turnos_fijos'],
            ],
        ];

        foreach ($planes as $planData) {
            $moduloSlugs = $planData['modulos'];
            unset($planData['modulos']);

            $plan = Plan::updateOrCreate(
                ['slug' => $planData['slug']],
                $planData
            );

            $moduloIds = collect($moduloSlugs)
                ->map(fn ($slug) => $modulos->get($slug)?->id)
                ->filter()
                ->values()
                ->all();

            $plan->modulos()->sync($moduloIds);
        }
    }
}
