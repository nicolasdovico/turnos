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
        Schema::table('paginas', function (Blueprint $table) {
            $table->integer('orden')->default(0)->after('esta_publicada');
            $table->boolean('mostrar_en_header')->default(false)->after('orden');
            $table->boolean('mostrar_en_footer')->default(false)->after('mostrar_en_header');
            $table->string('meta_descripcion', 160)->nullable()->after('mostrar_en_footer');

            $table->index(['complejo_id', 'mostrar_en_header']);
            $table->index(['complejo_id', 'mostrar_en_footer']);
            $table->index(['complejo_id', 'orden']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('paginas', function (Blueprint $table) {
            $table->dropIndex(['complejo_id', 'mostrar_en_header']);
            $table->dropIndex(['complejo_id', 'mostrar_en_footer']);
            $table->dropIndex(['complejo_id', 'orden']);
            $table->dropColumn([
                'orden',
                'mostrar_en_header',
                'mostrar_en_footer',
                'meta_descripcion',
            ]);
        });
    }
};
