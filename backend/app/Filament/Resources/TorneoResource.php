<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TorneoResource\Pages;
use App\Filament\Resources\TorneoResource\RelationManagers;
use App\Models\Torneo;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class TorneoResource extends Resource
{
    protected static ?string $model = Torneo::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('complejo_id')
                    ->relationship('complejo', 'id')
                    ->required(),
                Forms\Components\TextInput::make('nombre')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('slug')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('deporte')
                    ->required()
                    ->maxLength(255)
                    ->default('padel'),
                Forms\Components\TextInput::make('formato')
                    ->required()
                    ->maxLength(255)
                    ->default('eliminacion_directa'),
                Forms\Components\TextInput::make('categoria')
                    ->maxLength(255),
                Forms\Components\TextInput::make('max_equipos')
                    ->required()
                    ->numeric()
                    ->default(8),
                Forms\Components\DatePicker::make('fecha_inicio'),
                Forms\Components\DatePicker::make('fecha_fin'),
                Forms\Components\TextInput::make('precio_inscripcion')
                    ->required()
                    ->numeric()
                    ->default(0),
                Forms\Components\TextInput::make('estado')
                    ->required()
                    ->maxLength(255)
                    ->default('inscripciones_abiertas'),
                Forms\Components\Textarea::make('reglas')
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('complejo.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('nombre')
                    ->searchable(),
                Tables\Columns\TextColumn::make('slug')
                    ->searchable(),
                Tables\Columns\TextColumn::make('deporte')
                    ->searchable(),
                Tables\Columns\TextColumn::make('formato')
                    ->searchable(),
                Tables\Columns\TextColumn::make('categoria')
                    ->searchable(),
                Tables\Columns\TextColumn::make('max_equipos')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('fecha_inicio')
                    ->date()
                    ->sortable(),
                Tables\Columns\TextColumn::make('fecha_fin')
                    ->date()
                    ->sortable(),
                Tables\Columns\TextColumn::make('precio_inscripcion')
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
            'index' => Pages\ListTorneos::route('/'),
            'create' => Pages\CreateTorneo::route('/create'),
            'edit' => Pages\EditTorneo::route('/{record}/edit'),
        ];
    }
}
