<?php

namespace Database\Seeders;

use App\Models\Deporte;
use App\Models\Equipamiento;
use App\Models\Superficie;
use Illuminate\Database\Seeder;

class DeportesYEquipamientosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $deportesData = [
            [
                'nombre' => 'Pádel',
                'slug' => 'padel',
                'icono' => 'padel',
                'tiene_paredes' => true,
                'duracion_default_minutos' => 90,
                'orden' => 1,
                'formatos' => [
                    ['id' => 'dobles', 'label' => 'Dobles (2 vs 2 estándar)'],
                    ['id' => 'single', 'label' => 'Individual / Single (1 vs 1)'],
                ],
                'paredes' => [
                    ['id' => 'cristal_panoramico', 'label' => 'Cristal Panorámico (Sin pilares)'],
                    ['id' => 'cristal_estandar', 'label' => 'Cristal Estándar 10/12mm'],
                    ['id' => 'muro_cemento', 'label' => 'Muro / Pared de Cemento'],
                    ['id' => 'reja', 'label' => 'Reja Perimetral'],
                ],
                'superficies' => [
                    ['nombre' => 'Césped Sintético Texturado (WPT)', 'slug' => 'sintetico_wpt', 'orden' => 1],
                    ['nombre' => 'Césped Sintético Monofilamento', 'slug' => 'sintetico_monofilamento', 'orden' => 2],
                    ['nombre' => 'Césped Sintético Fibrilado', 'slug' => 'sintetico_fibrilado', 'orden' => 3],
                    ['nombre' => 'Cemento / Hormigón', 'slug' => 'cemento', 'orden' => 4],
                ],
            ],
            [
                'nombre' => 'Tenis',
                'slug' => 'tenis',
                'icono' => 'tennis',
                'tiene_paredes' => false,
                'duracion_default_minutos' => 60,
                'orden' => 2,
                'formatos' => [
                    ['id' => 'single_dobles', 'label' => 'Single & Dobles (Estándar)'],
                    ['id' => 'single', 'label' => 'Exclusivo Single'],
                ],
                'paredes' => null,
                'superficies' => [
                    ['nombre' => 'Polvo de Ladrillo (Clay)', 'slug' => 'polvo_ladrillo', 'orden' => 1],
                    ['nombre' => 'Cemento / Cancha Rápida (Hard Court)', 'slug' => 'cemento_rapida', 'orden' => 2],
                    ['nombre' => 'Césped Natural (Grass)', 'slug' => 'cesped_natural', 'orden' => 3],
                    ['nombre' => 'Césped Sintético', 'slug' => 'sintetico', 'orden' => 4],
                ],
            ],
            [
                'nombre' => 'Fútbol',
                'slug' => 'futbol',
                'icono' => 'futbol',
                'tiene_paredes' => false,
                'duracion_default_minutos' => 60,
                'orden' => 3,
                'formatos' => [
                    ['id' => 'f5', 'label' => 'Fútbol 5 (Futsal)'],
                    ['id' => 'f7', 'label' => 'Fútbol 7'],
                    ['id' => 'f8', 'label' => 'Fútbol 8'],
                    ['id' => 'f11', 'label' => 'Fútbol 11 (Reglamentaria)'],
                ],
                'paredes' => null,
                'superficies' => [
                    ['nombre' => 'Césped Sintético con Caucho', 'slug' => 'sintetico_caucho', 'orden' => 1],
                    ['nombre' => 'Césped Sintético Fibrilado', 'slug' => 'sintetico_sin_caucho', 'orden' => 2],
                    ['nombre' => 'Césped Natural', 'slug' => 'cesped_natural', 'orden' => 3],
                    ['nombre' => 'Parquet / Piso Flotante (Futsal)', 'slug' => 'parquet', 'orden' => 4],
                    ['nombre' => 'Cemento / Baldosa', 'slug' => 'cemento', 'orden' => 5],
                ],
            ],
            [
                'nombre' => 'Básquet',
                'slug' => 'basquet',
                'icono' => 'basketball',
                'tiene_paredes' => false,
                'duracion_default_minutos' => 60,
                'orden' => 4,
                'formatos' => [
                    ['id' => '5v5', 'label' => '5 vs 5 (Cancha Completa)'],
                    ['id' => '3v3', 'label' => '3 vs 3 (Media Cancha)'],
                ],
                'paredes' => null,
                'superficies' => [
                    ['nombre' => 'Parquet / Madera Flotante', 'slug' => 'parquet_madera', 'orden' => 1],
                    ['nombre' => 'Cemento Pulido / Pintura Epoxi', 'slug' => 'cemento_pulido', 'orden' => 2],
                    ['nombre' => 'Goma / Poliuretano', 'slug' => 'goma_poliuretano', 'orden' => 3],
                ],
            ],
            [
                'nombre' => 'Squash',
                'slug' => 'squash',
                'icono' => 'squash',
                'tiene_paredes' => true,
                'duracion_default_minutos' => 60,
                'orden' => 5,
                'formatos' => [
                    ['id' => 'individual', 'label' => 'Individual (Estándar)'],
                ],
                'paredes' => [
                    ['id' => 'cristal_trasero', 'label' => 'Frontis Tradicional + Cristal Trasero'],
                    ['id' => 'cuatro_cristales', 'label' => 'Cancha Totalmente de Cristal'],
                ],
                'superficies' => [
                    ['nombre' => 'Parquet / Madera Natural', 'slug' => 'parquet', 'orden' => 1],
                ],
            ],
            [
                'nombre' => 'Pickleball',
                'slug' => 'pickleball',
                'icono' => 'pickleball',
                'tiene_paredes' => false,
                'duracion_default_minutos' => 60,
                'orden' => 6,
                'formatos' => [
                    ['id' => 'dobles', 'label' => 'Dobles (Estándar)'],
                    ['id' => 'single', 'label' => 'Individual / Single'],
                ],
                'paredes' => null,
                'superficies' => [
                    ['nombre' => 'Resina Acrílica / Hard Court', 'slug' => 'resina_acrilica', 'orden' => 1],
                    ['nombre' => 'Cemento Pulido', 'slug' => 'cemento', 'orden' => 2],
                    ['nombre' => 'Madera / Parquet', 'slug' => 'madera', 'orden' => 3],
                ],
            ],
            [
                'nombre' => 'Vóley',
                'slug' => 'voley',
                'icono' => 'volleyball',
                'tiene_paredes' => false,
                'duracion_default_minutos' => 60,
                'orden' => 7,
                'formatos' => [
                    ['id' => '6v6', 'label' => '6 vs 6 (Indoor / Salón)'],
                    ['id' => '2v2_beach', 'label' => '2 vs 2 (Beach Vóley)'],
                ],
                'paredes' => null,
                'superficies' => [
                    ['nombre' => 'Arena de Playa (Beach)', 'slug' => 'arena', 'orden' => 1],
                    ['nombre' => 'Parquet / Madera Flotante', 'slug' => 'parquet', 'orden' => 2],
                    ['nombre' => 'Cemento / Baldosa', 'slug' => 'cemento', 'orden' => 3],
                ],
            ],
            [
                'nombre' => 'Hockey',
                'slug' => 'hockey',
                'icono' => 'hockey',
                'tiene_paredes' => false,
                'duracion_default_minutos' => 60,
                'orden' => 8,
                'formatos' => [
                    ['id' => '11v11', 'label' => '11 vs 11 (Reglamentaria)'],
                    ['id' => '7v7', 'label' => '7 vs 7 (Seven)'],
                ],
                'paredes' => null,
                'superficies' => [
                    ['nombre' => 'Césped Sintético de Agua', 'slug' => 'sintetico_agua', 'orden' => 1],
                    ['nombre' => 'Césped Sintético de Arena', 'slug' => 'sintetico_arena', 'orden' => 2],
                    ['nombre' => 'Césped Natural', 'slug' => 'cesped_natural', 'orden' => 3],
                ],
            ],
        ];

        foreach ($deportesData as $depData) {
            $superficies = $depData['superficies'];
            unset($depData['superficies']);

            $deporte = Deporte::updateOrCreate(
                ['slug' => $depData['slug']],
                $depData
            );

            foreach ($superficies as $supData) {
                Superficie::updateOrCreate(
                    [
                        'deporte_id' => $deporte->id,
                        'slug' => $supData['slug'],
                    ],
                    [
                        'nombre' => $supData['nombre'],
                        'orden' => $supData['orden'],
                        'esta_activo' => true,
                    ]
                );
            }
        }

        // Catálogo Maestro de Equipamientos / Amenities (Globales)
        $equipamientosGlobales = [
            [
                'slug' => 'iluminacion_led',
                'nombre' => 'Iluminación LED Profesional',
                'icono' => 'zap',
                'categoria' => 'iluminacion',
                'descripcion' => 'Focos LED de alta potencia para juego nocturno sin sombras.',
                'orden' => 1,
            ],
            [
                'slug' => 'techada_indoor',
                'nombre' => 'Cancha Techada / Cubierta (Indoor)',
                'icono' => 'home',
                'categoria' => 'estructura',
                'descripcion' => 'Pista completamente cubierta o protegida contra lluvia y sol directo.',
                'orden' => 2,
            ],
            [
                'slug' => 'camara_grabacion',
                'nombre' => 'Cámara de Grabación HD / Replay',
                'icono' => 'video',
                'categoria' => 'tecnologia',
                'descripcion' => 'Grabación automática de partidos con generación de clips y repeticiones.',
                'orden' => 3,
            ],
            [
                'slug' => 'marcador_digital',
                'nombre' => 'Marcador Digital / Tanteador LED',
                'icono' => 'hash',
                'categoria' => 'tecnologia',
                'descripcion' => 'Marcador electrónico de puntos visible en cancha con control remoto o app.',
                'orden' => 4,
            ],
            [
                'slug' => 'climatizada',
                'nombre' => 'Climatización / Calefacción',
                'icono' => 'thermometer',
                'categoria' => 'confort',
                'descripcion' => 'Ambiente cerrado con aire acondicionado frío o calefacción en invierno.',
                'orden' => 5,
            ],
            [
                'slug' => 'transmision_streaming',
                'nombre' => 'Transmisión Streaming en Vivo',
                'icono' => 'tv',
                'categoria' => 'tecnologia',
                'descripcion' => 'Cámaras preparadas para emitir partidos en directo vía YouTube o Twitch.',
                'orden' => 6,
            ],
            [
                'slug' => 'gradas_tribuna',
                'nombre' => 'Gradas / Tribuna para Espectadores',
                'icono' => 'users',
                'categoria' => 'estructura',
                'descripcion' => 'Asientos o gradas perimetrales para público y espectadores de torneos.',
                'orden' => 7,
            ],
            [
                'slug' => 'vestuario_cancha',
                'nombre' => 'Acceso Directo a Vestuarios',
                'icono' => 'door-open',
                'categoria' => 'confort',
                'descripcion' => 'Cercanía inmediata a vestuarios, duchas e instalaciones sanitarias.',
                'orden' => 8,
            ],
            [
                'slug' => 'sistema_sonido',
                'nombre' => 'Sistema de Sonido / Música Bluetooth',
                'icono' => 'volume-2',
                'categoria' => 'confort',
                'descripcion' => 'Altavoces inalámbricos integrados para música durante el turno.',
                'orden' => 9,
            ],
            [
                'slug' => 'salida_pista',
                'nombre' => 'Salida de Pista Reglamentaria',
                'icono' => 'maximize-2',
                'categoria' => 'estructura',
                'descripcion' => 'Espacio perimetral reglamentario (mínimo 2 metros) para recuperar pelotas fuera de pista.',
                'aplica_a_deportes' => ['padel'],
                'orden' => 10,
            ],
            [
                'slug' => 'alquiler_material',
                'nombre' => 'Paletas / Pelotas de Cortesía',
                'icono' => 'package',
                'categoria' => 'confort',
                'descripcion' => 'Incluye pelotas en tubo o paletas de test para los jugadores del turno.',
                'orden' => 11,
            ],
        ];

        foreach ($equipamientosGlobales as $eq) {
            Equipamiento::updateOrCreate(
                [
                    'complejo_id' => null,
                    'slug' => $eq['slug'],
                ],
                [
                    'nombre' => $eq['nombre'],
                    'icono' => $eq['icono'] ?? 'check',
                    'categoria' => $eq['categoria'] ?? 'general',
                    'descripcion' => $eq['descripcion'] ?? null,
                    'aplica_a_deportes' => $eq['aplica_a_deportes'] ?? null,
                    'orden' => $eq['orden'] ?? 0,
                    'esta_activo' => true,
                ]
            );
        }
    }
}
