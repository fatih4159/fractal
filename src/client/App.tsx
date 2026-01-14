import { useState } from 'react'

function App() {
  return (
    <div className="flex h-screen bg-background">
      <div className="flex flex-col items-center justify-center flex-1">
        <h1 className="text-4xl font-bold mb-4">Fractal</h1>
        <p className="text-muted-foreground mb-8">
          Multi-Channel Messaging Platform
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">Backend Status</div>
            <div className="text-green-500">✓ Server Running</div>
            <div className="text-green-500">✓ Database Connected</div>
            <div className="text-green-500">✓ Socket.IO Ready</div>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="font-semibold mb-2">Features</div>
            <div className="text-muted-foreground">• SMS/MMS Support</div>
            <div className="text-muted-foreground">• WhatsApp Integration</div>
            <div className="text-muted-foreground">• Real-time Updates</div>
          </div>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          Frontend components will be implemented next
        </p>
      </div>
    </div>
  )
}

export default App
