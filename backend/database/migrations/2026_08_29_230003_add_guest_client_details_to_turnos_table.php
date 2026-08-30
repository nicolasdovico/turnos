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
            $table->string('cliente_nombre')->nullable()->after('cliente_id');
            $table->string('cliente_telefono')->nullable()->after('cliente_nombre');
            $table->string('metodo_pago')->nullable()->default('mostrador')->after('precio');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('turnos', function (Blueprint $table) {
            $table->dropColumn(['cliente_nombre', 'cliente_telefono', 'metodo_pago']);
        });
    }
};
