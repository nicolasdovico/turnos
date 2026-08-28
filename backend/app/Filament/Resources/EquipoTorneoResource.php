<?php

namespace App\Filament\Resources;

use App\Filament\Resources\EquipoTorneoResource\Pages;
use App\Filament\Resources\EquipoTorneoResource\RelationManagers;
use App\Models\EquipoTorneo;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class EquipoTorneoResource extends Resource
{
    protected static ?string $model = EquipoTorneo::class;

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
                Forms\Components\Select::make('capitan_id')
                    ->relationship('capitan', 'name'),
                Forms\Components\TextInput::make('nombre')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('jugador_1_nombre')
                    ->maxLength(255),
                Forms\Components\TextInput::make('jugador_2_nombre')
                    ->maxLength(255),
                Forms\Components\TextInput::make('contacto_email')
                    ->email()
                    ->maxLength(255),
                Forms\Components\TextInput::make('contacto_telefono')
                    ->tel()
                    ->maxLength(255),
                Forms\Components\TextInput::make('semilla')
                    ->numeric(),
                Forms\Components\TextInput::make('puntos')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('partidos_jugados')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('partidos_ganados')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('partidos_empatados')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('partidos_perdidos')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('sets_favor')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('sets_contra')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('diferencia_sets')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('estado')
                    ->required()
                    ->maxLength(255)
                    ->default('confirmado'),
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
                Tables\Columns\TextColumn::make('capitan.name')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('nombre')
                    ->searchable(),
                Tables\Columns\TextColumn::make('jugador_1_nombre')
                    ->searchable(),
                Tables\Columns\TextColumn::make('jugador_2_nombre')
                    ->searchable(),
                Tables\Columns\TextColumn::make('contacto_email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('contacto_telefono')
                    ->searchable(),
                Tables\Columns\TextColumn::make('semilla')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('puntos')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('partidos_jugados')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('partidos_ganados')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('partidos_empatados')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('partidos_perdidos')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('sets_favor')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('sets_contra')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('diferencia_sets')
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
            'index' => Pages\ListEquipoTorneos::route('/'),
            'create' => Pages\CreateEquipoTorneo::route('/create'),
            'edit' => Pages\EditEquipoTorneo::route('/{record}/edit'),
        ];
    }
}
