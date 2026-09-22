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
        Schema::table('complejos', function (Blueprint $table) {
            $table->string('plantilla_slug', 50)->default('booking_direct')->after('dominio_personalizado');
            $table->string('logo_url', 500)->nullable()->after('plantilla_slug');
            $table->string('portada_url', 500)->nullable()->after('logo_url');
            $table->string('color_primario', 20)->default('#10b981')->after('portada_url');
            $table->string('color_secundario', 20)->default('#047857')->after('color_primario');
            $table->string('color_acento', 20)->default('#06b6d4')->after('color_secundario');
            $table->string('color_fondo', 20)->default('#020617')->after('color_acento');
            $table->string('eslogan', 255)->nullable()->after('color_fondo');
            $table->text('descripcion_corta')->nullable()->after('eslogan');
            $table->json('redes_sociales')->nullable()->after('descripcion_corta');

            $table->index('plantilla_slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('complejos', function (Blueprint $table) {
            $table->dropIndex(['plantilla_slug']);
            $table->dropColumn([
                'plantilla_slug',
                'logo_url',
                'portada_url',
                'color_primario',
                'color_secundario',
                'color_acento',
                'color_fondo',
                'eslogan',
                'descripcion_corta',
                'redes_sociales',
            ]);
        });
    }
};
