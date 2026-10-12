export const dynamic = 'force-static'

export default function RootPage() {
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0; url=/ar" />
        <script dangerouslySetInnerHTML={{ __html: "window.location.replace('/ar')" }} />
      </head>
      <body />
    </html>
  )
}
