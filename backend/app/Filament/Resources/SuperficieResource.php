<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SuperficieResource\Pages;
use App\Models\Deporte;
use App\Models\Superficie;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Set;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class SuperficieResource extends Resource
{
    protected static ?string $model = Superficie::class;

    protected static ?string $navigationIcon = 'heroicon-o-sparkles';

    protected static ?string $navigationGroup = 'Configuración Deportiva';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Detalle de la Superficie')
                    ->schema([
                        Forms\Components\Select::make('deporte_id')
                            ->label('Deporte Asociado')
                            ->relationship('deporte', 'nombre')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Forms\Components\TextInput::make('nombre')
                            ->label('Nombre de la Superficie')
                            ->placeholder('ej. Césped Sintético Texturado (WPT)')
                            ->required()
                            ->maxLength(100)
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (string $operation, ?string $state, Set $set) {
                                if ($operation === 'create') {
                                    $set('slug', Str::slug($state));
                                }
                            }),
                        Forms\Components\TextInput::make('slug')
                            ->label('Slug / Identificador')
                            ->required()
                            ->maxLength(100),
                        Forms\Components\TextInput::make('orden')
                            ->label('Orden de Visualización')
                            ->numeric()
                            ->default(fn () => (\App\Models\Superficie::max('orden') ?? 0) + 1),
                        Forms\Components\Textarea::make('descripcion')
                            ->label('Descripción / Características')
                            ->columnSpanFull(),
                        Forms\Components\Toggle::make('esta_activo')
                            ->label('Superficie Activa')
                            ->default(true)
                            ->required(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('deporte.nombre')
                    ->label('Deporte')
                    ->badge()
                    ->color('info')
                    ->sortable()
                    ->searchable(),
                Tables\Columns\TextColumn::make('nombre')
                    ->label('Superficie')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('orden')
                    ->label('Orden')
                    ->sortable(),
                Tables\Columns\IconColumn::make('esta_activo')
                    ->label('Activo')
                    ->boolean()
                    ->sortable(),
            ])
            ->defaultSort('orden', 'asc')
            ->filters([
                Tables\Filters\SelectFilter::make('deporte_id')
                    ->label('Filtrar por Deporte')
                    ->relationship('deporte', 'nombre'),
                Tables\Filters\TernaryFilter::make('esta_activo')
                    ->label('Solo Activas'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
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
            'index' => Pages\ListSuperficies::route('/'),
            'create' => Pages\CreateSuperficie::route('/create'),
            'edit' => Pages\EditSuperficie::route('/{record}/edit'),
        ];
    }
}
