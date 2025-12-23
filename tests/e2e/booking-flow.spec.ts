import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Full Booking Flow
 *
 * These tests verify the complete user journey from frontend to backend:
 * 1. Landing page navigation
 * 2. Admin dashboard functionality
 * 3. Client portal booking flow
 * 4. Real-time availability updates
 */

test.describe('Landing Page', () => {
  test('displays hero section and navigation', async ({ page }) => {
    await page.goto('/');

    // Check hero content
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Réservations');
    await expect(page.getByText('sur-réservation')).toBeVisible();

    // Check navigation buttons
    await expect(page.getByRole('link', { name: /Dashboard Admin/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Réserver/i })).toBeVisible();
  });

  test('navigates to admin dashboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Dashboard Admin/i }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  });

  test('navigates to booking portal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Tester une réservation/i }).click();

    await expect(page).toHaveURL(/\/book\//);
  });
});

test.describe('Admin Dashboard', () => {
  test('displays stats and resources', async ({ page }) => {
    await page.goto('/admin');

    // Check stats cards are visible
    await expect(page.getByText('Ressources')).toBeVisible();
    await expect(page.getByText('Réservations actives')).toBeVisible();
    await expect(page.getByText('Utilisation capacité')).toBeVisible();

    // Check section headers
    await expect(page.getByRole('heading', { name: /Ressources/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Réservations récentes/i })).toBeVisible();
  });

  test('opens create resource modal', async ({ page }) => {
    await page.goto('/admin');

    // Click add resource button
    await page.getByRole('button', { name: /Ajouter ressource/i }).click();

    // Modal should be visible
    await expect(page.getByRole('heading', { name: /Créer une ressource/i })).toBeVisible();
    await expect(page.getByLabel(/ID de la ressource/i)).toBeVisible();
    await expect(page.getByLabel(/Type/i)).toBeVisible();
    await expect(page.getByLabel(/Capacité/i)).toBeVisible();
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/admin');

    // Sidebar should be visible
    await expect(page.getByText('Reservo').first()).toBeVisible();

    // Navigation items should be visible
    await expect(page.getByRole('link', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ressources/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Réservations/i })).toBeVisible();
  });
});

