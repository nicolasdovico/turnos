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
        Schema::table('canchas', function (Blueprint $table) {
            $table->boolean('iluminacion')->default(true)->after('precio_base');
            $table->string('tipo_iluminacion')->nullable()->default('led')->after('iluminacion');
            $table->decimal('precio_con_luz', 10, 2)->nullable()->after('tipo_iluminacion');
            $table->boolean('camara_grabacion')->default(false)->after('precio_con_luz');
            $table->boolean('marcador_digital')->default(false)->after('camara_grabacion');
            $table->boolean('climatizada')->default(false)->after('marcador_digital');
            $table->string('tipo_cubierta')->nullable()->default('outdoor')->after('climatizada'); // indoor, outdoor, semicubierta
            $table->string('tipo_pared')->nullable()->after('tipo_cubierta'); // cristal_panoramico, cristal_estandar, cemento, reja
            $table->string('formato')->nullable()->after('tipo_pared'); // dobles, single, f5, f7, f8, f11, 3x3, 5x5
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('canchas', function (Blueprint $table) {
            $table->dropColumn([
                'iluminacion',
                'tipo_iluminacion',
                'precio_con_luz',
                'camara_grabacion',
                'marcador_digital',
                'climatizada',
                'tipo_cubierta',
                'tipo_pared',
                'formato',
            ]);
        });
    }
};
