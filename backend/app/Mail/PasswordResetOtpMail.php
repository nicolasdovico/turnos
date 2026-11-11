<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $codigo,
        public string $nombreUsuario = 'Usuario'
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Código para restablecer tu contraseña: {$this->codigo} - TurnosFlow",
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
    <title>Recuperación de Contraseña - TurnosFlow</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #1e293b;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden;">
        <tr>
            <td style="background-color: #059669; padding: 28px 24px; text-align: center;">
                <img src="https://turnosflow.com/logo-full.png" alt="TurnosFlow" height="42" style="max-height: 42px; width: auto; display: inline-block;" />
            </td>
        </tr>
        <tr>
            <td style="padding: 32px 28px;">
                <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; color: #0f172a;">Hola, {$this->nombreUsuario}</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>TurnosFlow</strong>. Utiliza el siguiente código de seguridad de 6 dígitos para continuar:
                </p>

                <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #059669; display: inline-block;">
                        {$this->codigo}
                    </span>
                </div>

                <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 8px;">
                    ⏱️ Este código es válido durante los próximos <strong>15 minutos</strong>.
                </p>
                <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 0;">
                    🔒 Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura. Tu contraseña actual no será modificada.
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                © 2026 TurnosFlow • Plataforma Integral de Gestión y Reservas
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
}
