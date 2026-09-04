<?php

namespace Database\Seeders;

use App\Models\CajaSesion;
use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\DispositivoIoT;
use App\Models\EquipoTorneo;
use App\Models\HorarioAtencion;
use App\Models\ListaEspera;
use App\Models\Modulo;
use App\Models\Pagina;
use App\Models\PartidoAbierto;
use App\Models\PartidoTorneo;
use App\Models\Plan;
use App\Models\Producto;
use App\Models\TipoNegocio;
use App\Models\Torneo;
use App\Models\Turno;
use App\Models\TurnoPagoDividido;
use App\Models\User;
use App\Models\UserCredito;
use App\Models\Venta;
use App\Models\VentaItem;
use App\Models\WalletMovimiento;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class FullTestingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $timezone = 'America/Argentina/Buenos_Aires';
        $hoy = Carbon::today($timezone);
        $manana = $hoy->copy()->addDay();
        $pasado = $hoy->copy()->addDays(2);

        // 1. Tipos de Negocio, Módulos y Planes base
        $this->call([
            TipoNegocioSeeder::class,
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $tipoClub = TipoNegocio::where('slug', 'club')->first();
        $tipoComplejo = TipoNegocio::where('slug', 'complejo')->first();
        $tipoGym = TipoNegocio::where('slug', 'gimnasio')->first();

        $planOro = Plan::where('slug', 'oro')->first();
        $planPlata = Plan::where('slug', 'plata')->first();
        $planBronce = Plan::where('slug', 'bronce')->first();

        // 2. Usuarios del Ecosistema
        $passwordHasheado = Hash::make('password123');

        // Super Administrador (Acceso a Filament /admin)
        $superAdmin = User::updateOrCreate(
            ['email' => 'admin@turnos.test'],
            [
                'name' => 'Super Administrador SaaS',
                'password' => $passwordHasheado,
                'telefono' => '1155550000',
                'email_verified_at' => now(),
            ]
        );

        // Dueño Club 1 (Nico Pádel y Nico Tenis - Multi-negocio)
        $duenoNicolas = User::where('email', 'nicolas@gmail.com')->first();
        if (!$duenoNicolas) {
            $duenoNicolas = User::updateOrCreate(
                ['email' => 'nicolas@club.test'],
                [
                    'name' => 'Nicolás Dóvico (Dueño Clubes)',
                    'password' => $passwordHasheado,
                    'telefono' => '1149790001',
                    'email_verified_at' => now(),
                ]
            );
        }

        // Dueño Complejo 2 (Complejo Central Fútbol)
        $duenoMarcos = User::updateOrCreate(
            ['email' => 'marcos@complejo.test'],
            [
                'name' => 'Marcos Gómez (Dueño Fútbol)',
                'password' => $passwordHasheado,
                'telefono' => '1149790002',
                'email_verified_at' => now(),
            ]
        );

        // Dueña Gimnasio 3 (Iron Gym)
        $duenaLaura = User::updateOrCreate(
            ['email' => 'laura@gym.test'],
            [
                'name' => 'Laura Benítez (Dueña Gimnasio)',
                'password' => $passwordHasheado,
                'telefono' => '1149790003',
                'email_verified_at' => now(),
            ]
        );

        // Operador / Recepcionista de Mostrador
        $operadorRecepcion = User::updateOrCreate(
            ['email' => 'recepcion@nico-padel.test'],
            [
                'name' => 'Facundo Recepcionista',
                'password' => $passwordHasheado,
                'telefono' => '1149790004',
                'email_verified_at' => now(),
            ]
        );

        // Clientes / Jugadores
        $clienteBela = User::updateOrCreate(
            ['email' => 'bela@jugador.test'],
            [
                'name' => 'Fernando Belasteguín',
                'password' => $passwordHasheado,
                'telefono' => '1149790220',
                'fcm_token' => 'fcm_token_test_belasteguin_device_1',
                'email_verified_at' => now(),
            ]
        );

        $clienteLebron = User::updateOrCreate(
            ['email' => 'lebron@jugador.test'],
            [
                'name' => 'Juan Lebrón',
                'password' => $passwordHasheado,
                'telefono' => '1149790221',
                'fcm_token' => 'fcm_token_test_lebron_device_2',
                'email_verified_at' => now(),
            ]
        );

        $clienteChino = User::updateOrCreate(
            ['email' => 'chino@jugador.test'],
            [
                'name' => 'Marcos "Chino" Maidana',
                'password' => $passwordHasheado,
                'telefono' => '1149700220',
                'fcm_token' => 'fcm_token_test_maidana_device_3',
                'email_verified_at' => now(),
            ]
        );

        $clienteMessi = User::updateOrCreate(
            ['email' => 'messi@jugador.test'],
            [
                'name' => 'Lionel Messi',
                'password' => $passwordHasheado,
                'telefono' => '1149790010',
                'fcm_token' => 'fcm_token_test_messi_device_4',
                'email_verified_at' => now(),
            ]
        );

        // 3. Complejos y Clubes
        // Club 1: Nico Pádel & Sport (Club social con Pádel y todos los módulos activos)
        $clubPadel = Complejo::updateOrCreate(
            ['subdominio' => 'nico-padel'],
            [
                'user_id' => $duenoNicolas->id,
                'nombre' => 'Nico Pádel & Sport Club',
                'plan_id' => $planOro->id,
                'tipo_negocio_id' => $tipoClub?->id,
                'estado' => 'activo',
                'latitud' => -34.5800,
                'longitud' => -58.4000,
                'direccion' => 'Av. Libertador 4520, Palermo',
                'ciudad' => 'Buenos Aires',
                'telefono' => '+54 11 4979-0001',
                'deporte_principal' => 'padel',
                'timezone' => $timezone,
                'tipo_cobro_reserva' => 'sena_obligatoria',
                'porcentaje_sena' => 50.00,
                'permite_mostrador_publico' => true,
                'horas_limite_cancelacion' => 4,
            ]
        );

        // Club 2: Nico Tenis Park (Mismo dueño para probar menú selector multinegocio SSO)
        $clubTenis = Complejo::updateOrCreate(
            ['subdominio' => 'nico-tenis'],
            [
                'user_id' => $duenoNicolas->id,
                'nombre' => 'Nico Tenis Park',
                'plan_id' => $planOro->id,
                'tipo_negocio_id' => $tipoClub?->id,
                'estado' => 'activo',
                'latitud' => -34.5650,
                'longitud' => -58.4200,
                'direccion' => 'Av. Figueroa Alcorta 6800, Nuñez',
                'ciudad' => 'Buenos Aires',
                'telefono' => '+54 11 4979-0002',
                'deporte_principal' => 'tenis',
                'timezone' => $timezone,
                'tipo_cobro_reserva' => 'sena_obligatoria',
                'porcentaje_sena' => 50.00,
                'permite_mostrador_publico' => true,
                'horas_limite_cancelacion' => 4,
            ]
        );

        // Complejo 3: Complejo Central Fútbol (Alquiler comercial de canchas de Fútbol 5 y 7)
        $complejoFutbol = Complejo::updateOrCreate(
            ['subdominio' => 'complejo-central'],
            [
                'user_id' => $duenoMarcos->id,
                'nombre' => 'Complejo Deportivo Central',
                'plan_id' => $planPlata->id,
                'tipo_negocio_id' => $tipoComplejo?->id,
                'estado' => 'activo',
                'latitud' => -34.6100,
                'longitud' => -58.4400,
                'direccion' => 'Av. Rivadavia 7800, Flores',
                'ciudad' => 'Buenos Aires',
                'telefono' => '+54 11 4979-0003',
                'deporte_principal' => 'futbol',
                'timezone' => $timezone,
                'tipo_cobro_reserva' => 'sena_obligatoria',
                'porcentaje_sena' => 30.00,
                'permite_mostrador_publico' => true,
                'horas_limite_cancelacion' => 6,
            ]
        );

        // Gimnasio 4: Iron Gym (Centro de entrenamiento y Crossfit)
        $gym = Complejo::updateOrCreate(
            ['subdominio' => 'iron-gym'],
            [
                'user_id' => $duenaLaura->id,
                'nombre' => 'Iron Gym & Crossfit Box',
                'plan_id' => $planBronce->id,
                'tipo_negocio_id' => $tipoGym?->id,
                'estado' => 'activo',
                'latitud' => -34.5900,
                'longitud' => -58.3900,
                'direccion' => 'Santa Fe 2900, Recoleta',
                'ciudad' => 'Buenos Aires',
                'telefono' => '+54 11 4979-0004',
                'deporte_principal' => 'fitness',
                'timezone' => $timezone,
                'tipo_cobro_reserva' => 'pago_total',
                'porcentaje_sena' => 100.00,
                'permite_mostrador_publico' => false,
                'horas_limite_cancelacion' => 2,
            ]
        );

        // 4. Horarios de Atención Semanales
        // Horarios Club Pádel (Lunes a Viernes 08:00 a 23:00, Sábados 08:00 a 22:00, Domingos 09:00 a 21:00)
        for ($dia = 0; $dia <= 6; $dia++) {
            $apertura = ($dia === 0) ? '09:00' : '08:00';
            $cierre = ($dia === 0) ? '21:00' : (($dia === 6) ? '22:00' : '23:00');
            HorarioAtencion::updateOrCreate(
                ['complejo_id' => $clubPadel->id, 'dia_semana' => $dia],
                ['hora_apertura' => $apertura, 'hora_cierre' => $cierre, 'duracion_turno_minutos' => 90]
            );
        }

        // Horarios Club Tenis (Lunes a Sábado 08:00 a 22:00, Domingo cerrado dia_semana = 0 omitido)
        for ($dia = 1; $dia <= 6; $dia++) {
            HorarioAtencion::updateOrCreate(
                ['complejo_id' => $clubTenis->id, 'dia_semana' => $dia],
                ['hora_apertura' => '08:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 60]
            );
        }
        HorarioAtencion::where('complejo_id', $clubTenis->id)->where('dia_semana', 0)->delete();

        // Horarios Complejo Fútbol (Lunes a Domingo 14:00 a 00:00)
        for ($dia = 0; $dia <= 6; $dia++) {
            HorarioAtencion::updateOrCreate(
                ['complejo_id' => $complejoFutbol->id, 'dia_semana' => $dia],
                ['hora_apertura' => '14:00', 'hora_cierre' => '23:30', 'duracion_turno_minutos' => 60]
            );
        }

        // Horarios Iron Gym (Lunes a Viernes 07:00 a 22:00, Sábados 08:00 a 14:00, Domingos cerrado)
        for ($dia = 1; $dia <= 5; $dia++) {
            HorarioAtencion::updateOrCreate(
                ['complejo_id' => $gym->id, 'dia_semana' => $dia],
                ['hora_apertura' => '07:00', 'hora_cierre' => '22:00', 'duracion_turno_minutos' => 60]
            );
        }
        HorarioAtencion::updateOrCreate(
            ['complejo_id' => $gym->id, 'dia_semana' => 6],
            ['hora_apertura' => '08:00', 'hora_cierre' => '14:00', 'duracion_turno_minutos' => 60]
        );
        HorarioAtencion::where('complejo_id', $gym->id)->where('dia_semana', 0)->delete();

        // 5. Canchas por Complejo y Disciplina
        // Canchas Club Pádel
        $canchaPadelCentral = Cancha::updateOrCreate(
            ['complejo_id' => $clubPadel->id, 'nombre' => 'Cancha 1 - Central Cristal'],
            [
                'deporte' => 'padel',
                'superficie' => 'sintetico',
                'techada' => true,
                'precio_base' => 10000.00,
                'precio_con_luz' => 12000.00,
                'iluminacion' => true,
                'tipo_iluminacion' => 'LED',
                'camara_grabacion' => true,
                'marcador_digital' => true,
                'climatizada' => false,
                'tipo_cubierta' => 'indoor',
                'tipo_pared' => 'cristal',
                'formato' => 'dobles',
                'duracion_minutos' => 90,
                'permite_duracion_flexible' => false,
                'anti_baches_activo' => false,
                'estado' => 'activo',
            ]
        );

        $canchaPadelPanoramica = Cancha::updateOrCreate(
            ['complejo_id' => $clubPadel->id, 'nombre' => 'Cancha 2 - Panorámica Exterior'],
            [
                'deporte' => 'padel',
                'superficie' => 'sintetico',
                'techada' => false,
                'precio_base' => 8000.00,
                'precio_con_luz' => 10000.00,
                'precio_90_min' => 11000.00,
                'precio_120_min' => 14000.00,
                'iluminacion' => true,
                'tipo_iluminacion' => 'LED',
                'camara_grabacion' => false,
                'marcador_digital' => true,
                'climatizada' => false,
                'tipo_cubierta' => 'outdoor',
                'tipo_pared' => 'cristal',
                'formato' => 'dobles',
                'duracion_minutos' => 60,
                'permite_duracion_flexible' => true,
                'anti_baches_activo' => true,
                'duraciones_permitidas' => [60, 90, 120],
                'estado' => 'activo',
            ]
        );

        $canchaPadelMuro = Cancha::updateOrCreate(
            ['complejo_id' => $clubPadel->id, 'nombre' => 'Cancha 3 - Muro Clásica'],
            [
                'deporte' => 'padel',
                'superficie' => 'cemento',
                'techada' => true,
                'precio_base' => 7000.00,
                'precio_con_luz' => 8500.00,
                'iluminacion' => true,
                'tipo_iluminacion' => 'Halógena',
                'camara_grabacion' => false,
                'marcador_digital' => false,
                'climatizada' => false,
                'tipo_cubierta' => 'indoor',
                'tipo_pared' => 'muro',
                'formato' => 'dobles',
                'duracion_minutos' => 60,
                'permite_duracion_flexible' => false,
                'anti_baches_activo' => false,
                'estado' => 'activo',
            ]
        );

        // Canchas Club Tenis
        $courtTenisPolvo = Cancha::updateOrCreate(
            ['complejo_id' => $clubTenis->id, 'nombre' => 'Court Central - Polvo de Ladrillo'],
            [
                'deporte' => 'tenis',
                'superficie' => 'polvo_ladrillo',
                'techada' => false,
                'precio_base' => 9000.00,
                'precio_con_luz' => 11500.00,
                'iluminacion' => true,
                'tipo_iluminacion' => 'LED',
                'camara_grabacion' => true,
                'marcador_digital' => true,
                'climatizada' => false,
                'tipo_cubierta' => 'outdoor',
                'duracion_minutos' => 90,
                'permite_duracion_flexible' => false,
                'anti_baches_activo' => false,
                'estado' => 'activo',
            ]
        );

        $courtTenisRapida = Cancha::updateOrCreate(
            ['complejo_id' => $clubTenis->id, 'nombre' => 'Court 2 - Hard Court Rápida'],
            [
                'deporte' => 'tenis',
                'superficie' => 'cemento',
                'techada' => true,
                'precio_base' => 11000.00,
                'precio_con_luz' => 13000.00,
                'iluminacion' => true,
                'tipo_iluminacion' => 'LED',
                'camara_grabacion' => false,
                'marcador_digital' => false,
                'climatizada' => true,
                'tipo_cubierta' => 'indoor',
                'duracion_minutos' => 60,
                'permite_duracion_flexible' => false,
                'anti_baches_activo' => false,
                'estado' => 'activo',
            ]
        );

        // Canchas Complejo Fútbol
        $canchaFutbol5 = Cancha::updateOrCreate(
            ['complejo_id' => $complejoFutbol->id, 'nombre' => 'Cancha 1 - Fútbol 5 Sintético Pro'],
            [
                'deporte' => 'futbol',
                'superficie' => 'sintetico',
                'techada' => true,
                'precio_base' => 18000.00,
                'precio_con_luz' => 20000.00,
                'iluminacion' => true,
                'tipo_iluminacion' => 'LED',
                'camara_grabacion' => true,
                'marcador_digital' => true,
                'tipo_cubierta' => 'indoor',
                'formato' => 'futbol_5',
                'duracion_minutos' => 60,
                'permite_duracion_flexible' => false,
                'anti_baches_activo' => false,
                'estado' => 'activo',
            ]
        );

        $canchaFutbol7 = Cancha::updateOrCreate(
            ['complejo_id' => $complejoFutbol->id, 'nombre' => 'Cancha 2 - Fútbol 7 Césped Natural'],
            [
                'deporte' => 'futbol',
                'superficie' => 'cesped_natural',
                'techada' => false,
                'precio_base' => 28000.00,
                'precio_con_luz' => 32000.00,
                'iluminacion' => true,
                'tipo_iluminacion' => 'Halógena',
                'tipo_cubierta' => 'outdoor',
                'formato' => 'futbol_7',
                'duracion_minutos' => 60,
                'permite_duracion_flexible' => false,
                'anti_baches_activo' => false,
                'estado' => 'activo',
            ]
        );

        // Gimnasio Box
        $boxGym = Cancha::updateOrCreate(
            ['complejo_id' => $gym->id, 'nombre' => 'Box Principal - Crossfit & Funcional'],
            [
                'deporte' => 'fitness',
                'superficie' => 'goma_alto_impacto',
                'techada' => true,
                'precio_base' => 5000.00,
                'precio_con_luz' => 5000.00,
                'iluminacion' => true,
                'climatizada' => true,
                'tipo_cubierta' => 'indoor',
                'duracion_minutos' => 60,
                'permite_duracion_flexible' => false,
                'anti_baches_activo' => false,
                'estado' => 'activo',
            ]
        );

        // 6. Saldos de Billetera Virtual y Movimientos
        // Fernando Belasteguin tiene $15.000 de saldo a favor en Nico Pádel
        UserCredito::updateOrCreate(
            ['user_id' => $clienteBela->id, 'complejo_id' => $clubPadel->id],
            ['saldo' => 15000.00]
        );

        WalletMovimiento::updateOrCreate(
            ['user_id' => $clienteBela->id, 'complejo_id' => $clubPadel->id, 'tipo' => 'reembolso_cancelacion'],
            [
                'monto' => 15000.00,
                'descripcion' => 'Reembolso automático por cancelación con más de 4 horas de anticipación',
            ]
        );

        // Chino Maidana tiene $5.000 de saldo a favor
        UserCredito::updateOrCreate(
            ['user_id' => $clienteChino->id, 'complejo_id' => $clubPadel->id],
            ['saldo' => 5000.00]
        );

        // 7. Turnos con Diferentes Estados Financieros y Horarios para HOY
        // Slot 1: Hoy 10:00 a 11:30 - Pagado 100% en Mostrador (Efectivo) por Belasteguín
        Turno::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelCentral->id,
                'fecha' => $hoy->toDateString(),
                'hora_inicio' => '10:00:00',
            ],
            [
                'hora_fin' => '11:30:00',
                'cliente_id' => $clienteBela->id,
                'cliente_nombre' => $clienteBela->name,
                'cliente_telefono' => $clienteBela->telefono,
                'precio' => 10000.00,
                'monto_pagado' => 10000.00,
                'saldo_pendiente' => 0.00,
                'metodo_pago' => 'mostrador',
                'estado_pago' => 'pagado',
                'estado' => 'reservado',
                'es_fijo' => false,
            ]
        );

        // Slot 2: Hoy 12:00 a 13:30 - Seña 50% Pagada Online, Saldo $5.000 Pendiente por Juan Lebrón (Ideal para probar botón "Cobrar")
        Turno::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelCentral->id,
                'fecha' => $hoy->toDateString(),
                'hora_inicio' => '12:00:00',
            ],
            [
                'hora_fin' => '13:30:00',
                'cliente_id' => $clienteLebron->id,
                'cliente_nombre' => $clienteLebron->name,
                'cliente_telefono' => $clienteLebron->telefono,
                'precio' => 10000.00,
                'monto_pagado' => 5000.00,
                'saldo_pendiente' => 5000.00,
                'metodo_pago' => 'online',
                'estado_pago' => 'senado',
                'estado' => 'reservado',
                'es_fijo' => false,
            ]
        );

        // Slot 3: Hoy 14:00 a 15:30 - 100% Pendiente de Pago (Reservó online eligiendo "Pagar en Mostrador")
        Turno::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelCentral->id,
                'fecha' => $hoy->toDateString(),
                'hora_inicio' => '14:00:00',
            ],
            [
                'hora_fin' => '15:30:00',
                'cliente_id' => $clienteLebron->id,
                'cliente_nombre' => $clienteLebron->name,
                'cliente_telefono' => $clienteLebron->telefono,
                'precio' => 10000.00,
                'monto_pagado' => 0.00,
                'saldo_pendiente' => 10000.00,
                'metodo_pago' => 'mostrador',
                'estado_pago' => 'pendiente',
                'estado' => 'reservado',
                'es_fijo' => false,
            ]
        );

        // Slot 4: Hoy 16:00 a 17:30 - Cliente No Registrado (Walk-in Mostrador sin email ni cuenta)
        Turno::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelCentral->id,
                'fecha' => $hoy->toDateString(),
                'hora_inicio' => '16:00:00',
            ],
            [
                'hora_fin' => '17:30:00',
                'cliente_id' => null,
                'cliente_nombre' => 'Carlos Mostrador',
                'cliente_telefono' => '1133445566',
                'precio' => 10000.00,
                'monto_pagado' => 0.00,
                'saldo_pendiente' => 10000.00,
                'metodo_pago' => 'mostrador',
                'estado_pago' => 'pendiente',
                'estado' => 'reservado',
                'es_fijo' => false,
            ]
        );

        // Slot 5: Hoy 18:00 a 19:30 - Turno Fijo / Abonado Semanal de la serie activa
        Turno::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelCentral->id,
                'fecha' => $hoy->toDateString(),
                'hora_inicio' => '18:00:00',
            ],
            [
                'hora_fin' => '19:30:00',
                'cliente_id' => null,
                'cliente_nombre' => 'Dr. Roberto Martínez (Abonado)',
                'cliente_telefono' => '1122334455',
                'precio' => 10000.00,
                'monto_pagado' => 10000.00,
                'saldo_pendiente' => 0.00,
                'metodo_pago' => 'transferencia',
                'estado_pago' => 'pagado',
                'estado' => 'reservado',
                'es_fijo' => true,
            ]
        );

        // 8. Turnos Fijos (Abonados a 6 meses con 26 semanas y alertas de renovación)
        // Serie 1: Serie activa de 26 semanas (Martes 18:00 a 19:30) para Dr. Roberto Martínez
        for ($semana = 1; $semana <= 22; $semana++) {
            $fechaSemana = $hoy->copy()->addWeeks($semana);
            Turno::updateOrCreate(
                [
                    'complejo_id' => $clubPadel->id,
                    'cancha_id' => $canchaPadelCentral->id,
                    'fecha' => $fechaSemana->toDateString(),
                    'hora_inicio' => '18:00:00',
                ],
                [
                    'hora_fin' => '19:30:00',
                    'cliente_id' => null,
                    'cliente_nombre' => 'Dr. Roberto Martínez (Abonado)',
                    'cliente_telefono' => '1122334455',
                    'precio' => 10000.00,
                    'monto_pagado' => 0.00,
                    'saldo_pendiente' => 10000.00,
                    'metodo_pago' => 'mostrador',
                    'estado_pago' => 'pendiente',
                    'estado' => 'reservado',
                    'es_fijo' => true,
                ]
            );
        }

        // Serie 2: Serie Próxima a Vencer (le quedan solo 2 semanas, para probar el badge "⚡ Renovar 6 Meses Más")
        // Jueves 19:00 a 20:00 en Cancha 3 Muro para Belasteguín
        for ($semana = 1; $semana <= 2; $semana++) {
            $fechaVenciendo = $hoy->copy()->addWeeks($semana);
            Turno::updateOrCreate(
                [
                    'complejo_id' => $clubPadel->id,
                    'cancha_id' => $canchaPadelMuro->id,
                    'fecha' => $fechaVenciendo->toDateString(),
                    'hora_inicio' => '19:00:00',
                ],
                [
                    'hora_fin' => '20:00:00',
                    'cliente_id' => $clienteBela->id,
                    'cliente_nombre' => $clienteBela->name,
                    'cliente_telefono' => $clienteBela->telefono,
                    'precio' => 8500.00,
                    'monto_pagado' => 8500.00,
                    'saldo_pendiente' => 0.00,
                    'metodo_pago' => 'transferencia',
                    'estado_pago' => 'pagado',
                    'estado' => 'reservado',
                    'es_fijo' => true,
                ]
            );
        }

        // 9. Turnos en Cancha Panorámica (Duración Flexible & Algoritmo Anti-Baches)
        // Ocupamos 18:00 a 19:00 en Cancha 2. Con duración flexible de 90 min, 17:00 a 18:30 dejaría un hueco de 30 min y se protege automáticamente
        Turno::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelPanoramica->id,
                'fecha' => $hoy->toDateString(),
                'hora_inicio' => '18:00:00',
            ],
            [
                'hora_fin' => '19:00:00',
                'cliente_id' => $clienteMessi->id,
                'cliente_nombre' => $clienteMessi->name,
                'cliente_telefono' => $clienteMessi->telefono,
                'precio' => 8000.00,
                'monto_pagado' => 8000.00,
                'saldo_pendiente' => 0.00,
                'metodo_pago' => 'online',
                'estado_pago' => 'pagado',
                'estado' => 'reservado',
                'es_fijo' => false,
            ]
        );

        // 10. Lista de Espera Inteligente
        // El Chino Maidana está anotado para mañana a las 19:00 en Cancha 1
        ListaEspera::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelCentral->id,
                'user_id' => $clienteChino->id,
                'fecha' => $manana->toDateString(),
                'hora_inicio' => '19:00:00',
            ],
            [
                'hora_fin' => '20:30:00',
                'notificado' => false,
            ]
        );

        // Turno ocupado en ese slot que al cancelarse disparará la notificación al Chino Maidana
        Turno::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelCentral->id,
                'fecha' => $manana->toDateString(),
                'hora_inicio' => '19:00:00',
            ],
            [
                'hora_fin' => '20:30:00',
                'cliente_id' => $clienteLebron->id,
                'cliente_nombre' => $clienteLebron->name,
                'cliente_telefono' => $clienteLebron->telefono,
                'precio' => 12000.00,
                'monto_pagado' => 6000.00,
                'saldo_pendiente' => 6000.00,
                'metodo_pago' => 'online',
                'estado_pago' => 'senado',
                'estado' => 'reservado',
                'es_fijo' => false,
            ]
        );

        // 11. Punto de Venta (POS Buffet) e Inventario
        $productosBuffet = [
            ['nombre' => 'Bebida Isotónica Gatorade 500ml', 'codigo_barra' => '779001', 'categoria' => 'Bebidas', 'precio_costo' => 1200.00, 'precio_venta' => 2000.00, 'stock_actual' => 45, 'stock_minimo' => 10],
            ['nombre' => 'Agua Mineral Sin Gas 500ml', 'codigo_barra' => '779002', 'categoria' => 'Bebidas', 'precio_costo' => 600.00, 'precio_venta' => 1200.00, 'stock_actual' => 60, 'stock_minimo' => 15],
            ['nombre' => 'Tubo de Pelotas Head Pádel Pro S', 'codigo_barra' => '779003', 'categoria' => 'Equipamiento', 'precio_costo' => 8500.00, 'precio_venta' => 13500.00, 'stock_actual' => 18, 'stock_minimo' => 5],
            ['nombre' => 'Overgrip Bullpadel Confort (x1)', 'codigo_barra' => '779004', 'categoria' => 'Equipamiento', 'precio_costo' => 1800.00, 'precio_venta' => 3500.00, 'stock_actual' => 30, 'stock_minimo' => 8],
            ['nombre' => 'Barra de Proteína Whey Choco-Maní', 'codigo_barra' => '779005', 'categoria' => 'Snacks', 'precio_costo' => 1400.00, 'precio_venta' => 2500.00, 'stock_actual' => 24, 'stock_minimo' => 6],
            ['nombre' => 'Café Espresso Illy', 'codigo_barra' => '779006', 'categoria' => 'Cafetería', 'precio_costo' => 600.00, 'precio_venta' => 1500.00, 'stock_actual' => 100, 'stock_minimo' => 20],
        ];

        foreach ($productosBuffet as $prod) {
            Producto::updateOrCreate(
                ['complejo_id' => $clubPadel->id, 'codigo_barra' => $prod['codigo_barra']],
                array_merge($prod, ['estado' => 'activo'])
            );
        }

        // Sesión de Caja Diaria (Abierta hoy a las 08:00 con $20.000 de fondo)
        $cajaAbierta = CajaSesion::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'usuario_id' => $duenoNicolas->id,
                'estado' => 'abierta',
            ],
            [
                'monto_apertura' => 20000.00,
                'fecha_apertura' => $hoy->copy()->setTime(8, 0, 0),
                'total_ventas_efectivo' => 4000.00,
                'total_ventas_digitales' => 6000.00,
                'total_ingresos_turnos' => 10000.00,
                'total_esperado_efectivo' => 34000.00, // 20.000 fondo + 4.000 ventas + 10.000 turno efectivo
            ]
        );

        // Venta en mostrador vinculada a la caja
        $productoBebida = Producto::where('complejo_id', $clubPadel->id)->where('codigo_barra', '779001')->first();
        if ($productoBebida) {
            $venta = Venta::updateOrCreate(
                [
                    'complejo_id' => $clubPadel->id,
                    'numero_comprobante' => 'VTA-0001',
                ],
                [
                    'usuario_id' => $duenoNicolas->id,
                    'cliente_id' => $clienteBela->id,
                    'tipo_pago' => 'efectivo',
                    'subtotal' => 4000.00,
                    'descuento' => 0.00,
                    'total' => 4000.00,
                    'estado' => 'completada',
                ]
            );

            VentaItem::updateOrCreate(
                [
                    'venta_id' => $venta->id,
                    'producto_id' => $productoBebida->id,
                ],
                [
                    'cantidad' => 2,
                    'precio_unitario' => 2000.00,
                    'subtotal' => 4000.00,
                ]
            );
        }

        // 12. Partidos Abiertos & Split Payment
        // Turno para pasado mañana 20:00 a 21:30 en Cancha 2 Panorámica
        $turnoSplit = Turno::updateOrCreate(
            [
                'complejo_id' => $clubPadel->id,
                'cancha_id' => $canchaPadelPanoramica->id,
                'fecha' => $pasado->toDateString(),
                'hora_inicio' => '20:00:00',
            ],
            [
                'hora_fin' => '21:30:00',
                'cliente_id' => $clienteBela->id,
                'cliente_nombre' => $clienteBela->name,
                'cliente_telefono' => $clienteBela->telefono,
                'precio' => 11000.00,
                'monto_pagado' => 5500.00, // 2 de las 4 cuotas pagadas
                'saldo_pendiente' => 5500.00,
                'metodo_pago' => 'online',
                'estado_pago' => 'senado',
                'estado' => 'reservado',
                'es_fijo' => false,
            ]
        );

        $partidoAbierto = PartidoAbierto::updateOrCreate(
            ['turno_id' => $turnoSplit->id],
            [
                'complejo_id' => $clubPadel->id,
                'organizador_id' => $clienteBela->id,
                'nivel_min' => '4ta',
                'nivel_max' => '3ra',
                'jugadores_requeridos' => 4,
                'jugadores_actuales' => 2,
                'estado' => 'buscando',
                'tipo_partido' => 'competitivo',
            ]
        );

        // 4 Cuotas Split de $2.750 cada una (Total $11.000)
        // Cuota 1: Bela (Pagada)
        TurnoPagoDividido::updateOrCreate(
            ['turno_id' => $turnoSplit->id, 'cuota_numero' => 1],
            [
                'complejo_id' => $clubPadel->id,
                'partido_abierto_id' => $partidoAbierto->id,
                'user_id' => $clienteBela->id,
                'nombre_jugador' => $clienteBela->name,
                'email_jugador' => $clienteBela->email,
                'monto' => 2750.00,
                'total_cuotas' => 4,
                'token_pago' => (string) Str::uuid(),
                'estado' => 'pagado',
                'metodo_pago' => 'online',
                'pagado_en' => now(),
            ]
        );

        // Cuota 2: Lebrón (Pagada)
        TurnoPagoDividido::updateOrCreate(
            ['turno_id' => $turnoSplit->id, 'cuota_numero' => 2],
            [
                'complejo_id' => $clubPadel->id,
                'partido_abierto_id' => $partidoAbierto->id,
                'user_id' => $clienteLebron->id,
                'nombre_jugador' => $clienteLebron->name,
                'email_jugador' => $clienteLebron->email,
                'monto' => 2750.00,
                'total_cuotas' => 4,
                'token_pago' => (string) Str::uuid(),
                'estado' => 'pagado',
                'metodo_pago' => 'online',
                'pagado_en' => now(),
            ]
        );

        // Cuotas 3 y 4: Vacantes pendientes de pago (Listas para unirse)
        TurnoPagoDividido::updateOrCreate(
            ['turno_id' => $turnoSplit->id, 'cuota_numero' => 3],
            [
                'complejo_id' => $clubPadel->id,
                'partido_abierto_id' => $partidoAbierto->id,
                'user_id' => null,
                'nombre_jugador' => null,
                'email_jugador' => null,
                'monto' => 2750.00,
                'total_cuotas' => 4,
                'token_pago' => (string) Str::uuid(),
                'estado' => 'pendiente',
            ]
        );

        TurnoPagoDividido::updateOrCreate(
            ['turno_id' => $turnoSplit->id, 'cuota_numero' => 4],
            [
                'complejo_id' => $clubPadel->id,
                'partido_abierto_id' => $partidoAbierto->id,
                'user_id' => null,
                'nombre_jugador' => null,
                'email_jugador' => null,
                'monto' => 2750.00,
                'total_cuotas' => 4,
                'token_pago' => (string) Str::uuid(),
                'estado' => 'pendiente',
            ]
        );

        // 13. Gestor de Torneos y Cuadro de Eliminación Directa
        $torneo = Torneo::updateOrCreate(
            ['complejo_id' => $clubPadel->id, 'slug' => 'copa-master-apertura-2026'],
            [
                'nombre' => 'Copa Master Pádel Apertura 2026',
                'deporte' => 'padel',
                'formato' => 'eliminacion_directa',
                'categoria' => '4ta Caballeros',
                'max_equipos' => 8,
                'fecha_inicio' => $hoy->toDateString(),
                'fecha_fin' => $hoy->copy()->addDays(7)->toDateString(),
                'precio_inscripcion' => 25000.00,
                'estado' => 'en_progreso',
                'reglas' => 'Partidos al mejor de 3 sets con super tie-break a 10 en el tercero. Tolerancia 15 minutos.',
            ]
        );

        $parejas = [
            ['nombre' => 'Belasteguín / Coello', 'j1' => 'Fernando Belasteguín', 'j2' => 'Arturo Coello', 'semilla' => 1],
            ['nombre' => 'Lebrón / Galán', 'j1' => 'Juan Lebrón', 'j2' => 'Alejandro Galán', 'semilla' => 2],
            ['nombre' => 'Tapia / Chingotto', 'j1' => 'Agustín Tapia', 'j2' => 'Federico Chingotto', 'semilla' => 3],
            ['nombre' => 'Navarro / Di Nenno', 'j1' => 'Paquito Navarro', 'j2' => 'Martín Di Nenno', 'semilla' => 4],
            ['nombre' => 'Stupaczuk / Yanguas', 'j1' => 'Franco Stupaczuk', 'j2' => 'Mike Yanguas', 'semilla' => 5],
            ['nombre' => 'Tello / Ruiz', 'j1' => 'Juan Tello', 'j2' => 'Álex Ruiz', 'semilla' => 6],
            ['nombre' => 'Sanyo / Gutiérrez', 'j1' => 'Sanyo Gutiérrez', 'j2' => 'Agustín Gutiérrez', 'semilla' => 7],
            ['nombre' => 'González / Momo', 'j1' => 'Jero González', 'j2' => 'Momo González', 'semilla' => 8],
        ];

        $equiposIds = [];
        foreach ($parejas as $p) {
            $equipo = EquipoTorneo::updateOrCreate(
                ['torneo_id' => $torneo->id, 'nombre' => $p['nombre']],
                [
                    'complejo_id' => $clubPadel->id,
                    'capitan_id' => $clienteBela->id,
                    'jugador_1_nombre' => $p['j1'],
                    'jugador_2_nombre' => $p['j2'],
                    'semilla' => $p['semilla'],
                    'estado' => 'confirmado',
                ]
            );
            $equiposIds[] = $equipo->id;
        }

        // Partidos de Cuartos de Final
        $partidoCuartos1 = PartidoTorneo::updateOrCreate(
            ['torneo_id' => $torneo->id, 'fase' => 'cuartos', 'ronda' => 1, 'posicion_llave' => 1],
            [
                'complejo_id' => $clubPadel->id,
                'equipo_local_id' => $equiposIds[0],
                'equipo_visitante_id' => $equiposIds[7],
                'ganador_id' => $equiposIds[0],
                'score_local' => 2,
                'score_visitante' => 0,
                'resultado_local' => '6-3, 6-4',
                'resultado_visitante' => '3-6, 4-6',
                'estado' => 'finalizado',
            ]
        );

        $partidoCuartos2 = PartidoTorneo::updateOrCreate(
            ['torneo_id' => $torneo->id, 'fase' => 'cuartos', 'ronda' => 1, 'posicion_llave' => 2],
            [
                'complejo_id' => $clubPadel->id,
                'equipo_local_id' => $equiposIds[3],
                'equipo_visitante_id' => $equiposIds[4],
                'ganador_id' => $equiposIds[3],
                'score_local' => 2,
                'score_visitante' => 1,
                'resultado_local' => '4-6, 7-6, 10-8',
                'resultado_visitante' => '6-4, 6-7, 8-10',
                'estado' => 'finalizado',
            ]
        );

        // Semifinal 1 pendiente
        PartidoTorneo::updateOrCreate(
            ['torneo_id' => $torneo->id, 'fase' => 'semifinal', 'ronda' => 2, 'posicion_llave' => 1],
            [
                'complejo_id' => $clubPadel->id,
                'equipo_local_id' => $equiposIds[0],
                'equipo_visitante_id' => $equiposIds[3],
                'estado' => 'pendiente',
            ]
        );

        // 14. Domótica IoT (Control Automático de Luces)
        DispositivoIoT::updateOrCreate(
            ['complejo_id' => $clubPadel->id, 'nombre' => 'Relay Sonoff Luces Cancha 1'],
            [
                'cancha_id' => $canchaPadelCentral->id,
                'tipo' => 'luces',
                'ip_address' => '192.168.1.101',
                'topic_mqtt' => 'nico-padel/luces/cancha1',
                'token_api' => 'sec_iot_token_991823',
                'endpoint_url' => 'http://192.168.1.101/relay/0',
                'minutos_antelacion_encendido' => 5,
                'minutos_gracia_apagado' => 5,
                'estado_actual' => 'encendido',
                'esta_activo' => true,
            ]
        );

        DispositivoIoT::updateOrCreate(
            ['complejo_id' => $clubPadel->id, 'nombre' => 'Relay Sonoff Luces Cancha 2'],
            [
                'cancha_id' => $canchaPadelPanoramica->id,
                'tipo' => 'luces',
                'ip_address' => '192.168.1.102',
                'topic_mqtt' => 'nico-padel/luces/cancha2',
                'endpoint_url' => 'http://192.168.1.102/relay/0',
                'minutos_antelacion_encendido' => 5,
                'minutos_gracia_apagado' => 5,
                'estado_actual' => 'apagado',
                'esta_activo' => true,
            ]
        );

        // 15. Páginas CMS Informativas
        Pagina::updateOrCreate(
            ['complejo_id' => $clubPadel->id, 'slug' => 'reglamento-interno'],
            [
                'titulo' => 'Reglamento Interno y Código de Convivencia',
                'contenido_html' => '<h2>Reglamento del Club</h2><p>Bienvenido a Nico Pádel. El uso de calzado adecuado para césped sintético es obligatorio. Por favor respetar los horarios de inicio y finalización del turno puntualmente.</p><ul><li>Prohibido ingresar con calzado con tapones.</li><li>Cuidar las instalaciones y apagar luces si corresponde.</li><li>Cancelaciones con al menos 4 horas de anticipación reciben reintegro en billetera virtual.</li></ul>',
                'esta_publicada' => true,
            ]
        );

        Pagina::updateOrCreate(
            ['complejo_id' => $clubPadel->id, 'slug' => 'escuelita-menores'],
            [
                'titulo' => 'Escuelita de Menores y Formación de Pádel',
                'contenido_html' => '<h2>Escuelita de Menores</h2><p>Clases grupales para niños y adolescentes de 6 a 16 años a cargo de profesores certificados por la APA. Grupos divididos por edades y niveles todos los Martes y Jueves de 17:00 a 18:30.</p>',
                'esta_publicada' => true,
            ]
        );
    }
}
