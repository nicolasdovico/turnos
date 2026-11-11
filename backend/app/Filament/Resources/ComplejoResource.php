<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ComplejoResource\Pages;
use App\Filament\Resources\ComplejoResource\RelationManagers;
use App\Models\Complejo;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class ComplejoResource extends Resource
{
    protected static ?string $model = Complejo::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('uuid')
                    ->label('UUID')
                    ->required(),
                Forms\Components\TextInput::make('nombre')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('subdominio')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('dominio_personalizado')
                    ->maxLength(255),
                Forms\Components\Select::make('plan_id')
                    ->relationship('plan', 'nombre'),
                Forms\Components\Select::make('tipo_negocio_id')
                    ->label('Tipo de Negocio')
                    ->relationship('tipoNegocio', 'nombre')
                    ->searchable()
                    ->preload(),
                Forms\Components\TextInput::make('estado')
                    ->required()
                    ->maxLength(255)
                    ->default('activo'),
                Forms\Components\Select::make('suscripcion_estado')
                    ->label('Estado Suscripción')
                    ->options([
                        'trial' => 'Prueba Gratuita (Trial)',
                        'activa' => 'Suscripción Activa',
                        'gracia' => 'Período de Gracia',
                        'vencida' => 'Vencida / Impaga',
                        'suspendida' => 'Suspendida',
                    ])
                    ->default('trial')
                    ->required(),
                Forms\Components\DateTimePicker::make('suscripcion_trial_vence_at')
                    ->label('Vencimiento Prueba Gratuita (Trial)'),
                Forms\Components\DateTimePicker::make('suscripcion_proximo_vencimiento')
                    ->label('Próximo Vencimiento Pago'),
                Forms\Components\DateTimePicker::make('suscripcion_gracia_vence_at')
                    ->label('Límite Período de Gracia'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('uuid')
                    ->label('UUID')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('nombre')
                    ->searchable(),
                Tables\Columns\TextColumn::make('tipoNegocio.nombre')
                    ->label('Tipo')
                    ->sortable()
                    ->badge(),
                Tables\Columns\TextColumn::make('subdominio')
                    ->searchable(),
                Tables\Columns\TextColumn::make('dominio_personalizado')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('plan.nombre')
                    ->sortable(),
                Tables\Columns\TextColumn::make('suscripcion_estado')
                    ->label('Suscripción')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'activa' => 'success',
                        'trial' => 'info',
                        'gracia' => 'warning',
                        'vencida', 'suspendida' => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'trial' => 'Prueba',
                        'activa' => 'Activa',
                        'gracia' => 'En Gracia',
                        'vencida' => 'Vencida',
                        'suspendida' => 'Suspendida',
                        default => $state,
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('suscripcion_trial_vence_at')
                    ->label('Vence Prueba')
                    ->dateTime('d/m/Y H:i')
                    ->description(function (Complejo $record): ?string {
                        if ($record->suscripcion_estado === 'trial' && $record->suscripcion_trial_vence_at) {
                            $dias = (int) round(now()->diffInDays($record->suscripcion_trial_vence_at, false));
                            if ($dias > 0) {
                                return "Quedan {$dias} días";
                            } elseif ($dias === 0) {
                                return "Vence hoy";
                            } else {
                                return "Venció hace " . abs($dias) . " días";
                            }
                        }
                        return null;
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('estado')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
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
            'index' => Pages\ListComplejos::route('/'),
            'create' => Pages\CreateComplejo::route('/create'),
            'edit' => Pages\EditComplejo::route('/{record}/edit'),
        ];
    }
}
