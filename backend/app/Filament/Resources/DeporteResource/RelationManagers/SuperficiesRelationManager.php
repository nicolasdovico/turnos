<?php

namespace App\Filament\Resources\DeporteResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class SuperficiesRelationManager extends RelationManager
{
    protected static string $relationship = 'superficies';

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('nombre')
                    ->label('Nombre de la Superficie')
                    ->placeholder('ej. Césped Natural (Grass)')
                    ->required()
                    ->maxLength(100)
                    ->live(onBlur: true)
                    ->afterStateUpdated(function (string $operation, ?string $state, Forms\Set $set) {
                        if ($operation === 'create') {
                            $set('slug', \Illuminate\Support\Str::slug($state));
                        }
                    }),
                Forms\Components\TextInput::make('slug')
                    ->label('Slug / Identificador')
                    ->required()
                    ->maxLength(100),
                Forms\Components\TextInput::make('orden')
                    ->label('Orden')
                    ->numeric()
                    ->default(fn () => (\App\Models\Superficie::max('orden') ?? 0) + 1),
                Forms\Components\Toggle::make('esta_activo')
                    ->label('Superficie Activa')
                    ->default(true)
                    ->required(),
                Forms\Components\Textarea::make('descripcion')
                    ->label('Descripción / Características')
                    ->columnSpanFull(),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('nombre')
            ->columns([
                Tables\Columns\TextColumn::make('orden')
                    ->sortable()
                    ->label('Orden'),
                Tables\Columns\TextColumn::make('nombre')
                    ->searchable()
                    ->label('Nombre'),
                Tables\Columns\TextColumn::make('slug')
                    ->badge()
                    ->color('gray')
                    ->label('Slug'),
                Tables\Columns\IconColumn::make('esta_activo')
                    ->boolean()
                    ->label('Activa'),
            ])
            ->filters([
                //
            ])
            ->headerActions([
                Tables\Actions\CreateAction::make(),
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
}
