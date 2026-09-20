<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Complejo;
use App\Models\Turno;
use App\Models\User;
use App\Models\UserCredito;
use App\Models\ValeCredito;
use App\Models\WalletMovimiento;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClubClienteService
{
    /**
     * Busca un cliente existente en el club o lo crea automáticamente.
     */
    public function obtenerOCrearCliente(
        int $complejoId,
        ?int $userId,
        string $nombre,
        ?string $telefono = null,
        ?string $email = null
    ): Cliente {
        $nombre = trim($nombre) ?: 'Cliente Mostrador';
        $telefono = !empty($telefono) ? trim($telefono) : null;
        $email = !empty($email) ? strtolower(trim($email)) : null;

        $cliente = null;

        // 1. Buscar por user_id si está autenticado
        if ($userId) {
            $cliente = Cliente::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('user_id', $userId)
                ->first();
        }

        // 2. Buscar por teléfono si no se encontró
        if (!$cliente && !empty($telefono)) {
            $cliente = Cliente::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('telefono', $telefono)
                ->first();
        }

        // 3. Buscar por email si no se encontró
        if (!$cliente && !empty($email)) {
            $cliente = Cliente::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('email', $email)
                ->first();
        }

        if ($cliente) {
            // Actualizar datos faltantes si ahora se proporcionan
            $dirty = false;
            if (!$cliente->user_id && $userId) {
                $cliente->user_id = $userId;
                $dirty = true;
            }
            if (empty($cliente->telefono) && !empty($telefono)) {
                $cliente->telefono = $telefono;
                $dirty = true;
            }
            if (empty($cliente->email) && !empty($email)) {
                $cliente->email = $email;
                $dirty = true;
            }
            if ($dirty) {
                $cliente->save();
            }
            return $cliente;
        }

        // Si el email corresponde a un usuario existente, asociarlo
        if (!$userId && !empty($email)) {
            $existingUser = User::where('email', $email)->first();
            if ($existingUser) {
                $userId = $existingUser->id;
            }
        }

        return Cliente::create([
            'complejo_id' => $complejoId,
            'user_id' => $userId,
            'nombre' => $nombre,
            'telefono' => $telefono,
            'email' => $email,
            'estado' => 'activo',
        ]);
    }

    /**
     * Listado filtrado y paginado de clientes con cálculo de métricas consolidadas.
     */
    public function listarClientes(int $complejoId, array $filtros, int $perPage = 20): array
    {
        $search = trim($filtros['search'] ?? '');
        $estado = trim($filtros['estado'] ?? 'todos');
        $filtro = trim($filtros['filtro'] ?? 'todos');

        $query = Cliente::withoutGlobalScopes()
            ->where('complejo_id', $complejoId);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'ilike', "%{$search}%")
                  ->orWhere('telefono', 'like', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('dni', 'like', "%{$search}%");
            });
        }

        if ($estado !== 'todos' && in_array($estado, ['activo', 'bloqueado'])) {
            $query->where('estado', $estado);
        }

        if ($filtro === 'bloqueados') {
            $query->where('estado', 'bloqueado');
        } elseif ($filtro === 'con_saldo') {
            // Clientes con saldo en billetera
            $userIdsConSaldo = UserCredito::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('saldo', '>', 0)
                ->pluck('user_id');

            $query->whereIn('user_id', $userIdsConSaldo);
        } elseif ($filtro === 'con_vales') {
            // Clientes con vales activos
            $valesActivos = ValeCredito::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('estado', 'activo')
                ->get();

            $valesUserIds = $valesActivos->pluck('user_id_canje')->filter();
            $valesTelefonos = $valesActivos->pluck('cliente_telefono')->filter();

            $query->where(function ($q) use ($valesUserIds, $valesTelefonos) {
                if ($valesUserIds->isNotEmpty()) {
                    $q->whereIn('user_id', $valesUserIds);
                }
                if ($valesTelefonos->isNotEmpty()) {
                    $q->orWhereIn('telefono', $valesTelefonos);
                }
            });
        }

        // Métricas globales del club
        $totalClientes = Cliente::withoutGlobalScopes()->where('complejo_id', $complejoId)->count();
        $clientesBloqueados = Cliente::withoutGlobalScopes()->where('complejo_id', $complejoId)->where('estado', 'bloqueado')->count();

        $inicioMes = Carbon::now()->startOfMonth()->toDateString();
        $finMes = Carbon::now()->endOfMonth()->toDateString();

        $clientesActivosMes = Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->whereBetween('fecha', [$inicioMes, $finMes])
            ->where('estado', '!=', 'cancelado')
            ->whereNotNull('club_cliente_id')
            ->distinct('club_cliente_id')
            ->count('club_cliente_id');

        $totalSaldoBilleteras = (float) UserCredito::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->sum('saldo');

        $valesActivosCount = ValeCredito::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where('estado', 'activo')
            ->count();

        // Paginación de clientes
        $paginator = $query->orderBy('nombre', 'asc')
            ->paginate($perPage);

        $hoy = Carbon::today()->toDateString();
        $horaActual = Carbon::now()->toTimeString();

        // Enriquecer cada cliente con conteos de turnos y saldo
        $clientesItems = collect($paginator->items())->map(function (Cliente $c) use ($complejoId, $hoy, $horaActual) {
            $turnosBase = Turno::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where(function ($q) use ($c) {
                    $q->where('club_cliente_id', $c->id);
                    if ($c->user_id) {
                        $q->orWhere(function ($q2) use ($c) {
                            $q2->where('cliente_id', $c->user_id)
                               ->where(function ($q3) use ($c) {
                                   $q3->whereNull('club_cliente_id')
                                      ->orWhere('club_cliente_id', $c->id);
                               });
                        });
                    }
                    if (!empty($c->telefono)) {
                        $q->orWhere(function ($q2) use ($c) {
                            $q2->whereNull('club_cliente_id')
                               ->whereNull('cliente_id')
                               ->where('cliente_telefono', $c->telefono);
                        });
                    }
                });

            $totalTurnos = (clone $turnosBase)->count();

            $turnosCancelados = (clone $turnosBase)
                ->where('estado', 'cancelado')
                ->count();

            // Turnos jugados: pasados y no cancelados
            $turnosJugados = (clone $turnosBase)
                ->where('estado', '!=', 'cancelado')
                ->where(function ($q) use ($hoy, $horaActual) {
                    $q->where('fecha', '<', $hoy)
                      ->orWhere(function ($q2) use ($hoy, $horaActual) {
                          $q2->where('fecha', '=', $hoy)
                             ->where('hora_fin', '<=', $horaActual);
                      });
                })
                ->count();

            // Turnos futuros: agendados en el futuro y no cancelados
            $turnosFuturos = (clone $turnosBase)
                ->where('estado', '!=', 'cancelado')
                ->where(function ($q) use ($hoy, $horaActual) {
                    $q->where('fecha', '>', $hoy)
                      ->orWhere(function ($q2) use ($hoy, $horaActual) {
                          $q2->where('fecha', '=', $hoy)
                             ->where('hora_fin', '>', $horaActual);
                      });
                })
                ->count();

            // Último turno jugado (estrictamente pasado, no cancelado)
            $ultimoTurno = (clone $turnosBase)
                ->with('cancha:id,nombre')
                ->where('estado', '!=', 'cancelado')
                ->where(function ($q) use ($hoy, $horaActual) {
                    $q->where('fecha', '<', $hoy)
                      ->orWhere(function ($q2) use ($hoy, $horaActual) {
                          $q2->where('fecha', '=', $hoy)
                             ->where('hora_fin', '<=', $horaActual);
                      });
                })
                ->orderBy('fecha', 'desc')
                ->orderBy('hora_inicio', 'desc')
                ->first();

            // Próximo turno en agenda (estrictamente futuro, no cancelado)
            $proximoTurno = (clone $turnosBase)
                ->with('cancha:id,nombre')
                ->where('estado', '!=', 'cancelado')
                ->where(function ($q) use ($hoy, $horaActual) {
                    $q->where('fecha', '>', $hoy)
                      ->orWhere(function ($q2) use ($hoy, $horaActual) {
                          $q2->where('fecha', '=', $hoy)
                             ->where('hora_fin', '>', $horaActual);
                      });
                })
                ->orderBy('fecha', 'asc')
                ->orderBy('hora_inicio', 'asc')
                ->first();

            $saldo = $c->saldo_billetera;
            $valesCount = $c->valesActivos()->count();

            return [
                'id' => $c->id,
                'user_id' => $c->user_id,
                'nombre' => $c->nombre,
                'telefono' => $c->telefono,
                'email' => $c->email,
                'dni' => $c->dni,
                'notas' => $c->notas,
                'estado' => $c->estado,
                'motivo_bloqueo' => $c->motivo_bloqueo,
                'saldo_billetera' => $saldo,
                'vales_activos_count' => $valesCount,
                'total_turnos' => $totalTurnos,
                'turnos_jugados' => $turnosJugados,
                'turnos_futuros' => $turnosFuturos,
                'turnos_cancelados' => $turnosCancelados,
                'ultimo_turno' => $ultimoTurno ? [
                    'fecha' => $ultimoTurno->fecha ? $ultimoTurno->fecha->format('Y-m-d') : null,
                    'hora_inicio' => substr($ultimoTurno->hora_inicio, 0, 5),
                    'cancha_nombre' => $ultimoTurno->cancha?->nombre ?? 'Cancha',
                    'estado' => $ultimoTurno->estado,
                ] : null,
                'proximo_turno' => $proximoTurno ? [
                    'fecha' => $proximoTurno->fecha ? $proximoTurno->fecha->format('Y-m-d') : null,
                    'hora_inicio' => substr($proximoTurno->hora_inicio, 0, 5),
                    'cancha_nombre' => $proximoTurno->cancha?->nombre ?? 'Cancha',
                    'estado' => $proximoTurno->estado,
                ] : null,
                'created_at' => $c->created_at ? $c->created_at->toIso8601String() : null,
            ];
        });

        return [
            'metricas' => [
                'total_clientes' => $totalClientes,
                'clientes_activos_mes' => $clientesActivosMes,
                'total_saldo_billeteras' => round($totalSaldoBilleteras, 2),
                'vales_activos_count' => $valesActivosCount,
                'clientes_bloqueados' => $clientesBloqueados,
            ],
            'paginacion' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'clientes' => $clientesItems,
        ];
    }

    /**
     * Ficha 360° detallada del cliente.
     */
    public function obtenerFichaCliente(int $complejoId, int $clienteId): array
    {
        $cliente = Cliente::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where('id', $clienteId)
            ->first();

        if (!$cliente) {
            throw ValidationException::withMessages([
                'cliente' => ['El cliente especificado no existe en este club.'],
            ]);
        }

        $hoy = Carbon::today()->toDateString();
        $horaActual = Carbon::now()->toTimeString();

        $turnosQueryBase = function () use ($complejoId, $cliente) {
            return Turno::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where(function ($q) use ($cliente) {
                    $q->where('club_cliente_id', $cliente->id);
                    if ($cliente->user_id) {
                        $q->orWhere(function ($q2) use ($cliente) {
                            $q2->where('cliente_id', $cliente->user_id)
                               ->where(function ($q3) use ($cliente) {
                                   $q3->whereNull('club_cliente_id')
                                      ->orWhere('club_cliente_id', $cliente->id);
                               });
                        });
                    }
                    if (!empty($cliente->telefono)) {
                        $q->orWhere(function ($q2) use ($cliente) {
                            $q2->whereNull('club_cliente_id')
                               ->whereNull('cliente_id')
                               ->where('cliente_telefono', $cliente->telefono);
                        });
                    }
                });
        };

        // Turnos futuros (próximos en agenda, ordenados cronológicamente desde el más próximo)
        $turnosFuturos = $turnosQueryBase()
            ->with('cancha:id,nombre')
            ->where(function ($q) use ($hoy, $horaActual) {
                $q->where('fecha', '>', $hoy)
                  ->orWhere(function ($q2) use ($hoy, $horaActual) {
                      $q2->where('fecha', '=', $hoy)
                         ->where('hora_fin', '>', $horaActual);
                  });
            })
            ->orderBy('fecha', 'asc')
            ->orderBy('hora_inicio', 'asc')
            ->limit(50)
            ->get();

        // Turnos pasados (historial jugado, ordenados desde el más reciente)
        $turnosPasados = $turnosQueryBase()
            ->with('cancha:id,nombre')
            ->where(function ($q) use ($hoy, $horaActual) {
                $q->where('fecha', '<', $hoy)
                  ->orWhere(function ($q2) use ($hoy, $horaActual) {
                      $q2->where('fecha', '=', $hoy)
                         ->where('hora_fin', '<=', $horaActual);
                  });
            })
            ->orderBy('fecha', 'desc')
            ->orderBy('hora_inicio', 'desc')
            ->limit(50)
            ->get();

        $turnos = $turnosFuturos->concat($turnosPasados)->map(function ($t) use ($hoy, $horaActual) {
            $fechaStr = $t->fecha ? $t->fecha->format('Y-m-d') : null;
            $esFuturo = false;
            if ($fechaStr) {
                if ($fechaStr > $hoy) {
                    $esFuturo = true;
                } elseif ($fechaStr === $hoy) {
                    $esFuturo = ($t->hora_fin > $horaActual);
                }
            }

            return [
                'id' => $t->id,
                'fecha' => $fechaStr,
                'hora_inicio' => substr($t->hora_inicio, 0, 5),
                'hora_fin' => substr($t->hora_fin, 0, 5),
                'cancha_nombre' => $t->cancha?->nombre ?? 'Cancha',
                'precio' => (float) $t->precio,
                'monto_pagado' => (float) $t->monto_pagado,
                'saldo_pendiente' => (float) $t->saldo_pendiente,
                'estado' => $t->estado,
                'estado_pago' => $t->estado_pago,
                'metodo_pago' => $t->metodo_pago,
                'es_fijo' => (bool) $t->es_fijo,
                'es_futuro' => $esFuturo,
                'motivo_cancelacion' => $t->motivo_cancelacion,
            ];
        });

        // Billetera virtual y movimientos si tiene user_id
        $saldoBilletera = $cliente->saldo_billetera;
        $movimientos = [];
        if ($cliente->user_id) {
            $movimientos = WalletMovimiento::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('user_id', $cliente->user_id)
                ->orderBy('created_at', 'desc')
                ->limit(20)
                ->get()
                ->map(function ($m) {
                    return [
                        'id' => $m->id,
                        'tipo' => $m->tipo,
                        'monto' => (float) $m->monto,
                        'saldo_anterior' => (float) $m->saldo_anterior,
                        'saldo_posterior' => (float) $m->saldo_posterior,
                        'descripcion' => $m->descripcion,
                        'created_at' => $m->created_at ? $m->created_at->toIso8601String() : null,
                    ];
                });
        }

        // Vales de crédito (activos e históricos)
        $vales = ValeCredito::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where(function ($q) use ($cliente) {
                if ($cliente->user_id) {
                    $q->where('user_id_canje', $cliente->user_id);
                }
                if (!empty($cliente->telefono)) {
                    $q->orWhere('cliente_telefono', $cliente->telefono);
                }
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($v) {
                return [
                    'id' => $v->id,
                    'codigo' => $v->codigo,
                    'token_seguro' => $v->token_seguro,
                    'monto' => (float) $v->monto,
                    'saldo_restante' => (float) $v->saldo_restante,
                    'estado' => $v->estado,
                    'fecha_emision' => $v->fecha_emision ? Carbon::parse($v->fecha_emision)->format('Y-m-d H:i') : null,
                    'fecha_vencimiento' => $v->fecha_vencimiento ? Carbon::parse($v->fecha_vencimiento)->format('Y-m-d') : null,
                ];
            });

        // Estadísticas agregadas
        $totalTurnos = $turnosQueryBase()->count();
        $turnosCancelados = $turnosQueryBase()->where('estado', 'cancelado')->count();

        $turnosJugados = $turnosQueryBase()
            ->where('estado', '!=', 'cancelado')
            ->where(function ($q) use ($hoy, $horaActual) {
                $q->where('fecha', '<', $hoy)
                  ->orWhere(function ($q2) use ($hoy, $horaActual) {
                      $q2->where('fecha', '=', $hoy)
                         ->where('hora_fin', '<=', $horaActual);
                  });
            })
            ->count();

        $turnosFuturosCount = $turnosQueryBase()
            ->where('estado', '!=', 'cancelado')
            ->where(function ($q) use ($hoy, $horaActual) {
                $q->where('fecha', '>', $hoy)
                  ->orWhere(function ($q2) use ($hoy, $horaActual) {
                      $q2->where('fecha', '=', $hoy)
                         ->where('hora_fin', '>', $horaActual);
                  });
            })
            ->count();

        $turnosCanceladosPasados = $turnosQueryBase()
            ->where('estado', 'cancelado')
            ->where(function ($q) use ($hoy, $horaActual) {
                $q->where('fecha', '<', $hoy)
                  ->orWhere(function ($q2) use ($hoy, $horaActual) {
                      $q2->where('fecha', '=', $hoy)
                         ->where('hora_fin', '<=', $horaActual);
                  });
            })
            ->count();

        $turnosPasadosTotales = $turnosJugados + $turnosCanceladosPasados;
        $tasaCumplimiento = $turnosPasadosTotales > 0
            ? round(($turnosJugados / $turnosPasadosTotales) * 100, 1)
            : 100.0;

        return [
            'cliente' => [
                'id' => $cliente->id,
                'user_id' => $cliente->user_id,
                'nombre' => $cliente->nombre,
                'telefono' => $cliente->telefono,
                'email' => $cliente->email,
                'dni' => $cliente->dni,
                'notas' => $cliente->notas,
                'estado' => $cliente->estado,
                'motivo_bloqueo' => $cliente->motivo_bloqueo,
                'saldo_billetera' => $saldoBilletera,
                'created_at' => $cliente->created_at ? $cliente->created_at->toIso8601String() : null,
            ],
            'estadisticas' => [
                'total_turnos' => $totalTurnos,
                'turnos_jugados' => $turnosJugados,
                'turnos_futuros' => $turnosFuturosCount,
                'turnos_cancelados' => $turnosCancelados,
                'tasa_cumplimiento' => $tasaCumplimiento,
            ],
            'turnos' => $turnos,
            'billetera' => [
                'saldo' => $saldoBilletera,
                'movimientos' => $movimientos,
            ],
            'vales' => $vales,
        ];
    }

    /**
     * Crear un nuevo cliente manualmente desde el panel del club.
     */
    public function crearCliente(int $complejoId, array $datos): Cliente
    {
        $nombre = trim($datos['nombre'] ?? '');
        $telefono = !empty($datos['telefono']) ? trim($datos['telefono']) : null;
        $email = !empty($datos['email']) ? strtolower(trim($datos['email'])) : null;
        $dni = !empty($datos['dni']) ? trim($datos['dni']) : null;
        $notas = !empty($datos['notas']) ? trim($datos['notas']) : null;
        $estado = in_array($datos['estado'] ?? '', ['activo', 'bloqueado']) ? $datos['estado'] : 'activo';
        $motivoBloqueo = ($estado === 'bloqueado') ? trim($datos['motivo_bloqueo'] ?? 'Bloqueado por administración') : null;

        // Validar formato numérico y unicidad de teléfono si se proporciona
        if (!empty($telefono)) {
            if (!preg_match('/^\+?[0-9]{8,15}$/', $telefono)) {
                throw ValidationException::withMessages([
                    'telefono' => ['El teléfono / WhatsApp debe ser numérico y contener entre 8 y 15 dígitos.'],
                ]);
            }

            $existeTel = Cliente::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('telefono', $telefono)
                ->exists();

            if ($existeTel) {
                throw ValidationException::withMessages([
                    'telefono' => ['Ya existe un cliente registrado con este número de teléfono en el club.'],
                ]);
            }
        }

        // Validar formato numérico de DNI si se proporciona
        if (!empty($dni)) {
            if (!preg_match('/^[0-9]{6,12}$/', $dni)) {
                throw ValidationException::withMessages([
                    'dni' => ['El DNI debe ser numérico y contener entre 6 y 12 dígitos.'],
                ]);
            }
        }

        // Validar unicidad de email si se proporciona
        if (!empty($email)) {
            $existeEmail = Cliente::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('email', $email)
                ->exists();

            if ($existeEmail) {
                throw ValidationException::withMessages([
                    'email' => ['Ya existe un cliente registrado con este correo electrónico en el club.'],
                ]);
            }
        }

        // Asociar user_id si coincide con un usuario registrado
        $userId = null;
        if (!empty($email)) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $userId = $user->id;
            }
        }

        return Cliente::create([
            'complejo_id' => $complejoId,
            'user_id' => $userId,
            'nombre' => $nombre,
            'telefono' => $telefono,
            'email' => $email,
            'dni' => $dni,
            'notas' => $notas,
            'estado' => $estado,
            'motivo_bloqueo' => $motivoBloqueo,
        ]);
    }

    /**
     * Actualizar los datos de un cliente existente.
     */
    public function actualizarCliente(int $complejoId, int $clienteId, array $datos): Cliente
    {
        $cliente = Cliente::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where('id', $clienteId)
            ->first();

        if (!$cliente) {
            throw ValidationException::withMessages([
                'cliente' => ['El cliente especificado no existe en este club.'],
            ]);
        }

        $currNombre = $cliente->nombre;
        $nombre = array_key_exists('nombre', $datos) ? trim($datos['nombre'] ?? '') : $currNombre;
        if (empty($nombre)) {
            $nombre = $currNombre;
        }

        $currTel = $cliente->telefono ? trim($cliente->telefono) : null;
        $telefono = array_key_exists('telefono', $datos)
            ? (!empty($datos['telefono']) ? trim($datos['telefono']) : null)
            : $currTel;

        $currEmail = $cliente->email ? strtolower(trim($cliente->email)) : null;
        $email = array_key_exists('email', $datos)
            ? (!empty($datos['email']) ? strtolower(trim($datos['email'])) : null)
            : $currEmail;

        $dni = array_key_exists('dni', $datos)
            ? (!empty($datos['dni']) ? trim($datos['dni']) : null)
            : $cliente->dni;

        $notas = array_key_exists('notas', $datos)
            ? (!empty($datos['notas']) ? trim($datos['notas']) : null)
            : $cliente->notas;

        $estado = array_key_exists('estado', $datos) && in_array($datos['estado'], ['activo', 'bloqueado'])
            ? $datos['estado']
            : $cliente->estado;

        $motivoBloqueo = ($estado === 'bloqueado')
            ? (array_key_exists('motivo_bloqueo', $datos) ? trim($datos['motivo_bloqueo'] ?? '') : ($cliente->motivo_bloqueo ?: 'Bloqueado por administración'))
            : null;

        if ($estado === 'bloqueado' && empty($motivoBloqueo)) {
            $motivoBloqueo = 'Bloqueado por administración';
        }

        // Validar formato numérico de teléfono y unicidad si se proporciona
        if (!empty($telefono)) {
            if (!preg_match('/^\+?[0-9]{8,15}$/', $telefono)) {
                throw ValidationException::withMessages([
                    'telefono' => ['El teléfono / WhatsApp debe ser numérico y contener entre 8 y 15 dígitos.'],
                ]);
            }

            if ($telefono !== $currTel) {
                $existeTel = Cliente::withoutGlobalScopes()
                    ->where('complejo_id', $complejoId)
                    ->where('telefono', $telefono)
                    ->where('id', '!=', $clienteId)
                    ->exists();

                if ($existeTel) {
                    throw ValidationException::withMessages([
                        'telefono' => ['Ya existe otro cliente registrado con este número de teléfono en el club.'],
                    ]);
                }
            }
        }

        // Validar formato numérico de DNI si se proporciona
        if (!empty($dni)) {
            if (!preg_match('/^[0-9]{6,12}$/', $dni)) {
                throw ValidationException::withMessages([
                    'dni' => ['El DNI debe ser numérico y contener entre 6 y 12 dígitos.'],
                ]);
            }
        }

        // Validar que el nuevo email no esté tomado por otro cliente en este club
        if (!empty($email) && $email !== $currEmail) {
            $existeEmail = Cliente::withoutGlobalScopes()
                ->where('complejo_id', $complejoId)
                ->where('email', $email)
                ->where('id', '!=', $clienteId)
                ->exists();

            if ($existeEmail) {
                throw ValidationException::withMessages([
                    'email' => ['Ya existe otro cliente registrado con este correo electrónico en el club.'],
                ]);
            }
        }

        // Sincronizar user_id si se proporcionó email
        $userId = $cliente->user_id;
        if (array_key_exists('email', $datos)) {
            if (!empty($email)) {
                $existingUser = User::where('email', $email)->first();
                $userId = $existingUser ? $existingUser->id : null;
            } else {
                $userId = null;
            }
        }

        $cliente->update([
            'user_id' => $userId,
            'nombre' => $nombre,
            'telefono' => $telefono,
            'email' => $email,
            'dni' => $dni,
            'notas' => $notas,
            'estado' => $estado,
            'motivo_bloqueo' => $motivoBloqueo,
        ]);

        // Propagar nombre y teléfono a turnos futuros no cancelados para que el mostrador vea el dato actualizado
        Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where('club_cliente_id', $cliente->id)
            ->where('fecha', '>=', now()->toDateString())
            ->where('estado', '!=', 'cancelado')
            ->update([
                'cliente_nombre' => $nombre,
                'cliente_telefono' => $telefono,
            ]);

        return $cliente;
    }

    /**
     * Eliminar ficha de cliente si no posee turnos futuros ni saldo retenido.
     */
    public function eliminarCliente(int $complejoId, int $clienteId): bool
    {
        $cliente = Cliente::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where('id', $clienteId)
            ->first();

        if (!$cliente) {
            throw ValidationException::withMessages([
                'cliente' => ['El cliente especificado no existe en este club.'],
            ]);
        }

        // Validar saldo
        if ($cliente->saldo_billetera > 0) {
            throw ValidationException::withMessages([
                'cliente' => ['No es posible eliminar al cliente porque posee saldo a favor en su billetera virtual. Debes reintegrarlo o dejar su saldo en cero.'],
            ]);
        }

        // Validar turnos futuros
        $tieneTurnosFuturos = Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where('club_cliente_id', $cliente->id)
            ->where('fecha', '>=', now()->toDateString())
            ->where('estado', '!=', 'cancelado')
            ->exists();

        if ($tieneTurnosFuturos) {
            throw ValidationException::withMessages([
                'cliente' => ['No es posible eliminar al cliente porque cuenta con turnos reservados activos para hoy o fechas futuras. Debes cancelarlos o reasignarlos previamente.'],
            ]);
        }

        // Desvincular de turnos históricos para no violar integridad referencial y eliminar
        Turno::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where('club_cliente_id', $cliente->id)
            ->update(['club_cliente_id' => null]);

        return $cliente->delete();
    }

    /**
     * Búsqueda rápida de sugerencias para autocompletado en reservas de mostrador.
     */
    public function buscarSugerencias(int $complejoId, string $query, int $limit = 5): Collection
    {
        $clean = trim($query);
        if (empty($clean)) {
            return new Collection();
        }

        return Cliente::withoutGlobalScopes()
            ->where('complejo_id', $complejoId)
            ->where(function ($q) use ($clean) {
                $q->where('nombre', 'ilike', "%{$clean}%")
                  ->orWhere('telefono', 'like', "%{$clean}%")
                  ->orWhere('email', 'ilike', "%{$clean}%");
            })
            ->limit($limit)
            ->get(['id', 'nombre', 'telefono', 'email', 'estado', 'motivo_bloqueo']);
    }
}
