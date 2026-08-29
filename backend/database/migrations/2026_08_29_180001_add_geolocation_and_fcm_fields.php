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
            $table->decimal('latitud', 10, 7)->nullable()->after('estado');
            $table->decimal('longitud', 10, 7)->nullable()->after('latitud');
            $table->string('direccion')->nullable()->after('longitud');
            $table->string('ciudad')->nullable()->after('direccion');
            $table->string('telefono')->nullable()->after('ciudad');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('fcm_token')->nullable()->after('password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('complejos', function (Blueprint $table) {
            $table->dropColumn(['latitud', 'longitud', 'direccion', 'ciudad', 'telefono']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['fcm_token']);
        });
    }
};
