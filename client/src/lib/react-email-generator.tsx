import React from 'react';
import { render } from '@react-email/render';
import { 
  Html, 
  Head, 
  Body, 
  Container, 
  Section, 
  Column, 
  Row,
  Text, 
  Button, 
  Img, 
  Hr,
  Link
} from '@react-email/components';
import { EmailElement } from '@shared/schema';

export interface ReactEmailGenerationOptions {
  emailWidth?: number;
  emailBackground?: {
    type: 'color' | 'gradient' | 'image';
    backgroundColor?: string;
    gradientColors?: [string, string];
    gradientDirection?: string;
    imageUrl?: string;
    borderRadius?: string;
  };
}

// Convert our elements to React.email components
function ElementToReactEmail({ element }: { element: EmailElement }) {
  const styles = element.styles || {};
  const properties = element.properties || {};

  switch (element.type) {
    case 'text':
    case 'header':
      return (
        <Text style={{
          fontSize: styles.fontSize || '16px',
          color: styles.color || '#374151',
          fontFamily: styles.fontFamily || '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
          textAlign: styles.textAlign as any || 'left',
          lineHeight: styles.lineHeight || '1.6',
          fontWeight: styles.fontWeight || 'normal',
          marginTop: styles.marginTop || '16px',
          marginBottom: styles.marginBottom || '16px',
          paddingLeft: styles.paddingX || '20px',
          paddingRight: styles.paddingX || '20px',
          paddingTop: styles.paddingY || '0px',
          paddingBottom: styles.paddingY || '0px',
        }}>
          {element.content || 'Enter your text here...'}
        </Text>
      );

    case 'button':
      const buttonText = properties.text || element.content || 'Click Here';
      const buttonUrl = properties.url || '#';
      
      // Get size styles
      const getSizeStyles = (size: string) => {
        switch (size) {
          case 'small':
            return { fontSize: '14px', padding: '8px 16px' };
          case 'large':
            return { fontSize: '18px', padding: '16px 32px' };
          default: // medium
            return { fontSize: '16px', padding: '12px 24px' };
        }
      };
      
      const sizeStyles = getSizeStyles(properties.size || 'medium');
      
      // Calculate final padding values safely
      const defaultPadding = sizeStyles.padding || '12px 24px';
      const paddingParts = defaultPadding.split(' ');
      const defaultY = paddingParts[0] || '12px';
      const defaultX = paddingParts[1] || paddingParts[0] || '24px';
      
      const finalPaddingY = styles.paddingY || defaultY;
      const finalPaddingX = styles.paddingX || defaultX;
      
      // Gmail-compatible table-based button
      const buttonBgColor = styles.backgroundColor || '#ef4444';
      const buttonTextColor = styles.color || '#ffffff';
      const buttonBorderRadius = styles.borderRadius || '6px';
      
      const isFullWidth = properties.fullWidth;
      
      return (
        <Section style={{ 
          textAlign: properties.alignment || 'center', 
          marginTop: styles.marginTop || '20px',
          marginBottom: styles.marginBottom || '20px',
          paddingLeft: styles.paddingX || '20px',
          paddingRight: styles.paddingX || '20px'
        }}>
          <table border={0} cellSpacing={0} cellPadding={0} style={{ 
            margin: '0 auto',
            width: isFullWidth ? '100%' : 'auto'
          }}>
            <tr>
              <td>
                <Link 
                  href={buttonUrl}
                  style={{
                    backgroundColor: buttonBgColor,
                    color: buttonTextColor,
                    borderRadius: buttonBorderRadius,
                    padding: `${finalPaddingY} ${finalPaddingX}`,
                    fontSize: styles.fontSize || sizeStyles.fontSize,
                    fontWeight: styles.fontWeight || '600',
                    textDecoration: 'none',
                    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
                    display: 'block',
                    lineHeight: '1.4',
                    textAlign: 'center',
                    width: isFullWidth ? '100%' : 'auto',
                    minWidth: isFullWidth ? '100%' : '120px',
                    boxSizing: 'border-box',
                    border: `1px solid ${buttonBgColor}`,
                    msoHide: 'all'
                  }}
                >
                  {buttonText}
                </Link>
              </td>
            </tr>
          </table>
        </Section>
      );

    case 'image':
      const imageSrc = properties.src || element.content || '';
      const imageAlt = properties.alt || 'Image';
      
      return (
        <Section style={{ 
          textAlign: styles.textAlign as any || 'center',
          marginTop: styles.marginTop || '20px',
          marginBottom: styles.marginBottom || '20px',
          paddingLeft: styles.paddingX || '20px',
          paddingRight: styles.paddingX || '20px',
          paddingTop: styles.paddingY || '0px',
          paddingBottom: styles.paddingY || '0px'
        }}>
          <Img 
            src={imageSrc} 
            alt={imageAlt}
            style={{
              maxWidth: '100%',
              height: 'auto',
              width: properties.width || 'auto',
              borderRadius: styles.borderRadius || '0',
              display: 'block',
              margin: '0 auto'
            }}
          />
        </Section>
      );

    case 'divider':
      return (
        <Section style={{ 
          marginTop: styles.marginTop || '20px',
          marginBottom: styles.marginBottom || '20px',
          paddingLeft: styles.paddingX || '20px',
          paddingRight: styles.paddingX || '20px'
        }}>
          <Hr style={{
            borderColor: styles.backgroundColor || '#e5e7eb',
            height: styles.height || '1px',
            width: styles.width || '100%'
          }} />
        </Section>
      );

    case 'spacer':
      const height = element.content || element.styles?.height || '20px';
      return (
        <Section style={{ 
          height: height, 
          lineHeight: height, 
          fontSize: '1px' 
        }}>
          &nbsp;
        </Section>
      );

    case 'columns':
      const leftChildren = element.leftChildren || [];
      const rightChildren = element.rightChildren || [];
      
      return (
        <Section style={{ 
          marginTop: styles.marginTop || '20px',
          marginBottom: styles.marginBottom || '20px',
          paddingLeft: styles.paddingX || '20px',
          paddingRight: styles.paddingX || '20px'
        }}>
          <Row>
            <Column style={{ 
              width: '50%', 
              verticalAlign: 'top', 
              paddingRight: '10px',
              paddingTop: '0',
              paddingBottom: '0'
            }}>
              {leftChildren.map((child) => (
                <ElementToReactEmail key={child.id} element={child} />
              ))}
            </Column>
            <Column style={{ 
              width: '50%', 
              verticalAlign: 'top', 
              paddingLeft: '10px',
              paddingTop: '0',
              paddingBottom: '0'
            }}>
              {rightChildren.map((child) => (
                <ElementToReactEmail key={child.id} element={child} />
              ))}
            </Column>
          </Row>
        </Section>
      );

    case 'social':
      const socialLinks = [
        { name: 'Facebook', url: properties.facebook || '', symbol: '📘' },
        { name: 'Twitter', url: properties.twitter || '', symbol: '🐦' },
        { name: 'Instagram', url: properties.instagram || '', symbol: '📷' },
        { name: 'LinkedIn', url: properties.linkedin || '', symbol: '💼' },
        { name: 'TikTok', url: properties.tiktok || '', symbol: '🎵' },
      ].filter(social => social.url);

      return (
        <Section style={{ 
          textAlign: styles.textAlign as any || 'center',
          marginTop: styles.marginTop || '20px',
          marginBottom: styles.marginBottom || '20px',
          paddingLeft: styles.paddingX || '20px',
          paddingRight: styles.paddingX || '20px',
          paddingTop: styles.paddingY || '0px',
          paddingBottom: styles.paddingY || '0px'
        }}>
          {socialLinks.map((social) => (
            <Link 
              key={social.name}
              href={social.url}
              style={{
                color: properties.iconColor || '#6b7280',
                textDecoration: 'none',
                fontSize: '24px',
                margin: '0 8px',
                display: 'inline-block'
              }}
            >
              {social.symbol}
            </Link>
          ))}
        </Section>
      );

    case 'section':
      const children = element.children || [];
      
      // Generate background style
      const getBackgroundStyle = () => {
        const backgroundType = properties.backgroundType || 'color';
        let style: React.CSSProperties = {
          borderRadius: styles.borderRadius || '0px',
          padding: styles.padding || '20px',
          margin: styles.margin || '20px 0',
        };
        
        if (backgroundType === 'color') {
          style.backgroundColor = styles.backgroundColor || 'transparent';
        } else if (backgroundType === 'gradient' && properties.gradientColors) {
          const direction = properties.gradientDirection || 'to bottom';
          style.background = `linear-gradient(${direction}, ${properties.gradientColors[0]}, ${properties.gradientColors[1]})`;
        } else if (backgroundType === 'image' && properties.imageUrl) {
          style.backgroundImage = `url(${properties.imageUrl})`;
          style.backgroundSize = 'cover';
          style.backgroundPosition = 'center';
          style.backgroundRepeat = 'no-repeat';
        }
        
        return style;
      };

      return (
        <Section style={getBackgroundStyle()}>
          {children.map((child) => (
            <ElementToReactEmail key={child.id} element={child} />
          ))}
        </Section>
      );

    case 'footer':
      return (
        <Section style={{
          padding: styles.padding || '20px',
          textAlign: styles.textAlign as any || 'center',
          fontSize: styles.fontSize || '14px',
          color: styles.color || '#6b7280',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: styles.backgroundColor || '#f9fafb',
          margin: '20px 0 0 0'
        }}>
          <Text style={{ margin: '0 0 12px 0' }}>
            <Link href="#facebook" style={{ color: '#6b7280', textDecoration: 'none', margin: '0 8px' }}>📘</Link>
            <Link href="#twitter" style={{ color: '#6b7280', textDecoration: 'none', margin: '0 8px' }}>🐦</Link>
            <Link href="#instagram" style={{ color: '#6b7280', textDecoration: 'none', margin: '0 8px' }}>📷</Link>
            <Link href="#linkedin" style={{ color: '#6b7280', textDecoration: 'none', margin: '0 8px' }}>💼</Link>
          </Text>
          <Text style={{ margin: '0 0 8px 0' }}>© 2024 Your Company. All rights reserved.</Text>
          <Text style={{ margin: '0', fontSize: '12px' }}>
            <Link href="#unsubscribe" style={{ color: '#3b82f6', textDecoration: 'none' }}>Unsubscribe</Link> | 
            <Link href="#preferences" style={{ color: '#3b82f6', textDecoration: 'none' }}>Preferences</Link> | 
            <Link href="#browser" style={{ color: '#3b82f6', textDecoration: 'none' }}>View in Browser</Link>
          </Text>
        </Section>
      );

    default:
      return (
        <Text style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
          Unknown element type: {element.type}
        </Text>
      );
  }
}

