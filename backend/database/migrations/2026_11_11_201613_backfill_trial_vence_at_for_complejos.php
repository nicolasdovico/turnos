<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Asignar 30 días de prueba desde created_at (o desde ahora) a todos los complejos en trial que tengan fecha nula
        DB::table('complejos')
            ->where('suscripcion_estado', 'trial')
            ->whereNull('suscripcion_trial_vence_at')
            ->update([
                'suscripcion_trial_vence_at' => DB::raw("COALESCE(created_at, NOW()) + INTERVAL '30 days'"),
            ]);

        // Por si algún motor no soporta INTERVAL postgres directamente o tiene fecha por defecto:
        DB::table('complejos')
            ->where('suscripcion_estado', 'trial')
            ->whereNull('suscripcion_trial_vence_at')
            ->update([
                'suscripcion_trial_vence_at' => now()->addDays(30),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
