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
        Schema::table('canchas', function (Blueprint $table) {
            $table->unsignedSmallInteger('duracion_minutos')->default(60)->after('formato');
            $table->boolean('permite_duracion_flexible')->default(false)->after('duracion_minutos');
            $table->json('duraciones_permitidas')->nullable()->after('permite_duracion_flexible');
            $table->decimal('precio_90_min', 10, 2)->nullable()->after('duraciones_permitidas');
            $table->decimal('precio_120_min', 10, 2)->nullable()->after('precio_90_min');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('canchas', function (Blueprint $table) {
            $table->dropColumn([
                'duracion_minutos',
                'permite_duracion_flexible',
                'duraciones_permitidas',
                'precio_90_min',
                'precio_120_min',
            ]);
        });
    }
};
