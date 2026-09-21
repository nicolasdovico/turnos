<?php

namespace App\Filament\Resources;

use App\Filament\Resources\FacturaClubResource\Pages;
use App\Models\FacturaClub;
use App\Services\ClubPaymentGatewayService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class FacturaClubResource extends Resource
{
    protected static ?string $model = FacturaClub::class;

    protected static ?string $navigationIcon = 'heroicon-o-banknotes';

    protected static ?string $navigationGroup = 'Facturación & Finanzas';

    protected static ?string $modelLabel = 'Factura de Club';

    protected static ?string $pluralModelLabel = 'Facturas de Clubes';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Información General')
                    ->schema([
                        Forms\Components\Select::make('complejo_id')
                            ->label('Club / Complejo')
                            ->relationship('complejo', 'nombre')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Forms\Components\Select::make('plan_id')
                            ->label('Plan Asignado')
                            ->relationship('plan', 'nombre')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Forms\Components\TextInput::make('numero_factura')
                            ->label('N° Factura')
                            ->required()
                            ->maxLength(50),
                        Forms\Components\TextInput::make('periodo')
                            ->label('Período')
                            ->placeholder('YYYY-MM')
                            ->required()
                            ->maxLength(7),
                        Forms\Components\DatePicker::make('fecha_emision')
                            ->label('Fecha Emisión')
                            ->required(),
                        Forms\Components\DatePicker::make('fecha_vencimiento')
                            ->label('Fecha Vencimiento')
                            ->required(),
                        Forms\Components\DatePicker::make('fecha_gracia_vencimiento')
                            ->label('Fin Período de Gracia')
                            ->helperText('Fecha límite antes de suspender funciones operativas del club.'),
                    ])->columns(2),

                Forms\Components\Section::make('Cálculo de Importes y Comisiones')
                    ->schema([
                        Forms\Components\TextInput::make('monto_plan_base_usd')
                            ->label('Plan Base (USD)')
                            ->prefix('$')
                            ->numeric()
                            ->required()
                            ->default(0),
                        Forms\Components\TextInput::make('canchas_totales')
                            ->label('Canchas Totales')
                            ->numeric()
                            ->default(0),
                        Forms\Components\TextInput::make('canchas_incluidas_plan')
                            ->label('Canchas Cupo')
                            ->numeric()
                            ->default(0),
                        Forms\Components\TextInput::make('canchas_excedentes')
                            ->label('Canchas Excedentes')
                            ->numeric()
                            ->default(0),
                        Forms\Components\TextInput::make('precio_unitario_cancha_extra_usd')
                            ->label('Precio Unit. Cancha Extra (USD)')
                            ->prefix('$')
                            ->numeric()
                            ->default(0),
                        Forms\Components\TextInput::make('monto_canchas_extras_usd')
                            ->label('Total Canchas Extras (USD)')
                            ->prefix('$')
                            ->numeric()
                            ->default(0),
                        Forms\Components\TextInput::make('cantidad_turnos_marketplace')
                            ->label('Turnos Marketplace')
                            ->numeric()
                            ->default(0),
                        Forms\Components\TextInput::make('monto_comisiones_marketplace_usd')
                            ->label('Comisiones Marketplace (USD)')
                            ->prefix('$')
                            ->numeric()
                            ->default(0),
                        Forms\Components\TextInput::make('total_usd')
                            ->label('Total Final (USD)')
                            ->prefix('$')
                            ->numeric()
                            ->required(),
                        Forms\Components\TextInput::make('tipo_cambio_ars')
                            ->label('Tipo de Cambio (ARS/USD)')
                            ->prefix('$')
                            ->numeric()
                            ->required(),
                        Forms\Components\TextInput::make('total_ars')
                            ->label('Total Final (ARS)')
                            ->prefix('$')
                            ->numeric()
                            ->required(),
                    ])->columns(3),

                Forms\Components\Section::make('Estado y Cobro')
                    ->schema([
                        Forms\Components\Select::make('estado')
                            ->label('Estado de Factura')
                            ->options([
                                'pendiente' => 'Pendiente',
                                'pagada' => 'Pagada',
                                'en_revision' => 'En Revisión (Comprobante cargado)',
                                'vencida' => 'Vencida',
                                'anulada' => 'Anulada',
                            ])
                            ->required()
                            ->default('pendiente'),
                        Forms\Components\Select::make('metodo_pago')
                            ->label('Método de Pago')
                            ->options([
                                'mercadopago' => 'Mercado Pago',
                                'stripe' => 'Stripe',
                                'transferencia_bancaria' => 'Transferencia Bancaria',
                            ]),
                        Forms\Components\DateTimePicker::make('fecha_pago')
                            ->label('Fecha de Pago'),
                        Forms\Components\TextInput::make('comprobante_transferencia_url')
                            ->label('URL / Comprobante de Transferencia')
                            ->url()
                            ->maxLength(2048),
                        Forms\Components\Textarea::make('comprobante_transferencia_notas')
                            ->label('Notas del Club sobre el Comprobante')
                            ->columnSpanFull(),
                        Forms\Components\Textarea::make('notas_admin')
                            ->label('Notas de Administración Interna')
                            ->columnSpanFull(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('numero_factura')
                    ->label('N° Factura')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('complejo.nombre')
                    ->label('Club')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('periodo')
                    ->label('Período')
                    ->badge()
                    ->color('gray')
                    ->sortable(),
                Tables\Columns\TextColumn::make('total_usd')
                    ->label('Total USD')
                    ->money('USD')
                    ->sortable(),
                Tables\Columns\TextColumn::make('total_ars')
                    ->label('Total ARS')
                    ->money('ARS')
                    ->sortable(),
                Tables\Columns\TextColumn::make('estado')
                    ->label('Estado')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pagada' => 'success',
                        'pendiente' => 'warning',
                        'en_revision' => 'info',
                        'vencida' => 'danger',
                        default => 'gray',
                    })
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('metodo_pago')
                    ->label('Método')
                    ->badge()
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'mercadopago' => 'Mercado Pago',
                        'stripe' => 'Stripe',
                        'transferencia_bancaria' => 'Transferencia',
                        default => $state ?: '-',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('fecha_vencimiento')
                    ->label('Vencimiento')
                    ->date()
                    ->sortable(),
                Tables\Columns\TextColumn::make('fecha_pago')
                    ->label('Pagada el')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('estado')
                    ->options([
                        'pendiente' => 'Pendiente',
                        'pagada' => 'Pagada',
                        'en_revision' => 'En Revisión',
                        'vencida' => 'Vencida',
                        'anulada' => 'Anulada',
                    ]),
                Tables\Filters\SelectFilter::make('metodo_pago')
                    ->options([
                        'mercadopago' => 'Mercado Pago',
                        'stripe' => 'Stripe',
                        'transferencia_bancaria' => 'Transferencia',
                    ]),
            ])
            ->actions([
                Tables\Actions\Action::make('aprobarTransferencia')
                    ->label('Aprobar Pago')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Confirmar y Aprobar Pago de Factura')
                    ->modalDescription('¿Confirmas que el importe correspondiente ha impactado en la cuenta bancaria de la plataforma? La suscripción del club se extenderá automáticamente por 30 días.')
                    ->visible(fn (FacturaClub $record): bool => in_array($record->estado, ['en_revision', 'pendiente', 'vencida']))
                    ->action(function (FacturaClub $record, ClubPaymentGatewayService $gatewayService) {
                        $gatewayService->marcarFacturaPagada(
                            $record,
                            'transferencia_bancaria',
                            'Pago por transferencia bancaria aprobado manualmente por el Superadministrador.'
                        );

                        Notification::make()
                            ->title('Factura Aprobada')
                            ->body("La factura {$record->numero_factura} ha sido marcada como pagada y el período del club {$record->complejo?->nombre} fue extendido.")
                            ->success()
                            ->send();
                    }),
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFacturasClub::route('/'),
            'create' => Pages\CreateFacturaClub::route('/create'),
            'edit' => Pages\EditFacturaClub::route('/{record}/edit'),
        ];
    }
}
