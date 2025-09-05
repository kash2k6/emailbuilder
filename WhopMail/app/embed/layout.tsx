import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Embedded Form',
  description: 'Embedded signup form',
  robots: 'noindex, nofollow',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: transparent;
            line-height: 1.5;
          }
          button {
            font-family: inherit;
          }
          input, textarea, select {
            font-family: inherit;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
