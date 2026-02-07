"""
PDF Converter Tool

Converts HTML reports to PDF format using Playwright.
Playwright uses Chromium for pixel-perfect HTML/CSS rendering.

Install: pip install playwright && playwright install chromium
"""

import asyncio
import tempfile
import os
from typing import Optional, Union, Dict, Any
from pathlib import Path


async def convert_html_to_pdf_async(
    html_content: str,
    output_path: Optional[str] = None,
    pdf_options: Optional[Dict[str, Any]] = None,
) -> Union[bytes, str]:
    """
    Convert HTML content to PDF using Playwright (async).
    
    Uses Chromium browser for high-fidelity HTML/CSS rendering,
    including support for modern CSS features, gradients, flexbox, grid, etc.
    
    Args:
        html_content: HTML string to convert
        output_path: Optional file path to save PDF. If None, returns bytes.
        pdf_options: Optional Playwright PDF options
        
    Returns:
        PDF bytes if no output_path, otherwise the path to saved file
    """
    from playwright.async_api import async_playwright
    
    # Default PDF options for A4 professional report
    default_options = {
        "format": "A4",
        "print_background": True,  # Include background colors/images
        "margin": {
            "top": "15mm",
            "right": "15mm",
            "bottom": "15mm",
            "left": "15mm",
        },
        "display_header_footer": False,
        "prefer_css_page_size": True,  # Respect @page CSS rules
    }
    
    if pdf_options:
        default_options.update(pdf_options)
    
    async with async_playwright() as p:
        # Launch headless Chromium
        browser = await p.chromium.launch(headless=True)
        
        try:
            page = await browser.new_page()
            
            # Set content and wait for rendering
            await page.set_content(html_content, wait_until="networkidle")
            
            # Wait for fonts to load (important for Inter font)
            await page.wait_for_timeout(500)
            
            # Generate PDF
            if output_path:
                await page.pdf(path=output_path, **default_options)
                return output_path
            else:
                pdf_bytes = await page.pdf(**default_options)
                return pdf_bytes
                
        finally:
            await browser.close()


def convert_html_to_pdf(
    html_content: str,
    output_path: Optional[str] = None,
    pdf_options: Optional[Dict[str, Any]] = None,
) -> Union[bytes, str]:
    """
    Convert HTML content to PDF using Playwright (sync wrapper).
    
    This is the main entry point for synchronous code.
    Uses Chromium for pixel-perfect rendering.
    
    Args:
        html_content: HTML string to convert
        output_path: Optional file path to save PDF. If None, returns bytes.
        pdf_options: Optional Playwright PDF options
        
    Returns:
        PDF bytes if no output_path, otherwise the path to saved file
        
    Example:
        >>> html = "<html><body><h1>Report</h1></body></html>"
        >>> pdf_bytes = convert_html_to_pdf(html)
        >>> # Or save to file
        >>> convert_html_to_pdf(html, "/path/to/report.pdf")
    """
    try:
        # Try to get existing event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is running (e.g., in Jupyter or async context),
            # create a new thread to run the coroutine
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run,
                    convert_html_to_pdf_async(html_content, output_path, pdf_options)
                )
                return future.result()
        else:
            return loop.run_until_complete(
                convert_html_to_pdf_async(html_content, output_path, pdf_options)
            )
    except RuntimeError:
        # No event loop exists, create one
        return asyncio.run(
            convert_html_to_pdf_async(html_content, output_path, pdf_options)
        )


def convert_html_file_to_pdf(
    html_file_path: str,
    output_path: Optional[str] = None,
    pdf_options: Optional[Dict[str, Any]] = None,
) -> Union[bytes, str]:
    """
    Convert an HTML file to PDF.
    
    Args:
        html_file_path: Path to the HTML file
        output_path: Optional output path for PDF (defaults to same name with .pdf)
        pdf_options: Optional Playwright PDF options
        
    Returns:
        PDF bytes or path to saved file
    """
    with open(html_file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    if output_path is None:
        output_path = str(Path(html_file_path).with_suffix('.pdf'))
    
    return convert_html_to_pdf(html_content, output_path, pdf_options)


def convert_url_to_pdf(
    url: str,
    output_path: Optional[str] = None,
    pdf_options: Optional[Dict[str, Any]] = None,
) -> Union[bytes, str]:
    """
    Convert a web page URL to PDF.
    
    Args:
        url: URL of the page to convert
        output_path: Optional output path for PDF
        pdf_options: Optional Playwright PDF options
        
    Returns:
        PDF bytes or path to saved file
    """
    async def _convert():
        from playwright.async_api import async_playwright
        
        default_options = {
            "format": "A4",
            "print_background": True,
            "margin": {"top": "15mm", "right": "15mm", "bottom": "15mm", "left": "15mm"},
        }
        
        if pdf_options:
            default_options.update(pdf_options)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            try:
                page = await browser.new_page()
                await page.goto(url, wait_until="networkidle")
                await page.wait_for_timeout(1000)  # Wait for dynamic content
                
                if output_path:
                    await page.pdf(path=output_path, **default_options)
                    return output_path
                else:
                    return await page.pdf(**default_options)
            finally:
                await browser.close()
    
    return asyncio.run(_convert())


# PDF generation options presets
PDF_PRESETS = {
    "a4_portrait": {
        "format": "A4",
        "print_background": True,
        "margin": {"top": "15mm", "right": "15mm", "bottom": "15mm", "left": "15mm"},
    },
    "a4_landscape": {
        "format": "A4",
        "landscape": True,
        "print_background": True,
        "margin": {"top": "10mm", "right": "10mm", "bottom": "10mm", "left": "10mm"},
    },
    "letter_portrait": {
        "format": "Letter",
        "print_background": True,
        "margin": {"top": "0.5in", "right": "0.5in", "bottom": "0.5in", "left": "0.5in"},
    },
    "full_page": {
        "format": "A4",
        "print_background": True,
        "margin": {"top": "0", "right": "0", "bottom": "0", "left": "0"},
    },
    "presentation": {
        "width": "1920px",
        "height": "1080px",
        "print_background": True,
        "margin": {"top": "0", "right": "0", "bottom": "0", "left": "0"},
    },
}
