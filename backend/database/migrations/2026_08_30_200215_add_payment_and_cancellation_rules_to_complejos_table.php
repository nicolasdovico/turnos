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
        Schema::table('complejos', function (Blueprint $table) {
            $table->string('tipo_cobro_reserva', 30)->default('sena')->after('timezone'); // 'sena', 'total', 'flexible'
            $table->decimal('porcentaje_sena', 5, 2)->default(50.00)->after('tipo_cobro_reserva');
            $table->decimal('monto_sena_fijo', 10, 2)->nullable()->after('porcentaje_sena');
            $table->boolean('permite_mostrador_publico')->default(false)->after('monto_sena_fijo');
            $table->unsignedInteger('horas_limite_cancelacion')->default(4)->after('permite_mostrador_publico');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('complejos', function (Blueprint $table) {
            $table->dropColumn([
                'tipo_cobro_reserva',
                'porcentaje_sena',
                'monto_sena_fijo',
                'permite_mostrador_publico',
                'horas_limite_cancelacion',
            ]);
        });
    }
};
