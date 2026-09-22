<?php

namespace App\Filament\Resources;

use App\Filament\Resources\DeporteResource\Pages;
use App\Models\Deporte;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Set;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class DeporteResource extends Resource
{
    protected static ?string $model = Deporte::class;

    protected static ?string $navigationIcon = 'heroicon-o-trophy';

    protected static ?string $navigationGroup = 'Configuración Deportiva';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Información Básica')
                    ->schema([
                        Forms\Components\TextInput::make('nombre')
                            ->label('Nombre del Deporte')
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
                            ->maxLength(100)
                            ->unique(Deporte::class, 'slug', ignoreRecord: true),
                        Forms\Components\TextInput::make('icono')
                            ->label('Icono / Clave Visual')
                            ->placeholder('padel, tennis, futbol, zap...')
                            ->maxLength(50),
                        Forms\Components\TextInput::make('duracion_default_minutos')
                            ->label('Duración Estándar (Minutos)')
                            ->numeric()
                            ->default(60)
                            ->required(),
                        Forms\Components\TextInput::make('orden')
                            ->label('Orden de Visualización')
                            ->numeric()
                            ->default(0),
                        Forms\Components\Toggle::make('esta_activo')
                            ->label('Deporte Activo')
                            ->default(true)
                            ->required(),
                        Forms\Components\Toggle::make('tiene_paredes')
                            ->label('¿Requiere / Admite Cerramiento de Paredes?')
                            ->helperText('Habilita la selección de tipo de pared (vidrio, muro, reja) en canchas de este deporte.')
                            ->default(false),
                    ])->columns(2),

                Forms\Components\Section::make('Formatos de Juego y Paredes')
                    ->schema([
                        Forms\Components\Repeater::make('formatos')
                            ->label('Formatos de Juego Admitidos')
                            ->schema([
                                Forms\Components\TextInput::make('id')->required()->label('Identificador (ej. dobles, single, f5)'),
                                Forms\Components\TextInput::make('label')->required()->label('Etiqueta Visible (ej. Dobles 2 vs 2)'),
                            ])
                            ->columns(2)
                            ->collapsible()
                            ->defaultItems(0),

                        Forms\Components\Repeater::make('paredes')
                            ->label('Tipos de Pared / Cerramiento (si aplica)')
                            ->schema([
                                Forms\Components\TextInput::make('id')->required()->label('Identificador (ej. cristal_panoramico)'),
                                Forms\Components\TextInput::make('label')->required()->label('Etiqueta Visible (ej. Cristal Panorámico)'),
                            ])
                            ->columns(2)
                            ->collapsible()
                            ->defaultItems(0),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('orden')
                    ->label('Orden')
                    ->sortable(),
                Tables\Columns\TextColumn::make('nombre')
                    ->label('Deporte')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('superficies_count')
                    ->label('Superficies')
                    ->counts('superficies')
                    ->badge()
                    ->color('info'),
                Tables\Columns\IconColumn::make('tiene_paredes')
                    ->label('Paredes')
                    ->boolean(),
                Tables\Columns\TextColumn::make('duracion_default_minutos')
                    ->label('Duración Defecto')
                    ->suffix(' min')
                    ->sortable(),
                Tables\Columns\IconColumn::make('esta_activo')
                    ->label('Activo')
                    ->boolean()
                    ->sortable(),
            ])
            ->defaultSort('orden', 'asc')
            ->filters([
                Tables\Filters\TernaryFilter::make('esta_activo')
                    ->label('Solo Activos'),
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
            'index' => Pages\ListDeportes::route('/'),
            'create' => Pages\CreateDeporte::route('/create'),
            'edit' => Pages\EditDeporte::route('/{record}/edit'),
        ];
    }
}
