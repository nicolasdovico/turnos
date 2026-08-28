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
        Schema::create('torneos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->string('nombre');
            $table->string('slug');
            $table->string('deporte')->default('padel'); // padel, futbol, tenis
            $table->string('formato')->default('eliminacion_directa'); // eliminacion_directa, todos_contra_todos, fase_grupos
            $table->string('categoria')->nullable(); // 4ta, 5ta, Mixto B, Libre
            $table->integer('max_equipos')->default(8);
            $table->date('fecha_inicio')->nullable();
            $table->date('fecha_fin')->nullable();
            $table->decimal('precio_inscripcion', 10, 2)->default(0.00);
            $table->string('estado')->default('inscripciones_abiertas'); // inscripciones_abiertas, en_progreso, finalizado, cancelado
            $table->text('reglas')->nullable();
            $table->timestamps();

            $table->index(['complejo_id', 'estado']);
            $table->index(['complejo_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('torneos');
    }
};
