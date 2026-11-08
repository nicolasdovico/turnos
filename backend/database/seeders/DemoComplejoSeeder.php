<?php

namespace Database\Seeders;

use App\Models\Cancha;
use App\Models\Complejo;
use App\Models\HorarioAtencion;
use App\Models\Pagina;
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
                'direccion' => 'Av. Libertador 1234, Recoleta',
                'ciudad' => 'Buenos Aires',
                'telefono' => '+54 11 5555-4321',
                'plantilla_slug' => 'booking_direct',
                'logo_url' => '/storage/tenants/padelpro/branding/logo.jpg',
                'portada_url' => '/storage/tenants/padelpro/branding/portada.jpg',
                'color_primario' => '#10b981',
                'color_secundario' => '#047857',
                'color_acento' => '#06b6d4',
                'color_fondo' => '#020617',
                'eslogan' => 'El mejor pádel de Buenos Aires con pistas panorámicas de cristal y LED profesional',
                'descripcion_corta' => 'Complejo deportivo premium en Recoleta. Pistas oficiales de cristal, césped monofilamento texturado, vestuarios de primer nivel y buffet climatizado con vista a la central.',
                'redes_sociales' => [
                    'instagram' => 'https://instagram.com/padelproarena',
                    'facebook' => 'https://facebook.com/padelproarena',
                    'tiktok' => 'https://tiktok.com/@padelproarena',
                    'sitio_web' => 'https://padelpro.turnos.com',
                ],
            ]
        );

        // Cancha 1: Central Cristal Panorámica
        Cancha::updateOrCreate(
            ['complejo_id' => $complejo->id, 'nombre' => 'Cancha 1 - Cristal Panorámica'],
            [
                'deporte' => 'padel',
                'superficie' => 'sintetico',
                'techada' => true,
                'precio_base' => 9000,
                'estado' => 'activo',
                'iluminacion' => true,
                'tipo_iluminacion' => 'LED',
                'precio_con_luz' => 13000,
                'camara_grabacion' => true,
                'marcador_digital' => true,
                'climatizada' => true,
                'tipo_cubierta' => 'indoor',
                'tipo_pared' => 'cristal',
                'formato' => 'dobles',
                'duracion_minutos' => 90,
                'permite_duracion_flexible' => false,
                'duraciones_permitidas' => [60, 90, 120],
                'precio_90_min' => 9000,
                'precio_120_min' => 12000,
                'anti_baches_activo' => false,
                'precio_luz_adicional' => 4000,
            ]
        );

        // Cancha 2: Exterior Techada
        Cancha::updateOrCreate(
            ['complejo_id' => $complejo->id, 'nombre' => 'Cancha 2 - Exterior Techada'],
            [
                'deporte' => 'padel',
                'superficie' => 'sintetico',
                'techada' => true,
                'precio_base' => 8000,
                'estado' => 'activo',
                'iluminacion' => true,
                'tipo_iluminacion' => 'LED',
                'precio_con_luz' => 12000,
                'camara_grabacion' => false,
                'marcador_digital' => true,
                'climatizada' => false,
                'tipo_cubierta' => 'indoor',
                'tipo_pared' => 'cristal',
                'formato' => 'dobles',
                'duracion_minutos' => 90,
                'permite_duracion_flexible' => false,
                'duraciones_permitidas' => [60, 90, 120],
                'precio_90_min' => 8000,
                'precio_120_min' => 10500,
                'anti_baches_activo' => false,
                'precio_luz_adicional' => 4000,
            ]
        );

        // Cancha 3: Nocturna LED Master Pro
        Cancha::updateOrCreate(
            ['complejo_id' => $complejo->id, 'nombre' => 'Cancha 3 - Nocturna LED Master'],
            [
                'deporte' => 'padel',
                'superficie' => 'sintetico',
                'techada' => false,
                'precio_base' => 7500,
                'estado' => 'activo',
                'iluminacion' => true,
                'tipo_iluminacion' => 'LED',
                'precio_con_luz' => 11000,
                'camara_grabacion' => true,
                'marcador_digital' => false,
                'climatizada' => false,
                'tipo_cubierta' => 'outdoor',
                'tipo_pared' => 'cristal',
                'formato' => 'dobles',
                'duracion_minutos' => 90,
                'permite_duracion_flexible' => false,
                'duraciones_permitidas' => [60, 90, 120],
                'precio_90_min' => 7500,
                'precio_120_min' => 10000,
                'anti_baches_activo' => false,
                'precio_luz_adicional' => 3500,
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
                    'hora_cierre' => '23:30',
                    'duracion_turno_minutos' => 60,
                ]
            );
        }

        // Páginas CMS Dinámicas para Padel Pro Arena
        // 1. Reglamento Interno y Normas de Convivencia
        Pagina::updateOrCreate(
            ['complejo_id' => $complejo->id, 'slug' => 'reglamento-interno'],
            [
                'titulo' => 'Reglamento Interno y Convivencia',
                'contenido_html' => '<h2>Reglamento Oficial y Normas de Juego</h2>
<p>Bienvenido a <strong>Padel Pro Arena</strong>. Para garantizar la seguridad, el cuidado de nuestras instalaciones y la mejor experiencia deportiva de todos los jugadores, te solicitamos respetar las siguientes normas:</p>

<h3>1. Uso de Calzado y Equipamiento</h3>
<ul>
  <li><strong>Obligatorio:</strong> Uso exclusivo de zapatillas de pádel o tenis con suela espiga (clay) o específica para césped sintético.</li>
  <li><strong>Prohibido terminantemente:</strong> Calzado con tapones de fútbol (fútbol 5/11), suelas negras que dejen marcas o calzado urbano de suela dura.</li>
  <li>Es obligatorio el uso de remera y vestimenta deportiva adecuada en todo momento dentro de las pistas.</li>
</ul>

<h3>2. Puntualidad y Duración de Turnos</h3>
<ul>
  <li>Los turnos inician y finalizan con estricta puntualidad según el horario reservado.</li>
  <li>Te pedimos liberar la pista <strong>2 minutos antes del cierre</strong> para permitir el ingreso ordenado del siguiente grupo.</li>
</ul>

<h3>3. Política de Cancelaciones y Devoluciones</h3>
<ul>
  <li>Podés cancelar tu turno con hasta <strong>4 horas de anticipación</strong> de forma 100% autónoma desde la web y recibirás el reintegro instantáneo del saldo en tu billetera virtual del club para usar en futuras reservas.</li>
  <li>Cancelaciones con menos de 4 horas o inasistencias (no-show) no tienen derecho a reintegro de seña ni saldo.</li>
  <li><strong>Protocolo de lluvia:</strong> En caso de precipitaciones que inhabiliten canchas descubiertas, la administración emitirá vales de crédito equivalentes al 100% de lo abonado sin vencimiento.</li>
</ul>

<h3>4. Cuidados Generales</h3>
<p>No se permite ingresar a las pistas con vasos de vidrio, bebidas alcohólicas ni alimentos. Cuidemos los cristales y redes para disfrutar de un juego seguro y profesional.</p>',
                'esta_publicada' => true,
                'orden' => 1,
                'mostrar_en_header' => true,
                'mostrar_en_footer' => true,
                'meta_descripcion' => 'Reglamento interno, código de vestimenta, calzado obligatorio y políticas de cancelación de Padel Pro Arena.',
            ]
        );

        // 2. Nuestras Canchas y Tecnología
        Pagina::updateOrCreate(
            ['complejo_id' => $complejo->id, 'slug' => 'nuestras-canchas'],
            [
                'titulo' => 'Nuestras Canchas & Tecnología',
                'contenido_html' => '<h2>Infraestructura Profesional de Padel</h2>
<p>En <strong>Padel Pro Arena</strong> diseñamos un predio con las mejores comodidades e innovaciones tecnológicas del circuito internacional para que cada partido se sienta como una final de torneo.</p>

<h3>Pista 1: Central Cristal Panorámica (Indoor)</h3>
<p>Pista cubierta de última generación con cerramientos de cristal templado de 12mm sin montantes en los fondos, brindando una visión panorámica de 360 grados.</p>
<ul>
  <li><strong>Césped sintético monofilamento texturado:</strong> Menor impacto articular y bote perfecto en cualquier clima.</li>
  <li><strong>Sistema de Cámaras Replay HD:</strong> Grabación de partidos con código QR para revivir tus mejores tantos y repeticiones.</li>
  <li><strong>Climatización:</strong> Ambiente techado con circulación de aire forzada y aislamiento térmico.</li>
</ul>
<figure>
  <img src="/storage/tenants/padelpro/cms/cancha_cristal_panoramica.jpg" alt="Pista Central Cristal Panorámica" />
  <figcaption>Pista Central Cristal Panorámica con visión 360° y césped monofilamento azul.</figcaption>
</figure>

<h3>Pista 2: Exterior Techada</h3>
<p>Ideal para disfrutar del juego con luz natural y ventilación cruzada pero con cubierta protectora contra lluvia y sol intenso.</p>
<ul>
  <li>Marcador digital electrónico de tantos con mando a distancia para los jugadores.</li>
  <li>Iluminación LED de alta potencia sin sombras perimetrales.</li>
  <li>Espacio amplio para salidas de pista oficiales reglamentarias.</li>
</ul>
<figure>
  <img src="/storage/tenants/padelpro/cms/cancha_exterior_techada.jpg" alt="Pista Exterior Techada" />
  <figcaption>Pista Exterior Techada con marcador digital y protección climática.</figcaption>
</figure>

<h3>Pista 3: Nocturna LED Master Pro</h3>
<p>La favorita para partidos nocturnos con amigos y torneos relámpago. Equipada con 8 torres de iluminación LED de 250W con ópticas antideslumbrantes.</p>
<figure>
  <img src="/storage/tenants/padelpro/cms/cancha_nocturna_led.jpg" alt="Pista Nocturna LED Master Pro" />
  <figcaption>Pista Nocturna LED Master Pro para partidos nocturnos sin sombras.</figcaption>
</figure>',
                'esta_publicada' => true,
                'orden' => 2,
                'mostrar_en_header' => true,
                'mostrar_en_footer' => true,
                'meta_descripcion' => 'Conocé nuestras 3 pistas de pádel profesionales: cristal panorámico, césped texturado, grabación HD e iluminación LED.',
            ]
        );

        // 3. Buffet, Lounge y Tercer Tiempo
        Pagina::updateOrCreate(
            ['complejo_id' => $complejo->id, 'slug' => 'buffet-y-tercer-tiempo'],
            [
                'titulo' => 'Buffet & Tercer Tiempo',
                'contenido_html' => '<h2>El Tercer Tiempo se vive en Padel Pro</h2>
<p>El pádel no termina con el último punto. Nuestro espacio de <strong>Buffet & Sports Bar</strong> cuenta con vista directa a la Cancha Central, pantallas gigantes con partidos en vivo y una carta completa pensada para hidratarse y compartir entre amigos.</p>

<h3>Nuestra Carta</h3>
<ul>
  <li><strong>Bebidas e Hidratación:</strong> Bebidas isotónicas frías, aguas minerales, gaseosas y cervezas tiradas artesanales para después del partido.</li>
  <li><strong>Snacks y Comidas Rápidas:</strong> Tostados especiales en pan de campo, hamburguesas caseras, pizzas a la piedra y picadas para compartir.</li>
  <li><strong>Cafetería de Especialidad:</strong> Café en grano recién molido, licuados de frutas de estación y barras de cereal energéticas.</li>
</ul>

<h3>Cuenta y Cobro Unificado</h3>
<p>Podés cargar consumos de buffet directamente a tu cuenta del club o abonar el alquiler del turno y tus bebidas en un solo pago unificado en el mostrador mediante efectivo, transferencia o débito.</p>',
                'esta_publicada' => true,
                'orden' => 3,
                'mostrar_en_header' => false,
                'mostrar_en_footer' => true,
                'meta_descripcion' => 'Disfrutá del tercer tiempo en nuestro buffet climatizado con vista a la cancha central, cafetería y cervezas artesanales.',
            ]
        );
    }
}

