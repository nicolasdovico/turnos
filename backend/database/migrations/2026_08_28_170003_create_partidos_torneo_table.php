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
        Schema::create('partidos_torneo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('torneo_id')->constrained('torneos')->cascadeOnDelete();
            $table->foreignId('turno_id')->nullable()->constrained('turnos')->nullOnDelete();
            $table->foreignId('cancha_id')->nullable()->constrained('canchas')->nullOnDelete();
            $table->string('fase'); // dieciseisavos, octavos, cuartos, semifinal, final, jornada_1, etc.
            $table->integer('ronda')->default(1);
            $table->integer('posicion_llave')->default(1); // 1, 2, 3...
            $table->foreignId('siguiente_partido_id')->nullable()->constrained('partidos_torneo')->nullOnDelete();
            $table->foreignId('equipo_local_id')->nullable()->constrained('equipos_torneo')->nullOnDelete();
            $table->foreignId('equipo_visitante_id')->nullable()->constrained('equipos_torneo')->nullOnDelete();
            $table->foreignId('ganador_id')->nullable()->constrained('equipos_torneo')->nullOnDelete();
            $table->date('fecha')->nullable();
            $table->time('hora')->nullable();
            $table->string('resultado_local')->nullable(); // Ej: "6-4, 7-5"
            $table->string('resultado_visitante')->nullable();
            $table->integer('score_local')->default(0);
            $table->integer('score_visitante')->default(0);
            $table->string('estado')->default('pendiente'); // pendiente, programado, en_juego, finalizado, cancelado
            $table->timestamps();

            $table->index(['complejo_id', 'torneo_id']);
            $table->index(['torneo_id', 'fase']);
            $table->index(['siguiente_partido_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('partidos_torneo');
    }
};
