export function AuthCardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-6">
      <h1 className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-card px-4 text-center font-clash text-2xl font-semibold text-card-foreground">
        {children}
      </h1>
      <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 border-t"></div>
    </div>
  )
}
