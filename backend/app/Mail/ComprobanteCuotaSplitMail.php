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
<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe