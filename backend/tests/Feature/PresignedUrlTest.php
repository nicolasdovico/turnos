<?php

namespace Tests\Feature;

use App\Models\Complejo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PresignedUrlTest extends TestCase
{
    use RefreshDatabase;

    public function test_generar_presigned_url_con_tipo_mime_valido_retorna_200(): void
    {
        $response = $this->postJson('/api/assets/presigned-url', [
            'content_type' => 'image/webp',
            'folder' => 'canchas',
            'expires_in_minutes' => 15,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'upload_url',
                    'public_url',
                    'key',
                    'bucket',
                    'content_type',
                    'expires_at',
                    'headers' => ['Content-Type'],
                ],
            ]);

        $key = $response->json('data.key');
        $this->assertStringStartsWith('global/canchas/', $key);
        $this->assertStringEndsWith('.webp', $key);

        $uploadUrl = $response->json('data.upload_url');
        $this->assertStringContainsString('X-Amz-Algorithm', $uploadUrl);
        $this->assertStringContainsString('X-Amz-Signature', $uploadUrl);
    }

    public function test_generar_presigned_url_aisla_por_tenant_uuid(): void
    {
        $complejo = Complejo::create([
            'nombre' => 'Club San Telmo',
            'subdominio' => 'santelmo',
            'estado' => 'activo',
        ]);

        $response = $this->withHeader('X-Tenant-ID', $complejo->uuid)
            ->postJson('/api/assets/presigned-url', [
                'content_type' => 'image/png',
                'folder' => 'complejos',
            ]);

        $response->assertStatus(200);

        $key = $response->json('data.key');
        $this->assertStringStartsWith("tenants/{$complejo->uuid}/complejos/", $key);
        $this->assertStringEndsWith('.png', $key);
    }

    public function test_generar_presigned_url_soporta_driver_r2(): void
    {
        $response = $this->postJson('/api/assets/presigned-url', [
            'content_type' => 'image/jpeg',
            'folder' => 'comprobantes',
            'disk' => 'r2',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('image/jpeg', $response->json('data.content_type'));
        $this->assertStringEndsWith('.jpg', $response->json('data.key'));
    }

    public function test_rechaza_archivos_con_tipo_mime_no_permitido(): void
    {
        $response = $this->postJson('/api/assets/presigned-url', [
            'content_type' => 'application/x-php',
            'folder' => 'canchas',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['content_type']);
    }

    public function test_rechaza_carpetas_no_autorizadas(): void
    {
        $response = $this->postJson('/api/assets/presigned-url', [
            'content_type' => 'image/png',
            'folder' => 'system_secrets',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['folder']);
    }
}
