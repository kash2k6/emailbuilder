import { EmailElement } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ElementComponentsProps {
  element: EmailElement;
}

export function ElementComponents({ element }: ElementComponentsProps) {
  const renderTextElement = () => {
    const styles = element.styles || {};
    // Convert markdown-like formatting to JSX
    let content = element.content || 'Enter your text here...';
    
    // Simple markdown parsing for preview
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*)/);
    const renderedContent = parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return part.split('\n').map((line, lineIndex) => (
        <span key={`${index}-${lineIndex}`}>
          {line}
          {lineIndex < part.split('\n').length - 1 && <br />}
        </span>
      ));
    });

    return (
      <div
        style={{
          fontSize: styles.fontSize || '16px',
          color: styles.color || 'hsl(var(--foreground))',
          fontFamily: styles.fontFamily || 'Inter, system-ui, sans-serif',
          textAlign: styles.textAlign as any || 'left',
          lineHeight: styles.lineHeight || '1.6',
          fontWeight: styles.fontWeight || 'normal',
          margin: styles.margin || '0',
        }}
        className="prose prose-sm max-w-none dark:prose-invert"
      >
        {renderedContent}
      </div>
    );
  };

  const renderButtonElement = () => {
    const styles = element.styles || {};
    const properties = element.properties || {};
    const buttonText = properties.text || element.content || 'Click Here';
    
    return (
      <div style={{ textAlign: properties.alignment || 'center' }}>
        <Button
          style={{
            backgroundColor: styles.backgroundColor || 'hsl(var(--primary))',
            color: styles.color || 'hsl(var(--primary-foreground))',
            padding: `${styles.paddingY || '12px'} ${styles.paddingX || '24px'}`,
            borderRadius: styles.borderRadius || '6px',
            fontSize: styles.fontSize || '16px',
            fontWeight: styles.fontWeight || '600',
            border: 'none',
            cursor: 'pointer',
          }}
          className="hover:opacity-90 transition-opacity"
          data-testid="preview-button"
        >
          {buttonText}
        </Button>
      </div>
    );
  };

  const renderImageElement = () => {
    const styles = element.styles || {};
    const properties = element.properties || {};
    const imageSrc = properties.src || element.content || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400';
    const imageAlt = properties.alt || 'Image';
    
    return (
      <div style={{ textAlign: styles.textAlign || 'center' }}>
        <img
          src={imageSrc}
          alt={imageAlt}
          style={{
            maxWidth: '100%',
            height: properties.height === 'auto' ? 'auto' : properties.height || '200px',
            width: properties.width || 'auto',
            borderRadius: styles.borderRadius || '0px',
            objectFit: properties.objectFit || 'cover',
          }}
          className="rounded-lg"
          data-testid="preview-image"
        />
      </div>
    );
  };

  const renderDividerElement = () => {
    const styles = element.styles || {};
    
    return (
      <hr
        style={{
          border: 'none',
          borderTop: styles.borderTop || '1px solid hsl(var(--border))',
          margin: styles.margin || '20px 0',
          backgroundColor: 'transparent',
        }}
        data-testid="preview-divider"
      />
    );
  };

  const renderSpacerElement = () => {
    const height = element.content || element.styles?.height || '20px';
    
    return (
      <div
        style={{
          height,
          backgroundColor: 'transparent',
        }}
        data-testid="preview-spacer"
      />
    );
  };

  const renderHeaderElement = () => {
    const styles = element.styles || {};
    
    return (
      <div
        style={{
          background: styles.background || styles.backgroundColor || 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))',
          color: styles.color || 'hsl(var(--primary-foreground))',
          padding: styles.padding || '24px',
          textAlign: styles.textAlign as any || 'center',
          fontSize: styles.fontSize || '24px',
          fontWeight: styles.fontWeight || 'bold',
          borderRadius: '8px',
          margin: styles.margin || '0',
        }}
        data-testid="preview-header"
      >
        {element.content || 'Header Text'}
      </div>
    );
  };

  const renderColumnsElement = () => {
    const children = element.children || [];
    const leftChildren = children.filter((_, index) => index % 2 === 0);
    const rightChildren = children.filter((_, index) => index % 2 === 1);
    
    return (
      <div className="grid md:grid-cols-2 gap-4" data-testid="preview-columns">
        <div className="space-y-3">
          {leftChildren.map((child) => (
            <ElementComponents key={child.id} element={child} />
          ))}
          {leftChildren.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4 border-2 border-dashed border-border rounded">
              Drop elements here
            </div>
          )}
        </div>
        <div className="space-y-3">
          {rightChildren.map((child) => (
            <ElementComponents key={child.id} element={child} />
          ))}
          {rightChildren.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4 border-2 border-dashed border-border rounded">
              Drop elements here
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSocialElement = () => {
    const styles = element.styles || {};
    
    const socialLinks = [
      { name: 'Facebook', icon: '📘', url: '#' },
      { name: 'Twitter', icon: '🐦', url: '#' },
      { name: 'Instagram', icon: '📷', url: '#' },
      { name: 'LinkedIn', icon: '💼', url: '#' },
    ];

    return (
      <div
        style={{
          textAlign: (styles.textAlign as any) || 'center',
          margin: styles.margin || '20px 0',
        }}
        data-testid="preview-social"
      >
        <div className="flex justify-center gap-4">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              className="text-2xl hover:opacity-75 transition-opacity"
              title={social.name}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    );
  };

  const renderFooterElement = () => {
    const styles = element.styles || {};
    
    return (
      <div
        style={{
          fontSize: styles.fontSize || '14px',
          color: styles.color || 'hsl(var(--muted-foreground))',
          textAlign: styles.textAlign as any || 'center',
          margin: styles.margin || '20px 0',
          padding: styles.padding || '20px 0',
          borderTop: styles.borderTop || '1px solid hsl(var(--border))',
          backgroundColor: styles.backgroundColor || 'hsl(var(--muted)/0.5)',
        }}
        className="rounded-lg"
        data-testid="preview-footer"
      >
        <div className="space-y-3">
          <div className="flex justify-center gap-4 mb-3">
            <a href="#" className="hover:text-primary">📘</a>
            <a href="#" className="hover:text-primary">🐦</a>
            <a href="#" className="hover:text-primary">📷</a>
            <a href="#" className="hover:text-primary">💼</a>
          </div>
          <p>© 2024 Your Company. All rights reserved.</p>
          <p className="text-xs space-x-2">
            <a href="#" className="hover:text-primary">Unsubscribe</a>
            <span>|</span>
            <a href="#" className="hover:text-primary">Preferences</a>
            <span>|</span>
            <a href="#" className="hover:text-primary">View in Browser</a>
          </p>
        </div>
      </div>
    );
  };

  switch (element.type) {
    case 'text':
      return renderTextElement();
    case 'button':
      return renderButtonElement();
    case 'image':
      return renderImageElement();
    case 'divider':
      return renderDividerElement();
    case 'spacer':
      return renderSpacerElement();
    case 'header':
      return renderHeaderElement();
    case 'columns':
      return renderColumnsElement();
    case 'social':
      return renderSocialElement();
    case 'footer':
      return renderFooterElement();
    default:
      return (
        <div className="p-4 border border-dashed border-border rounded text-center text-muted-foreground">
          <Badge variant="secondary">{element.type}</Badge>
          <p className="text-sm mt-2">Unknown element type</p>
        </div>
      );
  }
}
