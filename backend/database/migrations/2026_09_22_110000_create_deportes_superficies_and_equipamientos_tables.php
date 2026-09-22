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
        // 1. Catálogo de Deportes
        Schema::create('deportes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('slug')->unique();
            $table->string('icono')->nullable();
            $table->boolean('tiene_paredes')->default(false);
            $table->unsignedInteger('duracion_default_minutos')->default(60);
            $table->json('formatos')->nullable();
            $table->json('paredes')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('esta_activo')->default(true);
            $table->timestamps();

            $table->index('esta_activo');
            $table->index('orden');
        });

        // 2. Catálogo de Superficies por Deporte
        Schema::create('superficies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deporte_id')->constrained('deportes')->cascadeOnDelete();
            $table->string('nombre');
            $table->string('slug');
            $table->string('descripcion')->nullable();
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('esta_activo')->default(true);
            $table->timestamps();

            $table->unique(['deporte_id', 'slug']);
            $table->index(['deporte_id', 'esta_activo']);
        });

        // 3. Catálogo de Equipamientos y Atributos de Canchas (Globales y de Club)
        Schema::create('equipamientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->nullable()->constrained('complejos')->cascadeOnDelete();
            $table->string('nombre');
            $table->string('slug');
            $table->string('icono')->nullable();
            $table->string('categoria')->default('general'); // estructura, iluminacion, tecnologia, confort, general
            $table->text('descripcion')->nullable();
            $table->json('aplica_a_deportes')->nullable(); // null = todos, o ['padel', 'tenis']
            $table->unsignedInteger('orden')->default(0);
            $table->boolean('esta_activo')->default(true);
            $table->timestamps();

            $table->index(['complejo_id', 'esta_activo']);
            $table->index('categoria');
        });

        // 4. Tabla Pivote Cancha - Equipamiento
        Schema::create('cancha_equipamiento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cancha_id')->constrained('canchas')->cascadeOnDelete();
            $table->foreignId('equipamiento_id')->constrained('equipamientos')->cascadeOnDelete();
            $table->string('valor_adicional')->nullable();
            $table->timestamps();

            $table->unique(['cancha_id', 'equipamiento_id']);
        });

        // 5. Claves foráneas opcionales en canchas para normalización relacional
        Schema::table('canchas', function (Blueprint $table) {
            $table->foreignId('deporte_id')->nullable()->after('deporte')->constrained('deportes')->nullOnDelete();
            $table->foreignId('superficie_id')->nullable()->after('superficie')->constrained('superficies')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('canchas', function (Blueprint $table) {
            $table->dropForeign(['deporte_id']);
            $table->dropForeign(['superficie_id']);
            $table->dropColumn(['deporte_id', 'superficie_id']);
        });

        Schema::dropIfExists('cancha_equipamiento');
        Schema::dropIfExists('equipamientos');
        Schema::dropIfExists('superficies');
        Schema::dropIfExists('deportes');
    }
};
