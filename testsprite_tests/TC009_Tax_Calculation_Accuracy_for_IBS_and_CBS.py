import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Try clicking the input field first to focus, then input the product code, or try clearing the field before inputting text.
        frame = context.pages[-1]
        # Click the product code input field to focus it
        elem = frame.locator('xpath=html/body/div/div/main/section/div[2]/div/div[2]/div/div[3]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Simular Busca' button (index 12) to trigger tax calculation using the preset product code.
        frame = context.pages[-1]
        # Click the 'Simular Busca' button to trigger tax calculation for IBS and CBS with the preset product code
        elem = frame.locator('xpath=html/body/div/div/main/section/div[2]/div/div[2]/div/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Chega de confusão com IBS e CBS!').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Mais de 1.333 consultas realizadas hoje.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Consultando base nacional...').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Alíquotas de 0,1% (IBS) e 0,9% (CBS) para teste do sistema.').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=A reforma tributária unificou 5 impostos em apenas dois (IBS e CBS). Parece simples, mas na prática é uma transição complexa. Nós da TributeiClass resolvemos isso para você, faça já seu cadastro e consulte de forma simples e segura a nova tributação de IBS e CBS!').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    