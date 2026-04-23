export const dynamic = 'force-dynamic'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="flex h-screen overflow-hidden">{children}</div>
}
