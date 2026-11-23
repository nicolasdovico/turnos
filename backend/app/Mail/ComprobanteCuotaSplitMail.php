<?php

namespace App\Mail;

use App\Models\TurnoPagoDividido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ComprobanteCuotaSplitMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public TurnoPagoDividido $cuota
    ) {}

    public function envelope(): Envelope
    {
        $clubNombre = $this->cuota->complejo?->nombre ?: "Tu Club";
        return new Envelope(
            subject: "✅ Comprobante de Pago Confirmado - {$clubNombre} (#{$this->cuota->cuota_numero}/{$this->cuota->total_cuotas})",
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
        $clubNombre = $this->cuota->complejo?->nombre ?: "Complejo Deportivo";
        $canchaNombre = $this->cuota->turno?->cancha?->nombre ?: "Cancha Deportiva";
        $deporte = ucfirst($this->cuota->turno?->cancha?->deporte ?: "Deporte");
        $fecha = $this->cuota->turno?->fecha ? date("d/m/Y", strtotime($this->cuota->turno->fecha)) : "";
        $horaInicio = substr((string) ($this->cuota->turno?->hora_inicio ?? ""), 0, 5);
        $horaFin = substr((string) ($this->cuota->turno?->hora_fin ?? ""), 0, 5);
        $montoFormateado = "$" . number_format((float) $this->cuota->monto, 2, ",", ".");
        $metodo = ucfirst($this->cuota->metodo_pago ?: "Transferencia");
        $jugador = $this->cuota->nombre_jugador ?: "Jugador";
        $token = $this->cuota->token_pago;

        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante de Pago - {$clubNombre}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b132b; color: #f1f5f9; padding: 24px; margin: 0;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
        <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px;">🎾</span>
            <h1 style="color: #10b981; font-size: 20px; font-weight: 800; margin: 12px 0 4px;">¡Tu Cuota ha sido Confirmada!</h1>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">{$clubNombre} • Convocatoria de Partido</p>
        </div>

        <div style="background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Titular de la Cuota:</td>
                    <td style="color: #ffffff; font-weight: bold; text-align: right;">{$jugador}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Cancha:</td>
                    <td style="color: #ffffff; font-weight: bold; text-align: right;">{$canchaNombre} ({$deporte})</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Fecha:</td>
                    <td style="color: #ffffff; text-align: right;">{$fecha}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Horario:</td>
                    <td style="color: #ffffff; text-align: right;">{$horaInicio} a {$horaFin} hs</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Detalle:</td>
                    <td style="color: #ffffff; text-align: right;">Cuota #{$this->cuota->cuota_numero} de {$this->cuota->total_cuotas}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Medio de Pago:</td>
                    <td style="color: #ffffff; text-align: right;">{$metodo}</td>
                </tr>
                <tr style="border-top: 1px solid #334155;">
                    <td style="color: #10b981; font-weight: bold; padding: 12px 0 6px;">Total Abonado:</td>
                    <td style="color: #10b981; font-weight: 900; font-size: 18px; text-align: right; padding: 12px 0 6px;">{$montoFormateado}</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin-top: 24px;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Tu lugar en la convocatoria está 100% asegurado. ¡Nos vemos en la cancha!
            </p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
