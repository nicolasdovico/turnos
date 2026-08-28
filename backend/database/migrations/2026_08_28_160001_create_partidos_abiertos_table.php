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
        Schema::create('partidos_abiertos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('turno_id')->constrained('turnos')->cascadeOnDelete();
            $table->foreignId('organizador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nivel_min')->nullable();
            $table->string('nivel_max')->nullable();
            $table->integer('jugadores_requeridos')->default(4);
            $table->integer('jugadores_actuales')->default(1);
            $table->string('estado')->default('buscando'); // buscando, completo, cancelado, confirmado
            $table->string('tipo_partido')->default('competitivo'); // competitivo, amistoso, entrenamiento
            $table->timestamps();

            $table->index(['complejo_id', 'estado']);
            $table->index(['turno_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('partidos_abiertos');
    }
};
