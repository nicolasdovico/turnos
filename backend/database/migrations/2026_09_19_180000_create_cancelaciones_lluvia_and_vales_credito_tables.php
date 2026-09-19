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
        // 1. Tabla de Auditoría e Historial de Cancelaciones Masivas por Lluvia
        Schema::create('cancelaciones_lluvia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('fecha');
            $table->time('hora_desde')->nullable();
            $table->time('hora_hasta')->nullable();
            $table->boolean('solo_descubiertas')->default(true);
            $table->json('canchas_afectadas_ids');
            $table->integer('total_turnos_cancelados')->default(0);
            $table->integer('total_clientes_afectados')->default(0);
            $table->decimal('total_monto_reembolsado', 12, 2)->default(0.00);
            $table->string('metodo_reembolso', 30)->default('billetera_y_vales');
            $table->integer('notificaciones_whatsapp_enviadas')->default(0);
            $table->boolean('bloquear_grilla_restante')->default(true);
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index(['complejo_id', 'fecha']);
        });

        // 2. Tabla de Vales de Crédito Tokenizados (Rain Check Vouchers)
        Schema::create('vales_credito', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('turno_origen_id')->constrained('turnos')->cascadeOnDelete();
            $table->foreignId('turno_destino_id')->nullable()->constrained('turnos')->nullOnDelete();
            $table->foreignId('user_id_canje')->nullable()->constrained('users')->nullOnDelete();
            $table->string('codigo', 20)->unique();
            $table->string('token_seguro', 64)->unique();
            $table->decimal('monto', 12, 2);
            $table->decimal('saldo_restante', 12, 2);
            $table->string('cliente_nombre', 100);
            $table->string('cliente_telefono', 50)->nullable();
            $table->string('estado', 30)->default('activo'); // activo, utilizado, transferido_billetera, reembolsado_efectivo, expirado
            $table->timestamp('fecha_emision')->useCurrent();
            $table->timestamp('fecha_vencimiento')->nullable();
            $table->timestamps();

            $table->index(['complejo_id', 'estado']);
            $table->index('token_seguro');
            $table->index('codigo');
        });

        // 3. Campos adicionales en tabla turnos
        Schema::table('turnos', function (Blueprint $table) {
            $table->string('motivo_cancelacion')->nullable()->after('estado');
            $table->foreignId('cancelado_por_user_id')->nullable()->after('motivo_cancelacion')->constrained('users')->nullOnDelete();
            $table->foreignId('cancelacion_lluvia_id')->nullable()->after('cancelado_por_user_id')->constrained('cancelaciones_lluvia')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('turnos', function (Blueprint $table) {
            $table->dropForeign(['cancelacion_lluvia_id']);
            $table->dropForeign(['cancelado_por_user_id']);
            $table->dropColumn(['motivo_cancelacion', 'cancelado_por_user_id', 'cancelacion_lluvia_id']);
        });

        Schema::dropIfExists('vales_credito');
        Schema::dropIfExists('cancelaciones_lluvia');
    }
};
