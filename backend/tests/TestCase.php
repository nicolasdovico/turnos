<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Creates the application and enforces the dedicated testing database.
     */
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

        $app['env'] = 'testing';
        putenv('QUEUE_CONNECTION=sync');
        $_ENV['QUEUE_CONNECTION'] = 'sync';
        $_SERVER['QUEUE_CONNECTION'] = 'sync';
        config([
            'app.env' => 'testing',
            'database.connections.pgsql.database' => 'saas_testing',
            'queue.default' => 'sync',
        ]);
        \Illuminate\Support\Facades\DB::purge('pgsql');

        return $app;
    }
}
