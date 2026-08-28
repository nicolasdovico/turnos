<?php

use App\Http\Controllers\Api\DisponibilidadController;
use App\Http\Controllers\Api\HealthCheckController;
use App\Http\Controllers\Api\TurnoBloqueoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'SaaS Deportivo & Turnos API',
        'version' => '1.0.0',
        'status' => 'online',
        'endpoints' => [
            'health' => '/api/health',
            'disponibilidad' => '/api/canchas/{id}/disponibilidad',
            'bloqueo_temporal' => '/api/turnos/bloquear-temporal',
            'confirmar_reserva' => '/api/turnos/confirmar',
            'turnos_fijos' => '/api/turnos/fijos',
            'split_payment' => '/api/turnos/{id}/split',
            'partidos_abiertos' => '/api/partidos-abiertos',
            'torneos' => '/api/torneos',
            'pos_productos' => '/api/pos/productos',
            'caja_resumen' => '/api/caja/resumen-diario',
            'cms_paginas' => '/api/cms/paginas',
        ],
    ]);
});

Route::get('/health', HealthCheckController::class);

Route::get('/canchas/{id}/disponibilidad', DisponibilidadController::class)
    ->middleware('tenant.has_module:reservas');

Route::post('/turnos/bloquear-temporal', TurnoBloqueoController::class)
    ->middleware('tenant.has_module:reservas');

Route::post('/turnos/confirmar', \App\Http\Controllers\Api\TurnoConfirmarController::class)
    ->middleware('tenant.has_module:reservas');

Route::post('/turnos/fijos', \App\Http\Controllers\Api\TurnoFijoController::class)
    ->middleware(['tenant.has_module:reservas', 'tenant.has_module:turnos_fijos']);

Route::middleware('tenant.has_module:pos_buffet')->group(function () {
    Route::get('/pos/productos', [\App\Http\Controllers\Api\POSController::class, 'indexProductos']);
    Route::post('/pos/productos', [\App\Http\Controllers\Api\POSController::class, 'storeProducto']);
    Route::post('/pos/ventas', [\App\Http\Controllers\Api\POSController::class, 'storeVenta']);
    Route::post('/turnos/{id}/consumos', [\App\Http\Controllers\Api\POSController::class, 'storeConsumoTurno']);
});

Route::post('/caja/apertura', [\App\Http\Controllers\Api\CajaController::class, 'apertura']);
Route::post('/caja/cierre', [\App\Http\Controllers\Api\CajaController::class, 'cierre']);
Route::get('/caja/resumen-diario', [\App\Http\Controllers\Api\CajaController::class, 'resumenDiario']);

Route::middleware('tenant.has_module:cms_web')->group(function () {
    Route::get('/cms/paginas', [\App\Http\Controllers\Api\PaginaController::class, 'index']);
    Route::get('/cms/paginas/{slug}', [\App\Http\Controllers\Api\PaginaController::class, 'show']);
    Route::post('/cms/paginas', [\App\Http\Controllers\Api\PaginaController::class, 'store']);
    Route::put('/cms/paginas/{id}', [\App\Http\Controllers\Api\PaginaController::class, 'update']);
    Route::delete('/cms/paginas/{id}', [\App\Http\Controllers\Api\PaginaController::class, 'destroy']);
});

Route::post('/tenants/revalidate', [\App\Http\Controllers\Api\PaginaController::class, 'triggerRevalidate']);

Route::middleware('tenant.has_module:split_payment')->group(function () {
    Route::post('/turnos/{id}/split', [\App\Http\Controllers\Api\SplitPaymentController::class, 'splitTurno']);
    Route::post('/split-pagos/{token}/pagar', [\App\Http\Controllers\Api\SplitPaymentController::class, 'pagarCuota']);
    Route::get('/split-pagos/{token}', [\App\Http\Controllers\Api\SplitPaymentController::class, 'showCuota']);
    Route::get('/partidos-abiertos', [\App\Http\Controllers\Api\SplitPaymentController::class, 'indexPartidos']);
    Route::post('/partidos-abiertos/{id}/unirse', [\App\Http\Controllers\Api\SplitPaymentController::class, 'unirsePartido']);
});

Route::middleware('tenant.has_module:torneos')->group(function () {
    Route::get('/torneos', [\App\Http\Controllers\Api\TorneoController::class, 'index']);
    Route::post('/torneos', [\App\Http\Controllers\Api\TorneoController::class, 'store']);
    Route::get('/torneos/{id}', [\App\Http\Controllers\Api\TorneoController::class, 'show']);
    Route::post('/torneos/{id}/equipos', [\App\Http\Controllers\Api\TorneoController::class, 'inscribirEquipo']);
    Route::post('/torneos/{id}/generar-fixture', [\App\Http\Controllers\Api\TorneoController::class, 'generarFixture']);
    Route::get('/torneos/{id}/bracket', [\App\Http\Controllers\Api\TorneoController::class, 'getBracket']);
    Route::get('/torneos/{id}/tabla-posiciones', [\App\Http\Controllers\Api\TorneoController::class, 'getTablaPosiciones']);
    Route::post('/torneos/partidos/{partidoId}/resultado', [\App\Http\Controllers\Api\TorneoController::class, 'registrarResultado']);
});






Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


