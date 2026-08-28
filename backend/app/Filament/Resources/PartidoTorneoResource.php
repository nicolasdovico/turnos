<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PartidoTorneoResource\Pages;
use App\Filament\Resources\PartidoTorneoResource\RelationManagers;
use App\Models\PartidoTorneo;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class PartidoTorneoResource extends Resource
{
    protected static ?string $model = PartidoTorneo::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('complejo_id')
                    ->relationship('complejo', 'id')
                    ->required(),
                Forms\Components\Select::make('torneo_id')
                    ->relationship('torneo', 'id')
                    ->required(),
                Forms\Components\Select::make('turno_id')
                    ->relationship('turno', 'id'),
                Forms\Components\Select::make('cancha_id')
                    ->relationship('cancha', 'id'),
                Forms\Components\TextInput::make('fase')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('ronda')
                    ->required()
                    ->numeric()
                    ->default(1),
                Forms\Components\TextInput::make('posicion_llave')
                    ->required()
                    ->numeric()
                    ->default(1),
                Forms\Components\Select::make('siguiente_partido_id')
                    ->relationship('siguientePartido', 'id'),
                Forms\Components\Select::make('equipo_local_id')
                    ->relationship('equipoLocal', 'id'),
                Forms\Components\Select::make('equipo_visitante_id')
                    ->relationship('equipoVisitante', 'id'),
                Forms\Components\Select::make('ganador_id')
                    ->relationship('ganador', 'id'),
                Forms\Components\DatePicker::make('fecha'),
                Forms\Components\TextInput::make('hora'),
                Forms\Components\TextInput::make('resultado_local')
                    ->maxLength(255),
                Forms\Components\TextInput::make('resultado_visitante')
                    ->maxLength(255),
                Forms\Components\TextInput::make('score_local')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('score_visitante')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('estado')
                    ->required()
                    ->maxLength(255)
                    ->default('pendiente'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('complejo.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('torneo.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('turno.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('cancha.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('fase')
                    ->searchable(),
                Tables\Columns\TextColumn::make('ronda')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('posicion_llave')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('siguientePartido.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('equipoLocal.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('equipoVisitante.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('ganador.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('fecha')
                    ->date()
                    ->sortable(),
                Tables\Columns\TextColumn::make('hora'),
                Tables\Columns\TextColumn::make('resultado_local')
                    ->searchable(),
                Tables\Columns\TextColumn::make('resultado_visitante')
                    ->searchable(),
                Tables\Columns\TextColumn::make('score_local')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('score_visitante')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('estado')
                    ->searchable(),
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
            'index' => Pages\ListPartidoTorneos::route('/'),
            'create' => Pages\CreatePartidoTorneo::route('/create'),
            'edit' => Pages\EditPartidoTorneo::route('/{record}/edit'),
        ];
    }
}
