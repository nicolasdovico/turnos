<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PlanResource\Pages;
use App\Models\Plan;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PlanResource extends Resource
{
    protected static ?string $model = Plan::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    protected static ?string $navigationGroup = 'Configuración Global';

    protected static ?string $modelLabel = 'Plan';

    protected static ?string $pluralModelLabel = 'Planes';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Información del Plan')
                    ->schema([
                        Forms\Components\TextInput::make('nombre')
                            ->label('Nombre del Plan')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('slug')
                            ->label('Slug / Identificador')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255),
                        Forms\Components\TextInput::make('precio_mensual')
                            ->label('Precio Mensual')
                            ->prefix('$')
                            ->required()
                            ->numeric()
                            ->default(0),
                        Forms\Components\Select::make('estado')
                            ->label('Estado')
                            ->options([
                                'activo' => 'Activo',
                                'inactivo' => 'Inactivo',
                            ])
                            ->required()
                            ->default('activo'),
                    ])->columns(2),

                Forms\Components\Section::make('Módulos Incluidos')
                    ->description('Selecciona los módulos del sistema que estarán habilitados para los clubes y complejos suscritos a este plan.')
                    ->schema([
                        Forms\Components\CheckboxList::make('modulos')
                            ->relationship('modulos', 'nombre')
                            ->columns(3)
                            ->gridDirection('row')
                            ->bulkToggleable()
                            ->searchable(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('nombre')
                    ->label('Plan')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->badge()
                    ->color('gray')
                    ->searchable(),
                Tables\Columns\TextColumn::make('precio_mensual')
                    ->label('Precio Mensual')
                    ->money('USD')
                    ->sortable(),
                Tables\Columns\TextColumn::make('modulos.nombre')
                    ->label('Módulos Incluidos')
                    ->badge()
                    ->color('success')
                    ->separator(', ')
                    ->wrap()
                    ->searchable(),
                Tables\Columns\TextColumn::make('estado')
                    ->label('Estado')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'activo' => 'success',
                        'inactivo' => 'danger',
                        default => 'warning',
                    })
                    ->searchable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Creado')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Actualizado')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('modulos')
                    ->relationship('modulos', 'nombre')
                    ->label('Filtrar por Módulo')
                    ->multiple()
                    ->preload(),
                Tables\Filters\SelectFilter::make('estado')
                    ->options([
                        'activo' => 'Activo',
                        'inactivo' => 'Inactivo',
                    ]),
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
            'index' => Pages\ListPlans::route('/'),
            'create' => Pages\CreatePlan::route('/create'),
            'edit' => Pages\EditPlan::route('/{record}/edit'),
        ];
    }
}
