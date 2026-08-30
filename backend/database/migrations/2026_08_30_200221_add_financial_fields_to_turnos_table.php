<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('turnos', function (Blueprint $table) {
            $table->decimal('monto_pagado', 10, 2)->default(0.00)->after('precio');
            $table->decimal('saldo_pendiente', 10, 2)->default(0.00)->after('monto_pagado');
            $table->string('estado_pago', 30)->default('pendiente')->after('metodo_pago'); // 'pendiente', 'senado', 'pagado_total', 'reembolsado'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('turnos', function (Blueprint $table) {
            $table->dropColumn([
                'monto_pagado',
                'saldo_pendiente',
                'estado_pago',
            ]);
        });
    }
};
