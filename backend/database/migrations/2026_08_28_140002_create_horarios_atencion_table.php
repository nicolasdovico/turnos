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
        Schema::create('horarios_atencion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->unsignedTinyInteger('dia_semana'); // 0 (Domingo) a 6 (Sábado)
            $table->time('hora_apertura');
            $table->time('hora_cierre');
            $table->unsignedSmallInteger('duracion_turno_minutos')->default(60);
            $table->timestamps();

            $table->index(['complejo_id', 'dia_semana']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('horarios_atencion');
    }
};
