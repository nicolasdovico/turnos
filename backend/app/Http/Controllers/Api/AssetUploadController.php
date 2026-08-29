<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complejo;
use App\Services\StoragePresignedUrlService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetUploadController extends Controller
{
    public function __construct(
        protected StoragePresignedUrlService $presignedUrlService
    ) {}

    /**
     * Genera una URL prefirmada para subida directa de imágenes y assets a S3 o Cloudflare R2.
     * POST /api/assets/presigned-url
     */
    public function generatePresignedUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content_type' => [
                'required',
                'string',
                'in:' . implode(',', array_keys(StoragePresignedUrlService::ALLOWED_MIME_TYPES)),
            ],
            'folder' => [
                'nullable',
                'string',
                'in:' . implode(',', StoragePresignedUrlService::ALLOWED_FOLDERS),
            ],
            'expires_in_minutes' => ['nullable', 'integer', 'min:1', 'max:60'],
            'disk' => ['nullable', 'string', 'in:s3,r2'],
        ]);

        $contentType = $validated['content_type'];
        $folder = $validated['folder'] ?? 'assets';
        $expiresIn = $validated['expires_in_minutes'] ?? 15;
        $disk = $validated['disk'] ?? 's3';

        // Obtener UUID del tenant desde el contexto de la petición si existe
        $tenant = $request->attributes->get('tenant');
        $tenantUuid = null;

        if ($tenant instanceof Complejo) {
            $tenantUuid = $tenant->uuid;
        } elseif ($tenantHeader = $request->header('X-Tenant-ID')) {
            $tenantUuid = $tenantHeader;
        }

        $presignedData = $this->presignedUrlService->generatePresignedUploadUrl(
            $contentType,
            $folder,
            $tenantUuid,
            $expiresIn,
            $disk
        );

        return response()->json([
            'success' => true,
            'message' => 'URL prefirmada generada exitosamente para subida directa',
            'data' => $presignedData,
        ], 200);
    }
}
