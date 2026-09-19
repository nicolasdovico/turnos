<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            UPDATE canchas
            SET precio_luz_adicional = GREATEST(0, precio_con_luz - precio_base)
            WHERE precio_luz_adicional IS NULL
              AND precio_con_luz IS NOT NULL
              AND precio_base IS NOT NULL
        ");
    }

    public function down(): void
    {
        // Operación no destructiva
    }
};
