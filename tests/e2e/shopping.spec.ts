import { type Page, expect, test } from '@playwright/test';

// Queries go through roles: Next keeps recently visited pages mounted (hidden) for instant
// back/forward, and role queries ignore hidden elements where label/text queries don't.

async function searchAndOpen(page: Page, typed: string, productName: string) {
  const search = page.getByRole('combobox', { name: 'Buscar no armazém' });
  await search.fill(typed);
  const suggestion = page.getByRole('option', { name: new RegExp(productName) }).first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page.getByRole('heading', { level: 1, name: productName })).toBeVisible();
}

test('search → product → cart → checkout → telegram', async ({ page }) => {
  await page.goto('/');
  await searchAndOpen(page, 'lampi', 'Lampião a querosene');

  // Product page: pick a finish and two units, quote freight, add to the cart.
  await page.getByRole('button', { name: 'Cobre' }).click();
  await page.getByRole('button', { name: 'Aumentar', exact: true }).click();
  await page.getByRole('textbox', { name: 'CEP' }).fill('30140071');
  await page.getByRole('button', { name: 'Calcular' }).click();
  await expect(page.getByText(/Destino: Belo Horizonte \(MG\) · 55 léguas/)).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Opções de frete' }).getByRole('button'),
  ).toHaveCount(3);

  // The product's own button comes first; related products further down have one each too.
  await page.getByRole('button', { name: 'Adicionar à carroça' }).first().click();
  const drawer = page.getByRole('dialog', { name: 'CAIXOTE Nº 1887' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('Acabamento: Cobre')).toBeVisible();
  await expect(drawer.getByText('R$ 179,80').first()).toBeVisible();

  // Cart page: coupon and freight, all totals computed by the server.
  await drawer.getByRole('button', { name: 'Ver carroça' }).click();
  await expect(page.getByRole('heading', { name: 'Sua carroça' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Cupom do armazém' }).fill('galinha10');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByText('Cupom aceito: 10% de desconto em toda a carroça.')).toBeVisible();
  await page.getByRole('textbox', { name: 'CEP' }).fill('30140-071');
  await page.getByRole('button', { name: 'Calcular' }).click();
  await page.getByRole('button', { name: /Cavalo/ }).click();
  const ledger = page.getByRole('complementary', { name: 'Resumo do pedido' });
  await expect(ledger.getByText('− R$ 17,98')).toBeVisible();
  await expect(ledger.getByText(/R\$\s17,85 · Cavalo/)).toBeVisible();
  await expect(ledger.getByText('R$ 179,67')).toBeVisible();

  // Checkout: address (with the design's validation messages), animal, payment.
  await ledger.getByRole('link', { name: 'Finalizar encomenda' }).click();
  await expect(page.getByRole('heading', { name: 'Acertar a encomenda' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar viagem' }).click();
  // Shown in the error summary and under the field itself.
  await expect(page.getByText('Sem rua, o burro fica rodando em círculos.').first()).toBeVisible();

  await page.getByRole('textbox', { name: 'Nome completo' }).fill('Joaquina da Silva');
  await page.getByRole('textbox', { name: 'Telefone' }).fill('(35) 99999-0000');
  await page.getByRole('textbox', { name: 'Rua / Estrada' }).fill('Estrada Velha do Rosário');
  await page.getByRole('textbox', { name: 'Número' }).fill('12');
  await page.getByRole('textbox', { name: 'Cidade' }).fill('Belo Horizonte');
  await page.getByRole('textbox', { name: 'UF' }).fill('mg');
  await page.getByRole('button', { name: 'Continuar viagem' }).click();

  await expect(page.getByRole('heading', { name: 'II. Quem leva?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cavalo/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Continuar viagem' }).click();

  await expect(page.getByRole('heading', { name: 'III. Como vai acertar?' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar encomenda' }).click();
  await expect(page.getByText('Escolha como vai acertar a conta.')).toBeVisible();
  await page.getByRole('radio', { name: /Fiado/ }).check();
  await page.getByRole('textbox', { name: 'Assigne a caderneta' }).fill('Joaquina da Silva');
  await page.getByRole('button', { name: 'Confirmar encomenda' }).click();

  // The telegram.
  await expect(
    page.getByRole('heading', { name: 'Sua encomenda partiu ao raiar do dia.' }),
  ).toBeVisible();
  await expect(page.getByText(/Nº TC-\d+/)).toBeVisible();
  await expect(page.getByText(/lombo do Cavalo rumo a Belo Horizonte MG/i)).toBeVisible();
  await expect(page.getByText('55 léguas até você')).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir carroça, 0 itens/ })).toBeVisible();
});

test('bulky goods can only go by charrete', async ({ page }) => {
  await page.goto('/mercadoria/fogao');
  await page.getByRole('textbox', { name: 'CEP' }).fill('01310-100');
  await page.getByRole('button', { name: 'Calcular' }).click();
  const options = page.getByRole('group', { name: 'Opções de frete' });
  await expect(options.getByRole('button', { name: /Burro/ })).toBeDisabled();
  await expect(options.getByRole('button', { name: /Cavalo/ })).toBeDisabled();
  await expect(options.getByRole('button', { name: /Charrete/ })).toBeEnabled();
});

test('an unknown search answers with a telegram and suggestions', async ({ page }) => {
  await page.goto('/busca?q=xyzzy');
  await expect(page.getByText('Nem o telegrafista encontrou isso.')).toBeVisible();
  await page.getByRole('link', { name: 'Café' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '“Café”' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Saco de café 5 kg' }).first()).toBeVisible();
});

test('listing filters and keyset pagination', async ({ page }) => {
  await page.goto('/secao/iluminacao');
  await expect(page.getByRole('heading', { level: 1, name: 'Iluminação' })).toBeVisible();
  await page.getByRole('link', { name: 'Página 2' }).click();
  await expect(page.getByText(/página 2 de \d+/)).toBeVisible();
  await page.getByRole('link', { name: 'Página 1' }).click();
  await expect(page.getByText(/página 1 de \d+/)).toBeVisible();

  await page.getByRole('combobox', { name: 'Ordenar' }).selectOption('menor-preco');
  await expect(page).toHaveURL(/ordem=menor-preco/);
  await page.goto('/mercadorias?cabe=charrete');
  // Every tag on the shelf carries the "Só de charrete" ribbon.
  await expect(
    page.locator('article').getByText('Só de charrete', { exact: true }).first(),
  ).toBeVisible();
});
