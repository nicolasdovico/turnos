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
            $table->string('timezone', 64)->default('America/Argentina/Buenos_Aires')->after('deporte_principal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('complejos', function (Blueprint $table) {
            $table->dropColumn('timezone');
        });
    }
};
