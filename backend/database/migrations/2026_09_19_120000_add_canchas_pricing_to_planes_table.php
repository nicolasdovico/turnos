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
        Schema::table('planes', function (Blueprint $table) {
            $table->unsignedInteger('canchas_incluidas')->default(2)->after('precio_mensual');
            $table->decimal('precio_cancha_adicional', 10, 2)->default(8.00)->after('canchas_incluidas');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('planes', function (Blueprint $table) {
            $table->dropColumn(['canchas_incluidas', 'precio_cancha_adicional']);
        });
    }
};
