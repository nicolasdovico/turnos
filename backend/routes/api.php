<?php

use App\Http\Controllers\Api\DisponibilidadController;
use App\Http\Controllers\Api\HealthCheckController;
use App\Http\Controllers\Api\TurnoBloqueoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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






Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


