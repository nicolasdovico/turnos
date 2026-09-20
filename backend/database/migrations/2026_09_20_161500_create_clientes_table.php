<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nombre', 150);
            $table->string('telefono', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('dni', 50)->nullable();
            $table->text('notas')->nullable();
            $table->string('estado', 30)->default('activo'); // 'activo', 'bloqueado'
            $table->string('motivo_bloqueo', 255)->nullable();
            $table->timestamps();

            $table->index(['complejo_id', 'nombre']);
            $table->index(['complejo_id', 'telefono']);
            $table->index(['complejo_id', 'email']);
            $table->index(['complejo_id', 'estado']);
        });

        Schema::table('turnos', function (Blueprint $table) {
            $table->foreignId('club_cliente_id')->nullable()->after('cliente_id')->constrained('clientes')->nullOnDelete();
        });

        // Backfill inteligente de clientes existentes a partir de turnos, billeteras y vales
        $complejos = DB::table('complejos')->select('id')->get();

        foreach ($complejos as $complejo) {
            $complejoId = $complejo->id;

            // 1. Clientes desde turnos con cliente_id (usuarios registrados)
            $turnosConUser = DB::table('turnos')
                ->where('complejo_id', $complejoId)
                ->whereNotNull('cliente_id')
                ->select('cliente_id')
                ->distinct()
                ->get();

            foreach ($turnosConUser as $tUser) {
                $user = DB::table('users')->where('id', $tUser->cliente_id)->first();
                if ($user) {
                    $clienteId = DB::table('clientes')->insertGetId([
                        'complejo_id' => $complejoId,
                        'user_id' => $user->id,
                        'nombre' => $user->name ?: 'Jugador',
                        'telefono' => $user->telefono ?: null,
                        'email' => $user->email ?: null,
                        'notas' => null,
                        'estado' => 'activo',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('turnos')
                        ->where('complejo_id', $complejoId)
                        ->where('cliente_id', $user->id)
                        ->update(['club_cliente_id' => $clienteId]);
                }
            }

            // 2. Clientes desde turnos de mostrador (sin cliente_id pero con cliente_nombre o cliente_telefono)
            $turnosMostrador = DB::table('turnos')
                ->where('complejo_id', $complejoId)
                ->whereNull('cliente_id')
                ->where(function ($query) {
                    $query->whereNotNull('cliente_nombre')
                          ->orWhereNotNull('cliente_telefono');
                })
                ->select('cliente_nombre', 'cliente_telefono')
                ->distinct()
                ->get();

            foreach ($turnosMostrador as $tMos) {
                $nombre = trim($tMos->cliente_nombre ?: 'Cliente Mostrador');
                $telefono = trim($tMos->cliente_telefono ?: '');

                // Verificar si ya existe un cliente con ese teléfono en este complejo
                $existente = null;
                if (!empty($telefono)) {
                    $existente = DB::table('clientes')
                        ->where('complejo_id', $complejoId)
                        ->where('telefono', $telefono)
                        ->first();
                }

                if (!$existente) {
                    $clienteId = DB::table('clientes')->insertGetId([
                        'complejo_id' => $complejoId,
                        'user_id' => null,
                        'nombre' => $nombre,
                        'telefono' => !empty($telefono) ? $telefono : null,
                        'email' => null,
                        'notas' => null,
                        'estado' => 'activo',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $clienteId = $existente->id;
                }

                DB::table('turnos')
                    ->where('complejo_id', $complejoId)
                    ->whereNull('cliente_id')
                    ->where(function ($query) use ($nombre, $telefono) {
                        if (!empty($telefono)) {
                            $query->where('cliente_telefono', $telefono);
                        } else {
                            $query->where('cliente_nombre', $nombre);
                        }
                    })
                    ->update(['club_cliente_id' => $clienteId]);
            }

            // 3. Clientes con billeteras virtuales (user_creditos) que quizás no hayan jugado aún
            $userCreditos = DB::table('user_creditos')
                ->where('complejo_id', $complejoId)
                ->select('user_id')
                ->distinct()
                ->get();

            foreach ($userCreditos as $uc) {
                $yaExiste = DB::table('clientes')
                    ->where('complejo_id', $complejoId)
                    ->where('user_id', $uc->user_id)
                    ->exists();

                if (!$yaExiste) {
                    $user = DB::table('users')->where('id', $uc->user_id)->first();
                    if ($user) {
                        DB::table('clientes')->insert([
                            'complejo_id' => $complejoId,
                            'user_id' => $user->id,
                            'nombre' => $user->name ?: 'Jugador',
                            'telefono' => $user->telefono ?: null,
                            'email' => $user->email ?: null,
                            'notas' => null,
                            'estado' => 'activo',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            // 4. Clientes con vales de crédito (vales_credito)
            if (Schema::hasTable('vales_credito')) {
                $vales = DB::table('vales_credito')
                    ->where('complejo_id', $complejoId)
                    ->select('user_id_canje', 'cliente_nombre', 'cliente_telefono')
                    ->distinct()
                    ->get();

                foreach ($vales as $vale) {
                    $yaExiste = false;
                    if ($vale->user_id_canje) {
                        $yaExiste = DB::table('clientes')
                            ->where('complejo_id', $complejoId)
                            ->where('user_id', $vale->user_id_canje)
                            ->exists();
                    } elseif (!empty($vale->cliente_telefono)) {
                        $yaExiste = DB::table('clientes')
                            ->where('complejo_id', $complejoId)
                            ->where('telefono', $vale->cliente_telefono)
                            ->exists();
                    }

                    if (!$yaExiste && (!empty($vale->cliente_nombre) || !empty($vale->cliente_telefono) || $vale->user_id_canje)) {
                        $user = $vale->user_id_canje ? DB::table('users')->where('id', $vale->user_id_canje)->first() : null;
                        DB::table('clientes')->insert([
                            'complejo_id' => $complejoId,
                            'user_id' => $vale->user_id_canje ?: null,
                            'nombre' => $user ? $user->name : ($vale->cliente_nombre ?: 'Cliente Vale'),
                            'telefono' => $user ? ($user->telefono ?: $vale->cliente_telefono) : $vale->cliente_telefono,
                            'email' => $user ? $user->email : null,
                            'notas' => 'Cliente receptor de Vale de Crédito',
                            'estado' => 'activo',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('turnos', function (Blueprint $table) {
            $table->dropForeign(['club_cliente_id']);
            $table->dropColumn('club_cliente_id');
        });

        Schema::dropIfExists('clientes');
    }
};
