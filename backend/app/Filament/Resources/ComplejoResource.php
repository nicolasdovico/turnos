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
                    ->relationship('plan', 'id'),
                Forms\Components\TextInput::make('estado')
                    ->required()
                    ->maxLength(255)
                    ->default('activo'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('uuid')
                    ->label('UUID'),
                Tables\Columns\TextColumn::make('nombre')
                    ->searchable(),
                Tables\Columns\TextColumn::make('subdominio')
                    ->searchable(),
                Tables\Columns\TextColumn::make('dominio_personalizado')
                    ->searchable(),
                Tables\Columns\TextColumn::make('plan.id')
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
            'index' => Pages\ListComplejos::route('/'),
            'create' => Pages\CreateComplejo::route('/create'),
            'edit' => Pages\EditComplejo::route('/{record}/edit'),
        ];
    }
}
