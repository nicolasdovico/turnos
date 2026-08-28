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
        Schema::create('cajas_sesiones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('monto_apertura', 10, 2)->default(0);
            $table->timestamp('fecha_apertura');
            $table->decimal('monto_cierre_declarado', 10, 2)->nullable();
            $table->timestamp('fecha_cierre')->nullable();
            $table->decimal('total_ventas_efectivo', 10, 2)->default(0);
            $table->decimal('total_ventas_digitales', 10, 2)->default(0);
            $table->decimal('total_ingresos_turnos', 10, 2)->default(0);
            $table->decimal('total_esperado_efectivo', 10, 2)->default(0);
            $table->decimal('diferencia', 10, 2)->nullable();
            $table->text('notas_cierre')->nullable();
            $table->string('estado')->default('abierta'); // abierta, cerrada
            $table->timestamps();

            $table->index(['complejo_id', 'estado']);
            $table->index(['complejo_id', 'fecha_apertura']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cajas_sesiones');
    }
};
