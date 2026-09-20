import { useState, useEffect, useCallback, useContext } from 'react'
import { formatEther, formatUnits } from 'viem'
import { getContractBalance, getWalletClient, getBalance, WalletContext } from '../connector.tsx'
import { CONTRACTS } from '../config/contracts'
import { robinhood } from '../chains'

const LJB_TOKEN = CONTRACTS.robinhood.ljbToken

interface TokenBalance {
  symbol: string
  address: string
  balance: bigint
  decimals: number
}

export default function GetLjbTokens() {
  const {} = useContext(WalletContext)
  const [isOpen, setIsOpen] = useState(false)
  const [balances, setBalances] = useState<Record<string, TokenBalance>>({})
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDG'>('ETH')
  const [amount, setAmount] = useState('')
  const [quoteResult, setQuoteResult] = useState<{ amountOut: string; gasUsd: string } | null>(null)
  const [buttonText, setButtonText] = useState('Quote')
  const [isSwapping, setIsSwapping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tokenConfig: Record<string, { address: string; decimals: number }> = {
    ETH: { address: '0xEeeeeEeeeEeEeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
    USDG: { address: CONTRACTS.robinhood.stableCoin, decimals: 6 },
  }

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const walletClient = getWalletClient()
      const accounts = await walletClient.getAddresses()
      const walletAddress = accounts[0] || '0x0000000000000000000000000000000001'

      const [ethBalance, usdgBalance] = await Promise.all([
        getBalance(walletAddress as `0x${string}`),
        getContractBalance({
          address: tokenConfig.USDG.address,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: 'balance', type: 'uint256' }],
          }],
          functionName: 'balanceOf',
          args: [walletAddress],
          chain: robinhood,
        }),
      ])
      setBalances({
        ETH: { symbol: 'ETH', address: tokenConfig.ETH.address, balance: ethBalance, decimals: 18 },
        USDG: { symbol: 'USDG', address: tokenConfig.USDG.address, balance: BigInt((usdgBalance as bigint).toString() || '0'), decimals: 6 },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balances'
      setError(message)
      setBalances({
        ETH: { symbol: 'ETH', address: tokenConfig.ETH.address, balance: 0n, decimals: 18 },
        USDG: { symbol: 'USDG', address: tokenConfig.USDG.address, balance: 0n, decimals: 6 },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchBalances()
    }
  }, [isOpen, fetchBalances])

  const handleMax = () => {
    const bal = balances[selectedToken]
    if (bal) {
      const formatted = bal.symbol === 'ETH' ? formatEther(bal.balance) : formatUnits(bal.balance, bal.decimals)
      setAmount(formatted)
    }
  }

  const maxLabel = () => {
    const bal = balances[selectedToken]
    if (!bal || BigInt(bal.balance) === 0n) return 'Max'
    const formatted = bal.symbol === 'ETH' ? formatEther(bal.balance) : formatUnits(bal.balance, bal.decimals)
    return `Max: ${formatted}`
  }

  const handleQuote = async () => {
    if (!amount || Number(amount) <= 0) return
    setError(null)
    setButtonText('Get Quote')
    try {
      const tokenIn = tokenConfig[selectedToken]
      const amountWei = BigInt(Math.floor(Number(amount) * Math.pow(10, tokenIn.decimals))).toString()
      const routesUrl = `https://aggregator-api.kyberswap.com/robinhood/api/v1/routes?tokenIn=${tokenIn.address}&tokenOut=${LJB_TOKEN}&amountIn=${amountWei}&source=ai-agent-skills`
      const resp = await fetch(routesUrl, { headers: { 'X-Client-Id': 'ai-agent-skills' } })
      const json = await resp.json()
      if (json.code && json.code !== 0) throw new Error(json.message || 'Quote failed')
      const route = json.data?.routes?.[0]
      if (!route) throw new Error('No route found')
      const amountOut = route.amountOut || route.outputAmount || '0'
      const gasUsd = route.gasFeeUSD || '0.00'
      setQuoteResult({ amountOut, gasUsd })
    } catch (err) {
      setError('Quote failed — no liquidity for this pair')
    }
  }

  const handleSwap = async () => {
    if (!quoteResult || !amount) return
    setIsSwapping(true)
    try {
      setButtonText('Swapping...')
      setTimeout(() => {
        setIsSwapping(false)
        setButtonText('Swap')
      }, 2000)
    } catch {
      setError('Swap failed')
      setButtonText('Swap')
    } finally {
      setIsSwapping(false)
    }
  }

  const toggleAccordion = () => {
    setIsOpen(prev => !prev)
    setError(null)
    setQuoteResult(null)
    setButtonText('Quote')
    setAmount('')
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <div
        onClick={toggleAccordion}
        style={{
          padding: '10px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#C6FE00', fontWeight: 900, fontFamily: 'Rubik', fontSize: '14px' }}>
          {isOpen ? '▼' : '▶'} Get LJB Tokens
        </span>
        <span style={{ color: '#fff', fontFamily: 'Rubik', fontSize: '12px' }}>
          Swap to LJB on Robinhood
        </span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading && <span style={{ color: '#fff', fontSize: '12px' }}>Loading balances...</span>}

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['ETH', 'USDG'] as const).map(token => {
              const bal = balances[token]
              const formatted = bal ? (bal.symbol === 'ETH' ? formatEther(bal.balance) : formatUnits(bal.balance, bal.decimals)) : ''
              return (
                <button
                  key={token}
                  className={`btn ${selectedToken === token ? 'btn-primary' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedToken(token); setQuoteResult(null); setButtonText('Quote') }}
                  style={{ flex: 1 }}
                >
                  {token} {formatted && `(${formatted})`}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={(e) => { e.stopPropagation(); handleMax() }}
              style={{ width: '130px', flexShrink: 0 }}
            >
              {maxLabel()}
            </button>
          </div>

          {quoteResult && (
            <div className="panel" style={{ padding: '8px 12px' }}>
              <strong>Quote:</strong> {quoteResult.amountOut} LJB
              <br />
              <span style={{ fontSize: '11px', opacity: 0.7 }}>Gas: ~{quoteResult.gasUsd} USD</span>
            </div>
          )}

          {error && (
            <div style={{ color: '#ff537b', fontSize: '12px' }}>{error}</div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={quoteResult ? handleSwap : handleQuote}
            disabled={isSwapping}
          >
            {buttonText}
          </button>
        </div>
      )}
    </div>
  )
}
