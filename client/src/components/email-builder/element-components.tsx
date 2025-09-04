import { EmailElement } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDragDropContext } from "@/lib/drag-drop-context";
import { useEmailBuilder } from "@/contexts/email-builder-context";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter, faInstagram, faLinkedin, faTiktok } from '@fortawesome/free-brands-svg-icons';
import { Plus } from "lucide-react";

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

    const isSelected = selectedElement?.id === element.id;

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
          cursor: 'pointer',
          borderRadius: '4px',
          transition: 'all 0.2s ease',
        }}
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert hover:bg-muted/20 p-2 -m-2",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
        data-testid="element-text"
      >
        {renderedContent}
      </div>
    );
  };

  const renderButtonElement = () => {
    const styles = element.styles || {};
    const properties = element.properties || {};
    const buttonText = properties.text || element.content || 'Click Here';
    
    const isSelected = selectedElement?.id === element.id;
    
    // Size variants
    const getSizeStyles = (size: string) => {
      switch (size) {
        case 'small':
          return { fontSize: '14px', paddingY: '8px', paddingX: '16px' };
        case 'large':
          return { fontSize: '18px', paddingY: '16px', paddingX: '32px' };
        default: // medium
          return { fontSize: '16px', paddingY: '12px', paddingX: '24px' };
      }
    };
    
    const sizeStyles = getSizeStyles(properties.size || 'medium');
    const buttonWidth = properties.fullWidth ? '100%' : 'auto';

    return (
      <div 
        style={{ 
          textAlign: properties.alignment || 'center',
          margin: styles.margin || '20px 0'
        }}
        className={cn(
          "p-2 -m-2 rounded transition-all duration-200 hover:bg-muted/20",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
        data-testid="element-button-container"
      >
        <Button
          style={{
            backgroundColor: styles.backgroundColor || 'hsl(var(--primary))',
            color: styles.color || 'hsl(var(--primary-foreground))',
            padding: `${styles.paddingY || sizeStyles.paddingY} ${styles.paddingX || sizeStyles.paddingX}`,
            borderRadius: styles.borderRadius || '6px',
            fontSize: styles.fontSize || sizeStyles.fontSize,
            fontWeight: styles.fontWeight || '600',
            border: 'none',
            cursor: 'pointer',
            width: buttonWidth,
            display: properties.fullWidth ? 'block' : 'inline-block',
          }}
          className="hover:opacity-90 transition-opacity"
          data-testid="preview-button"
          onClick={(e) => e.preventDefault()}
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
    const isSelected = selectedElement?.id === element.id;
    
    return (
      <div 
        style={{ 
          textAlign: 'center',
          margin: styles.margin || '20px 0'
        }}
        className={cn(
          "p-2 -m-2 rounded transition-all duration-200 hover:bg-muted/20 cursor-pointer",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
        data-testid="element-image-container"
      >
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
    const isSelected = selectedElement?.id === element.id;
    
    return (
      <div
        className={cn(
          "p-2 -m-2 rounded transition-all duration-200 hover:bg-muted/20 cursor-pointer",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
        data-testid="element-divider-container"
      >
        <hr
          style={{
            border: 'none',
            borderTop: styles.borderTop || '1px solid hsl(var(--border))',
            margin: styles.margin || '20px 0',
            backgroundColor: 'transparent',
          }}
          data-testid="preview-divider"
        />
      </div>
    );
  };

  const renderSpacerElement = () => {
    const height = element.content || element.styles?.height || '20px';
    const isSelected = selectedElement?.id === element.id;
    
    return (
      <div
        style={{
          height,
          backgroundColor: 'transparent',
          cursor: 'pointer',
          position: 'relative',
        }}
        className={cn(
          "hover:bg-muted/10 transition-colors border border-dashed border-transparent hover:border-muted-foreground/30 rounded flex items-center justify-center",
          isSelected && "ring-2 ring-primary bg-primary/5 border-primary/30"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
        data-testid="element-spacer"
      >
        {(isSelected || height === '20px') && (
          <span className="text-xs text-muted-foreground">Spacer ({height})</span>
        )}
      </div>
    );
  };

  const renderHeaderElement = () => {
    const styles = element.styles || {};
    const isSelected = selectedElement?.id === element.id;
    
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
          cursor: 'pointer',
        }}
        className={cn(
          "transition-all duration-200 hover:opacity-90",
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
        data-testid="element-header"
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
      { name: 'TikTok', icon: faTiktok, url: properties.tiktok || '', color: '#000000' },
    ].filter(social => social.url);

    const isSelected = selectedElement?.id === element.id;

    return (
      <div
        style={{
          textAlign: (styles.textAlign as any) || 'center',
          margin: styles.margin || '20px 0',
          cursor: 'pointer',
        }}
        className={cn(
          "p-2 -m-2 rounded transition-all duration-200 hover:bg-muted/20",
          isSelected && "ring-2 ring-primary bg-primary/5"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
        data-testid="element-social"
      >
        <div className="flex justify-center gap-4">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              className="hover:opacity-75 transition-all duration-200 hover:scale-110"
              title={social.name}
              style={{ color: properties.iconColor || social.color }}
              onClick={(e) => e.preventDefault()}
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

  const renderSectionElement = () => {
    const styles = element.styles || {};
    const properties = element.properties || {};
    
    // Generate background style based on properties
    const getBackgroundStyle = () => {
      const backgroundType = properties.backgroundType || 'color';
      let style: React.CSSProperties = {
        borderRadius: styles.borderRadius || '0px',
        padding: styles.padding || '20px',
        margin: styles.margin || '20px 0',
        minHeight: styles.minHeight || '100px',
        border: '2px dashed transparent',
      };
      
      if (backgroundType === 'color') {
        style.backgroundColor = styles.backgroundColor || 'transparent';
      } else if (backgroundType === 'gradient' && properties.gradientColors) {
        const direction = properties.gradientDirection || 'to-bottom';
        style.background = `linear-gradient(${direction}, ${properties.gradientColors[0]}, ${properties.gradientColors[1]})`;
      } else if (backgroundType === 'image' && properties.imageUrl) {
        style.backgroundImage = `url(${properties.imageUrl})`;
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center';
        style.backgroundRepeat = 'no-repeat';
        if (styles.backgroundColor) {
          style.backgroundColor = styles.backgroundColor; // Fallback
        }
      }
      
      return style;
    };
    
    const isSelected = selectedElement?.id === element.id;
    
    const dropTargetProps = createDropTarget({
      onDrop: (componentType: string) => {
        addElement(componentType as any, element.id);
      },
    });
    
    return (
      <div
        style={{
          ...getBackgroundStyle(),
          cursor: 'pointer',
        }}
        className={cn(
          "relative group transition-all duration-200 hover:border-dashed hover:border-primary/30",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={(e) => {
          // Only select the section if clicking on empty space (not on children)
          if (e.target === e.currentTarget) {
            e.stopPropagation();
            selectElement(element.id);
          }
        }}
        data-testid="element-section"
        {...dropTargetProps}
      >
        {element.children && element.children.length > 0 ? (
          <div className="space-y-4">
            {element.children.map((child: any) => (
              <ElementComponents key={child.id} element={child} />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <div className="text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Drop components here or click to add
              </p>
            </div>
          </div>
        )}
        
        {/* Visual indicator when hovering */}
        <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-transparent group-hover:border-primary/30 rounded transition-colors" />
      </div>
    );
  };

  const renderFooterElement = () => {
    const styles = element.styles || {};
    
    const isSelected = selectedElement?.id === element.id;

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
          cursor: 'pointer',
        }}
        className={cn(
          "rounded-lg transition-all duration-200 hover:bg-muted/20",
          isSelected && "ring-2 ring-primary"
        )}
        onClick={(e) => {
          e.stopPropagation();
          selectElement(element.id);
        }}
        data-testid="element-footer"
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
    case 'section':
      return renderSectionElement();
    default:
      return (
        <div className="p-4 border border-dashed border-border rounded text-center text-muted-foreground">
          <Badge variant="secondary">{element.type}</Badge>
          <p className="text-sm mt-2">Unknown element type</p>
        </div>
      );
  }
}
