<?php

namespace Tests\Feature;

use App\Models\Complejo;
use App\Models\Modulo;
use App\Models\Plan;
use App\Models\Scopes\TenantScope;
use App\Traits\BelongsToTenant;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DummyTenantModel extends Model
{
    use BelongsToTenant;

    protected $table = 'dummy_tenant_items';
    protected $fillable = ['nombre', 'complejo_id'];
}

class TenantModuleSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected Complejo $complejoBronce;
    protected Complejo $complejoOro;
    protected Plan $planBronce;
    protected Plan $planOro;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $this->planBronce = Plan::where('slug', 'bronce')->firstOrFail();
        $this->planOro = Plan::where('slug', 'oro')->firstOrFail();

        $this->complejoBronce = Complejo::create([
            'nombre' => 'Club Bronce Central',
            'subdominio' => 'bronce-central',
            'dominio_personalizado' => 'broncecentral.com',
            'plan_id' => $this->planBronce->id,
            'estado' => 'activo',
        ]);

        $this->complejoOro = Complejo::create([
            'nombre' => 'Club Oro Premium',
            'subdominio' => 'oro-premium',
            'dominio_personalizado' => 'oropremium.com',
            'plan_id' => $this->planOro->id,
            'estado' => 'activo',
        ]);

        // Create temporary table for testing BelongsToTenant & TenantScope
        Schema::create('dummy_tenant_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complejo_id')->constrained('complejos')->cascadeOnDelete();
            $table->string('nombre');
            $table->timestamps();
        });

        // Register test routes guarded by tenant middlewares
        Route::middleware(['tenant.context', 'tenant.has_module:reservas'])->get('/api/test-route-reservas', function () {
            return response()->json(['status' => 'success', 'module' => 'reservas']);
        });

        Route::middleware(['tenant.context', 'tenant.has_module:torneos'])->get('/api/test-route-torneos', function () {
            return response()->json(['status' => 'success', 'module' => 'torneos']);
        });
    }

    /**
     * Test tenant resolution via X-Tenant-ID header using ID, UUID and subdomain.
     */
    public function test_tenant_resolution_via_header(): void
    {
        // By ID
        $response = $this->withHeader('X-Tenant-ID', (string) $this->complejoBronce->id)
            ->getJson('/api/test-route-reservas');
        $response->assertStatus(200);

        // By UUID
        $response = $this->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->getJson('/api/test-route-reservas');
        $response->assertStatus(200);

        // By Subdomain
        $response = $this->withHeader('X-Tenant-ID', $this->complejoBronce->subdominio)
            ->getJson('/api/test-route-reservas');
        $response->assertStatus(200);

        // Invalid Header
        $response = $this->withHeader('X-Tenant-ID', 'non-existent-tenant')
            ->getJson('/api/test-route-reservas');
        $response->assertStatus(404)
            ->assertJson(['error' => 'TENANT_NOT_FOUND']);
    }

    /**
     * Test tenant resolution via Host header (custom domain and subdomain).
     */
    public function test_tenant_resolution_via_host(): void
    {
        // Custom domain
        $response = $this->getJson('http://broncecentral.com/api/test-route-reservas');
        $response->assertStatus(200);

        // Subdomain
        $response = $this->getJson('http://bronce-central.turnos.test/api/test-route-reservas');
        $response->assertStatus(200);
    }

    /**
     * Test TenantScope isolates queries and BelongsToTenant auto-fills complejo_id.
     */
    public function test_tenant_scope_isolates_data_and_auto_assigns_id(): void
    {
        // Set active tenant to Bronce
        app()->instance('currentTenant', $this->complejoBronce);

        // Auto-assigns complejo_id
        $itemBronce = DummyTenantModel::create(['nombre' => 'Cancha Padel 1']);
        $this->assertEquals($this->complejoBronce->id, $itemBronce->complejo_id);

        // Set active tenant to Oro
        app()->instance('currentTenant', $this->complejoOro);
        $itemOro = DummyTenantModel::create(['nombre' => 'Cancha Tenis 1']);
        $this->assertEquals($this->complejoOro->id, $itemOro->complejo_id);

        // Querying under Oro tenant only returns Oro items
        $oroItems = DummyTenantModel::all();
        $this->assertCount(1, $oroItems);
        $this->assertEquals('Cancha Tenis 1', $oroItems->first()->nombre);

        // Switch back to Bronce
        app()->instance('currentTenant', $this->complejoBronce);
        $bronceItems = DummyTenantModel::all();
        $this->assertCount(1, $bronceItems);
        $this->assertEquals('Cancha Padel 1', $bronceItems->first()->nombre);

        // Without TenantScope, returns all items
        $allItems = DummyTenantModel::withoutGlobalScope(TenantScope::class)->get();
        $this->assertCount(2, $allItems);
    }

    /**
     * Test access allowed when module is included in the tenant plan.
     */
    public function test_access_allowed_when_module_in_plan(): void
    {
        // Plan Bronce includes 'reservas'
        $response = $this->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->getJson('/api/test-route-reservas');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'module' => 'reservas',
            ]);

        // Plan Oro includes 'torneos'
        $responseOro = $this->withHeader('X-Tenant-ID', $this->complejoOro->uuid)
            ->getJson('/api/test-route-torneos');

        $responseOro->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'module' => 'torneos',
            ]);
    }

    /**
     * Test 403 Forbidden returned when module is NOT enabled.
     */
    public function test_403_forbidden_when_module_not_enabled(): void
    {
        // Plan Bronce does NOT include 'torneos'
        $response = $this->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->getJson('/api/test-route-torneos');

        $response->assertStatus(403)
            ->assertJson([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'torneos',
            ]);
    }

    /**
     * Test access allowed when module is added as an individual active add-on.
     */
    public function test_access_allowed_with_individual_addon(): void
    {
        $moduloTorneos = Modulo::where('slug', 'torneos')->firstOrFail();

        // Attach 'torneos' add-on to Bronce complejo
        $this->complejoBronce->modulosPersonalizados()->attach($moduloTorneos->id, [
            'esta_activo' => true,
            'valido_hasta' => null,
        ]);

        $response = $this->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->getJson('/api/test-route-torneos');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'module' => 'torneos',
            ]);
    }

    /**
     * Test 403 Forbidden when individual add-on is expired or inactive.
     */
    public function test_403_forbidden_when_addon_is_expired_or_inactive(): void
    {
        $moduloTorneos = Modulo::where('slug', 'torneos')->firstOrFail();

        // Expired add-on
        $this->complejoBronce->modulosPersonalizados()->attach($moduloTorneos->id, [
            'esta_activo' => true,
            'valido_hasta' => now()->subDay(),
        ]);

        $response = $this->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->getJson('/api/test-route-torneos');

        $response->assertStatus(403)
            ->assertJson([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'torneos',
            ]);

        // Update add-on to inactive
        $this->complejoBronce->modulosPersonalizados()->updateExistingPivot($moduloTorneos->id, [
            'esta_activo' => false,
            'valido_hasta' => now()->addDays(30),
        ]);

        $responseInactive = $this->withHeader('X-Tenant-ID', $this->complejoBronce->uuid)
            ->getJson('/api/test-route-torneos');

        $responseInactive->assertStatus(403)
            ->assertJson([
                'error' => 'MODULE_NOT_ENABLED',
                'module' => 'torneos',
            ]);
    }
}
