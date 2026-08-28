<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PartidoAbiertoResource\Pages;
use App\Filament\Resources\PartidoAbiertoResource\RelationManagers;
use App\Models\PartidoAbierto;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class PartidoAbiertoResource extends Resource
{
    protected static ?string $model = PartidoAbierto::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('complejo_id')
                    ->relationship('complejo', 'id')
                    ->required(),
                Forms\Components\Select::make('turno_id')
                    ->relationship('turno', 'id')
                    ->required(),
                Forms\Components\Select::make('organizador_id')
                    ->relationship('organizador', 'name'),
                Forms\Components\TextInput::make('nivel_min')
                    ->maxLength(255),
                Forms\Components\TextInput::make('nivel_max')
                    ->maxLength(255),
                Forms\Components\TextInput::make('jugadores_requeridos')
                    ->required()
                    ->numeric()
                    ->default(4),
                Forms\Components\TextInput::make('jugadores_actuales')
                    ->required()
                    ->numeric()
                    ->default(1),
                Forms\Components\TextInput::make('estado')
                    ->required()
                    ->maxLength(255)
                    ->default('buscando'),
                Forms\Components\TextInput::make('tipo_partido')
                    ->required()
                    ->maxLength(255)
                    ->default('competitivo'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('complejo.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('turno.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('organizador.name')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('nivel_min')
                    ->searchable(),
                Tables\Columns\TextColumn::make('nivel_max')
                    ->searchable(),
                Tables\Columns\TextColumn::make('jugadores_requeridos')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('jugadores_actuales')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('estado')
                    ->searchable(),
                Tables\Columns\TextColumn::make('tipo_partido')
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
            'index' => Pages\ListPartidoAbiertos::route('/'),
            'create' => Pages\CreatePartidoAbierto::route('/create'),
            'edit' => Pages\EditPartidoAbierto::route('/{record}/edit'),
        ];
    }
}