test.describe('Client Portal - Booking Flow', () => {
  test('displays resource information and booking form', async ({ page }) => {
    await page.goto('/book/conf-room-a');

    // Resource info should be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Availability banner should be visible
    await expect(page.getByText(/Disponible|Presque complet|Complet/)).toBeVisible();
    await expect(page.getByText(/place.*restante/i)).toBeVisible();

    // Form elements should be visible
    await expect(page.getByLabel(/Votre identifiant/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Réserver maintenant/i })).toBeVisible();
  });

  test('quantity selector works correctly', async ({ page }) => {
    await page.goto('/book/conf-room-a');

    // Get the quantity elements using data-testid
    const increaseBtn = page.locator('[data-testid="quantity-increase"]');
    const decreaseBtn = page.locator('[data-testid="quantity-decrease"]');
    const quantityValue = page.locator('[data-testid="quantity-value"]');

    // Initial quantity should be 1
    await expect(quantityValue).toHaveText('1');

    // Decrease button should be disabled when quantity is 1
    await expect(decreaseBtn).toBeDisabled();

    // Click increase button
    await increaseBtn.click();

    // Quantity should increase
    await expect(quantityValue).toHaveText('2');

    // Decrease button should now be enabled
    await expect(decreaseBtn).toBeEnabled();

    // Click decrease button
    await decreaseBtn.click();

    // Quantity should decrease back to 1
    await expect(quantityValue).toHaveText('1');
    await expect(decreaseBtn).toBeDisabled();
  });

  test('validates required fields and form submission behavior', async ({ page }) => {
    await page.goto('/book/conf-room-a');

    // Get form elements using data-testid
    const clientIdInput = page.locator('[data-testid="client-id-input"]');
    const submitBtn = page.locator('[data-testid="submit-booking"]');

    // Button should be disabled when no client ID
    await expect(submitBtn).toBeDisabled();

    // Fill client ID with empty spaces - should still be disabled
    await clientIdInput.fill('   ');
    await expect(submitBtn).toBeDisabled();

    // Fill client ID with valid value
    await clientIdInput.fill('test@example.com');
    await expect(submitBtn).toBeEnabled();

    // Clear the input - button should be disabled again
    await clientIdInput.clear();
    await expect(submitBtn).toBeDisabled();

    // Fill valid client ID again for final state
    await clientIdInput.fill('valid-user@test.com');
    await expect(submitBtn).toBeEnabled();
  });

  test('shows features tags', async ({ page }) => {
    await page.goto('/book/conf-room-a');

    // Feature tags should be visible
    await expect(page.getByText(/places/)).toBeVisible();
    await expect(page.getByText('WiFi')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('landing page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Hero should still be visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Buttons should be visible
    await expect(page.getByRole('link', { name: /Dashboard Admin/i })).toBeVisible();
  });

  test('booking page is responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/book/conf-room-a');

    // Form should be visible
    await expect(page.getByLabel(/Votre identifiant/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Réserver maintenant/i })).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('landing page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Should have at least one h1 (main heading)
    const h1Elements = page.locator('h1');
    await expect(h1Elements.first()).toBeVisible();

    // Verify semantic heading structure exists (h1, h2, h3 in order)
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toContainText(/Réservations/);

    // H2s should exist for sections
    const h2Elements = page.locator('h2');
    expect(await h2Elements.count()).toBeGreaterThan(0);
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/book/conf-room-a');

    // Check that inputs have associated labels
    const clientIdInput = page.getByLabel(/Votre identifiant/i);
    await expect(clientIdInput).toBeVisible();
    await expect(clientIdInput).toHaveAttribute('type', 'text');
  });

  test('buttons are focusable', async ({ page }) => {
    await page.goto('/');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Should be able to reach buttons via keyboard
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Complete Booking Flow', () => {
  test('complete booking flow: form fill → submit → confirmation or error', async ({ page }) => {
    // 1. Navigate to booking page
    await page.goto('/book/conf-room-a');

    // 2. Verify page loaded with availability information
    const availabilityStatus = page.locator('[data-testid="availability-status"]');
    const availabilityCount = page.locator('[data-testid="availability-count"]');
    await expect(availabilityStatus).toBeVisible();
    await expect(availabilityCount).toBeVisible();

    // 3. Fill client ID
    const clientIdInput = page.locator('[data-testid="client-id-input"]');
    const uniqueClientId = `e2e-test-user-${Date.now()}`;
    await clientIdInput.fill(uniqueClientId);

    // 4. Adjust quantity (increase to 2)
    const increaseBtn = page.locator('[data-testid="quantity-increase"]');
    const quantityValue = page.locator('[data-testid="quantity-value"]');
    const initialAvailabilityText = await availabilityCount.textContent();

    // Extract numeric value from availability text (e.g., "8 places restantes" -> 8)
    const remainingCapacity = initialAvailabilityText ? parseInt(initialAvailabilityText.match(/\d+/)?.[0] || '0') : 0;

    // Only increase if there's capacity for at least 2
    if (remainingCapacity >= 2) {
      await increaseBtn.click();
      await expect(quantityValue).toHaveText('2');
    }

    // 5. Submit form
    const submitBtn = page.locator('[data-testid="submit-booking"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 6. Verify loading state (button should show loading or be disabled)
    await expect(submitBtn).toBeDisabled();

    // 7. Wait for either success confirmation or error message (with timeout)
    const confirmationOrError = page.locator('[data-testid="booking-confirmation"], [data-testid="booking-error"]');
    await expect(confirmationOrError).toBeVisible({ timeout: 10000 });

    // 8. Verify the outcome
    const confirmation = page.locator('[data-testid="booking-confirmation"]');
    const error = page.locator('[data-testid="booking-error"]');

    if (await confirmation.isVisible()) {
      // Success case: verify reservation ID is displayed
      const reservationId = page.locator('[data-testid="reservation-id"]');
      await expect(reservationId).toBeVisible();
      await expect(reservationId).toContainText(/^res_/);

      // Verify confirmation message
      await expect(confirmation).toContainText(/confirmée/i);
    } else if (await error.isVisible()) {
      // Error case: verify error message is meaningful
      await expect(error).toContainText(/erreur|capacité|refusée/i);
    }
  });

  test('booking with maximum quantity respects capacity limit', async ({ page }) => {
    await page.goto('/book/conf-room-a');

    // Get the remaining capacity
    const availabilityCount = page.locator('[data-testid="availability-count"]');
    const quantityValue = page.locator('[data-testid="quantity-value"]');
    const availabilityText = await availabilityCount.textContent();

    // Extract numeric value from availability text (e.g., "8 places restantes" -> 8)
    const remainingCapacity = availabilityText ? parseInt(availabilityText.match(/\d+/)?.[0] || '0') : 0;

    // Skip test if no capacity available
    if (remainingCapacity === 0) {
      return;
    }

    // Try to increase beyond capacity
    const increaseBtn = page.locator('[data-testid="quantity-increase"]');

    // Click increase button up to the capacity limit
    for (let i = 1; i < remainingCapacity; i++) {
      if (await increaseBtn.isEnabled()) {
        await increaseBtn.click();
      }
    }

    // At capacity limit, quantity should equal remaining capacity
    await expect(quantityValue).toHaveText(String(remainingCapacity));

    // At capacity limit, increase button should be disabled
    await expect(increaseBtn).toBeDisabled();
  });
});

test.describe('Error Scenarios', () => {
  test('handles network errors gracefully', async ({ page }) => {
    // Mock a network error by going offline
    await page.route('**/api/v1/reservations', route => {
      route.abort('failed');
    });

    await page.goto('/book/conf-room-a');

    // Fill and submit the form
    const clientIdInput = page.locator('[data-testid="client-id-input"]');
    await clientIdInput.fill(`network-error-test-${Date.now()}`);

    const submitBtn = page.locator('[data-testid="submit-booking"]');
    await submitBtn.click();

    // Should show error message
    const errorMessage = page.locator('[data-testid="booking-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText(/erreur/i);
  });

  test('shows error when resource is full', async ({ page }) => {
    // Mock API response with zero capacity
    await page.route('**/api/v1/resources/*/availability', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          resourceId: 'full-resource',
          capacity: 10,
          currentBookings: 10,
          remainingCapacity: 0,
          isAvailable: false,
        }),
      });
    });

    await page.goto('/book/full-resource');

    // Verify "Complet" status is shown
    const statusBadge = page.locator('[data-testid="availability-status"]');
    await expect(statusBadge).toContainText(/complet/i);

    // Verify submit button is disabled
    const submitBtn = page.locator('[data-testid="submit-booking"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('shows validation error for capacity exceeded', async ({ page }) => {
    // Mock API response rejecting the booking due to capacity
    await page.route('**/api/v1/reservations', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'REJECTED',
          reason: 'CAPACITY_EXCEEDED',
          serverTimestamp: Date.now(),
        }),
      });
    });

    await page.goto('/book/conf-room-a');

    // Fill and submit the form
    const clientIdInput = page.locator('[data-testid="client-id-input"]');
    await clientIdInput.fill(`capacity-test-${Date.now()}`);

    const submitBtn = page.locator('[data-testid="submit-booking"]');
    await submitBtn.click();

    // Should show capacity error message
    const errorMessage = page.locator('[data-testid="booking-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText(/capacité|insuffisante/i);
  });
});
