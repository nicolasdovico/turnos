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
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('turno_id')->nullable()->constrained('turnos')->nullOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('users')->nullOnDelete(); // Cajero / Operador
            $table->foreignId('cliente_id')->nullable()->constrained('users')->nullOnDelete(); // Cliente
            $table->string('numero_comprobante')->nullable();
            $table->string('tipo_pago')->default('efectivo'); // efectivo, tarjeta_debito, tarjeta_credito, transferencia, mercado_pago, cuenta_corriente, cuenta_turno
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('descuento', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->string('estado')->default('completada'); // completada, pendiente, cancelada
            $table->timestamps();

            $table->index(['complejo_id', 'estado']);
            $table->index(['complejo_id', 'turno_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