// Main email template component (following official Resend pattern)
export function EmailTemplate({ 
  elements, 
  subject, 
  options 
}: { 
  elements: EmailElement[], 
  subject: string, 
  options: ReactEmailGenerationOptions 
}) {
  const { emailWidth = 600, emailBackground } = options;

  // Generate container background style
  const getContainerStyle = () => {
    let style: React.CSSProperties = {
      maxWidth: `${emailWidth}px`,
      margin: '0 auto',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    };

    if (emailBackground?.type === 'color') {
      style.backgroundColor = emailBackground.backgroundColor || '#ffffff';
    } else if (emailBackground?.type === 'gradient' && emailBackground.gradientColors) {
      const direction = emailBackground.gradientDirection || 'to bottom';
      style.background = `linear-gradient(${direction}, ${emailBackground.gradientColors[0]}, ${emailBackground.gradientColors[1]})`;
    } else if (emailBackground?.type === 'image' && emailBackground.imageUrl) {
      style.backgroundImage = `url(${emailBackground.imageUrl})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
      style.backgroundColor = emailBackground.backgroundColor || '#ffffff';
    } else {
      style.backgroundColor = '#ffffff';
    }

    if (emailBackground?.borderRadius) {
      style.borderRadius = emailBackground.borderRadius;
    }

    return style;
  };

  return (
    <Html lang="en">
      <Head>
        <title>{subject}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
      </Head>
      <Body style={{
        margin: '0',
        padding: '0',
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
        WebkitTextSizeAdjust: '100%',
        color: '#333333'
      }}>
        <Container style={{
          backgroundColor: '#f8fafc',
          padding: '20px 0'
        }}>
          <Container style={getContainerStyle()}>
            {elements.map((element) => (
              <ElementToReactEmail key={element.id} element={element} />
            ))}
          </Container>
          
          {/* Footer notice */}
          <Container style={{
            maxWidth: `${emailWidth}px`,
            margin: '20px auto 0',
            textAlign: 'center',
            fontSize: '12px',
            color: '#9ca3af'
          }}>
            <Text>
              This email was sent to you because you subscribed to our newsletter.
              <br />
              <Link href="#" style={{ color: '#6366f1', textDecoration: 'none' }}>Unsubscribe</Link> | 
              <Link href="#" style={{ color: '#6366f1', textDecoration: 'none' }}>View in browser</Link>
            </Text>
          </Container>
        </Container>
      </Body>
    </Html>
  );
}

// Main generation function following React.email pattern
export async function generateReactEmail(
  elements: EmailElement[],
  subject: string,
  options: ReactEmailGenerationOptions = {}
): Promise<{ html: string; text: string }> {
  // Render React component to HTML using React.email
  const html = await render(
    <EmailTemplate 
      elements={elements} 
      subject={subject} 
      options={options} 
    />
  );

  // Generate text version
  const text = generateTextContent(elements);

  return { html, text };
}

// Official Resend integration helper (following their exact pattern)
// Usage: 
// await resend.emails.send({
//   from: 'your@domain.com',
//   to: 'user@example.com',
//   subject: 'Your Subject',
//   react: createEmailComponent(elements, subject, options)
// });
export function createEmailComponent(
  elements: EmailElement[],
  subject: string,
  options: ReactEmailGenerationOptions = {}
) {
  return EmailTemplate({ elements, subject, options });
}

// Text content generation (same as before)
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
        const leftChildren = element.leftChildren || [];
        const rightChildren = element.rightChildren || [];
        return [...leftChildren, ...rightChildren]
          .map(child => generateTextContent([child]))
          .join('\n');
      case 'social':
        return 'Follow us on social media: Facebook | Twitter | Instagram | LinkedIn | TikTok';
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\n\n/g, '\n').trim();
}