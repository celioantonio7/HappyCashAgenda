const currency = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
export const formatCurrency = (value: number | null | undefined) => currency.format(value ?? 0);
