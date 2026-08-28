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
        Schema::create('paginas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->string('titulo');
            $table->string('slug');
            $table->longText('contenido_html');
            $table->boolean('esta_publicada')->default(true);
            $table->timestamps();

            $table->unique(['complejo_id', 'slug']);
            $table->index(['complejo_id', 'esta_publicada']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paginas');
    }
};
