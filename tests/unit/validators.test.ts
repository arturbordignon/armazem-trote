import { describe, expect, it } from 'vitest';
import { normalizeSearchTerm } from '@/services/search.service';
import { parseListingParams, parseSearchParams } from '@/validators/catalog';
import { cepSchema, paramsToRecord } from '@/validators/common';

describe('parseListingParams', () => {
  it('defaults everything for a bare URL', () => {
    expect(parseListingParams({})).toEqual({
      filters: { sections: [], maxPriceCents: null, fit: 'tanto-faz', sort: 'relevancia' },
      after: undefined,
      before: undefined,
      page: 1,
    });
  });

  it('reads repeated sections, price in reais, fit, sort and paging', () => {
    const parsed = parseListingParams(
      paramsToRecord(
        new URLSearchParams(
          'secao=vestuario&secao=iluminacao&secao=vestuario&preco=150&cabe=lombo&ordem=menor-preco&depois=abc_-1&pagina=3',
        ),
      ),
    );
    expect(parsed).toEqual({
      filters: {
        sections: ['iluminacao', 'vestuario'],
        maxPriceCents: 15_000,
        fit: 'lombo',
        sort: 'menor-preco',
      },
      after: 'abc_-1',
      before: undefined,
      page: 3,
    });
  });

  it('treats the top of the price slider as "no limit"', () => {
    expect(parseListingParams({ preco: '2500' }).filters.maxPriceCents).toBeNull();
    expect(parseListingParams({ preco: '9999' }).filters.maxPriceCents).toBeNull();
  });

  it('falls back to defaults on hand-edited garbage instead of failing the page', () => {
    const parsed = parseListingParams({
      ordem: 'barato',
      cabe: 'carroça',
      preco: '-5',
      pagina: 'x',
      secao: '../etc',
      depois: '<script>',
    });
    expect(parsed.filters).toEqual({
      sections: [],
      maxPriceCents: null,
      fit: 'tanto-faz',
      sort: 'relevancia',
    });
    expect(parsed.page).toBe(1);
    expect(parsed.after).toBeUndefined();
  });
});

describe('parseSearchParams', () => {
  it('trims the query and caps its length', () => {
    expect(parseSearchParams({ q: '  lampião  ' }).query).toBe('lampião');
    expect(parseSearchParams({ q: 'x'.repeat(200) }).query).toHaveLength(80);
    expect(parseSearchParams({}).query).toBe('');
  });
});

describe('normalizeSearchTerm', () => {
  it('folds case, accents and spacing so equivalent queries share a cache entry', () => {
    expect(normalizeSearchTerm('  Café   de  Minas ')).toBe('cafe de minas');
    expect(normalizeSearchTerm('LAMPIÃO')).toBe(normalizeSearchTerm('lampiao'));
  });
});

describe('cepSchema', () => {
  it('accepts any punctuation and returns digits', () => {
    expect(cepSchema.parse('37540-000')).toBe('37540000');
  });

  it('rejects the wrong number of digits with the design message', () => {
    const result = cepSchema.safeParse('3754');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('O CEP precisa de 8 números, como 37540-000.');
  });
});
