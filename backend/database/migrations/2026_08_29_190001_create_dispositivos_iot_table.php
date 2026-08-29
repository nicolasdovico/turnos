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
        Schema::create('dispositivos_iot', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('cancha_id')->nullable()->constrained('canchas')->cascadeOnDelete();
            $table->string('nombre');
            $table->string('tipo')->default('luces'); // luces, relay, acceso, ventilacion
            $table->string('ip_address')->nullable();
            $table->string('topic_mqtt')->nullable();
            $table->string('token_api')->nullable();
            $table->string('endpoint_url')->nullable();
            $table->integer('minutos_antelacion_encendido')->default(5);
            $table->integer('minutos_gracia_apagado')->default(5);
            $table->string('estado_actual')->default('apagado'); // encendido, apagado, error, desconectado
            $table->timestamp('ultimo_cambio_estado')->nullable();
            $table->boolean('esta_activo')->default(true);
            $table->timestamps();

            $table->index(['complejo_id', 'cancha_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dispositivos_iot');
    }
};
