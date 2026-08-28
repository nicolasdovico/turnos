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
        Schema::create('canchas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->string('nombre');
            $table->string('deporte'); // futbol, padel, tenis, etc.
            $table->string('superficie'); // sintetico, cemento, polvo_ladrillo, etc.
            $table->boolean('techada')->default(false);
            $table->decimal('precio_base', 10, 2)->default(0.00);
            $table->string('estado')->default('activo'); // activo, mantenimiento, inactivo
            $table->timestamps();

            $table->index(['complejo_id', 'deporte']);
            $table->index(['complejo_id', 'estado']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('canchas');
    }
};
