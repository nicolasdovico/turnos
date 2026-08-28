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
        Schema::create('turno_pagos_divididos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('turno_id')->constrained('turnos')->cascadeOnDelete();
            $table->foreignId('partido_abierto_id')->nullable()->constrained('partidos_abiertos')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nombre_jugador')->nullable();
            $table->string('email_jugador')->nullable();
            $table->decimal('monto', 10, 2);
            $table->integer('cuota_numero');
            $table->integer('total_cuotas');
            $table->uuid('token_pago')->unique();
            $table->string('estado')->default('pendiente'); // pendiente, pagado, cancelado
            $table->string('metodo_pago')->nullable(); // tarjeta, mercadopago, efectivo, transferencia
            $table->timestamp('pagado_en')->nullable();
            $table->timestamps();

            $table->index(['complejo_id', 'estado']);
            $table->index(['turno_id', 'estado']);
            $table->index(['token_pago']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('turno_pagos_divididos');
    }
};
