export const dynamic = 'force-dynamic'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="relative flex flex-col md:flex-row h-screen overflow-hidden">{children}</div>
}
