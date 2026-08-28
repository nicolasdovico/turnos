<?php

namespace App\Services;

class HtmlSanitizerService
{
    /**
     * List of allowed HTML tags for CMS page contents.
     */
    protected const ALLOWED_TAGS = [
        '<h1>', '<h2>', '<h3>', '<h4>', '<h5>', '<h6>',
        '<p>', '<br>', '<hr>',
        '<a>', '<b>', '<strong>', '<i>', '<em>', '<u>', '<s>', '<strike>', '<code>', '<pre>', '<mark>',
        '<ul>', '<ol>', '<li>',
        '<blockquote>', '<figure>', '<figcaption>',
        '<table>', '<thead>', '<tbody>', '<tfoot>', '<tr>', '<th>', '<td>',
        '<div>', '<span>', '<section>', '<article>', '<header>', '<footer>',
        '<img>', '<video>', '<audio>', '<source>',
    ];

    /**
     * Sanitize user provided HTML content, removing dangerous tags,
     * inline event handlers (onerror, onload, onclick, etc.), and javascript: schemes.
     */
    public function sanitize(?string $html): string
    {
        if (empty($html)) {
            return '';
        }

        // 1. Remove dangerous blocks completely including their body (script, style, iframe, object, embed, etc.)
        $cleaned = preg_replace('/<(script|style|iframe|object|embed|applet|svg|math)[^>]*>.*?<\/\1>/is', '', $html);
        $cleaned = preg_replace('/<(script|style|iframe|object|embed|applet|svg|math)[^>]*\/?>/is', '', $cleaned);

        // 2. Strip disallowed HTML tags
        $allowedTagsString = implode('', self::ALLOWED_TAGS);
        $cleaned = strip_tags($cleaned, $allowedTagsString);

        // 3. Remove inline event handlers (e.g. onerror=..., onclick=..., onload=...)
        $cleaned = preg_replace('/\s*on[a-zA-Z]+\s*=\s*(["\'][^"\']*["\']|[^\s>]+)/i', '', $cleaned);

        // 4. Remove dangerous javascript: / data: pseudo-protocols from attributes
        $cleaned = preg_replace_callback('/(href|src|poster)\s*=\s*(["\'])(.*?)\2/i', function ($matches) {
            $attribute = $matches[1];
            $quote = $matches[2];
            $value = trim($matches[3]);

            // Decode entities to check for obfuscated javascript:
            $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $decoded = preg_replace('/\s+/', '', $decoded);

            if (preg_match('/^(javascript|vbscript|data):/i', $decoded)) {
                return "{$attribute}={$quote}#{$quote}";
            }

            return "{$attribute}={$quote}{$value}{$quote}";
        }, $cleaned);

        return trim($cleaned);
    }
}
