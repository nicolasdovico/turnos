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
        Schema::create('equipos_torneo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('torneo_id')->constrained('torneos')->cascadeOnDelete();
            $table->foreignId('capitan_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nombre');
            $table->string('jugador_1_nombre')->nullable();
            $table->string('jugador_2_nombre')->nullable();
            $table->string('contacto_email')->nullable();
            $table->string('contacto_telefono')->nullable();
            $table->integer('semilla')->nullable(); // Seeding: 1, 2, 3...
            $table->integer('puntos')->default(0);
            $table->integer('partidos_jugados')->default(0);
            $table->integer('partidos_ganados')->default(0);
            $table->integer('partidos_empatados')->default(0);
            $table->integer('partidos_perdidos')->default(0);
            $table->integer('sets_favor')->default(0);
            $table->integer('sets_contra')->default(0);
            $table->integer('diferencia_sets')->default(0);
            $table->string('estado')->default('confirmado'); // inscripto, confirmado, eliminado, campeon
            $table->timestamps();

            $table->index(['complejo_id', 'torneo_id']);
            $table->index(['torneo_id', 'puntos']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipos_torneo');
    }
};
