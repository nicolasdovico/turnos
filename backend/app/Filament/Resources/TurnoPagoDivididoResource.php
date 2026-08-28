<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TurnoPagoDivididoResource\Pages;
use App\Filament\Resources\TurnoPagoDivididoResource\RelationManagers;
use App\Models\TurnoPagoDividido;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class TurnoPagoDivididoResource extends Resource
{
    protected static ?string $model = TurnoPagoDividido::class;

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
                Forms\Components\Select::make('partido_abierto_id')
                    ->relationship('partidoAbierto', 'id'),
                Forms\Components\Select::make('user_id')
                    ->relationship('user', 'name'),
                Forms\Components\TextInput::make('nombre_jugador')
                    ->maxLength(255),
                Forms\Components\TextInput::make('email_jugador')
                    ->email()
                    ->maxLength(255),
                Forms\Components\TextInput::make('monto')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('cuota_numero')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('total_cuotas')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('token_pago')
                    ->required(),
                Forms\Components\TextInput::make('estado')
                    ->required()
                    ->maxLength(255)
                    ->default('pendiente'),
                Forms\Components\TextInput::make('metodo_pago')
                    ->maxLength(255),
                Forms\Components\DateTimePicker::make('pagado_en'),
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
                Tables\Columns\TextColumn::make('partidoAbierto.id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('user.name')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('nombre_jugador')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email_jugador')
                    ->searchable(),
                Tables\Columns\TextColumn::make('monto')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('cuota_numero')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('total_cuotas')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('token_pago'),
                Tables\Columns\TextColumn::make('estado')
                    ->searchable(),
                Tables\Columns\TextColumn::make('metodo_pago')
                    ->searchable(),
                Tables\Columns\TextColumn::make('pagado_en')
                    ->dateTime()
                    ->sortable(),
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
            'index' => Pages\ListTurnoPagoDivididos::route('/'),
            'create' => Pages\CreateTurnoPagoDividido::route('/create'),
            'edit' => Pages\EditTurnoPagoDividido::route('/{record}/edit'),
        ];
    }
}
