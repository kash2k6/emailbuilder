# HTML Template Import Feature

## Overview

The HTML Template Import feature allows users to import custom HTML email templates into the email system, making it easy to use existing email designs or create templates from scratch using HTML.

## Features

### 1. Import Methods
- **Paste HTML**: Users can paste HTML code directly into a text area
- **File Upload**: Users can upload HTML files (.html, .htm) from their computer

### 2. Template Parsing
The system automatically parses HTML and converts it to the email designer format:
- Extracts headings (h1-h6) and converts them to text elements with appropriate styling
- Converts paragraphs to text elements
- Identifies images and converts them to image elements
- Detects button-like links and converts them to button elements
- Converts horizontal rules (hr) to divider elements
- Handles line breaks and spacing

### 3. Subject Line Extraction
- Automatically extracts subject from `<title>` tags
- Supports `<meta name="subject">` tags for explicit subject lines
- Falls back to "Imported Email" if no subject is found

### 4. Template Management
- Saves imported templates to the user's template library
- Categorizes templates (General, Newsletter, Promotional, Onboarding, Announcement)
- Adds "imported" and "html" tags for easy identification
- Supports template descriptions and metadata

## How to Use

### In Email Designer
1. Click the "Load Template" button in the email designer
2. Click "Import HTML" in the template dialog
3. Choose import method (Paste or File Upload)
4. Enter template details (name, description, category)
5. Click "Import Template" to save and load the template

### In Enhanced Email Sender
1. Select "Import HTML Template" from the template dropdown
2. Follow the same import process as above
3. The imported HTML will be loaded into the email content area

## Supported HTML Elements

| HTML Element | Email Designer Element | Notes |
|--------------|----------------------|-------|
| `<h1>` - `<h6>` | Text | Automatically sized based on heading level |
| `<p>` | Text | Standard paragraph styling |
| `<img>` | Image | Preserves src, alt, width, height attributes |
| `<a>` | Button or Text | Detects button-like styling automatically |
| `<hr>` | Divider | Creates visual separators |
| `<br>` | Spacer | Adds vertical spacing |
| `<div>`, `<section>`, `<article>` | Container | Processes child elements recursively |

## Best Practices

### HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
    <meta name="subject" content="Your Email Subject">
    <title>Your Email Title</title>
</head>
<body>
    <div class="email-content">
        <!-- Your email content here -->
        <h1>Main Heading</h1>
        <p>Your content...</p>
        <a href="#" class="button">Call to Action</a>
    </div>
</body>
</html>
```

### Styling Tips
- Use inline styles for better email client compatibility
- Keep images under 600px width for mobile responsiveness
- Use web-safe fonts (Arial, Helvetica, Times New Roman)
- Test your HTML in multiple email clients before importing

### File Requirements
- Maximum file size: 1MB
- Supported formats: .html, .htm
- UTF-8 encoding recommended
- Valid HTML structure required

## Sample Template

A sample HTML template (`sample-email-template.html`) is provided in the project root for testing the import functionality.

## Technical Details

### Parsing Logic
The HTML parser uses the browser's DOMParser to:
1. Parse the HTML string into a DOM document
2. Extract the main content container
3. Recursively process child nodes
4. Convert each element to the appropriate email designer format
5. Preserve styling and attributes where possible

### Error Handling
- Validates HTML structure before parsing
- Provides fallback styling for unsupported elements
- Shows preview of imported content before saving
- Handles malformed HTML gracefully

### Integration
- Works with existing template system
- Compatible with email sending functionality
- Supports template variables and personalization
- Integrates with company settings and footer customization

## Troubleshooting

### Common Issues
1. **Template not importing**: Check HTML validity and file size
2. **Styling lost**: Ensure inline styles are used
3. **Images not showing**: Verify image URLs are accessible
4. **Subject not extracted**: Add `<meta name="subject">` tag

### Support
For issues with HTML import functionality, check:
- Browser console for JavaScript errors
- Network tab for file upload issues
- Template validation in the preview section
