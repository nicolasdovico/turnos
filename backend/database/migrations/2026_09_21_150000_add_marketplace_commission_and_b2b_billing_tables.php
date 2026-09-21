<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Agregar comisión de marketplace a planes
        Schema::table('planes', function (Blueprint $table) {
            $table->decimal('comision_marketplace', 5, 2)->default(5.00)->after('precio_cancha_adicional');
        });

        // Actualizar comisiones base por plan
        DB::table('planes')->where('slug', 'bronce')->update(['comision_marketplace' => 5.00]);
        DB::table('planes')->where('slug', 'plata')->update(['comision_marketplace' => 4.00]);
        DB::table('planes')->where('slug', 'oro')->update(['comision_marketplace' => 3.00]);

        // 2. Agregar campos de estado de suscripción y gracia a complejos
        Schema::table('complejos', function (Blueprint $table) {
            $table->string('suscripcion_estado')->default('trial')->after('plan_id'); // trial, activa, gracia, vencida, suspendida
            $table->timestamp('suscripcion_trial_vence_at')->nullable()->after('suscripcion_estado');
            $table->timestamp('suscripcion_proximo_vencimiento')->nullable()->after('suscripcion_trial_vence_at');
            $table->timestamp('suscripcion_gracia_vence_at')->nullable()->after('suscripcion_proximo_vencimiento');
        });

        // Inicializar suscripción para complejos existentes (14 días trial o activa si ya tienen histórico)
        DB::table('complejos')->update([
            'suscripcion_estado' => 'trial',
            'suscripcion_trial_vence_at' => now()->addDays(14),
        ]);

        // 3. Crear tabla facturas_club (Cuentas B2B del SaaS)
        Schema::create('facturas_club', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained('planes')->nullOnDelete();
            $table->string('periodo', 7); // YYYY-MM
            $table->decimal('monto_base_plan', 10, 2)->default(0);
            $table->unsignedInteger('canchas_incluidas')->default(2);
            $table->unsignedInteger('canchas_utilizadas')->default(0);
            $table->unsignedInteger('canchas_excedentes')->default(0);
            $table->decimal('precio_cancha_adicional', 10, 2)->default(0);
            $table->decimal('monto_canchas_adicionales', 10, 2)->default(0);
            $table->decimal('monto_comisiones_marketplace', 10, 2)->default(0);
            $table->unsignedInteger('total_turnos_marketplace')->default(0);
            $table->decimal('monto_descuento', 10, 2)->default(0);
            $table->decimal('total_usd', 10, 2)->default(0);
            $table->decimal('tipo_cambio_ars', 10, 2)->nullable();
            $table->decimal('total_ars', 12, 2)->nullable();
            $table->string('estado')->default('pendiente'); // pendiente, revision_transferencia, pagada, vencida, anulada
            $table->date('fecha_emision');
            $table->date('fecha_vencimiento');
            $table->date('fecha_limite_gracia')->nullable();
            $table->timestamp('pagado_at')->nullable();
            $table->string('metodo_pago')->nullable(); // mercadopago, stripe, transferencia
            $table->string('gateway_preference_id')->nullable();
            $table->string('gateway_payment_id')->nullable();
            $table->string('comprobante_transferencia_url')->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->index(['complejo_id', 'periodo']);
            $table->index(['complejo_id', 'estado']);
        });

        // 4. Agregar campos de marketplace y vinculación de factura en turnos
        Schema::table('turnos', function (Blueprint $table) {
            $table->string('origen')->default('directo')->after('precio'); // directo, marketplace
            $table->decimal('comision_marketplace', 10, 2)->default(0)->after('origen');
            $table->decimal('comision_porcentaje', 5, 2)->default(0)->after('comision_marketplace');
            $table->foreignId('factura_club_id')->nullable()->after('comision_porcentaje')->constrained('facturas_club')->nullOnDelete();

            $table->index(['complejo_id', 'origen']);
            $table->index(['complejo_id', 'factura_club_id']);
        });
    }

    public function down(): void
    {
        Schema::table('turnos', function (Blueprint $table) {
            $table->dropForeign(['factura_club_id']);
            $table->dropColumn(['origen', 'comision_marketplace', 'comision_porcentaje', 'factura_club_id']);
        });

        Schema::dropIfExists('facturas_club');

        Schema::table('complejos', function (Blueprint $table) {
            $table->dropColumn(['suscripcion_estado', 'suscripcion_trial_vence_at', 'suscripcion_proximo_vencimiento', 'suscripcion_gracia_vence_at']);
        });

        Schema::table('planes', function (Blueprint $table) {
            $table->dropColumn('comision_marketplace');
        });
    }
};
