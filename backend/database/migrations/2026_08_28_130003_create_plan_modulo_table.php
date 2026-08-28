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
        Schema::create('plan_modulo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('planes')->cascadeOnDelete();
            $table->foreignId('modulo_id')->constrained('modulos')->cascadeOnDelete();
            $table->unique(['plan_id', 'modulo_id']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plan_modulo');
    }
};
