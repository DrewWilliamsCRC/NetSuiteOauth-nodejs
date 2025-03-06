# Modern UI Integration Guide

This document explains how to integrate the modern UI design into the NetSuite API Toolkit applications.

## Overview

The `modern-ui.css` file provides a comprehensive set of styles for creating a modern, responsive user interface. It includes:

- A modern color palette with primary, secondary, and utility colors
- Typography improvements with a clean font hierarchy
- Card-based layout components
- Responsive design that works on mobile, tablet, and desktop
- Form styling, button variants, and other UI components

## How to Integrate

### Method 1: Link to the CSS file

The simplest approach is to add a link to the CSS file in your HTML `<head>` section.

```html
<link rel="stylesheet" href="/assets/modern-ui.css">
```

### Method 2: Inline the CSS directly

For better performance, you can include the CSS content directly in your HTML, especially if you're rendering HTML on the server side.

## Integration with Main App

Update the `src/app.js` file by replacing the existing `<style>` tag with a link to the modern-ui.css file. Find the HTML template around line 45-50 and replace:

```html
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
  pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
  .button { display: inline-block; background-color: #0078d7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 5px 0; }
  .warning { background-color: #fff3cd; border: 1px solid #ffecb5; padding: 10px; margin: 10px 0; border-radius: 4px; }
  .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 10px 0; border-radius: 4px; }
  .info { background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 10px 0; border-radius: 4px; }
  .token-status { margin: 20px 0; }
  .api-test { margin: 20px 0; }
</style>
```

With:

```html
<link rel="stylesheet" href="/assets/modern-ui.css">
```

### Update HTML Structure for Main App

To fully leverage the modern UI, update the HTML structure by adding card containers and using the new class names. Here's a suggested update:

```html
<div class="token-status">
  <h2>Token Status</h2>
  ${hasToken ? `
    <div class="card ${tokenValid ? 'success' : 'warning'}">
      <h3>${tokenValid ? '✅ Valid Token Available' : '⚠️ Token Expired'}</h3>
      <p><strong>Access Token:</strong> ${netsuiteClient.accessToken.substring(0, 15)}...[truncated]</p>
      <p><strong>Expires:</strong> ${tokenExpiry}</p>
      <p><strong>Status:</strong> ${tokenValid ? 'Valid' : 'Expired or expiring soon'}</p>
      <div class="flex gap-2">
        <a href="/token/info" class="button">View Token Details</a>
        <a href="/token/refresh" class="button">Refresh Token</a>
        <a href="/token/clear" class="button button-danger" onclick="return confirm('Are you sure you want to delete this token?')">Delete Token</a>
      </div>
    </div>
    
    <div class="card api-test mt-4">
      <h3>🔍 REST API Browser</h3>
      <p>Explore and interact with all available NetSuite REST API endpoints in our comprehensive browser:</p>
      <a href="/api-browser" class="button">Launch REST API Browser</a>
    </div>
  ` : `
    <div class="card info">
      <h3>No Token Available</h3>
      <p>You need to authenticate with NetSuite to get a token.</p>
    </div>
  `}
</div>
```

## Integration with REST API Browser

Similarly, update the `rest-api-browser/src/app.js` file to use the modern UI CSS. Replace the existing style tag with:

```html
<link rel="stylesheet" href="/assets/modern-ui.css">
```

### Update HTML Structure for API Browser

For the API browser, you can update the main container to better utilize the new CSS:

```html
<div class="main-container">
  <div class="sidebar">
    <h3>API Resources</h3>
    <div class="api-section">
      <h4>Metadata</h4>
      <ul class="resource-list">
        <li><a href="/api/metadata/catalog">API Catalog</a></li>
        <li><a href="/api/metadata/swagger">OpenAPI 3.0 Schema</a></li>
        <li><a href="/api/metadata/jsonschema">JSON Schema</a></li>
      </ul>
    </div>
    
    <!-- Other sections -->
  </div>
  
  <div class="content">
    <div class="card">
      <!-- Content goes here -->
    </div>
  </div>
</div>
```

## Adding Google Fonts (optional)

For the best typography experience, you can add the Inter and JetBrains Mono fonts by including this line before the CSS link:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

## Serving the CSS File

Make sure your Express app is configured to serve static files from the assets directory:

```javascript
// Add this to your app.js file
app.use('/assets', express.static('assets'));
```

This will allow the browser to access the CSS file at the path `/assets/modern-ui.css`.

## Additional Classes

Refer to the CSS file comments for additional utility classes and components you can use, including:

- `.card` for creating card containers
- `.button`, `.button-secondary`, `.button-success`, `.button-warning`, `.button-danger` for button variants
- `.alert`, `.success`, `.warning`, `.danger`, `.info` for message boxes
- Grid layout classes and flex utilities
- Form styling and responsive table styles 