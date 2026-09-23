<?php

namespace Tests\Feature;

use App\Models\Complejo;
use App\Models\Pagina;
use App\Models\Plan;
use App\Models\User;
use App\Services\ClubTemplateRegistry;
use Database\Seeders\ModuloSeeder;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClubBrandingTest extends TestCase
{
    use RefreshDatabase;

    protected User $ownerClubA;
    protected Complejo $complejoA;

    protected User $ownerClubB;
    protected Complejo $complejoB;

    protected function setUp(): void
    {
        parent::setUp();

        try {
            Redis::flushdb();
        } catch (\Throwable $e) {}

        $this->seed([
            ModuloSeeder::class,
            PlanSeeder::class,
        ]);

        $planBronce = Plan::where('slug', 'bronce')->firstOrFail();

        $this->ownerClubA = User::factory()->create([
            'email' => 'owner.club.a@example.com',
        ]);

        $this->complejoA = Complejo::create([
            'user_id' => $this->ownerClubA->id,
            'nombre' => 'Club Padel Norte',
            'subdominio' => 'padel-norte',
            'plan_id' => $planBronce->id,
            'plantilla_slug' => 'booking_direct',
            'color_primario' => '#10b981',
            'color_secundario' => '#047857',
            'eslogan' => 'El mejor pádel de la zona',
            'redes_sociales' => [
                'instagram' => 'https://instagram.com/padelnorte',
            ],
            'estado' => 'activo',
        ]);

        $this->ownerClubB = User::factory()->create([
            'email' => 'owner.club.b@example.com',
        ]);

        $this->complejoB = Complejo::create([
            'user_id' => $this->ownerClubB->id,
            'nombre' => 'Tenis Club Sur',
            'subdominio' => 'tenis-sur',
            'plan_id' => $planBronce->id,
            'plantilla_slug' => 'institucional',
            'estado' => 'activo',
        ]);

        // Simular respuesta exitosa para webhook de revalidación hacia Next.js
        Http::fake([
            '*/api/revalidate' => Http::response(['revalidated' => true], 200),
        ]);
    }

    protected function tearDown(): void
    {
        try {
            Redis::flushdb();
        } catch (\Throwable $e) {}

        parent::tearDown();
    }

    public function test_obtener_branding_publico_del_club(): void
    {
        $response = $this->getJson('/api/clubs/padel-norte/branding');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'subdominio' => 'padel-norte',
                    'nombre' => 'Club Padel Norte',
                    'branding' => [
                        'plantilla_slug' => 'booking_direct',
                        'color_primario' => '#10b981',
                        'color_secundario' => '#047857',
                        'eslogan' => 'El mejor pádel de la zona',
                        'redes_sociales' => [
                            'instagram' => 'https://instagram.com/padelnorte',
                        ],
                    ],
                    'plantilla' => [
                        'slug' => 'booking_direct',
                        'nombre' => 'Booking Direct / Operativa',
                    ],
                ],
            ]);
    }

    public function test_branding_incluye_paginas_con_visibilidad_en_header_y_footer(): void
    {
        // 1. Página en header
        Pagina::create([
            'complejo_id' => $this->complejoA->id,
            'titulo' => 'Reglamento',
            'slug' => 'reglamento',
            'contenido_html' => '<p>Normas del club</p>',
            'esta_publicada' => true,
            'mostrar_en_header' => true,
            'mostrar_en_footer' => false,
            'orden' => 1,
        ]);

        // 2. Página en footer
        Pagina::create([
            'complejo_id' => $this->complejoA->id,
            'titulo' => 'Políticas de Privacidad',
            'slug' => 'privacidad',
            'contenido_html' => '<p>Políticas legales</p>',
            'esta_publicada' => true,
            'mostrar_en_header' => false,
            'mostrar_en_footer' => true,
            'orden' => 2,
        ]);

        // 3. Página no publicada (no debe aparecer)
        Pagina::create([
            'complejo_id' => $this->complejoA->id,
            'titulo' => 'Borrador Oculto',
            'slug' => 'borrador',
            'contenido_html' => '<p>Borrador</p>',
            'esta_publicada' => false,
            'mostrar_en_header' => true,
            'mostrar_en_footer' => true,
            'orden' => 3,
        ]);

        $response = $this->getJson('/api/clubs/padel-norte/branding');

        $response->assertStatus(200);

        $headerPages = $response->json('data.navegacion.header');
        $footerPages = $response->json('data.navegacion.footer');

        $this->assertCount(1, $headerPages);
        $this->assertEquals('Reglamento', $headerPages[0]['titulo']);

        $this->assertCount(1, $footerPages);
        $this->assertEquals('Políticas de Privacidad', $footerPages[0]['titulo']);
    }

    public function test_catalogo_de_plantillas_disponibles(): void
    {
        $response = $this->getJson('/api/clubs/padel-norte/branding/templates');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'plantilla_activa' => 'booking_direct',
                ],
            ]);

        $plantillas = $response->json('data.plantillas');
        $slugs = array_column($plantillas, 'slug');

        $this->assertContains('booking_direct', $slugs);
        $this->assertContains('institucional', $slugs);
        $this->assertContains('modern_showcase', $slugs);
    }

    public function test_usuario_no_autenticado_no_puede_actualizar_branding(): void
    {
        $response = $this->putJson('/api/clubs/padel-norte/branding', [
            'color_primario' => '#ff0000',
        ]);

        $response->assertStatus(403);
    }

    public function test_usuario_de_otro_club_no_puede_modificar_branding_ajeno_403(): void
    {
        $tokenClubB = $this->ownerClubB->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$tokenClubB}")
            ->putJson('/api/clubs/padel-norte/branding', [
                'color_primario' => '#ff0000',
            ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'No tienes permisos para modificar el diseño de este club.',
            ]);
    }

    public function test_rechaza_actualizacion_con_plantilla_slug_invalida_422(): void
    {
        $tokenClubA = $this->ownerClubA->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->putJson('/api/clubs/padel-norte/branding', [
                'plantilla_slug' => 'plantilla_inexistente_xyz',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['plantilla_slug']);
    }

    public function test_rechaza_actualizacion_con_colores_hex_invalidos_422(): void
    {
        $tokenClubA = $this->ownerClubA->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->putJson('/api/clubs/padel-norte/branding', [
                'color_primario' => 'rojo-fuego',
                'color_secundario' => '#12345Z',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['color_primario', 'color_secundario']);
    }

    public function test_actualizar_branding_con_exito_invalida_cache_y_dispara_revalidacion(): void
    {
        $tokenClubA = $this->ownerClubA->createToken('test-token')->plainTextToken;

        // Primer request para calentar caché
        $firstGet = $this->getJson('/api/clubs/padel-norte/branding');
        $firstGet->assertStatus(200);

        // Actualización
        $payload = [
            'plantilla_slug' => 'modern_showcase',
            'color_primario' => '#3b82f6',
            'color_secundario' => '#1d4ed8',
            'color_acento' => '#60a5fa',
            'color_fondo' => '#0f172a',
            'eslogan' => 'Pádel de alto rendimiento',
            'redes_sociales' => [
                'instagram' => 'https://instagram.com/padelnorte_pro',
                'facebook' => 'https://facebook.com/padelnortepro',
            ],
        ];

        $response = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->putJson('/api/clubs/padel-norte/branding', $payload);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Identidad de marca y plantilla actualizadas exitosamente.',
                'revalidated' => true,
                'data' => [
                    'branding' => [
                        'plantilla_slug' => 'modern_showcase',
                        'color_primario' => '#3b82f6',
                        'eslogan' => 'Pádel de alto rendimiento',
                    ],
                ],
            ]);

        // Verificar que en base de datos cambió
        $this->complejoA->refresh();
        $this->assertEquals('modern_showcase', $this->complejoA->plantilla_slug);
        $this->assertEquals('#3b82f6', $this->complejoA->color_primario);
        $this->assertEquals('https://instagram.com/padelnorte_pro', $this->complejoA->redes_sociales['instagram']);

        // Siguiente GET debe traer los datos nuevos
        $secondGet = $this->getJson('/api/clubs/padel-norte/branding');
        $secondGet->assertStatus(200)
            ->assertJson([
                'data' => [
                    'branding' => [
                        'color_primario' => '#3b82f6',
                        'plantilla_slug' => 'modern_showcase',
                    ],
                ],
            ]);
    }

    public function test_subida_de_logo_multipart_almacena_archivo_y_actualiza_club(): void
    {
        Storage::fake('public');

        $tokenClubA = $this->ownerClubA->createToken('test-token')->plainTextToken;

        $file = UploadedFile::fake()->image('logo_padel.png', 400, 400);

        $response = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->postJson('/api/clubs/padel-norte/branding/upload', [
                'file' => $file,
                'tipo' => 'logo',
                'actualizar_directo' => true,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'tipo' => 'logo',
            ]);

        $this->complejoA->refresh();
        $this->assertNotNull($this->complejoA->logo_url);
        $this->assertStringContainsString('logo_', $this->complejoA->logo_url);
    }

    public function test_subida_de_portada_multipart_con_string_booleano_actualiza_club(): void
    {
        Storage::fake('public');

        $tokenClubA = $this->ownerClubA->createToken('test-token')->plainTextToken;

        $file = UploadedFile::fake()->image('portada_padel.jpg', 1200, 600);

        // Envío como string '1' y 'true' típico de FormData
        $response = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->post('/api/clubs/padel-norte/branding/upload', [
                'file' => $file,
                'tipo' => 'portada',
                'actualizar_directo' => '1',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'tipo' => 'portada',
            ]);

        $this->complejoA->refresh();
        $this->assertNotNull($this->complejoA->portada_url);
        $this->assertStringContainsString('portada_', $this->complejoA->portada_url);
        $this->assertStringStartsWith('/storage/', $this->complejoA->portada_url);
    }

    public function test_subida_de_archivo_con_formato_no_permitido_retorna_422(): void
    {
        Storage::fake('public');

        $tokenClubA = $this->ownerClubA->createToken('test-token')->plainTextToken;

        $file = UploadedFile::fake()->create('malicious.exe', 500, 'application/octet-stream');

        $response = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->postJson('/api/clubs/padel-norte/branding/upload', [
                'file' => $file,
                'tipo' => 'logo',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_club_admin_puede_crear_listar_editar_y_eliminar_paginas(): void
    {
        $tokenClubA = $this->ownerClubA->createToken('test-token')->plainTextToken;

        // 1. Crear página
        $storeRes = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->postJson('/api/clubs/padel-norte/paginas', [
                'titulo' => 'Reglamento General',
                'contenido_html' => '<p>Normativa oficial del club.</p>',
                'esta_publicada' => true,
                'mostrar_en_header' => true,
                'mostrar_en_footer' => true,
                'orden' => 1,
                'meta_descripcion' => 'Conoce las reglas de conducta y vestimenta de nuestro complejo.',
            ]);

        $storeRes->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'titulo' => 'Reglamento General',
                    'slug' => 'reglamento-general',
                    'mostrar_en_header' => true,
                    'orden' => 1,
                ],
            ]);

        $pageId = $storeRes->json('data.id');

        // 2. Listar páginas del club
        $listRes = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->getJson('/api/clubs/padel-norte/paginas');

        $listRes->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // 3. Editar página
        $updateRes = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->putJson("/api/clubs/padel-norte/paginas/{$pageId}", [
                'titulo' => 'Reglamento Actualizado 2026',
                'orden' => 5,
            ]);

        $updateRes->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'titulo' => 'Reglamento Actualizado 2026',
                    'orden' => 5,
                ],
            ]);

        // 4. Eliminar página
        $deleteRes = $this->withHeader('Authorization', "Bearer {$tokenClubA}")
            ->deleteJson("/api/clubs/padel-norte/paginas/{$pageId}");

        $deleteRes->assertStatus(200);
        $this->assertDatabaseMissing('paginas', ['id' => $pageId]);
    }

    public function test_usuario_de_otro_club_no_puede_modificar_paginas_ajenas_403(): void
    {
        $pagina = Pagina::create([
            'complejo_id' => $this->complejoA->id,
            'titulo' => 'Página Secreta',
            'slug' => 'pagina-secreta',
            'contenido_html' => '<p>Original</p>',
            'esta_publicada' => true,
        ]);

        $tokenClubB = $this->ownerClubB->createToken('test-token-b')->plainTextToken;

        $unauthorizedRes = $this->withHeader('Authorization', "Bearer {$tokenClubB}")
            ->putJson("/api/clubs/padel-norte/paginas/{$pagina->id}", [
                'titulo' => 'Hackeado',
            ]);
        $unauthorizedRes->assertStatus(403);

        $unauthorizedDelete = $this->withHeader('Authorization', "Bearer {$tokenClubB}")
            ->deleteJson("/api/clubs/padel-norte/paginas/{$pagina->id}");
        $unauthorizedDelete->assertStatus(403);
    }

    public function test_get_club_sitemap_returns_published_pages_and_metadata(): void
    {
        Pagina::create([
            'complejo_id' => $this->complejoA->id,
            'titulo' => 'Reglamento Oficial',
            'slug' => 'reglamento-oficial',
            'contenido_html' => '<p>Reglamento</p>',
            'esta_publicada' => true,
        ]);

        Pagina::create([
            'complejo_id' => $this->complejoA->id,
            'titulo' => 'Página Borrador',
            'slug' => 'pagina-borrador',
            'contenido_html' => '<p>Borrador</p>',
            'esta_publicada' => false,
        ]);

        $response = $this->getJson('/api/clubs/padel-norte/sitemap');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'subdominio' => 'padel-norte',
                    'nombre' => 'Club Padel Norte',
                ],
            ]);

        $paginas = $response->json('data.paginas');
        $this->assertCount(1, $paginas);
        $this->assertEquals('reglamento-oficial', $paginas[0]['slug']);
    }

    public function test_get_club_sitemap_returns_404_for_nonexistent_club(): void
    {
        $response = $this->getJson('/api/clubs/inexistente/sitemap');
        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Complejo deportivo no encontrado.',
            ]);
    }
}

