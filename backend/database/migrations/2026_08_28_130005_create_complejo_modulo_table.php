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
        Schema::create('complejo_modulo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('modulo_id')->constrained('modulos')->cascadeOnDelete();
            $table->boolean('esta_activo')->default(true);
            $table->timestamp('valido_hasta')->nullable();
            $table->unique(['complejo_id', 'modulo_id']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complejo_modulo');
    }
};
