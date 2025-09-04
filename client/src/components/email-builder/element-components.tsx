import { EmailElement } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDragDropContext } from "@/lib/drag-drop-context";
import { useEmailBuilder } from "@/contexts/email-builder-context";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter, faInstagram, faLinkedin } from '@fortawesome/free-brands-svg-icons';

interface ElementComponentsProps {
  element: EmailElement;
}

export function ElementComponents({ element }: ElementComponentsProps) {
  const { addElement, selectElement, selectedElement } = useEmailBuilder();
  const { createDropTarget } = useDragDropContext();
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
      <div style={{ 
        textAlign: 'center',
        margin: styles.margin || '20px 0'
      }}>
        <img
          src={imageSrc}
          alt={imageAlt}
          style={{
            width: '100%',
            maxWidth: styles.maxWidth || '100%',
            height: styles.height || 'auto',
            borderRadius: styles.borderRadius || '8px',
            objectFit: (styles.objectFit || 'cover') as any,
            display: 'block',
            margin: '0 auto',
          }}
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
    
    const leftDropTarget = createDropTarget({
      onDrop: (componentType, e) => {
        if (e) {
          e.stopPropagation();
        }
        addElement(componentType as any, element.id);
      },
      accepts: ['text', 'button', 'image', 'divider', 'spacer', 'social'],
    });

    const rightDropTarget = createDropTarget({
      onDrop: (componentType, e) => {
        if (e) {
          e.stopPropagation();
        }
        addElement(componentType as any, element.id);
      },
      accepts: ['text', 'button', 'image', 'divider', 'spacer', 'social'],
    });
    
    return (
      <div className="grid md:grid-cols-2 gap-4" data-testid="preview-columns">
        <div className="space-y-3 min-h-[100px]" {...leftDropTarget}>
          {leftChildren.map((child) => (
            <div
              key={child.id}
              onClick={(e) => {
                e.stopPropagation();
                selectElement(child.id);
              }}
              className={cn(
                "cursor-pointer rounded-md transition-all duration-200",
                "hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                selectedElement?.id === child.id && "ring-2 ring-primary"
              )}
            >
              <ElementComponents element={child} />
            </div>
          ))}
          {leftChildren.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4 border-2 border-dashed border-border rounded h-20 flex items-center justify-center">
              Drop elements here
            </div>
          )}
        </div>
        <div className="space-y-3 min-h-[100px]" {...rightDropTarget}>
          {rightChildren.map((child) => (
            <div
              key={child.id}
              onClick={(e) => {
                e.stopPropagation();
                selectElement(child.id);
              }}
              className={cn(
                "cursor-pointer rounded-md transition-all duration-200",
                "hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                selectedElement?.id === child.id && "ring-2 ring-primary"
              )}
            >
              <ElementComponents element={child} />
            </div>
          ))}
          {rightChildren.length === 0 && (
            <div className="text-center text-muted-foreground text-sm p-4 border-2 border-dashed border-border rounded h-20 flex items-center justify-center">
              Drop elements here
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSocialElement = () => {
    const styles = element.styles || {};
    const properties = element.properties || {};
    
    const socialLinks = [
      { name: 'Facebook', icon: faFacebook, url: properties.facebook || '', color: '#1877F2' },
      { name: 'Twitter', icon: faTwitter, url: properties.twitter || '', color: '#1DA1F2' },
      { name: 'Instagram', icon: faInstagram, url: properties.instagram || '', color: '#E4405F' },
      { name: 'LinkedIn', icon: faLinkedin, url: properties.linkedin || '', color: '#0A66C2' },
    ].filter(social => social.url);

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
              className="hover:opacity-75 transition-all duration-200 hover:scale-110"
              title={social.name}
              style={{ color: styles.iconColor || social.color }}
            >
              <FontAwesomeIcon icon={social.icon} size="2x" />
            </a>
          ))}
          {socialLinks.length === 0 && (
            <span className="text-muted-foreground text-sm">Add social media links in properties</span>
          )}
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
            <a href="#" className="hover:opacity-75 transition-opacity" style={{ color: '#1877F2' }}>
              <FontAwesomeIcon icon={faFacebook} size="lg" />
            </a>
            <a href="#" className="hover:opacity-75 transition-opacity" style={{ color: '#1DA1F2' }}>
              <FontAwesomeIcon icon={faTwitter} size="lg" />
            </a>
            <a href="#" className="hover:opacity-75 transition-opacity" style={{ color: '#E4405F' }}>
              <FontAwesomeIcon icon={faInstagram} size="lg" />
            </a>
            <a href="#" className="hover:opacity-75 transition-opacity" style={{ color: '#0A66C2' }}>
              <FontAwesomeIcon icon={faLinkedin} size="lg" />
            </a>
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
