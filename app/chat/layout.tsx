export const dynamic = 'force-dynamic'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex h-screen overflow-hidden" style={{ background: '#F5F4F0' }}>
      {children}
    </div>
  )
}
