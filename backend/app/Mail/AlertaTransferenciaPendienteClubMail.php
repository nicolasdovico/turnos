<?php

namespace App\Mail;

use App\Models\TurnoPagoDividido;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlertaTransferenciaPendienteClubMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public TurnoPagoDividido $cuota
    ) {}

    public function envelope(): Envelope
    {
        $hora = substr((string) ($this->cuota->turno?->hora_inicio ?? ""), 0, 5);
        return new Envelope(
            subject: "🔔 [Convocatoria] Nuevo Pago por Transferencia para Verificar ({$hora} hs)",
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
        $clubNombre = $this->cuota->complejo?->nombre ?: "Complejo";
        $canchaNombre = $this->cuota->turno?->cancha?->nombre ?: "Cancha Deportiva";
        $fecha = $this->cuota->turno?->fecha ? date("d/m/Y", strtotime($this->cuota->turno->fecha)) : "";
        $horaInicio = substr((string) ($this->cuota->turno?->hora_inicio ?? ""), 0, 5);
        $horaFin = substr((string) ($this->cuota->turno?->hora_fin ?? ""), 0, 5);
        $montoFormateado = "$" . number_format((float) $this->cuota->monto, 2, ",", ".");
        $jugador = $this->cuota->nombre_jugador ?: "Jugador";
        $emailJugador = $this->cuota->email_jugador ?: "Sin email";
        $comprobanteInfo = $this->cuota->comprobante_transferencia ?: "Transferencia informada por el usuario";
        $subdominio = $this->cuota->complejo?->subdominio ?: "nico-padel";
        $urlPanel = "http://{$subdominio}.localhost:8080/panel";

        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nuevo Pago por Verificar - {$clubNombre}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b132b; color: #f1f5f9; padding: 24px; margin: 0;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
        <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px;">🔔</span>
            <h1 style="color: #f59e0b; font-size: 20px; font-weight: 800; margin: 12px 0 4px;">Nueva Transferencia por Verificar</h1>
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">{$clubNombre} • Convocatoria / Partido Abierto</p>
        </div>

        <div style="background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Jugador:</td>
                    <td style="color: #ffffff; font-weight: bold; text-align: right;">{$jugador}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Email:</td>
                    <td style="color: #ffffff; text-align: right;">{$emailJugador}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Cancha:</td>
                    <td style="color: #ffffff; font-weight: bold; text-align: right;">{$canchaNombre}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Fecha y Horario:</td>
                    <td style="color: #ffffff; text-align: right;">{$fecha} • {$horaInicio} a {$horaFin} hs</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Cuota:</td>
                    <td style="color: #ffffff; text-align: right;">Cuota #{$this->cuota->cuota_numero} de {$this->cuota->total_cuotas}</td>
                </tr>
                <tr style="border-top: 1px solid #334155;">
                    <td style="color: #f59e0b; font-weight: bold; padding: 12px 0 6px;">Monto a Verificar:</td>
                    <td style="color: #10b981; font-weight: 900; font-size: 18px; text-align: right; padding: 12px 0 6px;">{$montoFormateado}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 6px 0;">Detalle / Referencia:</td>
                    <td style="color: #cbd5e1; text-align: right; font-style: italic;">{$comprobanteInfo}</td>
                </tr>
            </table>
        </div>

        <div style="text-align: center; margin-top: 24px;">
            <a href="{$urlPanel}" style="display: inline-block; background-color: #10b981; color: #020617; font-weight: 900; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                Ir al Panel y Confirmar Pago →
            </a>
            <p style="color: #64748b; font-size: 11px; margin-top: 16px;">
                Una vez verificado el crédito en la cuenta bancaria del club, confirmá la cuota para enviar automáticamente el comprobante al jugador y asegurar su cupo.
            </p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
