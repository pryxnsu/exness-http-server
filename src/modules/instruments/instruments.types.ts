import { z } from 'zod';

export const AddNewInstrumentSchema = z.object({
    symbol: z.string().nonempty({ message: 'Symbol is required' }),
    type: z.enum(['forex', 'crypto', 'stock']),
});

export const AddFavoriteInstrumentSchema = z.object({
    instrumentId: z.string().nonempty({ message: 'instrumentId is missing' }),
    sortOrder: z.number().positive(),
});

export type AddNewInstrumentSchemaType = z.input<typeof AddNewInstrumentSchema>;
export type AddFavoriteInstrumentType = z.infer<typeof AddFavoriteInstrumentSchema>;
