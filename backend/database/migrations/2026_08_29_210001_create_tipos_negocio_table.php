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
        Schema::create('tipos_negocio', function (Blueprint $table) {
            $table->id();
            $table->string('nombre'); // Ej: Club, Complejo, Gimnasio
            $table->string('slug')->unique(); // Ej: club, complejo, gimnasio
            $table->text('descripcion')->nullable();
            $table->boolean('esta_activo')->default(true);
            $table->timestamps();
        });

        Schema::table('complejos', function (Blueprint $table) {
            $table->foreignId('tipo_negocio_id')
                ->nullable()
                ->after('user_id')
                ->constrained('tipos_negocio')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('complejos', function (Blueprint $table) {
            $table->dropForeign(['tipo_negocio_id']);
            $table->dropColumn('tipo_negocio_id');
        });

        Schema::dropIfExists('tipos_negocio');
    }
};
