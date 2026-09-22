<?php

namespace App\Filament\Resources\FacturaClubResource\Pages;

use App\Filament\Resources\FacturaClubResource;
use App\Models\FacturaClub;
use App\Services\ClubPaymentGatewayService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditFacturaClub extends EditRecord
{
    protected static string $resource = FacturaClubResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('aprobarTransferencia')
                ->label('Aprobar Pago')
                ->icon('heroicon-o-check-circle')
                ->color('success')
                ->requiresConfirmation()
                ->modalHeading('Confirmar y Aprobar Pago de Factura')
                ->modalDescription('¿Confirmas que el importe correspondiente ha impactado en la cuenta bancaria de la plataforma? La suscripción del club se extenderá automáticamente por 30 días.')
                ->visible(fn (): bool => !in_array($this->record->estado, ['pagada', 'anulada']))
                ->action(function (ClubPaymentGatewayService $gatewayService) {
                    $gatewayService->marcarFacturaPagada(
                        $this->record,
                        'transferencia_bancaria',
                        'Pago por transferencia bancaria aprobado manualmente por el Superadministrador desde la edición de factura.'
                    );

                    $this->record->refresh();
                    $this->fillForm();

                    Notification::make()
                        ->title('Factura Aprobada')
                        ->body("La factura {$this->record->numero_factura} ha sido marcada como pagada y el período del club {$this->record->complejo?->nombre} fue extendido exitosamente.")
                        ->success()
                        ->send();
                }),
            Actions\DeleteAction::make(),
        ];
    }
}
