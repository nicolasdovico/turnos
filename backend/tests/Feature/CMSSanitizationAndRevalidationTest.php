<?php

namespace Tests\Feature;

use App\Models\Complejo;
use App\Models\Pagina;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Tests\TestCase;

class CMSSanitizationAndRevalidationTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejoOro;
    protected Complejo $complejoBronce;
    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        Redis::flushdb();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planOro = Plan::where('slug', 'oro')->firstOrFail();
        $planBronce = Plan::where('slug', 'bronce')->firstOrFail();

        $this->complejoOro = Complejo::create([
            'nombre' => 'Padel Club Oro',
            'subdominio' => 'padel-oro',
            'plan_id' => $planOro->id,
            'estado' => 'activo',
        ]);

        $this->complejoBronce = Complejo::create([
            'nombre' => 'Padel Club Bronce',
            'subdominio' => 'padel-bronce',
            'plan_id' => $planBronce->id,
            'estado' => 'activo',
        ]);

        $this->adminUser = User::factory()->create([
            'email' => 'admin.cms@example.com',
        ]);
    }

    protected function tearDown(): void
    {
        Redis::flushdb();
        parent::tearDown();
    }

    /**
     * Test HTML sanitization against XSS vectors (script, iframe, onerror, javascript: links).
     */
    public function test_sanitizacion_xss_en_contenido_html(): void
    {
        Http::fake([
            '*/api/revalidate' => Http::response(['revalidated' => true], 200),
        ]);

        $maliciousPayload = <<<HTML
        <div>
            <h1>Título Legítimo</h1>
            <script>alert('XSS VULNERABILITY');</script>
            <p>Párrafo seguro con <b>negrita</b> y <i>cursiva</i>.</p>
            <img src="https://example.com/logo.png" onerror="alert('stealing cookies')" alt="Logo">
            <a href="javascript:alert(1)">Click Malicioso</a>
            <iframe src="https://attacker.site/phishing"></iframe>
            <style>body { display: none; }</style>
        </div>
        HTML;

        $response = $this->actingAs($this->adminUser)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson('/api/cms/paginas', [
                'titulo' => 'Quiénes Somos',
                'slug' => 'quienes-somos',
                'contenido_html' => $maliciousPayload,
            ]);

        $response->assertStatus(201);
        $savedHtml = $response->json('data.contenido_html');

        // Verify dangerous elements are completely removed
        $this->assertStringNotContainsString('<script', $savedHtml);
        $this->assertStringNotContainsString('alert(', $savedHtml);
        $this->assertStringNotContainsString('<iframe', $savedHtml);
        $this->assertStringNotContainsString('<style', $savedHtml);
        $this->assertStringNotContainsString('onerror=', $savedHtml);
        $this->assertStringNotContainsString('javascript:', $savedHtml);

        // Verify legitimate elements remain intact
        $this->assertStringContainsString('<h1>Título Legítimo</h1>', $savedHtml);
        $this->assertStringContainsString('<b>negrita</b>', $savedHtml);
        $this->assertStringContainsString('src="https://example.com/logo.png"', $savedHtml);
    }

    /**
     * Test multi-tenant isolation and unique slug per tenant.
     */
    public function test_aislamiento_paginas_por_tenant_y_slug_unico(): void
    {
        Http::fake([
            '*/api/revalidate' => Http::response(['revalidated' => true], 200),
        ]);

        // Create page in Complejo Oro
        $this->actingAs($this->adminUser)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson('/api/cms/paginas', [
                'titulo' => 'Reglamento',
                'slug' => 'reglamento',
                'contenido_html' => '<p>Reglamento interno Club Oro</p>',
            ])
            ->assertStatus(201);

        // Duplicate slug within same complex -> 422 Unprocessable
        $this->actingAs($this->adminUser)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson('/api/cms/paginas', [
                'titulo' => 'Otro Reglamento',
                'slug' => 'reglamento',
                'contenido_html' => '<p>Otro reglamento</p>',
            ])
            ->assertStatus(422);

        // Same slug 'reglamento' in another tenant is completely allowed
        $this->actingAs($this->adminUser)
            ->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->postJson('/api/cms/paginas', [
                'titulo' => 'Reglamento Club Bronce',
                'slug' => 'reglamento',
                'contenido_html' => '<p>Reglamento interno Club Bronce</p>',
            ])
            ->assertStatus(201);
    }

    /**
     * Test on-demand ISR revalidation webhook is dispatched on save/update/delete.
     */
    public function test_disparo_revalidacion_on_demand_webhook(): void
    {
        Http::fake([
            '*/api/revalidate' => Http::response(['revalidated' => true, 'now' => 123456789], 200),
        ]);

        // 1. Create page
        $res = $this->actingAs($this->adminUser)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson('/api/cms/paginas', [
                'titulo' => 'Instalaciones',
                'slug' => 'instalaciones',
                'contenido_html' => '<p>Canchas de cristal templado</p>',
            ]);
        $res->assertStatus(201);
        $paginaId = $res->json('data.id');

        // Check webhook was dispatched with correct path and subdomain
        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/api/revalidate') &&
                $request['subdomain'] === 'padel-oro' &&
                $request['path'] === '/tenants/padel-oro/paginas/instalaciones';
        });

        // 2. Update page
        $this->actingAs($this->adminUser)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->putJson("/api/cms/paginas/{$paginaId}", [
                'titulo' => 'Instalaciones y Buffet',
            ])
            ->assertStatus(200);

        // 3. Manual endpoint trigger
        $manualResp = $this->actingAs($this->adminUser)
            ->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->postJson('/api/tenants/revalidate', [
                'path' => '/tenants/padel-oro/paginas/instalaciones',
            ]);
        $manualResp->assertStatus(200)
            ->assertJson([
                'success' => true,
                'path' => '/tenants/padel-oro/paginas/instalaciones',
            ]);
    }

    /**
     * Test module entitlement: 403 Forbidden when tenant has cms_web module disabled.
     */
    public function test_modulo_cms_web_requerido(): void
    {
        // Explicitly disable cms_web module for this complex via granular override
        $moduloCms = \App\Models\Modulo::where('slug', 'cms_web')->firstOrFail();
        $this->complejoBronce->modulosPersonalizados()->attach($moduloCms->id, [
            'esta_activo' => false,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->postJson('/api/cms/paginas', [
                'titulo' => 'Página Bloqueada',
                'contenido_html' => '<p>Prueba</p>',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'cms_web',
            ]);
    }

}
