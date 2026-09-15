<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TurnoLiberadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $nombreUsuario,
        public string $complejoNombre,
        public string $canchaNombre,
        public string $fecha,
        public string $horaInicio,
        public string $horaFin,
        public string $reservaUrl
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🎾 ¡Turno Disponible a las {$this->horaInicio} hs en {$this->complejoNombre}!",
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    protected function buildHtml(): string
    {
        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>¡Turno Liberado! - {$this->complejoNombre}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 40px 20px; color: #e2e8f0;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #1e293b; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); border: 1px solid #334155; overflow: hidden;">
        <tr>
            <td style="background-color: #059669; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">⚡ {$this->complejoNombre}</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px 28px; text-align: center;">
                <div style="font-size: 36px; margin-bottom: 8px;">🔔</div>
                <h2 style="color: #f8fafc; margin-top: 0; font-size: 20px; font-weight: 700;">¡Se liberó el turno que estabas esperando!</h2>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                    Hola <strong>{$this->nombreUsuario}</strong>,<br>
                    Alguien acaba de cancelar o liberar su reserva. El horario ya está disponible en la grilla pública para que lo aproveches antes que nadie:
                </p>
                
                <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: left;">
                    <p style="margin: 6px 0; font-size: 14px; color: #cbd5e1;">🏟️ <strong>Cancha:</strong> {$this->canchaNombre}</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #cbd5e1;">📅 <strong>Fecha:</strong> {$this->fecha}</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #cbd5e1;">⏰ <strong>Horario:</strong> {$this->horaInicio} a {$this->horaFin} hs</p>
                </div>
                
                <div style="margin: 28px 0 16px 0;">
                    <a href="{$this->reservaUrl}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);">
                        👉 Reservar Turno Ahora
                    </a>
                </div>
                
                <p style="color: #64748b; font-size: 12px; margin-top: 20px; margin-bottom: 0;">
                    ⚡ <em>Recuerda que la lista de espera avisa a todos los interesados. Quien reserve primero se queda con el turno.</em>
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #0f172a; padding: 16px; text-align: center; border-top: 1px solid #334155;">
                <p style="color: #64748b; font-size: 11px; margin: 0;">
                    Recibiste este correo porque activaste la alerta de lista de espera en {$this->complejoNombre}.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
}
