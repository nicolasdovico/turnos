<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table("turnos")
            ->join("partidos_abiertos", "turnos.id", "=", "partidos_abiertos.turno_id")
            ->whereIn("partidos_abiertos.estado", ["buscando", "completo"])
            ->where("turnos.estado", "disponible")
            ->update([
                "turnos.estado" => "bloqueado",
                "turnos.metodo_pago" => "split",
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    }
};
