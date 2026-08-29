<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerificationOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $codigo,
        public string $nombreUsuario = 'Usuario'
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Tu código de verificación: {$this->codigo} - Turnos SaaS",
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
    <title>Código de Verificación - Turnos SaaS</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #1e293b;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden;">
        <tr>
            <td style="background-color: #059669; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">⚡ Turnos SaaS</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px 28px; text-align: center;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">Verifica tu Correo Electrónico</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                    Hola <strong>{$this->nombreUsuario}</strong>,<br>
                    Para completar tu registro y asegurar tu cuenta en Turnos SaaS, ingresa el siguiente código de verificación de 6 dígitos:
                </p>
                
                <div style="background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 18px 24px; margin: 24px 0; display: inline-block;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #059669;">{$this->codigo}</span>
                </div>
                
                <p style="color: #64748b; font-size: 12px; margin-top: 20px; margin-bottom: 0;">
                    ⏱️ Este código expirará en <strong>10 minutos</strong>.<br>
                    Si no creaste una cuenta en Turnos SaaS, por favor ignora este mensaje.
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                    © 2026 Turnos SaaS Deportivo. Plataforma Multitenant de Gestión y Reservas.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
}
