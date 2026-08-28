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


Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


