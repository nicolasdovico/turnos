<?php

namespace Tests\Unit;

use App\Models\Cancha;
use PHPUnit\Framework\TestCase;

class CanchaPricingTest extends TestCase
{
    public function test_cancha_duracion_fija_90_minutos_usa_precio_base(): void
    {
        $cancha = new Cancha([
            'duracion_minutos' => 90,
            'permite_duracion_flexible' => false,
            'precio_base' => '10000.00',
            'precio_90_min' => null,
            'precio_120_min' => null,
        ]);

        // Un turno de 90 minutos en cancha fija de 90 min debe costar el precio_base ($10000), no $15000
        $this->assertEquals(10000.00, $cancha->getPrecioParaDuracion(90));
    }

    public function test_cancha_duracion_fija_90_minutos_con_tarifa_especifica(): void
    {
        $cancha = new Cancha([
            'duracion_minutos' => 90,
            'permite_duracion_flexible' => false,
            'precio_base' => '10000.00',
            'precio_90_min' => '9500.00',
        ]);

        $this->assertEquals(9500.00, $cancha->getPrecioParaDuracion(90));
    }

    public function test_cancha_duracion_flexible_60_minutos_prorratea_a_90_minutos(): void
    {
        $cancha = new Cancha([
            'duracion_minutos' => 60,
            'permite_duracion_flexible' => true,
            'precio_base' => '10000.00',
            'precio_90_min' => null,
        ]);

        // En cancha de 60 min sin precio_90_min explícito, 90 min cuesta 1.5x ($15000)
        $this->assertEquals(10000.00, $cancha->getPrecioParaDuracion(60));
        $this->assertEquals(15000.00, $cancha->getPrecioParaDuracion(90));
        $this->assertEquals(20000.00, $cancha->getPrecioParaDuracion(120));
        $this->assertEquals(5000.00, $cancha->getPrecioParaDuracion(30));
    }

    public function test_cancha_duracion_flexible_con_precios_personalizados(): void
    {
        $cancha = new Cancha([
            'duracion_minutos' => 60,
            'permite_duracion_flexible' => true,
            'precio_base' => '8000.00',
            'precio_90_min' => '11000.00',
            'precio_120_min' => '14000.00',
        ]);

        $this->assertEquals(8000.00, $cancha->getPrecioParaDuracion(60));
        $this->assertEquals(11000.00, $cancha->getPrecioParaDuracion(90));
        $this->assertEquals(14000.00, $cancha->getPrecioParaDuracion(120));
    }

    public function test_cancha_duracion_fija_120_minutos(): void
    {
        $cancha = new Cancha([
            'duracion_minutos' => 120,
            'permite_duracion_flexible' => false,
            'precio_base' => '18000.00',
            'precio_120_min' => null,
        ]);

        $this->assertEquals(18000.00, $cancha->getPrecioParaDuracion(120));
    }
}
