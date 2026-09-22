<?php

namespace App\Services;

class ClubTemplateRegistry
{
    /**
     * Catálogo maestro de plantillas web disponibles para los clubes.
     * Diseñado con arquitectura abierta para registrar nuevas plantillas sin alterar la base de datos.
     */
    public static function all(): array
    {
        return [
            'booking_direct' => [
                'slug' => 'booking_direct',
                'nombre' => 'Booking Direct / Operativa',
                'descripcion' => 'Enfoque directo en la reserva rápida. Grilla horaria en primer plano superior, ideal para complejos de pádel o fútbol orientados a conversión inmediata.',
                'badge' => '⚡ Más Rápida',
                'preview_imagen' => '/templates/previews/booking_direct.webp',
                'plan_minimo' => 'Bronce',
                'caracteristicas' => [
                    'Cabecera compacta con logo y contacto directo',
                    'Grilla de turnos y canchas en primer plano',
                    'Sin distracciones ni bloques informativos pesados',
                    'Acceso veloz a WhatsApp y cómo llegar',
                ],
            ],
            'institucional' => [
                'slug' => 'institucional',
                'nombre' => 'Club Tradicional / Institucional',
                'descripcion' => 'Presencia institucional y vida de club. Hero banner con portada, mensaje de bienvenida, menú superior hacia páginas institucionales y grilla de reservas integrada.',
                'badge' => '🏛️ Club Social',
                'preview_imagen' => '/templates/previews/institucional.webp',
                'plan_minimo' => 'Bronce',
                'caracteristicas' => [
                    'Gran banner de portada (Hero) con eslogan y reseña',
                    'Menú de navegación a páginas (/quienes-somos, /reglamento)',
                    'Bloques destacados de instalaciones y servicios',
                    'Grilla horaria integrada armónicamente',
                ],
            ],
            'modern_showcase' => [
                'slug' => 'modern_showcase',
                'nombre' => 'Modern Showcase / Premium',
                'descripcion' => 'Estética contemporánea de alto impacto visual. Tarjetas fotográficas amplias por cancha con insignias de equipamiento (LED, climatizada, césped pro) y reserva fluida.',
                'badge' => '✨ Boutique / Premium',
                'preview_imagen' => '/templates/previews/modern_showcase.webp',
                'plan_minimo' => 'Bronce',
                'caracteristicas' => [
                    'Tarjetas fotográficas destacadas por cada cancha',
                    'Insignias técnicas (césped sintético pro, LED, cámaras)',
                    'Contraste moderno de alto impacto en modo oscuro',
                    'Barra de contacto y reserva flotante interactiva',
                ],
            ],
        ];
    }

    /**
     * Retorna únicamente los slugs de las plantillas registradas.
     *
     * @return array<string>
     */
    public static function slugs(): array
    {
        return array_keys(self::all());
    }

    /**
     * Determina si un slug corresponde a una plantilla válida.
     */
    public static function isValid(?string $slug): bool
    {
        if (!$slug) {
            return false;
        }

        return array_key_exists($slug, self::all());
    }

    /**
     * Slug de la plantilla por defecto.
     */
    public static function defaultSlug(): string
    {
        return 'booking_direct';
    }

    /**
     * Retorna los metadatos de una plantilla específica.
     */
    public static function get(string $slug): ?array
    {
        return self::all()[$slug] ?? null;
    }
}
