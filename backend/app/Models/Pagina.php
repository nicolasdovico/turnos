<?php

namespace App\Models;

use App\Services\HtmlSanitizerService;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Pagina extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'paginas';

    protected $fillable = [
        'complejo_id',
        'titulo',
        'slug',
        'contenido_html',
        'esta_publicada',
        'orden',
        'mostrar_en_header',
        'mostrar_en_footer',
        'meta_descripcion',
    ];

    protected function casts(): array
    {
        return [
            'esta_publicada' => 'boolean',
            'mostrar_en_header' => 'boolean',
            'mostrar_en_footer' => 'boolean',
            'orden' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Pagina $pagina) {
            if (empty($pagina->slug) && !empty($pagina->titulo)) {
                $pagina->slug = Str::slug($pagina->titulo);
            }

            $sanitizer = app(HtmlSanitizerService::class);
            $pagina->contenido_html = $sanitizer->sanitize($pagina->contenido_html);
        });
    }

    public function complejo(): BelongsTo
    {
        return $this->belongsTo(Complejo::class);
    }
}
