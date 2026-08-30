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
        Schema::create('user_creditos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('complejo_id')->constrained('complejos')->onDelete('cascade');
            $table->decimal('saldo', 10, 2)->default(0.00);
            $table->timestamps();

            $table->unique(['user_id', 'complejo_id']);
        });

        Schema::create('wallet_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('complejo_id')->constrained('complejos')->onDelete('cascade');
            $table->foreignId('turno_id')->nullable()->constrained('turnos')->onDelete('set null');
            $table->decimal('monto', 10, 2);
            $table->string('tipo', 50); // 'reembolso_cancelacion', 'uso_reserva', 'ajuste_manual'
            $table->string('descripcion', 255)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallet_movimientos');
        Schema::dropIfExists('user_creditos');
    }
};
