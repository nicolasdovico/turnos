<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Turnos activos sin pagos registrados cuyo saldo_pendiente figure en 0
        DB::table('turnos')
            ->whereNotIn('estado', ['cancelado', 'rechazado', 'anulado'])
            ->where('precio', '>', 0)
            ->where('monto_pagado', '<=', 0)
            ->where('saldo_pendiente', '<=', 0)
            ->whereNotIn('estado_pago', ['pagado', 'pagado_total'])
            ->update([
                'saldo_pendiente' => DB::raw('precio'),
                'estado_pago' => 'pendiente',
            ]);

        // 2. Turnos activos con seña parcial donde saldo_pendiente figure en 0
        DB::table('turnos')
            ->whereNotIn('estado', ['cancelado', 'rechazado', 'anulado'])
            ->where('precio', '>', 0)
            ->where('monto_pagado', '>', 0)
            ->whereRaw('monto_pagado < precio')
            ->where('saldo_pendiente', '<=', 0)
            ->whereNotIn('estado_pago', ['pagado', 'pagado_total'])
            ->update([
                'saldo_pendiente' => DB::raw('precio - monto_pagado'),
                'estado_pago' => 'senado',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructivo
    }
};
