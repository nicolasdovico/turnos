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
        Schema::table('turnos', function (Blueprint $table) {
            $table->timestamp('recordatorio_enviado_at')->nullable()->after('estado');
        });

        Schema::table('complejos', function (Blueprint $table) {
            $table->boolean('recordatorio_whatsapp_activo')->default(true)->after('hora_inicio_luz');
            $table->integer('recordatorio_anticipacion_minutos')->default(120)->after('recordatorio_whatsapp_activo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('turnos', function (Blueprint $table) {
            $table->dropColumn('recordatorio_enviado_at');
        });

        Schema::table('complejos', function (Blueprint $table) {
            $table->dropColumn(['recordatorio_whatsapp_activo', 'recordatorio_anticipacion_minutos']);
        });
    }
};
