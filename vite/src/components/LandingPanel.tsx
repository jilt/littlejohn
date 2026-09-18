import { useState, useEffect } from 'react'

const KYBERSWAP_API = 'https://earn-service.kyberswap.com/api/v1/explorer/pools?chainIds=1&page=1&limit=1&interval=24h&q=0x5c6165e63581876edc7413bbc18e53b733f86dda709b1e9acf171fa15b0fa7a4&protocol=uniswap-v4&sortBy=tvl&orderBy=DESC'

interface KyberPool {
  address: string
  tvl: number
  volume1d: number
  apr: number
  allApr: number
  allApr7d: number
  activeApr: number
}

interface KyberResponse {
  data: {
    pools: KyberPool[]
  }
}

export default function LandingPanel() {
  const [apr24h, setApr24h] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPoolApr() {
      try {
        const res = await fetch(KYBERSWAP_API, {
          headers: { 'X-Client-Id': 'ai-agent-skills' }
        })
        if (!res.ok) throw new Error(`APR request failed: ${res.status}`)
        const json: KyberResponse = await res.json()
        const pool: KyberPool = json.data.pools[0]
        setApr24h(pool.allApr ?? pool.apr)
      } catch {
        setApr24h(null)
      } finally {
        setLoading(false)
      }
    }
    fetchPoolApr()
  }, [])

  return (
    <div className="landing-content">
      <div className="landing-header">
        <h3 className="landing-subtitle">Dynamically sweeps multi-chain stablecoin yields so you can flex high APYs without the volatility traps.</h3>
      </div>
      <div className="landing-stats">
        <div className="stat-card">
          <div className="stat-value">100%</div>
          <div className="stat-label">Stablecoins</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : apr24h !== null ? `${apr24h.toFixed(2)}%` : 'N/A'}
          </div>
          <div className="stat-label">APR</div>
        </div>
      </div>
    </div>
  )
}