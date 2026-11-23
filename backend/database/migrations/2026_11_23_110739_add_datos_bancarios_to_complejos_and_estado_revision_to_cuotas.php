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
        Schema::table("complejos", function (Blueprint $table) {
            $table->string("banco_nombre", 100)->nullable()->after("telefono");
            $table->string("banco_cbu", 30)->nullable()->after("banco_nombre");
            $table->string("banco_alias", 50)->nullable()->after("banco_cbu");
            $table->string("banco_titular", 150)->nullable()->after("banco_alias");
            $table->string("banco_cuit", 30)->nullable()->after("banco_titular");
        });

        Schema::table("turno_pagos_divididos", function (Blueprint $table) {
            $table->string("comprobante_transferencia", 255)->nullable()->after("metodo_pago");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table("complejos", function (Blueprint $table) {
            $table->dropColumn([
                "banco_nombre",
                "banco_cbu",
                "banco_alias",
                "banco_titular",
                "banco_cuit",
            ]);
        });

        Schema::table("turno_pagos_divididos", function (Blueprint $table) {
            $table->dropColumn("comprobante_transferencia");
        });
    }
};
