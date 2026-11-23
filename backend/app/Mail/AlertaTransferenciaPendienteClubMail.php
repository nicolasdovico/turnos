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
        $subdomain = $this->cuota->complejo?->subdominio ?: "admin";
        $urlPanel = url("/panel");

        return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Nuevo Pago por Verificar - {$clubNombre}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe