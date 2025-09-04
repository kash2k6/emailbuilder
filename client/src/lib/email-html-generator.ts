import { EmailElement } from '@shared/schema';

export interface EmailGenerationOptions {
  emailWidth?: number;
  includeStyles?: boolean;
  optimizeForClient?: 'gmail' | 'outlook' | 'apple' | 'generic';
  emailBackground?: {
    type: 'color' | 'gradient' | 'image';
    backgroundColor?: string;
    gradientColors?: [string, string];
    gradientDirection?: string;
    imageUrl?: string;
    borderRadius?: string;
  };
}

export function generateEmailHTML(
  elements: EmailElement[],
  subject: string,
  options: EmailGenerationOptions = {}
): { html: string; text: string } {
  const { emailWidth = 600, includeStyles = true, emailBackground } = options;

  // Generate background styles for email container
  const getContainerBackgroundStyle = () => {
    if (!emailBackground) return 'background-color: #ffffff; border-radius: 8px;';
    
    const { type, backgroundColor, gradientColors, gradientDirection, imageUrl, borderRadius } = emailBackground;
    let bgStyle = '';
    
    if (type === 'color') {
      bgStyle = `background-color: ${backgroundColor || '#ffffff'};`;
    } else if (type === 'gradient' && gradientColors) {
      const direction = gradientDirection || 'to-bottom';
      // Convert CSS gradient direction to email-compatible format
      const emailGradientDirection = direction.replace('to-', '').replace('-', ' ');
      bgStyle = `background: linear-gradient(${emailGradientDirection}, ${gradientColors[0]}, ${gradientColors[1]}); background-color: ${gradientColors[0]};`;
    } else if (type === 'image' && imageUrl) {
      bgStyle = `background-image: url(${imageUrl}); background-size: cover; background-position: center; background-repeat: no-repeat; background-color: ${backgroundColor || '#ffffff'};`;
    }
    
    const borderRadiusStyle = borderRadius ? `border-radius: ${borderRadius};` : 'border-radius: 8px;';
    
    return bgStyle + ' ' + borderRadiusStyle;
  };

  const elementsHTML = elements.map(element => generateElementHTML(element, options)).join('\n');
  const textContent = generateTextContent(elements);

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(subject)}</title>
  ${includeStyles ? generateEmailStyles(emailWidth) : ''}
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="${emailWidth}" style="max-width: ${emailWidth}px; ${getContainerBackgroundStyle()} overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 0;">
              ${elementsHTML}
            </td>
          </tr>
        </table>
        
        <!-- Footer for email client compatibility -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${emailWidth}" style="max-width: ${emailWidth}px; margin-top: 20px;">
          <tr>
            <td style="text-align: center; font-size: 12px; color: #9ca3af; font-family: Arial, sans-serif;">
              <p style="margin: 0;">
                This email was sent to you because you subscribed to our newsletter.
                <br>
                <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a> | 
                <a href="#" style="color: #6366f1; text-decoration: none;">View in browser</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text: textContent };
}

function generateEmailStyles(emailWidth: number): string {
  return `
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
      .mobile-text-center {
        text-align: center !important;
      }
      .mobile-full-width {
        width: 100% !important;
        display: block !important;
      }
    }
    
    @media only screen and (min-width: 601px) {
      .desktop-only {
        display: block !important;
      }
    }
    
    /* Outlook specific styles */
    <!--[if mso]>
    <style type="text/css">
      table, td { border-collapse: collapse; }
      .container { width: ${emailWidth}px !important; }
      .outlook-font { font-family: Arial, sans-serif !important; }
    </style>
    <![endif]-->
    
    /* Gmail specific styles */
    u + .body .gmail-blend-screen { background: #000; mix-blend-mode: screen; }
    u + .body .gmail-blend-difference { background: #000; mix-blend-mode: difference; }
  </style>`;
}

function generateElementHTML(element: EmailElement, options: EmailGenerationOptions = {}): string {
  const styles = element.styles || {};
  const properties = element.properties || {};

  switch (element.type) {
    case 'text':
    case 'header':
      return generateTextHTML(element, options);
    case 'button':
      return generateButtonHTML(element, options);
    case 'image':
      return generateImageHTML(element, options);
    case 'divider':
      return generateDividerHTML(element, options);
    case 'spacer':
      return generateSpacerHTML(element, options);
    case 'columns':
      return generateColumnsHTML(element, options);
    case 'social':
      return generateSocialHTML(element, options);
    case 'footer':
      return generateFooterHTML(element, options);
    case 'section':
      return generateSectionHTML(element, options);
    default:
      return '';
  }
}

function generateTextHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const styles = element.styles || {};
  const textAlign = styles.textAlign || 'left';
  const fontSize = styles.fontSize || '16px';
  const color = styles.color || '#374151';
  const lineHeight = styles.lineHeight || '1.6';
  const margin = styles.margin || '15px 0';
  const padding = styles.padding || '0 20px';
  const fontFamily = styles.fontFamily || 'Arial, sans-serif';
  const fontWeight = styles.fontWeight || 'normal';

  // Convert markdown-like formatting to HTML
  let content = element.content || '';
  content = processMarkdownToHTML(content);

  const inlineStyles = `
    padding: ${padding};
    margin: ${margin};
    text-align: ${textAlign};
    font-size: ${fontSize};
    color: ${color};
    line-height: ${lineHeight};
    font-family: ${fontFamily};
    font-weight: ${fontWeight};
  `.trim();

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td class="mobile-padding" style="${inlineStyles}">
          ${content}
        </td>
      </tr>
    </table>`;
}

function generateButtonHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const styles = element.styles || {};
  const properties = element.properties || {};
  
  const buttonText = properties.text || element.content || 'Click Here';
  const buttonUrl = properties.url || '#';
  const buttonBg = styles.backgroundColor || '#3b82f6';
  const buttonColor = styles.color || '#ffffff';
  const buttonPadding = styles.padding || '12px 24px';
  const buttonRadius = styles.borderRadius || '6px';
  const buttonAlign = properties.alignment || 'center';
  const fontSize = styles.fontSize || '16px';
  const fontWeight = styles.fontWeight || '600';

  const buttonStyles = `
    background-color: ${buttonBg};
    color: ${buttonColor};
    padding: ${buttonPadding};
    border-radius: ${buttonRadius};
    text-decoration: none;
    font-size: ${fontSize};
    font-weight: ${fontWeight};
    border: none;
    cursor: pointer;
    display: inline-block;
    mso-padding-alt: 0;
    text-align: center;
  `.trim();

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 20px; text-align: ${buttonAlign};">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonUrl}" style="height:44px;v-text-anchor:middle;width:auto;" arcsize="14%" strokecolor="${buttonBg}" fillcolor="${buttonBg}">
            <w:anchorlock/>
            <center style="color:${buttonColor};font-family:Arial,sans-serif;font-size:${fontSize};font-weight:${fontWeight};">${escapeHtml(buttonText)}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${buttonUrl}" style="${buttonStyles}" target="_blank">
            ${escapeHtml(buttonText)}
          </a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

function generateImageHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const styles = element.styles || {};
  const properties = element.properties || {};
  
  const imageSrc = properties.src || element.content || '';
  const imageAlt = properties.alt || 'Image';
  const imageWidth = properties.width || 'auto';
  const imageHeight = properties.height || 'auto';
  const imageAlign = styles.textAlign || 'center';
  const borderRadius = styles.borderRadius || '0';

  const imageStyles = `
    max-width: 100%;
    height: auto;
    width: ${typeof imageWidth === 'number' ? `${imageWidth}px` : imageWidth};
    ${typeof imageHeight === 'number' ? `height: ${imageHeight}px;` : ''}
    border-radius: ${borderRadius};
    display: block;
  `.trim();

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 20px; text-align: ${imageAlign};">
          <img src="${imageSrc}" alt="${escapeHtml(imageAlt)}" style="${imageStyles}" />
        </td>
      </tr>
    </table>`;
}

function generateDividerHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const styles = element.styles || {};
  const dividerColor = styles.backgroundColor || '#e5e7eb';
  const margin = styles.margin || '20px 0';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 20px;">
          <hr style="border: none; border-top: 1px solid ${dividerColor}; margin: ${margin};" />
        </td>
      </tr>
    </table>`;
}

function generateSpacerHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const height = element.content || element.styles?.height || '20px';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="height: ${height}; line-height: ${height}; font-size: 1px;">&nbsp;</td>
      </tr>
    </table>`;
}

function generateColumnsHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const children = element.children || [];
  const leftChildren = children.filter((_, index) => index % 2 === 0);
  const rightChildren = children.filter((_, index) => index % 2 === 1);

  const leftHTML = leftChildren.map(child => generateElementHTML(child, options)).join('');
  const rightHTML = rightChildren.map(child => generateElementHTML(child, options)).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 20px;">
          <!--[if mso]>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td width="50%" valign="top">${leftHTML}</td>
              <td width="50%" valign="top">${rightHTML}</td>
            </tr>
          </table>
          <![endif]-->
          <!--[if !mso]><!-->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td class="mobile-full-width" style="width: 50%; vertical-align: top; padding-right: 10px;">
                ${leftHTML}
              </td>
              <td class="mobile-full-width" style="width: 50%; vertical-align: top; padding-left: 10px;">
                ${rightHTML}
              </td>
            </tr>
          </table>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

function generateSocialHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const styles = element.styles || {};
  const textAlign = styles.textAlign || 'center';

  const socialLinks = [
    { name: 'Facebook', icon: '📘', url: '#facebook' },
    { name: 'Twitter', icon: '🐦', url: '#twitter' },
    { name: 'Instagram', icon: '📷', url: '#instagram' },
    { name: 'LinkedIn', icon: '💼', url: '#linkedin' },
  ];

  const socialHTML = socialLinks.map(social => `
    <td style="padding: 0 8px;">
      <a href="${social.url}" style="color: #6b7280; text-decoration: none; font-size: 24px; line-height: 1;">
        ${social.icon}
      </a>
    </td>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: 20px; text-align: ${textAlign};">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
            <tr>
              ${socialHTML}
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function generateFooterHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const styles = element.styles || {};
  const fontSize = styles.fontSize || '14px';
  const color = styles.color || '#6b7280';
  const textAlign = styles.textAlign || 'center';
  const padding = styles.padding || '20px';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: ${padding}; text-align: ${textAlign}; font-size: ${fontSize}; color: ${color}; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
          <div style="margin-bottom: 12px;">
            <a href="#facebook" style="color: #6b7280; text-decoration: none; margin: 0 8px;">📘</a>
            <a href="#twitter" style="color: #6b7280; text-decoration: none; margin: 0 8px;">🐦</a>
            <a href="#instagram" style="color: #6b7280; text-decoration: none; margin: 0 8px;">📷</a>
            <a href="#linkedin" style="color: #6b7280; text-decoration: none; margin: 0 8px;">💼</a>
          </div>
          <p style="margin: 0 0 8px 0;">© 2024 Your Company. All rights reserved.</p>
          <p style="margin: 0; font-size: 12px;">
            <a href="#unsubscribe" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a> | 
            <a href="#preferences" style="color: #3b82f6; text-decoration: none;">Preferences</a> | 
            <a href="#browser" style="color: #3b82f6; text-decoration: none;">View in Browser</a>
          </p>
        </td>
      </tr>
    </table>`;
}

function generateSectionHTML(element: EmailElement, options: EmailGenerationOptions): string {
  const styles = element.styles || {};
  const properties = element.properties || {};
  
  // Generate background style based on properties
  const getBackgroundStyle = () => {
    const backgroundType = properties.backgroundType || 'color';
    let bgStyle = '';
    
    if (backgroundType === 'color') {
      bgStyle = `background-color: ${styles.backgroundColor || 'transparent'};`;
    } else if (backgroundType === 'gradient' && properties.gradientColors) {
      const direction = properties.gradientDirection || 'to bottom';
      // Convert CSS gradient direction to email-compatible format
      const emailGradientDirection = direction.replace('to-', '').replace('-', ' ');
      bgStyle = `background: linear-gradient(${emailGradientDirection}, ${properties.gradientColors[0]}, ${properties.gradientColors[1]}); background-color: ${properties.gradientColors[0]};`;
    } else if (backgroundType === 'image' && properties.imageUrl) {
      bgStyle = `background-image: url(${properties.imageUrl}); background-size: cover; background-position: center; background-repeat: no-repeat; background-color: ${styles.backgroundColor || '#ffffff'};`;
    }
    
    return bgStyle;
  };
  
  const padding = styles.padding || '20px';
  const borderRadius = styles.borderRadius || '0px';
  const backgroundStyle = getBackgroundStyle();
  
  // Generate HTML for child elements
  const childrenHTML = element.children ? 
    element.children.map(child => generateElementHTML(child, options)).join('\n') :
    '';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding: ${padding}; ${backgroundStyle} border-radius: ${borderRadius};">
          ${childrenHTML}
        </td>
      </tr>
    </table>`;
}

function generateTextContent(elements: EmailElement[]): string {
  return elements.map(element => {
    switch (element.type) {
      case 'text':
      case 'header':
        return stripHtml(element.content || '');
      case 'button':
        return `${element.properties?.text || element.content || 'Click Here'}: ${element.properties?.url || '#'}`;
      case 'image':
        return `[Image: ${element.properties?.alt || 'Image'}]`;
      case 'divider':
        return '---';
      case 'spacer':
        return '\n';
      case 'columns':
        const children = element.children || [];
        return children.map(child => generateTextContent([child])).join('\n');
      case 'social':
        return 'Follow us on social media: Facebook | Twitter | Instagram | LinkedIn';
      case 'footer':
        return 'Footer: © 2024 Your Company. All rights reserved. | Unsubscribe | Preferences | View in Browser';
      case 'section':
        const sectionChildren = element.children || [];
        return sectionChildren.map(child => generateTextContent([child])).join('\n');
      default:
        return '';
    }
  }).filter(Boolean).join('\n\n');
}

function processMarkdownToHTML(content: string): string {
  let processed = content;
  
  // Bold text: **text** -> <strong>text</strong>
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic text: *text* -> <em>text</em>
  processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Line breaks: double newlines -> paragraph breaks
  processed = processed.replace(/\n\n/g, '</p><p style="margin: 0 0 16px 0;">');
  
  // Single line breaks -> <br>
  processed = processed.replace(/\n/g, '<br>');
  
  // Wrap in paragraph if not already wrapped
  if (!processed.startsWith('<p')) {
    processed = `<p style="margin: 0;">${processed}</p>`;
  }
  
  return processed;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\n\n/g, '\n').trim();
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
