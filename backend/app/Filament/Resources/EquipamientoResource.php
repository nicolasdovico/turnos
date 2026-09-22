<?php

namespace App\Filament\Resources;

use App\Filament\Resources\EquipamientoResource\Pages;
use App\Models\Deporte;
use App\Models\Equipamiento;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Set;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class EquipamientoResource extends Resource
{
    protected static ?string $model = Equipamiento::class;

    protected static ?string $navigationIcon = 'heroicon-o-puzzle-piece';

    protected static ?string $navigationGroup = 'Configuración Deportiva';

    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Definición del Atributo / Equipamiento')
                    ->schema([
                        Forms\Components\TextInput::make('nombre')
                            ->label('Nombre del Equipamiento / Amenity')
                            ->placeholder('ej. Iluminación LED Profesional, Cámara de Grabación...')
                            ->required()
                            ->maxLength(100)
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (string $operation, ?string $state, Set $set) {
                                if ($operation === 'create') {
                                    $set('slug', Str::slug($state));
                                }
                            }),
                        Forms\Components\TextInput::make('slug')
                            ->label('Slug / Clave')
                            ->required()
                            ->maxLength(100),
                        Forms\Components\Select::make('categoria')
                            ->label('Categoría')
                            ->options([
                                'iluminacion' => 'Iluminación',
                                'estructura' => 'Estructura / Cerramiento',
                                'tecnologia' => 'Tecnología & Grabación',
                                'confort' => 'Confort & Comodidades',
                                'general' => 'General / Varios',
                            ])
                            ->default('general')
                            ->required(),
                        Forms\Components\TextInput::make('icono')
                            ->label('Icono (Nombre Lucide)')
                            ->placeholder('zap, video, home, users, tv, volume-2...')
                            ->maxLength(50),
                        Forms\Components\Select::make('complejo_id')
                            ->label('Club / Complejo Específico')
                            ->relationship('complejo', 'nombre')
                            ->searchable()
                            ->placeholder('Global para toda la plataforma')
                            ->helperText('Dejar vacío para que este equipamiento esté disponible en todos los clubes del sistema.')
                            ->nullable(),
                        Forms\Components\Select::make('aplica_a_deportes')
                            ->label('Aplica a Deportes Específicos')
                            ->options(fn () => Deporte::pluck('nombre', 'slug')->toArray())
                            ->multiple()
                            ->placeholder('Aplica a todos los deportes')
                            ->helperText('Dejar vacío para que aplique a cualquier tipo de deporte.'),
                        Forms\Components\TextInput::make('orden')
                            ->label('Orden de Visualización')
                            ->numeric()
                            ->default(fn () => (\App\Models\Equipamiento::max('orden') ?? 0) + 1),
                        Forms\Components\Toggle::make('esta_activo')
                            ->label('Equipamiento Activo')
                            ->default(true)
                            ->required(),
                        Forms\Components\Textarea::make('descripcion')
                            ->label('Descripción para Clubes y Jugadores')
                            ->columnSpanFull(),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('nombre')
                    ->label('Equipamiento')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('categoria')
                    ->label('Categoría')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'iluminacion' => 'warning',
                        'tecnologia' => 'info',
                        'estructura' => 'primary',
                        'confort' => 'success',
                        default => 'gray',
                    })
                    ->sortable(),
                Tables\Columns\TextColumn::make('complejo.nombre')
                    ->label('Alcance')
                    ->placeholder('Global (Plataforma)')
                    ->badge()
                    ->color(fn ($record) => $record->complejo_id ? 'purple' : 'success'),
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
                Tables\Filters\SelectFilter::make('categoria')
                    ->label('Filtrar por Categoría')
                    ->options([
                        'iluminacion' => 'Iluminación',
                        'estructura' => 'Estructura',
                        'tecnologia' => 'Tecnología',
                        'confort' => 'Confort',
                        'general' => 'General',
                    ]),
                Tables\Filters\Filter::make('globales')
                    ->label('Solo Globales')
                    ->query(fn ($query) => $query->whereNull('complejo_id')),
                Tables\Filters\Filter::make('clubes')
                    ->label('Solo de Clubes')
                    ->query(fn ($query) => $query->whereNotNull('complejo_id')),
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
            'index' => Pages\ListEquipamientos::route('/'),
            'create' => Pages\CreateEquipamiento::route('/create'),
            'edit' => Pages\EditEquipamiento::route('/{record}/edit'),
        ];
    }
}
