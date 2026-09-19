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
            $table->decimal('precio_valle', 10, 2)->nullable()->after('precio_con_luz');
            $table->decimal('precio_pico', 10, 2)->nullable()->after('precio_valle');
            $table->decimal('precio_fin_semana', 10, 2)->nullable()->after('precio_pico');
            $table->decimal('precio_luz_adicional', 10, 2)->nullable()->after('precio_fin_semana');
        });

        Schema::table('complejos', function (Blueprint $table) {
            $table->string('hora_inicio_pico_semana', 5)->default('17:00')->after('hora_inicio_luz');
            $table->string('hora_fin_pico_semana', 5)->default('23:30')->after('hora_inicio_pico_semana');
            $table->json('dias_pico_semana')->nullable()->after('hora_fin_pico_semana');
            $table->json('dias_fin_semana')->nullable()->after('dias_pico_semana');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('canchas', function (Blueprint $table) {
            $table->dropColumn([
                'precio_valle',
                'precio_pico',
                'precio_fin_semana',
                'precio_luz_adicional',
            ]);
        });

        Schema::table('complejos', function (Blueprint $table) {
            $table->dropColumn([
                'hora_inicio_pico_semana',
                'hora_fin_pico_semana',
                'dias_pico_semana',
                'dias_fin_semana',
            ]);
        });
    }
};
