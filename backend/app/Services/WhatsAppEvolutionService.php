<?php

namespace App\Services;

use App\Models\Cancha;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppEvolutionService
{
    protected string $baseUrl;
    protected string $apiKey;
    protected string $instance;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.evolution_api.url', 'http://evolution_api:8080'), '/');
        $this->apiKey = config('services.evolution_api.api_key', 'evolution_secret_token_saas');
        $this->instance = config('services.evolution_api.instance', 'turnos');
    }

    /**
     * Enviar mensaje de WhatsApp avisando sobre un turno liberado.
     */
    public function enviarMensajeTurnoLiberado(
        User $user,
        Cancha $cancha,
        string $fecha,
        string $horaInicio,
        ?string $horaFin = null
    ): bool {
        if (empty($user->telefono)) {
            Log::warning("WhatsApp lista de espera no enviado: el usuario {$user->id} ({$user->name}) no tiene teléfono registrado.");
            return false;
        }

        $numeroLimpio = $this->formatearNumeroTelefono($user->telefono);
        if (empty($numeroLimpio)) {
            Log::warning("WhatsApp lista de espera no enviado: teléfono de usuario {$user->id} ({$user->telefono}) no pudo ser formateado.");
            return false;
        }

        $complejo = $cancha->complejo;
        $complejoNombre = $complejo?->nombre ?: 'Tu Club Deportivo';
        $subdominio = $complejo?->subdominio ?: 'app';
        $fechaCarbon = Carbon::parse($fecha);
        $fechaFormateada = $fechaCarbon->format('d/m/Y');
        $horaFinTexto = $horaFin ? " a {$horaFin}" : '';

        // Construir URL directa de reserva
        $frontendHost = env('FRONTEND_URL', 'http://localhost:8080');
        if ($subdominio && $subdominio !== 'app' && !str_contains($frontendHost, $subdominio)) {
            $parsed = parse_url($frontendHost);
            $host = $parsed['host'] ?? 'localhost';
            $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
            $scheme = $parsed['scheme'] ?? 'http';
            $reservaUrl = "{$scheme}://{$subdominio}.{$host}{$port}/?fecha={$fecha}&cancha={$cancha->id}";
        } else {
            $reservaUrl = "{$frontendHost}/?fecha={$fecha}&cancha={$cancha->id}";
        }

        $mensaje = "🎾 *¡Turno Liberado en {$complejoNombre}!* \n\n"
            . "Hola *{$user->name}*, se acaba de liberar el turno que estabas esperando:\n"
            . "🏟️ *Cancha:* {$cancha->nombre}\n"
            . "📅 *Fecha:* {$fechaFormateada}\n"
            . "⏰ *Horario:* {$horaInicio}{$horaFinTexto} hs\n\n"
            . "👉 *Reservalo ya mismo antes que nadie:*\n{$reservaUrl}\n\n"
            . "⚡ _Quien complete la reserva primero se queda con el turno._";

        return $this->enviarMensajeTexto($numeroLimpio, $mensaje);
    }

    /**
     * Envía mensaje de texto plano a través de Evolution API.
     */
    public function enviarMensajeTexto(string $numero, string $texto): bool
    {
        try {
            $endpoint = "{$this->baseUrl}/message/sendText/{$this->instance}";

            $response = Http::timeout(5)
                ->withHeaders([
                    'apikey' => $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($endpoint, [
                    'number' => $numero,
                    'text' => $texto,
                ]);

            if ($response->successful()) {
                Log::info("WhatsApp enviado exitosamente vía Evolution API a {$numero}");
                return true;
            }

            Log::warning("Evolution API response error ({$response->status()}): " . $response->body());
            return false;
        } catch (\Throwable $e) {
            Log::warning("No se pudo conectar con Evolution API ({$this->baseUrl}): " . $e->getMessage());
            return false;
        }
    }

    /**
     * Limpia y estandariza el número de teléfono con código de país.
     */
    protected function formatearNumeroTelefono(string $telefono): string
    {
        $digitos = preg_replace('/\D+/', '', $telefono);

        if (empty($digitos)) {
            return '';
        }

        // Si empieza con 0 en Argentina, quitar el 0 inicial
        if (str_starts_with($digitos, '0')) {
            $digitos = substr($digitos, 1);
        }

        // Si es número argentino de 10 dígitos (ej. 1133445566), agregar 549
        if (strlen($digitos) === 10 && (str_starts_with($digitos, '11') || str_starts_with($digitos, '2') || str_starts_with($digitos, '3'))) {
            $digitos = '549' . $digitos;
        }

        // Si tiene 11 dígitos y empieza con 9 (ej. 91133445566), agregar 54
        if (strlen($digitos) === 11 && str_starts_with($digitos, '9')) {
            $digitos = '54' . $digitos;
        }

        // Si tiene 12 dígitos y empieza con 54 pero no 549 (ej. 541133445566), insertar el 9: 5491133445566
        if (strlen($digitos) === 12 && str_starts_with($digitos, '54') && !str_starts_with($digitos, '549')) {
            $digitos = '549' . substr($digitos, 2);
        }

        return $digitos;
    }
}
