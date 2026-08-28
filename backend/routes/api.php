<?php

use App\Http\Controllers\Api\DisponibilidadController;
use App\Http\Controllers\Api\HealthCheckController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthCheckController::class);

Route::get('/canchas/{id}/disponibilidad', DisponibilidadController::class)
    ->middleware('tenant.has_module:reservas');

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


