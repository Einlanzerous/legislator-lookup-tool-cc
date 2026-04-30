import { test, expect } from '@playwright/test';

test.describe('Legislator Lookup', () => {
  test('should allow entering an address and displaying loading state', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/Find Your Elected Officials/);

    const addressInput = page.getByPlaceholder('e.g. 121 N LaSalle St');
    await expect(addressInput).toBeVisible();

    const submitButton = page.getByRole('button', { name: 'Look up' });
    await expect(submitButton).toBeDisabled();

    // Type an address
    await addressInput.fill('121 N LaSalle St');
    await expect(submitButton).toBeEnabled();

    // Mock Geocoding API proxy
    await page.route('**/geocode?address=*', async route => {
      await route.fulfill({
        json: {
          results: [{
            formatted_address: '121 N LaSalle St, Chicago, IL 60602',
            geometry: { location: { lat: 41.883, lng: -87.632 } }
          }],
          status: 'OK'
        }
      });
    });

    // Mock OpenStates API proxy
    await page.route('**/openstates*', async route => {
      await route.fulfill({
        json: {
          results: [] // Empty for brevity in this test
        }
      });
    });

    // Mock Chicago Wards API
    await page.route('**/resource/p293-wvbd.json*', async route => {
      await route.fulfill({ json: [{ ward: '42' }] });
    });

    // Mock Chicago Aldermen API
    await page.route('**/resource/htai-wnw4.json*', async route => {
      await route.fulfill({ json: [{ ward: '42', alderman: 'Reilly, Brendan' }] });
    });

    await submitButton.click();
    
    // Check loading state
    await expect(page.getByRole('button', { name: 'Searching…' })).toBeVisible();
    
    // You would then assert that the results are rendered based on the mock data.
    // For this boilerplate test, we'll just check that it attempted the search.
  });
});
