<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ModuloResource\Pages;
use App\Models\Modulo;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ModuloResource extends Resource
{
    protected static ?string $model = Modulo::class;

    protected static ?string $navigationIcon = 'heroicon-o-squares-2x2';

    protected static ?string $navigationGroup = 'Configuración Global';

    protected static ?string $modelLabel = 'Módulo';

    protected static ?string $pluralModelLabel = 'Módulos';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Información del Módulo')
                    ->schema([
                        Forms\Components\TextInput::make('nombre')
                            ->label('Nombre del Módulo')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('slug')
                            ->label('Slug / Código Identificador')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255),
                        Forms\Components\Textarea::make('descripcion')
                            ->label('Descripción')
                            ->columnSpanFull(),
                    ])->columns(2),

                Forms\Components\Section::make('Planes que incluyen este Módulo')
                    ->description('Selecciona los planes de suscripción base que tendrán este módulo habilitado por defecto.')
                    ->schema([
                        Forms\Components\CheckboxList::make('planes')
                            ->relationship('planes', 'nombre')
                            ->columns(3)
                            ->bulkToggleable(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('nombre')
                    ->label('Módulo')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->badge()
                    ->color('gray')
                    ->searchable(),
                Tables\Columns\TextColumn::make('planes.nombre')
                    ->label('Incluido en Planes')
                    ->badge()
                    ->color('info')
                    ->separator(', ')
                    ->wrap()
                    ->searchable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Creado')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Actualizado')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('planes')
                    ->relationship('planes', 'nombre')
                    ->label('Filtrar por Plan')
                    ->multiple()
                    ->preload(),
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
            'index' => Pages\ListModulos::route('/'),
            'create' => Pages\CreateModulo::route('/create'),
            'edit' => Pages\EditModulo::route('/{record}/edit'),
        ];
    }
}
