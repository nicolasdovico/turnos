<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Forzar HTTPS en producción para todos los esquemas de assets y rutas
        if (app()->environment('production') || str_contains(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
